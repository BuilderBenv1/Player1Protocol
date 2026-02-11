// SPDX-License-Identifier: MIT
pragma solidity 0.8.24;

interface IClub {
    function join() external payable;
    function leave() external;
    function invite(address player) external;
    function kick(address member) external;
    function promote(address member) external;
    function demote(address admin) external;
    function transferOwnership(address newOwner) external;
    function updateClub(string calldata name, string calldata description) external;
    function depositToTreasury() external payable;
    function withdrawFromTreasury(address to, uint256 amount) external;

    function getMemberCount() external view returns (uint256);
    function getMembers() external view returns (address[] memory);
    function getClubInfo() external view returns (
        string memory name, string memory tag, string memory description,
        address owner, uint256 memberCount, uint256 maxMembers,
        uint256 membershipFee, bool inviteOnly, uint256 treasury
    );
    function isMember(address player) external view returns (bool);
    function memberSince(address player) external view returns (uint256);
}
