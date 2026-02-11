// SPDX-License-Identifier: MIT
pragma solidity 0.8.24;

import "../interfaces/ITournament.sol";
import "../interfaces/IPlayerPassport.sol";
import "../interfaces/IAchievementRegistry.sol";

/**
 * @title DemoGame
 * @notice Mock game contract for demonstrating Player1 Protocol
 * @dev Used for testing and demo scenarios
 */
contract DemoGame {
    IPlayerPassport public playerPassport;
    IAchievementRegistry public achievementRegistry;
    address public owner;

    /// @notice Achievement IDs registered by this game
    uint256[] public achievementIds;

    /// @notice Tracks match wins per player for achievement logic
    mapping(address => uint256) public matchWins;
    mapping(address => uint256) public tournamentWins;
    mapping(address => uint256) public uniqueOpponents;
    mapping(address => mapping(address => bool)) public hasPlayedAgainst;

    event MatchResultReported(address indexed tournament, uint256 matchId, address winner);
    event AchievementAwarded(address indexed player, uint256 achievementId, string name);

    modifier onlyOwner() {
        require(msg.sender == owner, "Only owner");
        _;
    }

    constructor(address _passport, address _registry) {
        playerPassport = IPlayerPassport(_passport);
        achievementRegistry = IAchievementRegistry(_registry);
        owner = msg.sender;
    }

    /**
     * @notice Registers demo achievements
     * @dev Should be called after game is approved in AchievementRegistry
     */
    function registerDemoAchievements() external onlyOwner {
        // Common achievements (5 points, 5 P1)
        achievementIds.push(
            achievementRegistry.registerAchievement(
                "First Blood",
                "Win your first tournament match",
                IAchievementRegistry.Rarity.Common
            )
        );

        achievementIds.push(
            achievementRegistry.registerAchievement(
                "Social Butterfly",
                "Compete against 10 unique opponents",
                IAchievementRegistry.Rarity.Common
            )
        );

        // Rare achievements (25 points, 25 P1)
        achievementIds.push(
            achievementRegistry.registerAchievement(
                "Undefeated",
                "Win a tournament without losing a single match",
                IAchievementRegistry.Rarity.Rare
            )
        );

        achievementIds.push(
            achievementRegistry.registerAchievement(
                "Hat Trick",
                "Win 3 tournaments",
                IAchievementRegistry.Rarity.Rare
            )
        );

        // Legendary achievement (100 points, 100 P1)
        achievementIds.push(
            achievementRegistry.registerAchievement(
                "Legendary Champion",
                "Win a tournament with 16+ players and 10+ AVAX entry fee",
                IAchievementRegistry.Rarity.Legendary
            )
        );
    }

    /**
     * @notice Reports a match result to a tournament
     * @param tournament Tournament contract address
     * @param matchId Match ID to report
     * @param winner Winner address
     */
    function reportMatchResult(
        address tournament,
        uint256 matchId,
        address winner
    ) external onlyOwner {
        ITournament(tournament).reportResult(matchId, winner);

        // Track stats for achievements
        matchWins[winner]++;

        // Get loser for unique opponent tracking
        ITournament.Match memory m = ITournament(tournament).getMatch(matchId);
        address loser = m.player1 == winner ? m.player2 : m.player1;

        // Track unique opponents
        if (!hasPlayedAgainst[winner][loser]) {
            hasPlayedAgainst[winner][loser] = true;
            uniqueOpponents[winner]++;
        }
        if (!hasPlayedAgainst[loser][winner]) {
            hasPlayedAgainst[loser][winner] = true;
            uniqueOpponents[loser]++;
        }

        emit MatchResultReported(tournament, matchId, winner);

        // Check for First Blood (first match win)
        if (matchWins[winner] == 1) {
            _tryAwardAchievement(winner, 0, "First Blood");
        }

        // Check for Social Butterfly (10 unique opponents)
        if (uniqueOpponents[winner] >= 10) {
            _tryAwardAchievement(winner, 1, "Social Butterfly");
        }
        if (uniqueOpponents[loser] >= 10) {
            _tryAwardAchievement(loser, 1, "Social Butterfly");
        }
    }

    /**
     * @notice Records a tournament win and checks for achievements
     * @param winner Tournament winner address
     * @param playerCount Number of players in tournament
     * @param entryFee Tournament entry fee in wei
     * @param lostAnyMatch Whether the winner lost any match
     */
    function recordTournamentWin(
        address winner,
        uint256 playerCount,
        uint256 entryFee,
        bool lostAnyMatch
    ) external onlyOwner {
        tournamentWins[winner]++;

        // Undefeated - won without losing
        if (!lostAnyMatch) {
            _tryAwardAchievement(winner, 2, "Undefeated");
        }

        // Hat Trick - 3 tournament wins
        if (tournamentWins[winner] >= 3) {
            _tryAwardAchievement(winner, 3, "Hat Trick");
        }

        // Legendary Champion - 16+ players, 10+ AVAX entry
        if (playerCount >= 16 && entryFee >= 10 ether) {
            _tryAwardAchievement(winner, 4, "Legendary Champion");
        }
    }

    /**
     * @notice Manually attest an achievement to a player
     * @param player Player address
     * @param achievementIndex Index in achievementIds array
     */
    function attestAchievement(
        address player,
        uint256 achievementIndex
    ) external onlyOwner {
        require(achievementIndex < achievementIds.length, "Invalid achievement index");

        uint256 achievementId = achievementIds[achievementIndex];
        playerPassport.attestAchievement(player, achievementId);
    }

    /**
     * @notice Attempts to award an achievement if not already unlocked
     */
    function _tryAwardAchievement(
        address player,
        uint256 achievementIndex,
        string memory name
    ) internal {
        if (achievementIndex >= achievementIds.length) return;

        uint256 achievementId = achievementIds[achievementIndex];

        // Check if player already has this achievement
        if (!playerPassport.hasPlayerAchievement(player, achievementId)) {
            try playerPassport.attestAchievement(player, achievementId) {
                emit AchievementAwarded(player, achievementId, name);
            } catch {
                // Achievement attestation failed, continue
            }
        }
    }

    /**
     * @notice Gets all registered achievement IDs
     * @return Array of achievement IDs
     */
    function getAchievementIds() external view returns (uint256[] memory) {
        return achievementIds;
    }

    /**
     * @notice Gets player stats
     * @param player Player address
     * @return wins Match wins
     * @return tournaments Tournament wins
     * @return opponents Unique opponents faced
     */
    function getPlayerStats(address player) external view returns (
        uint256 wins,
        uint256 tournaments,
        uint256 opponents
    ) {
        return (matchWins[player], tournamentWins[player], uniqueOpponents[player]);
    }
}
