// SPDX-License-Identifier: MIT
pragma solidity 0.8.24;

import "@openzeppelin/contracts/access/AccessControl.sol";

/**
 * @title AchievementRegistry
 * @notice Stores achievement definitions that games register
 * @dev Acts as the canonical list of all achievements across all integrated games
 */
contract AchievementRegistry is AccessControl {
    /// @notice Role for approved game contracts that can register achievements
    bytes32 public constant GAME_ADMIN_ROLE = keccak256("GAME_ADMIN_ROLE");

    /// @notice Role for PlayerPassport to increment unlock counts
    bytes32 public constant PASSPORT_ROLE = keccak256("PASSPORT_ROLE");

    /// @notice Achievement rarity levels
    enum Rarity {
        Common,    // 5 points, 5 P1
        Rare,      // 25 points, 25 P1
        Legendary  // 100 points, 100 P1
    }

    /// @notice Achievement data structure
    struct Achievement {
        uint256 id;              // Unique global ID (auto-incremented)
        address gameContract;    // The game that registered this achievement
        string name;             // e.g. "First Blood", "Speed Demon"
        string description;      // e.g. "Win your first tournament match"
        Rarity rarity;           // Common, Rare, Legendary
        uint256 pointValue;      // Points awarded to PlayerPassport
        uint256 p1Reward;        // P1 tokens awarded (in wei)
        uint256 totalUnlocks;    // Counter of how many players have unlocked this
        bool active;             // Can be deactivated by game admin
    }

    /// @notice Auto-incrementing achievement ID counter, starts at 1
    uint256 public nextAchievementId = 1;

    /// @notice All achievements by ID
    mapping(uint256 => Achievement) public achievements;

    /// @notice Achievement IDs per game contract
    mapping(address => uint256[]) public gameAchievements;

    /// @notice Whether a game contract is approved
    mapping(address => bool) public approvedGames;

    /// @notice Emitted when a game is approved
    event GameApproved(address indexed gameContract);

    /// @notice Emitted when a game is revoked
    event GameRevoked(address indexed gameContract);

    /// @notice Emitted when a new achievement is registered
    event AchievementRegistered(
        uint256 indexed id,
        address indexed gameContract,
        string name,
        Rarity rarity
    );

    /// @notice Emitted when an achievement is deactivated
    event AchievementDeactivated(uint256 indexed id);

    /**
     * @notice Initializes the registry with admin role
     * @param admin Address to receive DEFAULT_ADMIN_ROLE
     */
    constructor(address admin) {
        require(admin != address(0), "Admin cannot be zero address");
        _grantRole(DEFAULT_ADMIN_ROLE, admin);
    }

    /**
     * @notice Approves a game contract to register achievements
     * @dev Only callable by DEFAULT_ADMIN_ROLE
     * @param gameContract Address of the game contract to approve
     */
    function approveGame(address gameContract) external onlyRole(DEFAULT_ADMIN_ROLE) {
        require(gameContract != address(0), "Game cannot be zero address");
        require(!approvedGames[gameContract], "Game already approved");

        approvedGames[gameContract] = true;
        _grantRole(GAME_ADMIN_ROLE, gameContract);

        emit GameApproved(gameContract);
    }

    /**
     * @notice Revokes a game contract's ability to register achievements
     * @dev Only callable by DEFAULT_ADMIN_ROLE
     * @param gameContract Address of the game contract to revoke
     */
    function revokeGame(address gameContract) external onlyRole(DEFAULT_ADMIN_ROLE) {
        require(approvedGames[gameContract], "Game not approved");

        approvedGames[gameContract] = false;
        _revokeRole(GAME_ADMIN_ROLE, gameContract);

        emit GameRevoked(gameContract);
    }

    /**
     * @notice Registers a new achievement for the calling game
     * @dev Only callable by approved game contracts (GAME_ADMIN_ROLE)
     * @param name Achievement name
     * @param description Achievement description
     * @param rarity Achievement rarity level
     * @return id The newly created achievement ID
     */
    function registerAchievement(
        string calldata name,
        string calldata description,
        Rarity rarity
    ) external onlyRole(GAME_ADMIN_ROLE) returns (uint256) {
        require(bytes(name).length > 0, "Name cannot be empty");
        require(bytes(description).length > 0, "Description cannot be empty");

        uint256 pointValue;
        uint256 p1Reward;

        if (rarity == Rarity.Common) {
            pointValue = 5;
            p1Reward = 5 ether; // 5 P1 (18 decimals)
        } else if (rarity == Rarity.Rare) {
            pointValue = 25;
            p1Reward = 25 ether; // 25 P1
        } else {
            pointValue = 100;
            p1Reward = 100 ether; // 100 P1
        }

        uint256 id = nextAchievementId++;

        achievements[id] = Achievement({
            id: id,
            gameContract: msg.sender,
            name: name,
            description: description,
            rarity: rarity,
            pointValue: pointValue,
            p1Reward: p1Reward,
            totalUnlocks: 0,
            active: true
        });

        gameAchievements[msg.sender].push(id);

        emit AchievementRegistered(id, msg.sender, name, rarity);

        return id;
    }

    /**
     * @notice Deactivates an achievement
     * @dev Only the game that registered the achievement can deactivate it
     * @param achievementId ID of the achievement to deactivate
     */
    function deactivateAchievement(uint256 achievementId) external {
        Achievement storage achievement = achievements[achievementId];
        require(achievement.id != 0, "Achievement does not exist");
        require(achievement.gameContract == msg.sender, "Not achievement owner");
        require(achievement.active, "Achievement already inactive");

        achievement.active = false;

        emit AchievementDeactivated(achievementId);
    }

    /**
     * @notice Increments the unlock count for an achievement
     * @dev Only callable by PlayerPassport (PASSPORT_ROLE)
     * @param achievementId ID of the achievement
     */
    function incrementUnlockCount(uint256 achievementId) external onlyRole(PASSPORT_ROLE) {
        require(achievements[achievementId].id != 0, "Achievement does not exist");
        achievements[achievementId].totalUnlocks++;
    }

    /**
     * @notice Grants PASSPORT_ROLE to the PlayerPassport contract
     * @dev Only callable by DEFAULT_ADMIN_ROLE
     * @param passport Address of the PlayerPassport contract
     */
    function setPassportRole(address passport) external onlyRole(DEFAULT_ADMIN_ROLE) {
        require(passport != address(0), "Passport cannot be zero address");
        _grantRole(PASSPORT_ROLE, passport);
    }

    /**
     * @notice Gets an achievement by ID
     * @param id Achievement ID
     * @return Achievement struct
     */
    function getAchievement(uint256 id) external view returns (Achievement memory) {
        require(achievements[id].id != 0, "Achievement does not exist");
        return achievements[id];
    }

    /**
     * @notice Gets all achievement IDs for a game
     * @param gameContract Address of the game contract
     * @return Array of achievement IDs
     */
    function getGameAchievements(address gameContract) external view returns (uint256[] memory) {
        return gameAchievements[gameContract];
    }

    /**
     * @notice Gets the total number of registered achievements
     * @return Count of achievements
     */
    function getAchievementCount() external view returns (uint256) {
        return nextAchievementId - 1;
    }

    /**
     * @notice Checks if a game is approved
     * @param gameContract Address to check
     * @return True if approved
     */
    function isGameApproved(address gameContract) external view returns (bool) {
        return approvedGames[gameContract];
    }
}
