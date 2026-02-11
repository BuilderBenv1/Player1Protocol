// SPDX-License-Identifier: MIT
pragma solidity 0.8.24;

import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import "@chainlink/contracts/src/v0.8/vrf/dev/VRFConsumerBaseV2Plus.sol";
import "@chainlink/contracts/src/v0.8/vrf/dev/libraries/VRFV2PlusClient.sol";
import "../interfaces/IPlayerPassport.sol";

/**
 * @title Tournament
 * @notice Individual tournament instance with escrow, VRF bracket seeding, and prize distribution
 * @dev Deployed as minimal proxy clones from TournamentFactory
 */
contract Tournament is ReentrancyGuard, VRFConsumerBaseV2Plus {
    // ═══════════════════════════════════════════════════════════════════════
    // ENUMS
    // ═══════════════════════════════════════════════════════════════════════

    enum TournamentStatus {
        Registration,
        Active,
        Completed,
        Cancelled,
        Finalized
    }

    enum MatchStatus {
        Pending,
        Reported,
        Confirmed,
        Disputed
    }

    // ═══════════════════════════════════════════════════════════════════════
    // STRUCTS
    // ═══════════════════════════════════════════════════════════════════════

    struct TournamentConfig {
        address organizer;
        address gameContract;
        uint256 entryFee;
        uint256 maxPlayers;
        uint256[] prizeSplitBps;
        uint256 protocolFeeBps;
        uint256 registrationDeadline;
        uint256 disputeWindowSeconds;
        string name;
        string description;
    }

    struct Match {
        uint256 matchId;
        uint256 round;
        address player1;
        address player2;
        address winner;
        address reporter;
        uint256 reportedAt;
        MatchStatus status;
    }

    struct BracketSlot {
        address player;
        uint256 seed;
    }

    // ═══════════════════════════════════════════════════════════════════════
    // STATE
    // ═══════════════════════════════════════════════════════════════════════

    TournamentConfig public config;
    TournamentStatus public status;

    address[] public players;
    mapping(address => bool) public isRegistered;
    mapping(address => bool) public hasClaimed;
    mapping(address => uint256) public claimableAmount;

    Match[] public matches;
    BracketSlot[] public bracket;

    uint256 public prizePool;
    uint256 public currentRound;
    bool public bracketGenerated;
    bool public initialized;

    IPlayerPassport public playerPassport;
    address public protocolTreasury;
    address public factory;

    // Chainlink VRF
    uint256 public vrfSubscriptionId;
    bytes32 public vrfKeyHash;
    uint256 public vrfRequestId;
    uint32 public constant VRF_CALLBACK_GAS_LIMIT = 500000;
    uint16 public constant VRF_REQUEST_CONFIRMATIONS = 3;

    // ═══════════════════════════════════════════════════════════════════════
    // EVENTS
    // ═══════════════════════════════════════════════════════════════════════

    event PlayerRegistered(address indexed player, uint256 playerCount);
    event BracketGenerationRequested(uint256 vrfRequestId);
    event BracketGenerated(address[] seededPlayers);
    event ResultReported(uint256 indexed matchId, address indexed winner, address reporter);
    event ResultConfirmed(uint256 indexed matchId, address indexed winner);
    event ResultDisputed(uint256 indexed matchId, address indexed disputedBy);
    event DisputeResolved(uint256 indexed matchId, address indexed winner);
    event TournamentCompleted(uint256 prizePool, address winner);
    event PrizeClaimed(address indexed player, uint256 amount);
    event TournamentCancelled();
    event RefundClaimed(address indexed player, uint256 amount);
    event RoundAdvanced(uint256 newRound);

    // ═══════════════════════════════════════════════════════════════════════
    // MODIFIERS
    // ═══════════════════════════════════════════════════════════════════════

    modifier onlyOrganizer() {
        require(msg.sender == config.organizer, "Only organizer");
        _;
    }

    modifier onlyOrganizerOrFactory() {
        require(msg.sender == config.organizer || msg.sender == factory, "Not authorized");
        _;
    }

    modifier onlyGameOrOrganizer() {
        require(
            msg.sender == config.gameContract || msg.sender == config.organizer,
            "Only game or organizer"
        );
        _;
    }

    // ═══════════════════════════════════════════════════════════════════════
    // CONSTRUCTOR
    // ═══════════════════════════════════════════════════════════════════════

    /**
     * @notice Constructor for the implementation contract
     * @dev This contract is deployed as an implementation for EIP-1167 minimal proxies.
     *      The constructor only runs on the implementation, NOT on clones.
     *      We pass a placeholder VRF coordinator (the deployer address) to satisfy
     *      VRFConsumerBaseV2Plus's non-zero requirement. Clones will have their
     *      s_vrfCoordinator set during initialize() to the actual coordinator.
     *      The implementation contract itself should never be used directly.
     */
    constructor() VRFConsumerBaseV2Plus(msg.sender) {
        // Mark implementation as initialized to prevent direct usage
        initialized = true;
    }

    // ═══════════════════════════════════════════════════════════════════════
    // INITIALIZATION
    // ═══════════════════════════════════════════════════════════════════════

    /**
     * @notice Initializes the tournament (called by factory after clone)
     * @param _config Tournament configuration
     * @param _playerPassport PlayerPassport contract address
     * @param _protocolTreasury Treasury address for protocol fees
     * @param _factory Factory contract address
     * @param _vrfSubscriptionId Chainlink VRF subscription ID
     * @param _vrfKeyHash Chainlink VRF key hash
     * @param _vrfCoordinator Chainlink VRF coordinator address
     */
    function initialize(
        TournamentConfig calldata _config,
        address _playerPassport,
        address _protocolTreasury,
        address _factory,
        uint256 _vrfSubscriptionId,
        bytes32 _vrfKeyHash,
        address _vrfCoordinator
    ) external {
        require(!initialized, "Already initialized");
        initialized = true;

        config = _config;
        playerPassport = IPlayerPassport(_playerPassport);
        protocolTreasury = _protocolTreasury;
        factory = _factory;
        vrfSubscriptionId = _vrfSubscriptionId;
        vrfKeyHash = _vrfKeyHash;

        // Set VRF coordinator (inherited state)
        s_vrfCoordinator = IVRFCoordinatorV2Plus(_vrfCoordinator);

        status = TournamentStatus.Registration;
    }

    // ═══════════════════════════════════════════════════════════════════════
    // REGISTRATION
    // ═══════════════════════════════════════════════════════════════════════

    /**
     * @notice Register for the tournament
     * @dev Requires exact entry fee payment
     */
    function register() external payable nonReentrant {
        require(status == TournamentStatus.Registration, "Registration closed");
        require(block.timestamp < config.registrationDeadline, "Registration deadline passed");
        require(players.length < config.maxPlayers, "Tournament full");
        require(msg.value == config.entryFee, "Incorrect entry fee");
        require(!isRegistered[msg.sender], "Already registered");

        players.push(msg.sender);
        isRegistered[msg.sender] = true;
        prizePool += msg.value;

        emit PlayerRegistered(msg.sender, players.length);

        // Auto-trigger bracket generation when full
        if (players.length == config.maxPlayers) {
            _requestBracketGeneration();
        }
    }

    // ═══════════════════════════════════════════════════════════════════════
    // BRACKET GENERATION
    // ═══════════════════════════════════════════════════════════════════════

    /**
     * @notice Manually trigger bracket generation (organizer only)
     * @dev Can be called after deadline if tournament isn't full
     */
    function generateBracket() external onlyOrganizer {
        require(status == TournamentStatus.Registration, "Not in registration");
        require(block.timestamp >= config.registrationDeadline, "Deadline not passed");
        require(players.length >= 2, "Not enough players");

        _requestBracketGeneration();
    }

    /**
     * @notice Generate bracket with deterministic seeding (testnet only)
     * @dev Uses block data as seed instead of VRF. Blocked on Avalanche mainnet (chainId 43114).
     */
    function generateBracketDeterministic() external onlyOrganizer {
        require(status == TournamentStatus.Registration, "Not in registration");
        require(players.length >= 2, "Not enough players");
        require(!bracketGenerated, "Bracket already generated");
        require(block.chainid != 43114, "Not available on mainnet");

        status = TournamentStatus.Active;

        uint256 seed = uint256(keccak256(abi.encodePacked(
            block.timestamp, block.prevrandao, address(this), players.length
        )));

        for (uint256 i = 0; i < players.length; i++) {
            bracket.push(BracketSlot({
                player: players[i],
                seed: uint256(keccak256(abi.encodePacked(seed, i)))
            }));
        }

        // Sort by seed (same bubble sort as fulfillRandomWords)
        for (uint256 i = 0; i < bracket.length - 1; i++) {
            for (uint256 j = 0; j < bracket.length - i - 1; j++) {
                if (bracket[j].seed > bracket[j + 1].seed) {
                    BracketSlot memory temp = bracket[j];
                    bracket[j] = bracket[j + 1];
                    bracket[j + 1] = temp;
                }
            }
        }

        _generateRoundMatches();
        bracketGenerated = true;

        address[] memory seededPlayers = new address[](bracket.length);
        for (uint256 i = 0; i < bracket.length; i++) {
            seededPlayers[i] = bracket[i].player;
        }

        emit BracketGenerated(seededPlayers);
    }

    function _requestBracketGeneration() internal {
        status = TournamentStatus.Active;

        vrfRequestId = s_vrfCoordinator.requestRandomWords(
            VRFV2PlusClient.RandomWordsRequest({
                keyHash: vrfKeyHash,
                subId: vrfSubscriptionId,
                requestConfirmations: VRF_REQUEST_CONFIRMATIONS,
                callbackGasLimit: VRF_CALLBACK_GAS_LIMIT,
                numWords: 1,
                extraArgs: VRFV2PlusClient._argsToBytes(
                    VRFV2PlusClient.ExtraArgsV1({nativePayment: false})
                )
            })
        );

        emit BracketGenerationRequested(vrfRequestId);
    }

    /**
     * @notice Chainlink VRF callback - seeds the bracket
     */
    function fulfillRandomWords(
        uint256 requestId,
        uint256[] calldata randomWords
    ) internal override {
        require(requestId == vrfRequestId, "Invalid request");
        require(!bracketGenerated, "Bracket already generated");

        uint256 seed = randomWords[0];

        // Create bracket slots with seeds
        for (uint256 i = 0; i < players.length; i++) {
            bracket.push(BracketSlot({
                player: players[i],
                seed: uint256(keccak256(abi.encodePacked(seed, i)))
            }));
        }

        // Sort by seed (simple bubble sort - OK for small arrays)
        for (uint256 i = 0; i < bracket.length - 1; i++) {
            for (uint256 j = 0; j < bracket.length - i - 1; j++) {
                if (bracket[j].seed > bracket[j + 1].seed) {
                    BracketSlot memory temp = bracket[j];
                    bracket[j] = bracket[j + 1];
                    bracket[j + 1] = temp;
                }
            }
        }

        // Generate first round matches
        _generateRoundMatches();

        bracketGenerated = true;

        address[] memory seededPlayers = new address[](bracket.length);
        for (uint256 i = 0; i < bracket.length; i++) {
            seededPlayers[i] = bracket[i].player;
        }

        emit BracketGenerated(seededPlayers);
    }

    function _generateRoundMatches() internal {
        uint256 matchCount = bracket.length / 2;
        uint256 baseMatchId = matches.length;

        for (uint256 i = 0; i < matchCount; i++) {
            uint256 p1Index = i * 2;
            uint256 p2Index = i * 2 + 1;

            address player1 = p1Index < bracket.length ? bracket[p1Index].player : address(0);
            address player2 = p2Index < bracket.length ? bracket[p2Index].player : address(0);

            matches.push(Match({
                matchId: baseMatchId + i,
                round: currentRound,
                player1: player1,
                player2: player2,
                winner: address(0),
                reporter: address(0),
                reportedAt: 0,
                status: MatchStatus.Pending
            }));

            // If one player is bye (address(0)), auto-advance the other
            if (player1 != address(0) && player2 == address(0)) {
                matches[baseMatchId + i].winner = player1;
                matches[baseMatchId + i].status = MatchStatus.Confirmed;
            } else if (player1 == address(0) && player2 != address(0)) {
                matches[baseMatchId + i].winner = player2;
                matches[baseMatchId + i].status = MatchStatus.Confirmed;
            }
        }
    }

    // ═══════════════════════════════════════════════════════════════════════
    // RESULT REPORTING
    // ═══════════════════════════════════════════════════════════════════════

    /**
     * @notice Report a match result
     * @param matchId Match ID to report
     * @param winner Address of the winner
     */
    function reportResult(uint256 matchId, address winner) external onlyGameOrOrganizer {
        require(status == TournamentStatus.Active, "Tournament not active");
        require(matchId < matches.length, "Invalid match ID");

        Match storage m = matches[matchId];
        require(m.round == currentRound, "Not current round");
        require(m.status == MatchStatus.Pending, "Match not pending");
        require(winner == m.player1 || winner == m.player2, "Invalid winner");

        m.winner = winner;
        m.reporter = msg.sender;
        m.reportedAt = block.timestamp;
        m.status = MatchStatus.Reported;

        emit ResultReported(matchId, winner, msg.sender);
    }

    /**
     * @notice Confirm a match result after dispute window
     * @param matchId Match ID to confirm
     */
    function confirmResult(uint256 matchId) external {
        require(matchId < matches.length, "Invalid match ID");

        Match storage m = matches[matchId];
        require(m.status == MatchStatus.Reported, "Not reported");
        require(
            block.timestamp >= m.reportedAt + config.disputeWindowSeconds,
            "Dispute window active"
        );

        m.status = MatchStatus.Confirmed;

        emit ResultConfirmed(matchId, m.winner);

        _checkRoundCompletion();
    }

    /**
     * @notice Dispute a match result
     * @param matchId Match ID to dispute
     */
    function disputeResult(uint256 matchId) external {
        require(matchId < matches.length, "Invalid match ID");

        Match storage m = matches[matchId];
        require(m.status == MatchStatus.Reported, "Not reported");
        require(
            block.timestamp < m.reportedAt + config.disputeWindowSeconds,
            "Dispute window closed"
        );

        // Only the losing player can dispute
        address loser = m.winner == m.player1 ? m.player2 : m.player1;
        require(msg.sender == loser, "Only loser can dispute");

        m.status = MatchStatus.Disputed;

        emit ResultDisputed(matchId, msg.sender);
    }

    /**
     * @notice Resolve a disputed match
     * @param matchId Match ID to resolve
     * @param winner Correct winner address
     */
    function resolveDispute(uint256 matchId, address winner) external onlyOrganizer {
        require(matchId < matches.length, "Invalid match ID");

        Match storage m = matches[matchId];
        require(m.status == MatchStatus.Disputed, "Not disputed");
        require(winner == m.player1 || winner == m.player2, "Invalid winner");

        m.winner = winner;
        m.status = MatchStatus.Confirmed;

        emit DisputeResolved(matchId, winner);

        _checkRoundCompletion();
    }

    function _checkRoundCompletion() internal {
        // Check if all current round matches are confirmed
        bool allConfirmed = true;
        uint256 roundMatchCount = 0;

        for (uint256 i = 0; i < matches.length; i++) {
            if (matches[i].round == currentRound) {
                roundMatchCount++;
                if (matches[i].status != MatchStatus.Confirmed) {
                    allConfirmed = false;
                    break;
                }
            }
        }

        if (!allConfirmed || roundMatchCount == 0) return;

        // Collect winners from current round
        address[] memory winners = new address[](roundMatchCount);
        uint256 winnerIndex = 0;

        for (uint256 i = 0; i < matches.length; i++) {
            if (matches[i].round == currentRound) {
                winners[winnerIndex++] = matches[i].winner;
            }
        }

        // Check if this was the final
        if (winners.length == 1) {
            _completeTournament(winners[0]);
        } else {
            // Advance to next round
            currentRound++;

            // Update bracket with winners
            delete bracket;
            for (uint256 i = 0; i < winners.length; i++) {
                bracket.push(BracketSlot({
                    player: winners[i],
                    seed: i // Order preserved from previous round
                }));
            }

            _generateRoundMatches();
            emit RoundAdvanced(currentRound);
        }
    }

    // ═══════════════════════════════════════════════════════════════════════
    // SETTLEMENT
    // ═══════════════════════════════════════════════════════════════════════

    function _completeTournament(address winner) internal {
        status = TournamentStatus.Completed;

        // Calculate protocol fee
        uint256 protocolFee = (prizePool * config.protocolFeeBps) / 10000;
        uint256 distributablePool = prizePool - protocolFee;

        // Send protocol fee to treasury
        if (protocolFee > 0) {
            (bool sent, ) = protocolTreasury.call{value: protocolFee}("");
            require(sent, "Protocol fee transfer failed");
        }

        // Calculate prize distribution
        uint256[] memory prizeSplit = config.prizeSplitBps;

        // Collect placement order from matches
        address[] memory placements = _getPlacementOrder(winner);

        // Set claimable amounts
        for (uint256 i = 0; i < prizeSplit.length && i < placements.length; i++) {
            uint256 prize = (distributablePool * prizeSplit[i]) / 10000;
            if (prize > 0 && placements[i] != address(0)) {
                claimableAmount[placements[i]] = prize;
            }
        }

        // Report results to PlayerPassport
        _reportToPassport(placements);

        emit TournamentCompleted(prizePool, winner);
    }

    function _getPlacementOrder(address winner) internal view returns (address[] memory) {
        // Simple implementation: winner is 1st, finalist is 2nd, semi-losers are 3rd
        address[] memory placements = new address[](config.prizeSplitBps.length);
        placements[0] = winner;

        // Find the final match to get runner-up
        for (uint256 i = matches.length; i > 0; i--) {
            Match storage m = matches[i - 1];
            if (m.round == currentRound && m.status == MatchStatus.Confirmed) {
                placements[1] = m.winner == m.player1 ? m.player2 : m.player1;
                break;
            }
        }

        // For 3rd place, find semi-final losers
        if (placements.length > 2 && currentRound > 0) {
            uint256 index = 2;
            for (uint256 i = 0; i < matches.length && index < placements.length; i++) {
                if (matches[i].round == currentRound - 1 && matches[i].status == MatchStatus.Confirmed) {
                    address loser = matches[i].winner == matches[i].player1
                        ? matches[i].player2
                        : matches[i].player1;
                    placements[index++] = loser;
                }
            }
        }

        return placements;
    }

    function _reportToPassport(address[] memory placements) internal {
        // Report to all registered players
        for (uint256 i = 0; i < players.length; i++) {
            address player = players[i];
            uint8 placement = 0;
            uint256 prize = 0;

            // Find placement
            for (uint256 j = 0; j < placements.length; j++) {
                if (placements[j] == player) {
                    placement = uint8(j + 1);
                    prize = claimableAmount[player];
                    break;
                }
            }

            // Report to passport
            // placement values: 1 = 1st, 2 = 2nd, 3 = 3rd, etc.
            // placement = 0 means the player participated but didn't finish in a prize position.
            // PlayerPassport treats 0 and 4+ as participation-only (10 base points).
            try playerPassport.reportTournamentResult(
                player,
                placement,
                prize,
                config.entryFee,
                config.gameContract
            ) {} catch {
                // Continue even if passport update fails
            }
        }
    }

    // ═══════════════════════════════════════════════════════════════════════
    // PRIZE CLAIMS
    // ═══════════════════════════════════════════════════════════════════════

    /**
     * @notice Claim prize winnings
     */
    function claimPrize() external nonReentrant {
        require(status == TournamentStatus.Completed, "Tournament not completed");
        require(claimableAmount[msg.sender] > 0, "No prize to claim");
        require(!hasClaimed[msg.sender], "Already claimed");

        uint256 amount = claimableAmount[msg.sender];
        hasClaimed[msg.sender] = true;

        (bool sent, ) = msg.sender.call{value: amount}("");
        require(sent, "Prize transfer failed");

        emit PrizeClaimed(msg.sender, amount);

        // Check if all prizes claimed
        _checkFinalization();
    }

    function _checkFinalization() internal {
        for (uint256 i = 0; i < players.length; i++) {
            if (claimableAmount[players[i]] > 0 && !hasClaimed[players[i]]) {
                return; // Still have unclaimed prizes
            }
        }
        status = TournamentStatus.Finalized;
    }

    // ═══════════════════════════════════════════════════════════════════════
    // CANCELLATION
    // ═══════════════════════════════════════════════════════════════════════

    /**
     * @notice Cancel the tournament (only during registration)
     */
    function cancelTournament() external onlyOrganizerOrFactory {
        require(status == TournamentStatus.Registration, "Cannot cancel");

        status = TournamentStatus.Cancelled;

        emit TournamentCancelled();
    }

    /**
     * @notice Claim refund for cancelled tournament
     */
    function claimRefund() external nonReentrant {
        require(status == TournamentStatus.Cancelled, "Not cancelled");
        require(isRegistered[msg.sender], "Not registered");
        require(!hasClaimed[msg.sender], "Already claimed");

        hasClaimed[msg.sender] = true;

        (bool sent, ) = msg.sender.call{value: config.entryFee}("");
        require(sent, "Refund transfer failed");

        emit RefundClaimed(msg.sender, config.entryFee);
    }

    // ═══════════════════════════════════════════════════════════════════════
    // VIEW FUNCTIONS
    // ═══════════════════════════════════════════════════════════════════════

    function getPlayers() external view returns (address[] memory) {
        return players;
    }

    function getPlayerCount() external view returns (uint256) {
        return players.length;
    }

    function getMatch(uint256 matchId) external view returns (Match memory) {
        require(matchId < matches.length, "Invalid match ID");
        return matches[matchId];
    }

    function getAllMatches() external view returns (Match[] memory) {
        return matches;
    }

    function getMatchCount() external view returns (uint256) {
        return matches.length;
    }

    function getCurrentRoundMatches() external view returns (Match[] memory) {
        uint256 count = 0;
        for (uint256 i = 0; i < matches.length; i++) {
            if (matches[i].round == currentRound) count++;
        }

        Match[] memory roundMatches = new Match[](count);
        uint256 index = 0;
        for (uint256 i = 0; i < matches.length; i++) {
            if (matches[i].round == currentRound) {
                roundMatches[index++] = matches[i];
            }
        }

        return roundMatches;
    }

    function getBracket() external view returns (BracketSlot[] memory) {
        return bracket;
    }

    function getConfig() external view returns (TournamentConfig memory) {
        return config;
    }

    function getTournamentInfo() external view returns (
        TournamentStatus _status,
        uint256 playerCount,
        uint256 _prizePool,
        uint256 _currentRound,
        bool _bracketGenerated
    ) {
        return (status, players.length, prizePool, currentRound, bracketGenerated);
    }

    function getClaimableAmount(address player) external view returns (uint256) {
        return claimableAmount[player];
    }
}
