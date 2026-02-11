// SPDX-License-Identifier: MIT
pragma solidity 0.8.24;

import "./Club.sol";

/**
 * @title ClubFactory
 * @notice Factory for creating player clubs/guilds
 */
contract ClubFactory {
    uint256 public creationFee;
    address public treasury;

    address[] public clubs;
    mapping(address => address[]) public ownerClubs;
    mapping(string => bool) public tagTaken;

    event ClubCreated(address indexed club, address indexed owner, string name, string tag);

    constructor(address _treasury, uint256 _creationFee) {
        treasury = _treasury;
        creationFee = _creationFee;
    }

    function createClub(
        string calldata _name,
        string calldata _tag,
        string calldata _description,
        uint256 _membershipFee,
        uint256 _maxMembers,
        bool _inviteOnly
    ) external payable returns (address) {
        require(msg.value >= creationFee, "Insufficient fee");
        require(!tagTaken[_tag], "Tag already taken");
        require(bytes(_tag).length >= 2, "Tag too short");

        Club club = new Club(
            _name,
            _tag,
            _description,
            msg.sender,
            _membershipFee,
            _maxMembers,
            _inviteOnly
        );

        clubs.push(address(club));
        ownerClubs[msg.sender].push(address(club));
        tagTaken[_tag] = true;

        if (msg.value > 0) {
            (bool success, ) = treasury.call{value: msg.value}("");
            require(success, "Fee transfer failed");
        }

        emit ClubCreated(address(club), msg.sender, _name, _tag);
        return address(club);
    }

    function getClubCount() external view returns (uint256) {
        return clubs.length;
    }

    function getAllClubs() external view returns (address[] memory) {
        return clubs;
    }

    function getClubsByOwner(address owner) external view returns (address[] memory) {
        return ownerClubs[owner];
    }
}
