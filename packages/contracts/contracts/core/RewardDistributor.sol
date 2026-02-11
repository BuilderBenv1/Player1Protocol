// SPDX-License-Identifier: MIT
pragma solidity 0.8.24;

import "@openzeppelin/contracts/access/AccessControl.sol";
import "./P1Token.sol";

/**
 * @title RewardDistributor
 * @notice Calculates and distributes P1 token rewards for competitive play
 * @dev Controls P1 emission for tournaments, achievements, and milestones
 */
contract RewardDistributor is AccessControl {
    /// @notice Role for PlayerPassport to trigger reward distribution
    bytes32 public constant DISTRIBUTOR_ROLE = keccak256("DISTRIBUTOR_ROLE");

    // ═══════════════════════════════════════════════════════════════════════
    // STATE
    // ═══════════════════════════════════════════════════════════════════════

    /// @notice Reference to the P1 token contract
    P1Token public p1Token;

    /// @notice Reference to the PlayerPassport contract
    address public playerPassport;

    // Emission rates (configurable)
    uint256 public tournamentWinP1 = 50 ether;           // 50 P1 for 1st place
    uint256 public tournamentTop3P1 = 25 ether;          // 25 P1 for 2nd-3rd
    uint256 public tournamentParticipationP1 = 5 ether;  // 5 P1 for participation
    uint256 public streakBonusP1 = 10 ether;             // 10 P1 per win in streak > 3

    // Tier multipliers (in basis points, 100 = x1)
    uint256 public constant TIER_FREE_MULT = 100;
    uint256 public constant TIER_LOW_MULT = 150;
    uint256 public constant TIER_MED_MULT = 200;
    uint256 public constant TIER_HIGH_MULT = 300;

    // Milestone thresholds and rewards
    uint256[] public milestoneThresholds;
    uint256[] public milestoneRewards;

    /// @notice Tracks which milestones have been claimed per player
    mapping(address => mapping(uint256 => bool)) public milestoneClaimed;

    // ═══════════════════════════════════════════════════════════════════════
    // EVENTS
    // ═══════════════════════════════════════════════════════════════════════

    event RewardDistributed(address indexed player, uint256 amount, string reason);
    event MilestoneReached(address indexed player, uint256 threshold, uint256 reward);
    event EmissionRatesUpdated(uint256 win, uint256 top3, uint256 participation);
    event MilestonesUpdated(uint256[] thresholds, uint256[] rewards);

    // ═══════════════════════════════════════════════════════════════════════
    // CONSTRUCTOR
    // ═══════════════════════════════════════════════════════════════════════

    /**
     * @notice Initializes the RewardDistributor
     * @param _p1Token Address of the P1 token contract
     * @param _playerPassport Address of the PlayerPassport contract
     * @param admin Address to receive admin role
     */
    constructor(address _p1Token, address _playerPassport, address admin) {
        require(_p1Token != address(0), "P1 token cannot be zero");
        require(_playerPassport != address(0), "Passport cannot be zero");
        require(admin != address(0), "Admin cannot be zero");

        p1Token = P1Token(_p1Token);
        playerPassport = _playerPassport;

        _grantRole(DEFAULT_ADMIN_ROLE, admin);
        _grantRole(DISTRIBUTOR_ROLE, _playerPassport);

        // Initialize default milestones
        milestoneThresholds = new uint256[](4);
        milestoneThresholds[0] = 1000;
        milestoneThresholds[1] = 5000;
        milestoneThresholds[2] = 10000;
        milestoneThresholds[3] = 50000;

        milestoneRewards = new uint256[](4);
        milestoneRewards[0] = 100 ether;   // 100 P1 at 1000 points
        milestoneRewards[1] = 500 ether;   // 500 P1 at 5000 points
        milestoneRewards[2] = 1000 ether;  // 1000 P1 at 10000 points
        milestoneRewards[3] = 5000 ether;  // 5000 P1 at 50000 points
    }

    // ═══════════════════════════════════════════════════════════════════════
    // INTERNAL FUNCTIONS
    // ═══════════════════════════════════════════════════════════════════════

    /**
     * @notice Gets the tier multiplier based on entry fee
     * @param entryFee Entry fee in wei
     * @return Multiplier in basis points
     */
    function _getTierMultiplier(uint256 entryFee) internal pure returns (uint256) {
        if (entryFee == 0) return TIER_FREE_MULT;
        if (entryFee <= 1 ether) return TIER_LOW_MULT;
        if (entryFee <= 10 ether) return TIER_MED_MULT;
        return TIER_HIGH_MULT;
    }

    // ═══════════════════════════════════════════════════════════════════════
    // DISTRIBUTION FUNCTIONS
    // ═══════════════════════════════════════════════════════════════════════

    /**
     * @notice Distributes P1 tokens for tournament results
     * @dev Only callable by PlayerPassport (DISTRIBUTOR_ROLE)
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
    ) external onlyRole(DISTRIBUTOR_ROLE) {
        require(player != address(0), "Player cannot be zero");

        uint256 multiplier = _getTierMultiplier(entryFee);
        uint256 reward;
        string memory reason;

        if (placement == 1) {
            reward = (tournamentWinP1 * multiplier) / 100;
            reason = "Tournament Win";

            // Add streak bonus for 4+ consecutive wins
            if (currentStreak > 3) {
                uint256 streakBonus = streakBonusP1 * (currentStreak - 3);
                reward += streakBonus;
            }
        } else if (placement == 2 || placement == 3) {
            reward = (tournamentTop3P1 * multiplier) / 100;
            reason = "Tournament Top 3";
        } else {
            reward = tournamentParticipationP1; // No multiplier for participation
            reason = "Tournament Participation";
        }

        if (reward > 0) {
            p1Token.mint(player, reward);
            emit RewardDistributed(player, reward, reason);
        }
    }

    /**
     * @notice Distributes P1 tokens for achievement unlocks
     * @dev Only callable by PlayerPassport (DISTRIBUTOR_ROLE)
     * @param player Player address
     * @param p1Amount Amount of P1 to mint
     */
    function distributeAchievementReward(
        address player,
        uint256 p1Amount
    ) external onlyRole(DISTRIBUTOR_ROLE) {
        require(player != address(0), "Player cannot be zero");

        if (p1Amount > 0) {
            p1Token.mint(player, p1Amount);
            emit RewardDistributed(player, p1Amount, "Achievement Unlock");
        }
    }

    /**
     * @notice Checks and distributes milestone rewards
     * @dev Only callable by PlayerPassport (DISTRIBUTOR_ROLE)
     * @param player Player address
     * @param compositeScore Player's current composite score
     */
    function checkAndDistributeMilestone(
        address player,
        uint256 compositeScore
    ) external onlyRole(DISTRIBUTOR_ROLE) {
        require(player != address(0), "Player cannot be zero");

        for (uint256 i = 0; i < milestoneThresholds.length; i++) {
            uint256 threshold = milestoneThresholds[i];

            // Check if score has crossed this threshold and not yet claimed
            if (compositeScore >= threshold && !milestoneClaimed[player][threshold]) {
                milestoneClaimed[player][threshold] = true;
                uint256 reward = milestoneRewards[i];

                p1Token.mint(player, reward);
                emit MilestoneReached(player, threshold, reward);
                emit RewardDistributed(player, reward, "Milestone Reward");
            }
        }
    }

    // ═══════════════════════════════════════════════════════════════════════
    // VIEW FUNCTIONS
    // ═══════════════════════════════════════════════════════════════════════

    /**
     * @notice Gets all milestone thresholds
     * @return Array of threshold values
     */
    function getMilestoneThresholds() external view returns (uint256[] memory) {
        return milestoneThresholds;
    }

    /**
     * @notice Gets all milestone rewards
     * @return Array of reward values
     */
    function getMilestoneRewards() external view returns (uint256[] memory) {
        return milestoneRewards;
    }

    /**
     * @notice Checks if a player has claimed a specific milestone
     * @param player Player address
     * @param threshold Milestone threshold
     * @return True if claimed
     */
    function hasMilestoneClaimed(address player, uint256 threshold) external view returns (bool) {
        return milestoneClaimed[player][threshold];
    }

    /**
     * @notice Calculates the P1 reward for a tournament result
     * @param placement Tournament placement
     * @param entryFee Tournament entry fee
     * @param currentStreak Current win streak
     * @return Calculated P1 reward
     */
    function calculateTournamentReward(
        uint8 placement,
        uint256 entryFee,
        uint256 currentStreak
    ) external view returns (uint256) {
        uint256 multiplier = _getTierMultiplier(entryFee);
        uint256 reward;

        if (placement == 1) {
            reward = (tournamentWinP1 * multiplier) / 100;
            if (currentStreak > 3) {
                reward += streakBonusP1 * (currentStreak - 3);
            }
        } else if (placement == 2 || placement == 3) {
            reward = (tournamentTop3P1 * multiplier) / 100;
        } else {
            reward = tournamentParticipationP1;
        }

        return reward;
    }

    // ═══════════════════════════════════════════════════════════════════════
    // ADMIN FUNCTIONS
    // ═══════════════════════════════════════════════════════════════════════

    /**
     * @notice Updates tournament reward rates
     * @dev Only callable by admin
     * @param win P1 for 1st place
     * @param top3 P1 for 2nd-3rd place
     * @param participation P1 for participation
     */
    function setTournamentRewards(
        uint256 win,
        uint256 top3,
        uint256 participation
    ) external onlyRole(DEFAULT_ADMIN_ROLE) {
        tournamentWinP1 = win;
        tournamentTop3P1 = top3;
        tournamentParticipationP1 = participation;
        emit EmissionRatesUpdated(win, top3, participation);
    }

    /**
     * @notice Updates streak bonus
     * @dev Only callable by admin
     * @param bonus P1 per win in streak after 3
     */
    function setStreakBonus(uint256 bonus) external onlyRole(DEFAULT_ADMIN_ROLE) {
        streakBonusP1 = bonus;
    }

    /**
     * @notice Updates milestone thresholds and rewards
     * @dev Only callable by admin
     * @param thresholds Array of score thresholds
     * @param rewards Array of P1 rewards
     */
    function setMilestones(
        uint256[] calldata thresholds,
        uint256[] calldata rewards
    ) external onlyRole(DEFAULT_ADMIN_ROLE) {
        require(thresholds.length == rewards.length, "Arrays must match");
        require(thresholds.length > 0, "Cannot be empty");

        // Verify thresholds are in ascending order
        for (uint256 i = 1; i < thresholds.length; i++) {
            require(thresholds[i] > thresholds[i - 1], "Thresholds must be ascending");
        }

        milestoneThresholds = thresholds;
        milestoneRewards = rewards;
        emit MilestonesUpdated(thresholds, rewards);
    }

    /**
     * @notice Grants DISTRIBUTOR_ROLE to an address
     * @dev Only callable by admin
     * @param distributor Address to grant role
     */
    function grantDistributorRole(address distributor) external onlyRole(DEFAULT_ADMIN_ROLE) {
        require(distributor != address(0), "Cannot be zero address");
        _grantRole(DISTRIBUTOR_ROLE, distributor);
    }
}
