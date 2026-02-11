// SPDX-License-Identifier: MIT
pragma solidity 0.8.24;

import "@openzeppelin/contracts/access/AccessControl.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";

/**
 * @title Club
 * @notice Player-created organizations/guilds with shared treasury
 */
contract Club is AccessControl, ReentrancyGuard {
    bytes32 public constant ADMIN_ROLE = keccak256("ADMIN_ROLE");
    bytes32 public constant MEMBER_ROLE = keccak256("MEMBER_ROLE");

    string public name;
    string public description;
    string public tag;
    address public owner;

    uint256 public membershipFee;
    uint256 public maxMembers;
    bool public inviteOnly;

    address[] public members;
    mapping(address => bool) public isMember;
    mapping(address => uint256) public memberIndex;
    mapping(address => uint256) public memberSince;

    mapping(address => bool) public invited;

    uint256 public treasury;

    event MemberJoined(address indexed member);
    event MemberLeft(address indexed member);
    event MemberKicked(address indexed member, address indexed kickedBy);
    event Invited(address indexed player, address indexed invitedBy);
    event TreasuryDeposit(address indexed from, uint256 amount);
    event TreasuryWithdraw(address indexed to, uint256 amount);
    event ClubUpdated(string name, string description);

    constructor(
        string memory _name,
        string memory _tag,
        string memory _description,
        address _owner,
        uint256 _membershipFee,
        uint256 _maxMembers,
        bool _inviteOnly
    ) {
        require(bytes(_name).length > 0 && bytes(_name).length <= 32, "Invalid name");
        require(bytes(_tag).length <= 8, "Tag too long");

        name = _name;
        tag = _tag;
        description = _description;
        owner = _owner;
        membershipFee = _membershipFee;
        maxMembers = _maxMembers > 0 ? _maxMembers : 100;
        inviteOnly = _inviteOnly;

        _grantRole(DEFAULT_ADMIN_ROLE, _owner);
        _grantRole(ADMIN_ROLE, _owner);
        _grantRole(MEMBER_ROLE, _owner);

        members.push(_owner);
        isMember[_owner] = true;
        memberIndex[_owner] = 0;
        memberSince[_owner] = block.timestamp;

        emit MemberJoined(_owner);
    }

    function join() external payable nonReentrant {
        require(!isMember[msg.sender], "Already member");
        require(members.length < maxMembers, "Club full");
        require(!inviteOnly || invited[msg.sender], "Invite required");
        require(msg.value >= membershipFee, "Insufficient fee");

        if (msg.value > 0) {
            treasury += msg.value;
            emit TreasuryDeposit(msg.sender, msg.value);
        }

        _addMember(msg.sender);
        invited[msg.sender] = false;
    }

    function leave() external {
        require(isMember[msg.sender], "Not a member");
        require(msg.sender != owner, "Owner cannot leave");

        _removeMember(msg.sender);
        emit MemberLeft(msg.sender);
    }

    function invite(address player) external onlyRole(ADMIN_ROLE) {
        require(!isMember[player], "Already member");
        invited[player] = true;
        emit Invited(player, msg.sender);
    }

    function kick(address member) external onlyRole(ADMIN_ROLE) {
        require(isMember[member], "Not a member");
        require(member != owner, "Cannot kick owner");
        require(!hasRole(ADMIN_ROLE, member) || msg.sender == owner, "Cannot kick admin");

        _removeMember(member);
        emit MemberKicked(member, msg.sender);
    }

    function promote(address member) external onlyRole(DEFAULT_ADMIN_ROLE) {
        require(isMember[member], "Not a member");
        _grantRole(ADMIN_ROLE, member);
    }

    function demote(address admin) external onlyRole(DEFAULT_ADMIN_ROLE) {
        require(admin != owner, "Cannot demote owner");
        _revokeRole(ADMIN_ROLE, admin);
    }

    function transferOwnership(address newOwner) external {
        require(msg.sender == owner, "Only owner");
        require(isMember[newOwner], "New owner must be member");

        _revokeRole(DEFAULT_ADMIN_ROLE, owner);
        _grantRole(DEFAULT_ADMIN_ROLE, newOwner);
        _grantRole(ADMIN_ROLE, newOwner);

        owner = newOwner;
    }

    function updateClub(string calldata _name, string calldata _description) external onlyRole(ADMIN_ROLE) {
        if (bytes(_name).length > 0) {
            require(bytes(_name).length <= 32, "Name too long");
            name = _name;
        }
        description = _description;
        emit ClubUpdated(name, description);
    }

    function setMembershipFee(uint256 fee) external onlyRole(DEFAULT_ADMIN_ROLE) {
        membershipFee = fee;
    }

    function setInviteOnly(bool _inviteOnly) external onlyRole(ADMIN_ROLE) {
        inviteOnly = _inviteOnly;
    }

    function depositToTreasury() external payable {
        require(isMember[msg.sender], "Members only");
        treasury += msg.value;
        emit TreasuryDeposit(msg.sender, msg.value);
    }

    function withdrawFromTreasury(address to, uint256 amount) external onlyRole(DEFAULT_ADMIN_ROLE) nonReentrant {
        require(amount <= treasury, "Insufficient treasury");
        treasury -= amount;
        (bool success, ) = to.call{value: amount}("");
        require(success, "Transfer failed");
        emit TreasuryWithdraw(to, amount);
    }

    function _addMember(address player) internal {
        memberIndex[player] = members.length;
        members.push(player);
        isMember[player] = true;
        memberSince[player] = block.timestamp;
        _grantRole(MEMBER_ROLE, player);
        emit MemberJoined(player);
    }

    function _removeMember(address player) internal {
        isMember[player] = false;
        _revokeRole(MEMBER_ROLE, player);
        _revokeRole(ADMIN_ROLE, player);

        uint256 index = memberIndex[player];
        uint256 lastIndex = members.length - 1;

        if (index != lastIndex) {
            address lastMember = members[lastIndex];
            members[index] = lastMember;
            memberIndex[lastMember] = index;
        }

        members.pop();
    }

    // ── View functions ──

    function getMemberCount() external view returns (uint256) {
        return members.length;
    }

    function getMembers() external view returns (address[] memory) {
        return members;
    }

    function getClubInfo() external view returns (
        string memory _name,
        string memory _tag,
        string memory _description,
        address _owner,
        uint256 _memberCount,
        uint256 _maxMembers,
        uint256 _membershipFee,
        bool _inviteOnly,
        uint256 _treasury
    ) {
        return (name, tag, description, owner, members.length, maxMembers, membershipFee, inviteOnly, treasury);
    }
}
