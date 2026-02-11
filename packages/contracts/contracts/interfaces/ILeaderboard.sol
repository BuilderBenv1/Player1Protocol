// SPDX-License-Identifier: MIT
pragma solidity 0.8.24;

interface ILeaderboard {
    enum Period { AllTime, Monthly, Weekly, Daily }

    struct Score {
        address player;
        uint256 value;
        uint256 timestamp;
    }

    function createLeaderboard(address game, string calldata metricName, bool higherIsBetter, uint256 maxEntries) external returns (bytes32);
    function submitScore(bytes32 leaderboardId, address player, uint256 value) external;
    function getTopScores(bytes32 leaderboardId, Period period, uint256 limit) external view returns (Score[] memory);
    function getPlayerRank(bytes32 leaderboardId, Period period, address player) external view returns (uint256 rank, uint256 score);
    function getGameLeaderboards(address game) external view returns (bytes32[] memory);
}
