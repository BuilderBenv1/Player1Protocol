// SPDX-License-Identifier: MIT
pragma solidity 0.8.24;

interface ISocialGraph {
    function follow(address player) external;
    function unfollow(address player) external;
    function blockPlayer(address player) external;
    function unblockPlayer(address player) external;
    function setBio(string calldata newBio) external;

    function isFollowing(address follower, address followed) external view returns (bool);
    function areFriends(address a, address b) external view returns (bool);
    function getFollowing(address player) external view returns (address[] memory);
    function getFollowers(address player) external view returns (address[] memory);
    function getFollowingCount(address player) external view returns (uint256);
    function getFollowerCount(address player) external view returns (uint256);
    function getFriends(address player) external view returns (address[] memory);
    function bio(address player) external view returns (string memory);
}
