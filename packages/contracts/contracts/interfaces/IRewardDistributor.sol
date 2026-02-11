// SPDX-License-Identifier: MIT
pragma solidity 0.8.24;

/**
 * @title IRewardDistributor
 * @notice Interface for the RewardDistributor contract
 */
interface IRewardDistributor {
    /**
     * @notice Distributes P1 tokens for tournament results
     * @param player Player address
     * @param placement Tournament placement (1 = win, 2-3 = podium, 4+ = participation)
     * @param entryFee Tournament entry fee in wei
     * @param currentStreak Player's current win streak
     */
    function distributeTournamentReward(
        address player,
        uint8 placement,
        uint256 entryFee,
        uint256 currentStreak
    ) external;

    /**
     * @notice Distributes P1 tokens for achievement unlocks
     * @param player Player address
     * @param p1Amount Amount of P1 to mint
     */
    function distributeAchievementReward(
        address player,
        uint256 p1Amount
    ) external;

    /**
     * @notice Checks and distributes milestone rewards
     * @param player Player address
     * @param compositeScore Player's current composite score
     */
    function checkAndDistributeMilestone(
        address player,
        uint256 compositeScore
    ) external;
}
