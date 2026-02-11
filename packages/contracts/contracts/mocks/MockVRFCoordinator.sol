// SPDX-License-Identifier: MIT
pragma solidity 0.8.24;

import "@chainlink/contracts/src/v0.8/vrf/dev/interfaces/IVRFCoordinatorV2Plus.sol";
import "@chainlink/contracts/src/v0.8/vrf/dev/libraries/VRFV2PlusClient.sol";

/**
 * @title MockVRFCoordinator
 * @notice Mock Chainlink VRF V2Plus Coordinator for testing
 * @dev Implements IVRFCoordinatorV2Plus interface for compatibility with Tournament contract
 */
contract MockVRFCoordinator is IVRFCoordinatorV2Plus {
    uint256 public requestCounter;

    mapping(uint256 => address) public requestToConsumer;

    event RandomWordsRequested(
        uint256 indexed requestId,
        address indexed consumer,
        uint256 subId
    );

    event RandomWordsFulfilled(
        uint256 indexed requestId,
        uint256[] randomWords
    );

    /**
     * @notice Mock requestRandomWords - V2Plus interface with struct parameter
     * @param req The RandomWordsRequest struct from VRFV2PlusClient
     * @return requestId The request ID
     */
    function requestRandomWords(
        VRFV2PlusClient.RandomWordsRequest calldata req
    ) external override returns (uint256 requestId) {
        requestId = ++requestCounter;
        requestToConsumer[requestId] = msg.sender;

        emit RandomWordsRequested(requestId, msg.sender, req.subId);
        return requestId;
    }

    /**
     * @notice Fulfills a VRF request with specified random words
     * @dev Call this in tests to trigger the consumer's callback
     * @param requestId The request ID to fulfill
     * @param randomWords Array of random words to provide
     */
    function fulfillRandomWordsWithOverride(
        uint256 requestId,
        uint256[] memory randomWords
    ) external {
        address consumer = requestToConsumer[requestId];
        require(consumer != address(0), "Request not found");

        // Call the consumer's rawFulfillRandomWords function
        // This is the callback that VRFConsumerBaseV2Plus exposes
        (bool success, bytes memory data) = consumer.call(
            abi.encodeWithSignature(
                "rawFulfillRandomWords(uint256,uint256[])",
                requestId,
                randomWords
            )
        );

        if (!success) {
            if (data.length > 0) {
                assembly {
                    revert(add(data, 32), mload(data))
                }
            }
            revert("VRF callback failed");
        }

        emit RandomWordsFulfilled(requestId, randomWords);
    }

    /**
     * @notice Convenience function to fulfill with deterministic randomness
     * @param requestId The request ID to fulfill
     * @param seed A seed to generate deterministic random words
     * @param numWords Number of random words to generate
     */
    function fulfillRandomWordsWithSeed(
        uint256 requestId,
        uint256 seed,
        uint32 numWords
    ) external {
        uint256[] memory randomWords = new uint256[](numWords);
        for (uint32 i = 0; i < numWords; i++) {
            randomWords[i] = uint256(keccak256(abi.encodePacked(seed, i)));
        }

        this.fulfillRandomWordsWithOverride(requestId, randomWords);
    }

    // ═══════════════════════════════════════════════════════════════════════
    // IVRFCoordinatorV2Plus interface stubs (not used in tests but required)
    // ═══════════════════════════════════════════════════════════════════════

    function getActiveSubscriptionIds(
        uint256,
        uint256
    ) external pure override returns (uint256[] memory) {
        return new uint256[](0);
    }

    function getSubscription(
        uint256
    ) external pure override returns (
        uint96 balance,
        uint96 nativeBalance,
        uint64 reqCount,
        address owner,
        address[] memory consumers
    ) {
        return (0, 0, 0, address(0), new address[](0));
    }

    function pendingRequestExists(uint256) external pure override returns (bool) {
        return false;
    }

    function createSubscription() external pure override returns (uint256) {
        return 1;
    }

    function acceptSubscriptionOwnerTransfer(uint256) external pure override {}
    function addConsumer(uint256, address) external pure override {}
    function cancelSubscription(uint256, address) external pure override {}
    function fundSubscriptionWithNative(uint256) external payable override {}
    function removeConsumer(uint256, address) external pure override {}
    function requestSubscriptionOwnerTransfer(uint256, address) external pure override {}
}
