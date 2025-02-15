// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import {IMedusaStorage} from "./interfaces/IMedusaRegistryStorage.sol";
import "./utils/Constants.sol";

/**
 * @title Optimized MedusaRegistryStorage
 * @notice Storage management for Medusa Registry with gas optimizations
 */
abstract contract MedusaRegistryStorage is IMedusaStorage {
    // error StorageIsLocked(uint256 workflowId);
    error TimeoutNotElapsed();
    error MaxPartitionsReached();
    error InvalidPartitionIndex();
    error CleanupInProgress();
    error StorageNotLocked();
    error LockTimeoutActive();

    uint256 public cleanupThresholdPeriod = 90 days;
    // mapping(address => mapping(uint256 => CleanupTracker)) private cleanupStore;
    mapping(uint256 => CleanupTracker) private workflowCleanupStore;
    mapping(bytes32 => uint256) public partIndex;
    // mapping(address => mapping(uint256 => DeviceStorageLib)) public devStore;
    mapping(uint256 => DeviceStorageLib) public devStore; //device record summary

    modifier withStorageLock(uint256 wfId) {
        DeviceStorageLib storage store = devStore[wfId];
        if (store.locked) {
            if (block.timestamp - store.lockTime < MedusaConstants.STORAGE_LOCK_TIMEOUT) {
                revert TimeoutNotElapsed();
            }
            store.locked = false;
            store.lockTime = 0;
        }
        store.locked = true;
        store.lockTime = block.timestamp;
        emit StorageLocked(wfId);

        _;

        store.locked = false;
        emit StorageUnlocked(wfId);
    }

    function _addDevice(uint256 wfId, Device memory device) internal withStorageLock(wfId) {
        DeviceStorageLib storage store = devStore[wfId]; // devStore[user][wfId];
        CleanupTracker storage tracker = workflowCleanupStore[wfId];

        // Auto-cleanup check
        if (store.totalDevs > 0 && (block.timestamp - tracker.lastCleanTime) > cleanupThresholdPeriod) {
            _runCleanup(store, wfId);
        }

        uint256 pIdx = _getOrCreatePartition(store);
        if (pIdx >= MedusaConstants.MAX_PARTITIONS) revert InvalidPartitionIndex();

        store.devsByPart[pIdx].push(device);
        partIndex[keccak256(bytes(device.walletId))] = pIdx;
        store.totalDevs++;
    }

    function _getOrCreatePartition(DeviceStorageLib storage store) private returns (uint256) {
        // Find active non-full partition
        for (uint256 i = 0; i < store.parts.length; i++) {
            if (!store.parts[i].isFull && store.devsByPart[i].length < MedusaConstants.DEVICES_PER_PARTITION) {
                store.activeIdx = i;
                return i;
            }
        }

        // Reuse empty partition
        for (uint256 i = 0; i < store.parts.length; i++) {
            if (store.devsByPart[i].length == 0) {
                store.activeIdx = i;
                return i;
            }
        }

        if (store.parts.length >= MedusaConstants.MAX_PARTITIONS) {
            revert MaxPartitionsReached();
        }

        return _createPartition(store);
    }

    function _createPartition(DeviceStorageLib storage store) private returns (uint256) {
        uint256 idx = store.parts.length;
        store.parts.push(DevicePartition({startTimestamp: block.timestamp, endTimestamp: 0, isFull: false}));
        store.activeIdx = idx;
        emit DevicePartitionCreated(idx, block.timestamp, 0);
        return idx;
    }

    function _runCleanup(DeviceStorageLib storage store, uint256 wfId) private returns (bool) {
        CleanupTracker storage tracker = workflowCleanupStore[wfId];

        // Prevent parallel cleanup
        if (tracker.status == CleanupStatus.InProgress && block.timestamp <= tracker.startTime + 1 hours) {
            revert CleanupInProgress();
        }

        if (tracker.processed >= MedusaConstants.CLEANUP_MAX_ITERATIONS) {
            _finishCleanup(tracker);
            return true;
        }

        uint256 gasStart = gasleft();
        uint256 count;
        uint256 cutoff = block.timestamp - cleanupThresholdPeriod;

        // Initialize new cleanup
        if (tracker.status != CleanupStatus.InProgress) {
            _initCleanup(tracker);
        }

        // Main cleanup loop with gas checks
        for (
            uint256 i = tracker.lastPartIdx;
            i < store.parts.length && count < MedusaConstants.CLEANUP_BATCH_SIZE && gasStart - gasleft() < 200_000;
            i++
        ) {
            Device[] storage devices = store.devsByPart[i];

            // Device cleanup with swap-and-pop
            for (
                uint256 j = tracker.lastDevIdx;
                j < devices.length && count < MedusaConstants.CLEANUP_BATCH_SIZE && gasStart - gasleft() < 200_000;
                j++
            ) {
                if (devices[j].lastActive < cutoff) {
                    emit DeviceCleanedUp(devices[j].walletId, wfId, devices[j].lastActive, block.timestamp);

                    if (j < devices.length - 1) {
                        devices[j] = devices[devices.length - 1];
                    }
                    devices.pop();
                    store.totalDevs--;
                    count++;
                }
            }

            // Update tracker state
            tracker.lastPartIdx = i;
            tracker.lastDevIdx = 0;
        }

        // Check cleanup completion
        if (tracker.lastPartIdx >= store.parts.length - 1) {
            _finishCleanup(tracker);
            return true;
        }

        return false;
    }

    function _initCleanup(CleanupTracker storage tracker) private {
        tracker.startTime = block.timestamp;
        tracker.processed = 0;
        tracker.status = CleanupStatus.InProgress;
    }

    function _finishCleanup(CleanupTracker storage tracker) private {
        tracker.status = CleanupStatus.Completed;
        tracker.lastCleanTime = block.timestamp;
        tracker.lastPartIdx = 0;
        tracker.lastDevIdx = 0;
        tracker.processed = 0;
    }

    function _getDevices(uint256 wfId, uint256 pIdx) internal view returns (Device[] memory) {
        Device[] storage partDevices = devStore[wfId].devsByPart[pIdx];
        Device[] memory devices = new Device[](partDevices.length);

        for (uint256 i = 0; i < partDevices.length; i++) {
            devices[i] = partDevices[i];
        }

        return devices;
    }

    function _syncCleanupState(uint256 wfId) internal {
        DeviceStorageLib storage store = devStore[wfId];
        CleanupTracker storage tracker = workflowCleanupStore[wfId];

        if (store.totalDevs == 0) {
            _resetTracker(tracker);
        } else if (tracker.status == CleanupStatus.InProgress && block.timestamp > tracker.startTime + 1 hours) {
            tracker.status = CleanupStatus.None;
            tracker.startTime = 0;
            tracker.processed = 0;
        }
    }

    function _resetTracker(CleanupTracker storage tracker) private {
        tracker.lastPartIdx = 0;
        tracker.lastDevIdx = 0;
        tracker.lastCleanTime = block.timestamp;
        tracker.startTime = 0;
        tracker.processed = 0;
        tracker.status = CleanupStatus.Completed;
    }

    function _forceUnlock(uint256 wfId) internal {
        DeviceStorageLib storage store = devStore[wfId];
        if (!store.locked) revert StorageNotLocked();
        if (block.timestamp <= store.lockTime + MedusaConstants.STORAGE_LOCK_TIMEOUT) {
            revert LockTimeoutActive();
        }

        store.locked = false;
        store.lockTime = 0;
        emit StorageUnlocked(wfId);
    }

    function _internalUnlock(uint256 wfId) internal {
        DeviceStorageLib storage store = devStore[wfId];
        if (!store.locked) revert StorageNotLocked();
        store.locked = false;
        store.lockTime = 0;
    }
}
