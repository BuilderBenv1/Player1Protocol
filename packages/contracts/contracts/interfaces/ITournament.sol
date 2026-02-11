// SPDX-License-Identifier: MIT
pragma solidity 0.8.24;

/**
 * @title ITournament
 * @notice Interface for Tournament contracts
 */
interface ITournament {
    enum TournamentStatus {
        Registration,
        Active,
        Completed,
        Cancelled,
        Finalized
    }

    enum MatchStatus {
        Pending,
        Reported,
        Confirmed,
        Disputed
    }

    struct TournamentConfig {
        address organizer;
        address gameContract;
        uint256 entryFee;
        uint256 maxPlayers;
        uint256[] prizeSplitBps;
        uint256 protocolFeeBps;
        uint256 registrationDeadline;
        uint256 disputeWindowSeconds;
        string name;
        string description;
    }

    struct Match {
        uint256 matchId;
        uint256 round;
        address player1;
        address player2;
        address winner;
        address reporter;
        uint256 reportedAt;
        MatchStatus status;
    }

    function initialize(
        TournamentConfig calldata _config,
        address _playerPassport,
        address _protocolTreasury,
        address _factory,
        uint256 _vrfSubscriptionId,
        bytes32 _vrfKeyHash,
        address _vrfCoordinator
    ) external;

    function register() external payable;
    function reportResult(uint256 matchId, address winner) external;
    function confirmResult(uint256 matchId) external;
    function claimPrize() external;

    function getPlayers() external view returns (address[] memory);
    function getConfig() external view returns (TournamentConfig memory);
    function getMatch(uint256 matchId) external view returns (Match memory);
}
