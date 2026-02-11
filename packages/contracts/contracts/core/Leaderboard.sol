// SPDX-License-Identifier: MIT
pragma solidity 0.8.24;

import "@openzeppelin/contracts/access/AccessControl.sol";

/**
 * @title Leaderboard
 * @notice Per-game, per-metric leaderboards with time-based periods
 */
contract Leaderboard is AccessControl {
    bytes32 public constant GAME_ROLE = keccak256("GAME_ROLE");

    enum Period { AllTime, Monthly, Weekly, Daily }

    struct Score {
        address player;
        uint256 value;
        uint256 timestamp;
    }

    struct LeaderboardConfig {
        address game;
        string metricName;      // "kills", "wins", "points", etc.
        bool higherIsBetter;    // true = highest wins, false = lowest wins (speedruns)
        uint256 maxEntries;     // Max entries to store (e.g., top 100)
    }

    // leaderboardId => config
    mapping(bytes32 => LeaderboardConfig) public leaderboards;

    // leaderboardId => period => scores (sorted)
    mapping(bytes32 => mapping(Period => Score[])) public scores;

    // leaderboardId => period => player => their best score
    mapping(bytes32 => mapping(Period => mapping(address => uint256))) public playerBestScore;

    // Track all leaderboard IDs for a game
    mapping(address => bytes32[]) public gameLeaderboards;

    event LeaderboardCreated(bytes32 indexed leaderboardId, address indexed game, string metricName);
    event ScoreSubmitted(bytes32 indexed leaderboardId, address indexed player, uint256 value, uint256 rank);

    constructor(address admin) {
        _grantRole(DEFAULT_ADMIN_ROLE, admin);
    }

    function createLeaderboard(
        address game,
        string calldata metricName,
        bool higherIsBetter,
        uint256 maxEntries
    ) external onlyRole(GAME_ROLE) returns (bytes32 leaderboardId) {
        leaderboardId = keccak256(abi.encodePacked(game, metricName));
        require(leaderboards[leaderboardId].game == address(0), "Leaderboard exists");

        leaderboards[leaderboardId] = LeaderboardConfig({
            game: game,
            metricName: metricName,
            higherIsBetter: higherIsBetter,
            maxEntries: maxEntries > 0 ? maxEntries : 100
        });

        gameLeaderboards[game].push(leaderboardId);
        emit LeaderboardCreated(leaderboardId, game, metricName);
    }

    function submitScore(
        bytes32 leaderboardId,
        address player,
        uint256 value
    ) external onlyRole(GAME_ROLE) {
        LeaderboardConfig storage config = leaderboards[leaderboardId];
        require(config.game != address(0), "Leaderboard not found");

        _updatePeriod(leaderboardId, Period.AllTime, player, value, config);
        _updatePeriod(leaderboardId, Period.Monthly, player, value, config);
        _updatePeriod(leaderboardId, Period.Weekly, player, value, config);
        _updatePeriod(leaderboardId, Period.Daily, player, value, config);
    }

    function _updatePeriod(
        bytes32 leaderboardId,
        Period period,
        address player,
        uint256 value,
        LeaderboardConfig storage config
    ) internal {
        uint256 currentBest = playerBestScore[leaderboardId][period][player];
        bool isBetter = config.higherIsBetter ? value > currentBest : value < currentBest;

        if (currentBest == 0 || isBetter) {
            playerBestScore[leaderboardId][period][player] = value;
            _insertSorted(leaderboardId, period, player, value, config);
        }
    }

    function _insertSorted(
        bytes32 leaderboardId,
        Period period,
        address player,
        uint256 value,
        LeaderboardConfig storage config
    ) internal {
        Score[] storage board = scores[leaderboardId][period];

        // Remove existing entry for this player if present
        for (uint256 i = 0; i < board.length; i++) {
            if (board[i].player == player) {
                for (uint256 j = i; j < board.length - 1; j++) {
                    board[j] = board[j + 1];
                }
                board.pop();
                break;
            }
        }

        // Find insert position
        uint256 insertAt = board.length;
        for (uint256 i = 0; i < board.length; i++) {
            bool shouldInsert = config.higherIsBetter
                ? value > board[i].value
                : value < board[i].value;
            if (shouldInsert) {
                insertAt = i;
                break;
            }
        }

        // Insert if within max entries
        if (insertAt < config.maxEntries) {
            board.push(Score(address(0), 0, 0));

            for (uint256 i = board.length - 1; i > insertAt; i--) {
                board[i] = board[i - 1];
            }

            board[insertAt] = Score({
                player: player,
                value: value,
                timestamp: block.timestamp
            });

            if (board.length > config.maxEntries) {
                board.pop();
            }

            emit ScoreSubmitted(leaderboardId, player, value, insertAt + 1);
        }
    }

    // ── View functions ──

    function getTopScores(bytes32 leaderboardId, Period period, uint256 limit)
        external view returns (Score[] memory)
    {
        Score[] storage board = scores[leaderboardId][period];
        uint256 count = limit < board.length ? limit : board.length;
        Score[] memory result = new Score[](count);
        for (uint256 i = 0; i < count; i++) {
            result[i] = board[i];
        }
        return result;
    }

    function getPlayerRank(bytes32 leaderboardId, Period period, address player)
        external view returns (uint256 rank, uint256 score)
    {
        Score[] storage board = scores[leaderboardId][period];
        for (uint256 i = 0; i < board.length; i++) {
            if (board[i].player == player) {
                return (i + 1, board[i].value);
            }
        }
        return (0, 0);
    }

    function getGameLeaderboards(address game) external view returns (bytes32[] memory) {
        return gameLeaderboards[game];
    }
}
