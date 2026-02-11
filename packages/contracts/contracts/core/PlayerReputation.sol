// SPDX-License-Identifier: MIT
pragma solidity 0.8.24;

import "@openzeppelin/contracts/access/AccessControl.sol";

/**
 * @title PlayerReputation
 * @notice Social reputation - was this player friendly or toxic?
 * @dev Can only rate players you've actually played against
 */
contract PlayerReputation is AccessControl {
    bytes32 public constant GAME_ROLE = keccak256("GAME_ROLE");

    struct ReputationData {
        uint256 positiveRatings;
        uint256 negativeRatings;
        uint256 totalRatings;
    }

    mapping(address => ReputationData) public reputation;
    mapping(address => mapping(address => bool)) public hasRated;
    mapping(address => mapping(address => bool)) public hasPlayedAgainst;

    event PlayerRated(address indexed rater, address indexed rated, bool positive);
    event MatchRecorded(address indexed player1, address indexed player2, address indexed game);

    constructor(address admin) {
        _grantRole(DEFAULT_ADMIN_ROLE, admin);
    }

    function recordMatch(address player1, address player2) external onlyRole(GAME_ROLE) {
        hasPlayedAgainst[player1][player2] = true;
        hasPlayedAgainst[player2][player1] = true;
        emit MatchRecorded(player1, player2, msg.sender);
    }

    function ratePlayer(address player, bool positive) external {
        require(player != msg.sender, "Cannot rate self");
        require(hasPlayedAgainst[msg.sender][player], "Haven't played against them");
        require(!hasRated[msg.sender][player], "Already rated");

        hasRated[msg.sender][player] = true;

        ReputationData storage rep = reputation[player];
        rep.totalRatings++;

        if (positive) {
            rep.positiveRatings++;
        } else {
            rep.negativeRatings++;
        }

        emit PlayerRated(msg.sender, player, positive);
    }

    // ── View functions ──

    function getReputation(address player) external view returns (
        uint256 positive,
        uint256 negative,
        uint256 total,
        int256 score
    ) {
        ReputationData storage rep = reputation[player];
        return (
            rep.positiveRatings,
            rep.negativeRatings,
            rep.totalRatings,
            int256(rep.positiveRatings) - int256(rep.negativeRatings)
        );
    }

    function getReputationPercent(address player) external view returns (uint256) {
        ReputationData storage rep = reputation[player];
        if (rep.totalRatings == 0) return 100;
        return (rep.positiveRatings * 100) / rep.totalRatings;
    }

    function canRate(address rater, address player) external view returns (bool) {
        return hasPlayedAgainst[rater][player] && !hasRated[rater][player] && rater != player;
    }
}
