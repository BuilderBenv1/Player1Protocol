// SPDX-License-Identifier: MIT
pragma solidity 0.8.24;

/**
 * @title IPlayerPassport
 * @notice Interface for the PlayerPassport contract
 */
interface IPlayerPassport {
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

    function reportTournamentResult(
        address player,
        uint8 placement,
        uint256 prizeMoney,
        uint256 entryFee,
        address gameContract
    ) external;

    function attestAchievement(address player, uint256 achievementId) external;

    function grantReporterRole(address tournament) external;

    function getProfile(address player) external view returns (PlayerProfile memory);
    function getCompositeScore(address player) external view returns (uint256);
    function getGameScore(address player, address gameContract) external view returns (uint256);
    function getTournamentHistory(address player) external view returns (TournamentResult[] memory);
    function getAchievementHistory(address player) external view returns (AchievementUnlock[] memory);
    function hasPlayerAchievement(address player, uint256 achievementId) external view returns (bool);
}
