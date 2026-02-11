// SPDX-License-Identifier: MIT
pragma solidity 0.8.24;

import "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import "@openzeppelin/contracts/access/AccessControl.sol";

/**
 * @title P1Token
 * @notice Player1 Points - ERC-20 utility token earned through competitive play
 * @dev Minting is restricted to addresses with MINTER_ROLE (RewardDistributor)
 */
contract P1Token is ERC20, AccessControl {
    /// @notice Role identifier for addresses allowed to mint tokens
    bytes32 public constant MINTER_ROLE = keccak256("MINTER_ROLE");

    /**
     * @notice Initializes the P1 token with admin roles
     * @param admin Address to receive DEFAULT_ADMIN_ROLE and initial MINTER_ROLE
     */
    constructor(address admin) ERC20("Player1 Points", "P1") {
        require(admin != address(0), "Admin cannot be zero address");
        _grantRole(DEFAULT_ADMIN_ROLE, admin);
        _grantRole(MINTER_ROLE, admin);
    }

    /**
     * @notice Mints new P1 tokens to a specified address
     * @dev Only callable by addresses with MINTER_ROLE
     * @param to Recipient address
     * @param amount Amount of tokens to mint (in wei, 18 decimals)
     */
    function mint(address to, uint256 amount) external onlyRole(MINTER_ROLE) {
        require(to != address(0), "Cannot mint to zero address");
        _mint(to, amount);
    }

    /**
     * @notice Burns tokens from the caller's balance
     * @param amount Amount of tokens to burn (in wei, 18 decimals)
     */
    function burn(uint256 amount) external {
        _burn(msg.sender, amount);
    }
}
