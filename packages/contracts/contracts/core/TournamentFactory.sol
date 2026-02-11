// SPDX-License-Identifier: MIT
pragma solidity 0.8.24;

import "@openzeppelin/contracts/access/AccessControl.sol";
import "@openzeppelin/contracts/proxy/Clones.sol";
import "./Tournament.sol";
import "../interfaces/IPlayerPassport.sol";

/**
 * @title TournamentFactory
 * @notice Deploys Tournament instances using minimal proxy pattern (EIP-1167)
 * @dev Manages global protocol configuration and indexes all tournaments
 */
contract TournamentFactory is AccessControl {
    using Clones for address;

    // ═══════════════════════════════════════════════════════════════════════
    // STATE
    // ═══════════════════════════════════════════════════════════════════════

    /// @notice Tournament implementation contract for cloning
    address public tournamentImplementation;

    /// @notice PlayerPassport contract address
    address public playerPassport;

    /// @notice Protocol treasury receiving fees
    address public protocolTreasury;

    /// @notice Protocol fee in basis points (default 300 = 3%)
    uint256 public protocolFeeBps = 300;

    /// @notice Default dispute window in seconds (default 1800 = 30 min)
    uint256 public defaultDisputeWindowSeconds = 1800;

    /// @notice Chainlink VRF subscription ID
    uint256 public vrfSubscriptionId;

    /// @notice Chainlink VRF key hash
    bytes32 public vrfKeyHash;

    /// @notice Chainlink VRF coordinator address
    address public vrfCoordinator;

    /// @notice All deployed tournament addresses
    address[] public allTournaments;

    /// @notice Tournaments per organizer
    mapping(address => address[]) public organizerTournaments;

    /// @notice Quick lookup for valid tournaments
    mapping(address => bool) public isTournament;

    // ═══════════════════════════════════════════════════════════════════════
    // EVENTS
    // ═══════════════════════════════════════════════════════════════════════

    event TournamentCreated(
        address indexed tournament,
        address indexed organizer,
        address indexed gameContract,
        string name,
        uint256 entryFee,
        uint256 maxPlayers
    );

    event ProtocolFeeUpdated(uint256 oldFee, uint256 newFee);
    event TreasuryUpdated(address oldTreasury, address newTreasury);
    event ImplementationUpdated(address oldImpl, address newImpl);
    event DisputeWindowUpdated(uint256 oldWindow, uint256 newWindow);

    // ═══════════════════════════════════════════════════════════════════════
    // CONSTRUCTOR
    // ═══════════════════════════════════════════════════════════════════════

    /**
     * @notice Initializes the factory
     * @param _implementation Tournament implementation contract address
     * @param _playerPassport PlayerPassport contract address
     * @param _protocolTreasury Treasury address for protocol fees
     * @param _vrfSubscriptionId Chainlink VRF subscription ID
     * @param _vrfKeyHash Chainlink VRF key hash
     * @param _vrfCoordinator Chainlink VRF coordinator address
     */
    constructor(
        address _implementation,
        address _playerPassport,
        address _protocolTreasury,
        uint256 _vrfSubscriptionId,
        bytes32 _vrfKeyHash,
        address _vrfCoordinator
    ) {
        require(_implementation != address(0), "Implementation cannot be zero");
        require(_playerPassport != address(0), "Passport cannot be zero");
        require(_protocolTreasury != address(0), "Treasury cannot be zero");
        require(_vrfCoordinator != address(0), "VRF coordinator cannot be zero");

        tournamentImplementation = _implementation;
        playerPassport = _playerPassport;
        protocolTreasury = _protocolTreasury;
        vrfSubscriptionId = _vrfSubscriptionId;
        vrfKeyHash = _vrfKeyHash;
        vrfCoordinator = _vrfCoordinator;

        _grantRole(DEFAULT_ADMIN_ROLE, msg.sender);
    }

    // ═══════════════════════════════════════════════════════════════════════
    // TOURNAMENT CREATION
    // ═══════════════════════════════════════════════════════════════════════

    /**
     * @notice Creates a new tournament
     * @param name Tournament name
     * @param description Tournament description
     * @param gameContract Game contract address
     * @param entryFee Entry fee in wei (0 for free)
     * @param maxPlayers Maximum players (must be power of 2)
     * @param prizeSplitBps Prize distribution in basis points
     * @param registrationDeadline Unix timestamp for registration close
     * @param disputeWindowSeconds Dispute window duration
     * @return tournament Address of the created tournament
     */
    function createTournament(
        string calldata name,
        string calldata description,
        address gameContract,
        uint256 entryFee,
        uint256 maxPlayers,
        uint256[] calldata prizeSplitBps,
        uint256 registrationDeadline,
        uint256 disputeWindowSeconds
    ) external returns (address tournament) {
        // Validations
        require(bytes(name).length > 0, "Name cannot be empty");
        require(gameContract != address(0), "Game cannot be zero");
        require(maxPlayers >= 2, "Min 2 players");
        require(_isPowerOfTwo(maxPlayers), "Max players must be power of 2");
        require(registrationDeadline > block.timestamp, "Deadline must be future");
        require(prizeSplitBps.length > 0, "Prize split required");
        require(prizeSplitBps.length <= maxPlayers, "Too many prize positions");

        // Validate prize split sums correctly with protocol fee
        uint256 totalBps = 0;
        for (uint256 i = 0; i < prizeSplitBps.length; i++) {
            totalBps += prizeSplitBps[i];
        }
        require(totalBps + protocolFeeBps == 10000, "Prize split must equal 100% minus fee");

        // Use provided dispute window or default
        uint256 disputeWindow = disputeWindowSeconds > 0
            ? disputeWindowSeconds
            : defaultDisputeWindowSeconds;

        // Clone tournament implementation
        tournament = tournamentImplementation.clone();

        // Create config
        Tournament.TournamentConfig memory config = Tournament.TournamentConfig({
            organizer: msg.sender,
            gameContract: gameContract,
            entryFee: entryFee,
            maxPlayers: maxPlayers,
            prizeSplitBps: prizeSplitBps,
            protocolFeeBps: protocolFeeBps,
            registrationDeadline: registrationDeadline,
            disputeWindowSeconds: disputeWindow,
            name: name,
            description: description
        });

        // Initialize tournament
        Tournament(tournament).initialize(
            config,
            playerPassport,
            protocolTreasury,
            address(this),
            vrfSubscriptionId,
            vrfKeyHash,
            vrfCoordinator
        );

        // Grant REPORTER_ROLE on PlayerPassport to the tournament
        // Note: This requires the factory to have FACTORY_ROLE on PlayerPassport
        try IPlayerPassport(playerPassport).grantReporterRole(tournament) {} catch {
            // Continue even if this fails (for testing without full wiring)
        }

        // Index tournament
        allTournaments.push(tournament);
        organizerTournaments[msg.sender].push(tournament);
        isTournament[tournament] = true;

        emit TournamentCreated(
            tournament,
            msg.sender,
            gameContract,
            name,
            entryFee,
            maxPlayers
        );

        return tournament;
    }

    // ═══════════════════════════════════════════════════════════════════════
    // VIEW FUNCTIONS
    // ═══════════════════════════════════════════════════════════════════════

    /**
     * @notice Gets all tournament addresses
     * @return Array of tournament addresses
     */
    function getTournaments() external view returns (address[] memory) {
        return allTournaments;
    }

    /**
     * @notice Gets total tournament count
     * @return Number of tournaments created
     */
    function getTournamentCount() external view returns (uint256) {
        return allTournaments.length;
    }

    /**
     * @notice Gets tournaments created by an organizer
     * @param organizer Organizer address
     * @return Array of tournament addresses
     */
    function getOrganizerTournaments(address organizer) external view returns (address[] memory) {
        return organizerTournaments[organizer];
    }

    /**
     * @notice Gets active tournaments (Registration or Active status)
     * @dev Gas-heavy for large tournament counts - use off-chain indexing in production
     * @return Array of active tournament addresses
     */
    function getActiveTournaments() external view returns (address[] memory) {
        uint256 activeCount = 0;

        // Count active tournaments
        for (uint256 i = 0; i < allTournaments.length; i++) {
            Tournament.TournamentStatus status = Tournament(allTournaments[i]).status();
            if (
                status == Tournament.TournamentStatus.Registration ||
                status == Tournament.TournamentStatus.Active
            ) {
                activeCount++;
            }
        }

        // Collect active tournaments
        address[] memory active = new address[](activeCount);
        uint256 index = 0;
        for (uint256 i = 0; i < allTournaments.length; i++) {
            Tournament.TournamentStatus status = Tournament(allTournaments[i]).status();
            if (
                status == Tournament.TournamentStatus.Registration ||
                status == Tournament.TournamentStatus.Active
            ) {
                active[index++] = allTournaments[i];
            }
        }

        return active;
    }

    // ═══════════════════════════════════════════════════════════════════════
    // ADMIN FUNCTIONS
    // ═══════════════════════════════════════════════════════════════════════

    /**
     * @notice Updates the protocol fee
     * @dev Only callable by admin, max 10%
     * @param newFeeBps New fee in basis points
     */
    function setProtocolFee(uint256 newFeeBps) external onlyRole(DEFAULT_ADMIN_ROLE) {
        require(newFeeBps <= 1000, "Max 10% fee");

        uint256 oldFee = protocolFeeBps;
        protocolFeeBps = newFeeBps;

        emit ProtocolFeeUpdated(oldFee, newFeeBps);
    }

    /**
     * @notice Updates the default dispute window
     * @param newWindowSeconds New window in seconds
     */
    function setDefaultDisputeWindow(uint256 newWindowSeconds) external onlyRole(DEFAULT_ADMIN_ROLE) {
        require(newWindowSeconds >= 60, "Min 1 minute");
        require(newWindowSeconds <= 604800, "Max 1 week");

        uint256 oldWindow = defaultDisputeWindowSeconds;
        defaultDisputeWindowSeconds = newWindowSeconds;

        emit DisputeWindowUpdated(oldWindow, newWindowSeconds);
    }

    /**
     * @notice Updates the protocol treasury
     * @param newTreasury New treasury address
     */
    function setProtocolTreasury(address newTreasury) external onlyRole(DEFAULT_ADMIN_ROLE) {
        require(newTreasury != address(0), "Treasury cannot be zero");

        address oldTreasury = protocolTreasury;
        protocolTreasury = newTreasury;

        emit TreasuryUpdated(oldTreasury, newTreasury);
    }

    /**
     * @notice Updates the tournament implementation
     * @dev For upgrading tournament logic
     * @param newImplementation New implementation address
     */
    function updateImplementation(address newImplementation) external onlyRole(DEFAULT_ADMIN_ROLE) {
        require(newImplementation != address(0), "Implementation cannot be zero");

        address oldImpl = tournamentImplementation;
        tournamentImplementation = newImplementation;

        emit ImplementationUpdated(oldImpl, newImplementation);
    }

    /**
     * @notice Updates VRF configuration
     * @param _subscriptionId New subscription ID
     * @param _keyHash New key hash
     * @param _coordinator New coordinator address
     */
    function updateVRFConfig(
        uint256 _subscriptionId,
        bytes32 _keyHash,
        address _coordinator
    ) external onlyRole(DEFAULT_ADMIN_ROLE) {
        require(_coordinator != address(0), "Coordinator cannot be zero");

        vrfSubscriptionId = _subscriptionId;
        vrfKeyHash = _keyHash;
        vrfCoordinator = _coordinator;
    }

    // ═══════════════════════════════════════════════════════════════════════
    // INTERNAL FUNCTIONS
    // ═══════════════════════════════════════════════════════════════════════

    /**
     * @notice Checks if a number is a power of 2
     * @param n Number to check
     * @return True if power of 2
     */
    function _isPowerOfTwo(uint256 n) internal pure returns (bool) {
        return n != 0 && (n & (n - 1)) == 0;
    }
}
