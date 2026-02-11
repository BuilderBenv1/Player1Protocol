// SPDX-License-Identifier: MIT
pragma solidity 0.8.24;

import "./PlayerPassport.sol";

/**
 * @title LFG (Looking For Group)
 * @notice Find teammates based on game, activity, and skill level
 */
contract LFG {
    PlayerPassport public playerPassport;

    struct Listing {
        uint256 id;
        address creator;
        address game;
        string activity;
        uint256 minScore;
        uint256 maxScore;
        uint256 playersNeeded;
        uint256 playersJoined;
        address[] players;
        uint256 createdAt;
        uint256 expiresAt;
        bool active;
    }

    uint256 public nextListingId = 1;
    mapping(uint256 => Listing) public listings;

    mapping(address => uint256[]) public gameListings;
    mapping(address => uint256[]) public playerListings;
    mapping(address => uint256[]) public playerJoined;
    mapping(uint256 => mapping(address => bool)) public hasJoined;

    event ListingCreated(uint256 indexed listingId, address indexed creator, address indexed game, string activity);
    event PlayerJoined(uint256 indexed listingId, address indexed player);
    event PlayerLeft(uint256 indexed listingId, address indexed player);
    event ListingFilled(uint256 indexed listingId);
    event ListingCancelled(uint256 indexed listingId);

    constructor(address _playerPassport) {
        playerPassport = PlayerPassport(_playerPassport);
    }

    function createListing(
        address game,
        string calldata activity,
        uint256 minScore,
        uint256 maxScore,
        uint256 playersNeeded,
        uint256 duration
    ) external returns (uint256 listingId) {
        require(playersNeeded >= 1, "Need at least 1 player");
        require(duration >= 300 && duration <= 86400, "Duration 5min-24hr");

        (uint256 creatorScore,,,,,,) = playerPassport.getPlayerStats(msg.sender);
        require(creatorScore >= minScore, "You don't meet min score");
        if (maxScore > 0) {
            require(creatorScore <= maxScore, "You exceed max score");
        }

        listingId = nextListingId++;

        Listing storage listing = listings[listingId];
        listing.id = listingId;
        listing.creator = msg.sender;
        listing.game = game;
        listing.activity = activity;
        listing.minScore = minScore;
        listing.maxScore = maxScore;
        listing.playersNeeded = playersNeeded;
        listing.playersJoined = 1;
        listing.players.push(msg.sender);
        listing.createdAt = block.timestamp;
        listing.expiresAt = block.timestamp + duration;
        listing.active = true;

        gameListings[game].push(listingId);
        playerListings[msg.sender].push(listingId);
        hasJoined[listingId][msg.sender] = true;

        emit ListingCreated(listingId, msg.sender, game, activity);

        if (playersNeeded == 1) {
            listing.active = false;
            emit ListingFilled(listingId);
        }
    }

    function joinListing(uint256 listingId) external {
        Listing storage listing = listings[listingId];
        require(listing.active, "Listing not active");
        require(block.timestamp < listing.expiresAt, "Listing expired");
        require(!hasJoined[listingId][msg.sender], "Already joined");
        require(listing.playersJoined < listing.playersNeeded, "Listing full");

        (uint256 playerScore,,,,,,) = playerPassport.getPlayerStats(msg.sender);
        require(playerScore >= listing.minScore, "Score too low");
        if (listing.maxScore > 0) {
            require(playerScore <= listing.maxScore, "Score too high");
        }

        hasJoined[listingId][msg.sender] = true;
        listing.players.push(msg.sender);
        listing.playersJoined++;
        playerJoined[msg.sender].push(listingId);

        emit PlayerJoined(listingId, msg.sender);

        if (listing.playersJoined >= listing.playersNeeded) {
            listing.active = false;
            emit ListingFilled(listingId);
        }
    }

    function leaveListing(uint256 listingId) external {
        Listing storage listing = listings[listingId];
        require(hasJoined[listingId][msg.sender], "Not in listing");
        require(msg.sender != listing.creator, "Creator cannot leave");
        require(listing.active, "Listing not active");

        hasJoined[listingId][msg.sender] = false;
        listing.playersJoined--;

        for (uint256 i = 0; i < listing.players.length; i++) {
            if (listing.players[i] == msg.sender) {
                listing.players[i] = listing.players[listing.players.length - 1];
                listing.players.pop();
                break;
            }
        }

        emit PlayerLeft(listingId, msg.sender);
    }

    function cancelListing(uint256 listingId) external {
        Listing storage listing = listings[listingId];
        require(msg.sender == listing.creator, "Only creator");
        require(listing.active, "Already inactive");

        listing.active = false;
        emit ListingCancelled(listingId);
    }

    // ── View functions ──

    function getListing(uint256 listingId) external view returns (
        uint256 id,
        address creator,
        address game,
        string memory activity,
        uint256 minScore,
        uint256 maxScore,
        uint256 playersNeeded,
        uint256 playersJoined,
        address[] memory players,
        uint256 createdAt,
        uint256 expiresAt,
        bool active
    ) {
        Listing storage l = listings[listingId];
        return (l.id, l.creator, l.game, l.activity, l.minScore, l.maxScore,
                l.playersNeeded, l.playersJoined, l.players, l.createdAt, l.expiresAt, l.active);
    }

    function getActiveListingsForGame(address game) external view returns (uint256[] memory) {
        uint256[] storage ids = gameListings[game];

        uint256 activeCount = 0;
        for (uint256 i = 0; i < ids.length; i++) {
            if (listings[ids[i]].active && block.timestamp < listings[ids[i]].expiresAt) {
                activeCount++;
            }
        }

        uint256[] memory result = new uint256[](activeCount);
        uint256 idx = 0;
        for (uint256 i = 0; i < ids.length; i++) {
            if (listings[ids[i]].active && block.timestamp < listings[ids[i]].expiresAt) {
                result[idx++] = ids[i];
            }
        }

        return result;
    }

    function getPlayerActiveListings(address player) external view returns (uint256[] memory) {
        uint256[] storage ids = playerListings[player];

        uint256 activeCount = 0;
        for (uint256 i = 0; i < ids.length; i++) {
            if (listings[ids[i]].active && listings[ids[i]].creator == player) {
                activeCount++;
            }
        }

        uint256[] memory result = new uint256[](activeCount);
        uint256 idx = 0;
        for (uint256 i = 0; i < ids.length; i++) {
            if (listings[ids[i]].active && listings[ids[i]].creator == player) {
                result[idx++] = ids[i];
            }
        }

        return result;
    }
}
