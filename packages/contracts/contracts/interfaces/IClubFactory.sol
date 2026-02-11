// SPDX-License-Identifier: MIT
pragma solidity 0.8.24;

interface IClubFactory {
    function createClub(string calldata name, string calldata tag, string calldata description, uint256 membershipFee, uint256 maxMembers, bool inviteOnly) external payable returns (address);
    function getClubCount() external view returns (uint256);
    function getAllClubs() external view returns (address[] memory);
    function getClubsByOwner(address owner) external view returns (address[] memory);
    function creationFee() external view returns (uint256);
    function tagTaken(string calldata tag) external view returns (bool);
}
