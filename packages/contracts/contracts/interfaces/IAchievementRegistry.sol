// SPDX-License-Identifier: MIT
pragma solidity 0.8.24;

/**
 * @title IAchievementRegistry
 * @notice Interface for the AchievementRegistry contract
 */
interface IAchievementRegistry {
    enum Rarity {
        Common,
        Rare,
        Legendary
    }

    struct Achievement {
        uint256 id;
        address gameContract;
        string name;
        string description;
        Rarity rarity;
        uint256 pointValue;
        uint256 p1Reward;
        uint256 totalUnlocks;
        bool active;
    }

    function registerAchievement(
        string calldata name,
        string calldata description,
        Rarity rarity
    ) external returns (uint256);

    function getAchievement(uint256 id) external view returns (Achievement memory);
    function incrementUnlockCount(uint256 achievementId) external;
    function approvedGames(address gameContract) external view returns (bool);
}
