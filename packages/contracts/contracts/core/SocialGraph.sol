// SPDX-License-Identifier: MIT
pragma solidity 0.8.24;

/**
 * @title SocialGraph
 * @notice On-chain friends/following system, portable across all games
 */
contract SocialGraph {
    mapping(address => address[]) private _following;
    mapping(address => mapping(address => bool)) private _isFollowing;
    mapping(address => mapping(address => uint256)) private _followingIndex;

    mapping(address => address[]) private _followers;
    mapping(address => mapping(address => uint256)) private _followerIndex;

    mapping(address => mapping(address => bool)) public blocked;
    mapping(address => string) public bio;

    event Followed(address indexed follower, address indexed followed);
    event Unfollowed(address indexed follower, address indexed unfollowed);
    event Blocked(address indexed blocker, address indexed blockedPlayer);
    event Unblocked(address indexed blocker, address indexed unblockedPlayer);
    event BioUpdated(address indexed player, string bio);

    function follow(address player) external {
        require(player != msg.sender, "Cannot follow self");
        require(!_isFollowing[msg.sender][player], "Already following");
        require(!blocked[player][msg.sender], "You are blocked");

        _isFollowing[msg.sender][player] = true;
        _followingIndex[msg.sender][player] = _following[msg.sender].length;
        _following[msg.sender].push(player);

        _followerIndex[player][msg.sender] = _followers[player].length;
        _followers[player].push(msg.sender);

        emit Followed(msg.sender, player);
    }

    function unfollow(address player) external {
        require(_isFollowing[msg.sender][player], "Not following");

        _isFollowing[msg.sender][player] = false;

        uint256 index = _followingIndex[msg.sender][player];
        uint256 lastIndex = _following[msg.sender].length - 1;
        if (index != lastIndex) {
            address lastPlayer = _following[msg.sender][lastIndex];
            _following[msg.sender][index] = lastPlayer;
            _followingIndex[msg.sender][lastPlayer] = index;
        }
        _following[msg.sender].pop();

        index = _followerIndex[player][msg.sender];
        lastIndex = _followers[player].length - 1;
        if (index != lastIndex) {
            address lastFollower = _followers[player][lastIndex];
            _followers[player][index] = lastFollower;
            _followerIndex[player][lastFollower] = index;
        }
        _followers[player].pop();

        emit Unfollowed(msg.sender, player);
    }

    function blockPlayer(address player) external {
        require(player != msg.sender, "Cannot block self");
        blocked[msg.sender][player] = true;

        if (_isFollowing[player][msg.sender]) {
            _removeFollower(msg.sender, player);
        }

        emit Blocked(msg.sender, player);
    }

    function unblockPlayer(address player) external {
        blocked[msg.sender][player] = false;
        emit Unblocked(msg.sender, player);
    }

    function _removeFollower(address followed, address follower) internal {
        if (!_isFollowing[follower][followed]) return;

        _isFollowing[follower][followed] = false;

        uint256 index = _followingIndex[follower][followed];
        uint256 lastIndex = _following[follower].length - 1;
        if (index != lastIndex) {
            address lastPlayer = _following[follower][lastIndex];
            _following[follower][index] = lastPlayer;
            _followingIndex[follower][lastPlayer] = index;
        }
        _following[follower].pop();

        index = _followerIndex[followed][follower];
        lastIndex = _followers[followed].length - 1;
        if (index != lastIndex) {
            address lastFollower = _followers[followed][lastIndex];
            _followers[followed][index] = lastFollower;
            _followerIndex[followed][lastFollower] = index;
        }
        _followers[followed].pop();
    }

    function setBio(string calldata newBio) external {
        require(bytes(newBio).length <= 280, "Bio too long");
        bio[msg.sender] = newBio;
        emit BioUpdated(msg.sender, newBio);
    }

    // ── View functions ──

    function isFollowing(address follower, address followed) external view returns (bool) {
        return _isFollowing[follower][followed];
    }

    function areFriends(address a, address b) external view returns (bool) {
        return _isFollowing[a][b] && _isFollowing[b][a];
    }

    function getFollowing(address player) external view returns (address[] memory) {
        return _following[player];
    }

    function getFollowers(address player) external view returns (address[] memory) {
        return _followers[player];
    }

    function getFollowingCount(address player) external view returns (uint256) {
        return _following[player].length;
    }

    function getFollowerCount(address player) external view returns (uint256) {
        return _followers[player].length;
    }

    function getFriends(address player) external view returns (address[] memory) {
        address[] memory following = _following[player];
        uint256 friendCount = 0;

        for (uint256 i = 0; i < following.length; i++) {
            if (_isFollowing[following[i]][player]) {
                friendCount++;
            }
        }

        address[] memory friends = new address[](friendCount);
        uint256 idx = 0;
        for (uint256 i = 0; i < following.length; i++) {
            if (_isFollowing[following[i]][player]) {
                friends[idx++] = following[i];
            }
        }

        return friends;
    }
}
