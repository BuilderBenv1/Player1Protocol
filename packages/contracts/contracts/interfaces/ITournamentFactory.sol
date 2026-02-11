// SPDX-License-Identifier: MIT
pragma solidity 0.8.24;

/**
 * @title ITournamentFactory
 * @notice Interface for the TournamentFactory contract
 */
interface ITournamentFactory {
    function createTournament(
        string calldata name,
        string calldata description,
        address gameContract,
        uint256 entryFee,
        uint256 maxPlayers,
        uint256[] calldata prizeSplitBps,
        uint256 registrationDeadline,
        uint256 disputeWindowSeconds
    ) external returns (address);

    function getTournaments() external view returns (address[] memory);
    function getTournamentCount() external view returns (uint256);
    function isTournament(address tournament) external view returns (bool);
}
