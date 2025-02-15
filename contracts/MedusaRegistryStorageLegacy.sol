// SPDX-License-Identifier: MIT
/*
 * Copyright (C) 2025 Medusa Registry
 */
pragma solidity ^0.8.20;

import "./interfaces/IMedusaRegistryStorage.sol";
import "./utils/Constants.sol";

abstract contract MedusaRegistryStorageLegacy is IMedusaStorage {
    uint256 public cleanupThresholdPeriod = 90 days;
    mapping(address => mapping(uint256 => DeviceStorage)) public userWorkflowDevices;
    mapping(bytes32 => uint256) public devicePartitionIndex; // walletIdHash => partitionIndex
    mapping(address => mapping(uint256 => CleanupState)) private cleanupStates;
    mapping(bytes32 => uint256) public deviceDeregistrationTime; // walletIdHash => deregistration timestamp

    error StorageError(uint256 code, string message);

    modifier whenStorageNotLocked(address user, uint256 workflowId) {
        DeviceStorage storage store = userWorkflowDevices[user][workflowId];
        if (store.locked) {
            // Check if the lock timeout has elapsed
            if (block.timestamp - store.lastLockTime < MedusaConstants.STORAGE_LOCK_TIMEOUT) {
                revert StorageError(1, "Storage locked, timeout not elapsed");
            }
            store.locked = false;
            store.lastLockTime = 0;
        }
        // Lock the storage for this transaction
        store.locked = true;
        store.lastLockTime = block.timestamp;
        emit StorageLocked(user, workflowId);

        _;
        // Unlock storage after execution
        store.locked = false;
        emit StorageUnlocked(user, workflowId);
    }

    function _addDevice(
        address user, //workflow admin
        uint256 workflowId,
        Device memory device
    ) internal whenStorageNotLocked(user, workflowId) {
        DeviceStorage storage store = userWorkflowDevices[user][workflowId];
        CleanupState storage state = cleanupStates[user][workflowId];

        // Check if cleanup is needed based on time since last cleanup
        if (store.totalDevices > 0 && (block.timestamp - state.lastCleanupTime) > cleanupThresholdPeriod) {
            _cleanupInactiveDevices(store, workflowId);
        }

        uint256 partitionIndex = _getCurrentOrCreatePartition(store);

        require(partitionIndex < MedusaConstants.MAX_PARTITIONS, "Invalid partition index");

        store.partitionDevices[partitionIndex].push(device);
        devicePartitionIndex[keccak256(bytes(device.walletId))] = partitionIndex;

        store.totalDevices++;
    }

    function _getCurrentOrCreatePartition(DeviceStorage storage store) private returns (uint256) {
        // Look for a partition that is neither full nor empty
        for (uint256 i = 0; i < store.partitions.length; i++) {
            if (
                !store.partitions[i].isFull && store.partitionDevices[i].length < MedusaConstants.DEVICES_PER_PARTITION
            ) {
                store.activePartitionIndex = i;
                return i;
            }
        }

        // Look for an empty partition and reuse it
        for (uint256 i = 0; i < store.partitions.length; i++) {
            if (store.partitionDevices[i].length == 0) {
                store.activePartitionIndex = i;
                return i;
            }
        }

        // Create new partition if no space is found and max limit isn't reached
        require(store.partitions.length < MedusaConstants.MAX_PARTITIONS, "Max partitions reached, cleanup required");
        return _createNewPartition(store);
    }

    function _createNewPartition(DeviceStorage storage store) private returns (uint256) {
        uint256 newIndex = store.partitions.length;
        store.partitions.push(DevicePartition({startTimestamp: block.timestamp, endTimestamp: 0, isFull: false}));
        store.activePartitionIndex = newIndex;
        emit DevicePartitionCreated(newIndex, block.timestamp, 0);
        return newIndex;
    }

    /*
     * @title Device Cleanup with Multi-Transaction Support
     * @notice Performs gas-efficient cleanup of inactive devices with resumable state
     * @dev This function implements multiple safety measures:
     * 1. Bounded Execution: Limited by MAX_PARTITIONS (10) and DEVICES_PER_PARTITION (100)
     * 2. Gas Optimization: Uses batch processing and gas monitoring
     * 3. State Management: Maintains cleanup state for resumption across transactions
     * 4. Concurrency Control: Prevents parallel cleanups with timeout recovery
     * @param store The device storage to clean up
     * @param workflowId The workflow identifier
     * @return bool Indicating if cleanup completed
     */
    function _cleanupInactiveDevices(DeviceStorage storage store, uint256 workflowId) private returns (bool) {
        CleanupState storage state = cleanupStates[msg.sender][workflowId];

        // Anti-parallel execution mechanism with timeout recovery
        // Prevents concurrent cleanups but allows recovery after 1 hour if stuck
        require(
            state.status != CleanupStatus.InProgress || block.timestamp > state.startTime + 1 hours,
            "Cleanup in progress or locked"
        );

        // Safety check for maximum iterations (50) to prevent infinite loops
        // This is an additional safeguard on top of gas monitoring
        if (state.processedCount >= MedusaConstants.CLEANUP_MAX_ITERATIONS) {
            state.status = CleanupStatus.Completed;
            state.lastCleanupTime = block.timestamp;
            return true;
        }

        // Gas optimization parameters
        // Conservative thresholds to ensure transaction completion
        uint256 maxIterations = 50; // Prevents excessive loop iterations
        uint256 gasThreshold = 200_000; // Ensures sufficient gas for transaction completion
        uint256 startGas = gasleft();

        // State initialization for new cleanup process
        // Ensures clean state tracking for multi-transaction operations
        if (state.status != CleanupStatus.InProgress) {
            state.startTime = block.timestamp;
            state.processedCount = 0;
            state.status = CleanupStatus.InProgress;
        }

        uint256 cutoffTime = block.timestamp - cleanupThresholdPeriod;
        uint256 count = 0;
        uint256 iterations = 0;

        // Main cleanup loop with multiple break conditions:
        // 1. Partition limit (MAX_PARTITIONS = 10)
        // 2. Batch size limit (CLEANUP_BATCH_SIZE = 20)
        // 3. Iteration limit (maxIterations = 50)
        // 4. Gas threshold check
        for (
            uint256 i = state.lastPartitionIndex;
            i < store.partitions.length &&
                count < MedusaConstants.CLEANUP_BATCH_SIZE &&
                iterations < maxIterations &&
                startGas - gasleft() < gasThreshold;
            i++
        ) {
            iterations++;
            Device[] storage devices = store.partitionDevices[i];

            // Device cleanup loop with same safety checks
            // Ensures gas efficiency and prevents out-of-gas scenarios
            for (
                uint256 j = state.lastDeviceIndex;
                j < devices.length && count < MedusaConstants.CLEANUP_BATCH_SIZE && startGas - gasleft() < gasThreshold;
                j++
            ) {
                if (devices[j].lastActive < cutoffTime) {
                    emit DeviceCleanedUp(devices[j].walletId, workflowId, devices[j].lastActive, block.timestamp);

                    // Safe array manipulation using pop and swap pattern
                    // Prevents array gaps and optimizes gas usage
                    uint256 lastIndex = devices.length - 1;
                    if (j < lastIndex) {
                        devices[j] = devices[lastIndex];
                    }
                    devices.pop();
                    store.totalDevices--;
                    count++;
                }
            }

            // State persistence for cleanup resumption
            // Enables multi-transaction processing
            state.lastPartitionIndex = i;
            state.lastDeviceIndex = 0;
        }

        // Cleanup completion check and state reset
        // Ensures clean state for next cleanup cycle
        if (state.lastPartitionIndex >= store.partitions.length - 1) {
            state.status = CleanupStatus.Completed;
            state.lastCleanupTime = block.timestamp;
            state.lastPartitionIndex = 0;
            state.lastDeviceIndex = 0;
            state.processedCount = 0;
            return true;
        }

        return false;
    }

    function _getDevices(
        address user,
        uint256 workflowId,
        uint256 partitionIndex
    ) internal view returns (Device[] memory) {
        DeviceStorage storage store = userWorkflowDevices[user][workflowId];
        Device[] storage partitionDevices = store.partitionDevices[partitionIndex];
        uint256 length = partitionDevices.length;

        // Allocate memory for return array
        Device[] memory devices = new Device[](length);

        for (uint256 i = 0; i < length; i++) {
            devices[i] = partitionDevices[i];
        }

        return devices;
    }

    function _syncCleanupState(address user, uint256 workflowId) internal {
        DeviceStorage storage store = userWorkflowDevices[user][workflowId];
        CleanupState storage state = cleanupStates[msg.sender][workflowId];

        // Reset cleanup state if storage is empty
        if (store.totalDevices == 0) {
            // Reset all tracking fields
            state.lastPartitionIndex = 0;
            state.lastDeviceIndex = 0;
            state.lastCleanupTime = block.timestamp;
            state.startTime = 0;
            state.processedCount = 0;
            state.status = CleanupStatus.Completed; // Change from inProgress bool to enum
        } else {
            // If there are devices but cleanup was in progress
            // Check if cleanup process has timed out
            if (state.status == CleanupStatus.InProgress && block.timestamp > state.startTime + 1 hours) {
                // Reset the stuck cleanup
                state.status = CleanupStatus.None;
                state.startTime = 0;
                state.processedCount = 0;
            }
        }
    }

    function _forceUnlock(address user, uint256 workflowId) internal {
        DeviceStorage storage store = userWorkflowDevices[user][workflowId];
        require(store.locked, "Storage not locked");
        require(
            block.timestamp > store.lastLockTime + MedusaConstants.STORAGE_LOCK_TIMEOUT,
            "Lock timeout not elapsed"
        );

        store.locked = false;
        store.lastLockTime = 0;

        emit StorageUnlocked(user, workflowId);
    }

    function _internalUnlockStorage(address user, uint256 workflowId) internal {
        DeviceStorage storage store = userWorkflowDevices[user][workflowId];
        require(store.locked, "Storage not locked");
        store.locked = false;
        store.lastLockTime = 0;
    }
}
