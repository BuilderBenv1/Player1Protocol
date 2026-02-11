// SPDX-License-Identifier: MIT
pragma solidity 0.8.24;

import "@openzeppelin/contracts/access/AccessControl.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import "../interfaces/IAchievementRegistry.sol";
import "../interfaces/IRewardDistributor.sol";

/**
 * @title PlayerPassport
 * @notice Soulbound wallet-linked reputation record - the on-chain Gamerscore
 * @dev Tracks composite score, tournament history, achievements, and per-game stats
 */
contract PlayerPassport is AccessControl, ReentrancyGuard {
    /// @notice Role for tournament contracts that can report results
    bytes32 public constant REPORTER_ROLE = keccak256("REPORTER_ROLE");

    /// @notice Role for game contracts that can attest achievements
    bytes32 public constant GAME_ROLE = keccak256("GAME_ROLE");

    /// @notice Role for TournamentFactory to grant REPORTER_ROLE to tournaments
    bytes32 public constant FACTORY_ROLE = keccak256("FACTORY_ROLE");

    // ═══════════════════════════════════════════════════════════════════════
    // STRUCTS
    // ═══════════════════════════════════════════════════════════════════════

    struct PlayerProfile {
        uint256 compositeScore;
        uint256 totalTournaments;
        uint256 totalWins;
        uint256 totalTopThree;
        uint256 totalPrizeMoney;
        uint256 currentWinStreak;
        uint256 longestWinStreak;
        uint256 p1Earned;
        bool exists;
    }

    struct TournamentResult {
        address tournamentContract;
        uint8 placement;
        uint256 prizeMoney;
        uint256 pointsEarned;
        uint256 timestamp;
    }

    struct AchievementUnlock {
        uint256 achievementId;
        address gameContract;
        uint256 timestamp;
    }

    enum EntryFeeTier {
        Free,    // 0 AVAX - x1 multiplier
        Low,     // > 0 and <= 1 AVAX - x1.5 multiplier
        Medium,  // > 1 and <= 10 AVAX - x2 multiplier
        High     // > 10 AVAX - x3 multiplier
    }

    // ═══════════════════════════════════════════════════════════════════════
    // CONSTANTS
    // ═══════════════════════════════════════════════════════════════════════

    uint256 public constant TOURNAMENT_WIN_BASE = 100;
    uint256 public constant TOURNAMENT_TOP3_BASE = 50;
    uint256 public constant TOURNAMENT_PARTICIPATION = 10;
    uint256 public constant WIN_STREAK_BONUS = 20;

    uint256 public constant TIER_FREE_MULT = 100;   // x1.0 (100 basis points)
    uint256 public constant TIER_LOW_MULT = 150;    // x1.5
    uint256 public constant TIER_MED_MULT = 200;    // x2.0
    uint256 public constant TIER_HIGH_MULT = 300;   // x3.0

    // ═══════════════════════════════════════════════════════════════════════
    // STATE
    // ═══════════════════════════════════════════════════════════════════════

    /// @notice Player profiles by address
    mapping(address => PlayerProfile) public profiles;

    /// @notice Tournament history per player
    mapping(address => TournamentResult[]) private _tournamentHistory;

    /// @notice Achievement history per player
    mapping(address => AchievementUnlock[]) private _achievementHistory;

    /// @notice Quick lookup for achievement ownership
    mapping(address => mapping(uint256 => bool)) public hasAchievement;

    /// @notice Per-game score breakdown
    mapping(address => mapping(address => uint256)) public gameScores;

    /// @notice Reference to AchievementRegistry
    IAchievementRegistry public achievementRegistry;

    /// @notice Reference to RewardDistributor
    IRewardDistributor public rewardDistributor;

    /// @notice Total unique passports created
    uint256 public totalPassports;

    // ═══════════════════════════════════════════════════════════════════════
    // EVENTS
    // ═══════════════════════════════════════════════════════════════════════

    event PassportCreated(address indexed player, uint256 timestamp);
    event ScoreUpdated(address indexed player, uint256 newCompositeScore, uint256 pointsAdded);
    event TournamentResultRecorded(
        address indexed player,
        address indexed tournament,
        uint8 placement,
        uint256 prizeMoney,
        uint256 pointsEarned
    );
    event AchievementAttested(
        address indexed player,
        uint256 indexed achievementId,
        address indexed gameContract,
        uint256 pointsEarned
    );

    // ═══════════════════════════════════════════════════════════════════════
    // CONSTRUCTOR
    // ═══════════════════════════════════════════════════════════════════════

    /**
     * @notice Initializes the PlayerPassport contract
     * @param _achievementRegistry Address of the AchievementRegistry contract
     * @param admin Address to receive admin role
     */
    constructor(address _achievementRegistry, address admin) {
        require(_achievementRegistry != address(0), "Registry cannot be zero");
        require(admin != address(0), "Admin cannot be zero");

        achievementRegistry = IAchievementRegistry(_achievementRegistry);
        _grantRole(DEFAULT_ADMIN_ROLE, admin);
    }

    // ═══════════════════════════════════════════════════════════════════════
    // INTERNAL FUNCTIONS
    // ═══════════════════════════════════════════════════════════════════════

    /**
     * @notice Creates a passport for a player if they don't have one
     * @param player Address of the player
     */
    function _ensurePassport(address player) internal {
        if (!profiles[player].exists) {
            profiles[player].exists = true;
            totalPassports++;
            emit PassportCreated(player, block.timestamp);
        }
    }

    /**
     * @notice Determines the entry fee tier based on amount
     * @param entryFee Entry fee in wei
     * @return tier The entry fee tier
     */
    function _getEntryFeeTier(uint256 entryFee) internal pure returns (EntryFeeTier) {
        if (entryFee == 0) return EntryFeeTier.Free;
        if (entryFee <= 1 ether) return EntryFeeTier.Low;
        if (entryFee <= 10 ether) return EntryFeeTier.Medium;
        return EntryFeeTier.High;
    }

    /**
     * @notice Gets the multiplier for a tier in basis points
     * @param tier The entry fee tier
     * @return multiplier The multiplier in basis points
     */
    function _getTierMultiplier(EntryFeeTier tier) internal pure returns (uint256) {
        if (tier == EntryFeeTier.Free) return TIER_FREE_MULT;
        if (tier == EntryFeeTier.Low) return TIER_LOW_MULT;
        if (tier == EntryFeeTier.Medium) return TIER_MED_MULT;
        return TIER_HIGH_MULT;
    }

    // ═══════════════════════════════════════════════════════════════════════
    // TOURNAMENT REPORTING
    // ═══════════════════════════════════════════════════════════════════════

    /**
     * @notice Reports a tournament result for a player
     * @dev Only callable by addresses with REPORTER_ROLE (tournaments)
     * @param player Player address
     * @param placement Tournament placement (1 = win, 2-3 = podium, 4+ = participation)
     * @param prizeMoney Prize money won in wei
     * @param entryFee Tournament entry fee in wei
     * @param gameContract Address of the game contract
     */
    function reportTournamentResult(
        address player,
        uint8 placement,
        uint256 prizeMoney,
        uint256 entryFee,
        address gameContract
    ) external onlyRole(REPORTER_ROLE) nonReentrant {
        require(player != address(0), "Player cannot be zero");

        _ensurePassport(player);

        PlayerProfile storage profile = profiles[player];
        EntryFeeTier tier = _getEntryFeeTier(entryFee);
        uint256 multiplier = _getTierMultiplier(tier);

        // Calculate points based on placement
        uint256 pointsEarned;
        if (placement == 1) {
            pointsEarned = (TOURNAMENT_WIN_BASE * multiplier) / 100;
            profile.totalWins++;
            profile.totalTopThree++;

            // Update win streak
            profile.currentWinStreak++;
            if (profile.currentWinStreak > profile.longestWinStreak) {
                profile.longestWinStreak = profile.currentWinStreak;
            }

            // Add streak bonus for 4+ consecutive wins
            if (profile.currentWinStreak > 3) {
                pointsEarned += WIN_STREAK_BONUS;
            }
        } else if (placement == 2 || placement == 3) {
            pointsEarned = (TOURNAMENT_TOP3_BASE * multiplier) / 100;
            profile.totalTopThree++;
            profile.currentWinStreak = 0;
        } else {
            pointsEarned = TOURNAMENT_PARTICIPATION;
            profile.currentWinStreak = 0;
        }

        // Update profile
        profile.compositeScore += pointsEarned;
        profile.totalTournaments++;
        profile.totalPrizeMoney += prizeMoney;

        // Update per-game score
        gameScores[player][gameContract] += pointsEarned;

        // Store tournament result
        _tournamentHistory[player].push(TournamentResult({
            tournamentContract: msg.sender,
            placement: placement,
            prizeMoney: prizeMoney,
            pointsEarned: pointsEarned,
            timestamp: block.timestamp
        }));

        emit ScoreUpdated(player, profile.compositeScore, pointsEarned);
        emit TournamentResultRecorded(player, msg.sender, placement, prizeMoney, pointsEarned);

        // Distribute P1 rewards
        if (address(rewardDistributor) != address(0)) {
            rewardDistributor.distributeTournamentReward(
                player,
                placement,
                entryFee,
                profile.currentWinStreak
            );

            // Check for milestone rewards
            rewardDistributor.checkAndDistributeMilestone(player, profile.compositeScore);
        }
    }

    // ═══════════════════════════════════════════════════════════════════════
    // ACHIEVEMENT ATTESTATION
    // ═══════════════════════════════════════════════════════════════════════

    /**
     * @notice Attests that a player has unlocked an achievement
     * @dev Only callable by approved game contracts (GAME_ROLE)
     * @param player Player address
     * @param achievementId Achievement ID from AchievementRegistry
     */
    function attestAchievement(
        address player,
        uint256 achievementId
    ) external onlyRole(GAME_ROLE) nonReentrant {
        require(player != address(0), "Player cannot be zero");
        require(!hasAchievement[player][achievementId], "Achievement already unlocked");

        // Get achievement data
        IAchievementRegistry.Achievement memory achievement = achievementRegistry.getAchievement(achievementId);
        require(achievement.active, "Achievement not active");
        require(achievement.gameContract == msg.sender, "Not achievement owner");

        _ensurePassport(player);

        // Record achievement
        hasAchievement[player][achievementId] = true;
        _achievementHistory[player].push(AchievementUnlock({
            achievementId: achievementId,
            gameContract: msg.sender,
            timestamp: block.timestamp
        }));

        // Update scores
        PlayerProfile storage profile = profiles[player];
        profile.compositeScore += achievement.pointValue;
        gameScores[player][msg.sender] += achievement.pointValue;

        // Increment unlock count in registry
        achievementRegistry.incrementUnlockCount(achievementId);

        emit ScoreUpdated(player, profile.compositeScore, achievement.pointValue);
        emit AchievementAttested(player, achievementId, msg.sender, achievement.pointValue);

        // Distribute P1 reward
        if (address(rewardDistributor) != address(0)) {
            rewardDistributor.distributeAchievementReward(player, achievement.p1Reward);

            // Update P1 earned in profile
            profile.p1Earned += achievement.p1Reward;

            // Check for milestone rewards
            rewardDistributor.checkAndDistributeMilestone(player, profile.compositeScore);
        }
    }

    // ═══════════════════════════════════════════════════════════════════════
    // READ FUNCTIONS
    // ═══════════════════════════════════════════════════════════════════════

    /**
     * @notice Gets a player's full profile
     * @param player Player address
     * @return PlayerProfile struct
     */
    function getProfile(address player) external view returns (PlayerProfile memory) {
        return profiles[player];
    }

    /**
     * @notice Gets a player's composite score
     * @dev Gas-optimized single value read for frequent calls
     * @param player Player address
     * @return Composite score
     */
    function getCompositeScore(address player) external view returns (uint256) {
        return profiles[player].compositeScore;
    }

    /**
     * @notice Gets a player's score for a specific game
     * @param player Player address
     * @param gameContract Game contract address
     * @return Per-game score
     */
    function getGameScore(address player, address gameContract) external view returns (uint256) {
        return gameScores[player][gameContract];
    }

    /**
     * @notice Gets a player's full tournament history
     * @param player Player address
     * @return Array of TournamentResult
     */
    function getTournamentHistory(address player) external view returns (TournamentResult[] memory) {
        return _tournamentHistory[player];
    }

    /**
     * @notice Gets paginated tournament history
     * @param player Player address
     * @param offset Starting index
     * @param limit Maximum results to return
     * @return Array of TournamentResult
     */
    function getTournamentHistoryPaginated(
        address player,
        uint256 offset,
        uint256 limit
    ) external view returns (TournamentResult[] memory) {
        TournamentResult[] storage history = _tournamentHistory[player];

        if (offset >= history.length) {
            return new TournamentResult[](0);
        }

        uint256 end = offset + limit;
        if (end > history.length) {
            end = history.length;
        }

        TournamentResult[] memory results = new TournamentResult[](end - offset);
        for (uint256 i = offset; i < end; i++) {
            results[i - offset] = history[i];
        }

        return results;
    }

    /**
     * @notice Gets a player's achievement history
     * @param player Player address
     * @return Array of AchievementUnlock
     */
    function getAchievementHistory(address player) external view returns (AchievementUnlock[] memory) {
        return _achievementHistory[player];
    }

    /**
     * @notice Checks if a player has unlocked a specific achievement
     * @param player Player address
     * @param achievementId Achievement ID
     * @return True if unlocked
     */
    function hasPlayerAchievement(address player, uint256 achievementId) external view returns (bool) {
        return hasAchievement[player][achievementId];
    }

    /**
     * @notice Gets aggregated player stats
     * @param player Player address
     * @return compositeScore Total score
     * @return totalTournaments Tournaments entered
     * @return totalWins Tournament wins
     * @return winRate Win rate in basis points (0-10000)
     * @return totalPrizeMoney Total AVAX won
     * @return longestWinStreak All-time longest streak
     * @return p1Earned Total P1 earned
     */
    function getPlayerStats(address player) external view returns (
        uint256 compositeScore,
        uint256 totalTournaments,
        uint256 totalWins,
        uint256 winRate,
        uint256 totalPrizeMoney,
        uint256 longestWinStreak,
        uint256 p1Earned
    ) {
        PlayerProfile storage profile = profiles[player];
        compositeScore = profile.compositeScore;
        totalTournaments = profile.totalTournaments;
        totalWins = profile.totalWins;
        winRate = profile.totalTournaments > 0
            ? (profile.totalWins * 10000) / profile.totalTournaments
            : 0;
        totalPrizeMoney = profile.totalPrizeMoney;
        longestWinStreak = profile.longestWinStreak;
        p1Earned = profile.p1Earned;
    }

    /**
     * @notice Gets the number of tournaments a player has entered
     * @param player Player address
     * @return Number of tournaments
     */
    function getTournamentCount(address player) external view returns (uint256) {
        return _tournamentHistory[player].length;
    }

    /**
     * @notice Gets the number of achievements a player has unlocked
     * @param player Player address
     * @return Number of achievements
     */
    function getAchievementCount(address player) external view returns (uint256) {
        return _achievementHistory[player].length;
    }

    // ═══════════════════════════════════════════════════════════════════════
    // ADMIN FUNCTIONS
    // ═══════════════════════════════════════════════════════════════════════

    /**
     * @notice Sets the RewardDistributor address
     * @dev Only callable by admin, should be called once after deployment
     * @param _rewardDistributor Address of the RewardDistributor contract
     */
    function setRewardDistributor(address _rewardDistributor) external onlyRole(DEFAULT_ADMIN_ROLE) {
        require(_rewardDistributor != address(0), "Distributor cannot be zero");
        rewardDistributor = IRewardDistributor(_rewardDistributor);
    }

    /**
     * @notice Grants GAME_ROLE to a game contract
     * @dev Only callable by admin
     * @param gameContract Address of the game contract
     */
    function grantGameRole(address gameContract) external onlyRole(DEFAULT_ADMIN_ROLE) {
        require(gameContract != address(0), "Game cannot be zero");
        _grantRole(GAME_ROLE, gameContract);
    }

    /**
     * @notice Revokes GAME_ROLE from a game contract
     * @dev Only callable by admin
     * @param gameContract Address of the game contract
     */
    function revokeGameRole(address gameContract) external onlyRole(DEFAULT_ADMIN_ROLE) {
        _revokeRole(GAME_ROLE, gameContract);
    }

    /**
     * @notice Grants FACTORY_ROLE to the TournamentFactory
     * @dev Only callable by admin
     * @param factory Address of the TournamentFactory contract
     */
    function grantFactoryRole(address factory) external onlyRole(DEFAULT_ADMIN_ROLE) {
        require(factory != address(0), "Factory cannot be zero");
        _grantRole(FACTORY_ROLE, factory);
    }

    /**
     * @notice Grants REPORTER_ROLE to a tournament contract
     * @dev Only callable by FACTORY_ROLE (TournamentFactory)
     * @param tournament Address of the tournament contract
     */
    function grantReporterRole(address tournament) external onlyRole(FACTORY_ROLE) {
        require(tournament != address(0), "Tournament cannot be zero");
        _grantRole(REPORTER_ROLE, tournament);
    }

    /**
     * @notice Updates P1 earned for a player
     * @dev Only callable by addresses with REPORTER_ROLE (for tracking)
     * @param player Player address
     * @param amount Amount of P1 earned
     */
    function addP1Earned(address player, uint256 amount) external onlyRole(REPORTER_ROLE) {
        profiles[player].p1Earned += amount;
    }
}
