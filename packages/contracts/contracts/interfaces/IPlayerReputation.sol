// SPDX-License-Identifier: MIT
pragma solidity 0.8.24;

interface IPlayerReputation {
    function recordMatch(address player1, address player2) external;
    function ratePlayer(address player, bool positive) external;

    function getReputation(address player) external view returns (uint256 positive, uint256 negative, uint256 total, int256 score);
    function getReputationPercent(address player) external view returns (uint256);
    function canRate(address rater, address player) external view returns (bool);
    function hasPlayedAgainst(address a, address b) external view returns (bool);
}
