// SPDX-License-Identifier: MIT
pragma solidity 0.8.24;

interface ILFG {
    function createListing(address game, string calldata activity, uint256 minScore, uint256 maxScore, uint256 playersNeeded, uint256 duration) external returns (uint256);
    function joinListing(uint256 listingId) external;
    function leaveListing(uint256 listingId) external;
    function cancelListing(uint256 listingId) external;

    function getListing(uint256 listingId) external view returns (
        uint256 id, address creator, address game, string memory activity,
        uint256 minScore, uint256 maxScore, uint256 playersNeeded, uint256 playersJoined,
        address[] memory players, uint256 createdAt, uint256 expiresAt, bool active
    );
    function getActiveListingsForGame(address game) external view returns (uint256[] memory);
    function getPlayerActiveListings(address player) external view returns (uint256[] memory);
}
