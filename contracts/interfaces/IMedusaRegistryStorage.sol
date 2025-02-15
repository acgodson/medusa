// SPDX-License-Identifier: MIT
/*
 * Copyright (C) 2025 Medusa Registry
 */
pragma solidity ^0.8.20;

import "../utils/Constants.sol";

/**
 * @title IMedusaStorage
 * @author Godson Ani
 * @notice Interface defining core storage structures and types for the Medusa storage
 * version 1.0.0-testnet
 * copyright 2025 Medusa Registry. All rights reserved.
 */
interface IMedusaStorage {
    enum CleanupStatus {
        None,
        InProgress,
        Completed
    }

    struct DevicePartition {
        uint256 startTimestamp;
        uint256 endTimestamp;
        bool isFull;
    }

    struct Device {
        string walletId;
        address deviceAddress;
        uint256 registeredAt;
        bool blacklisted;
        uint256 lastActive;
    }

    struct PaginatedDevices {
        Device[] devices;
        uint256 totalPartitions;
        uint256 currentPartition;
        uint256 totalDevices;
        bool hasMore;
    }

    struct DeviceRegistration {
        address deviceAddress;
        uint256 registeredAt;
        uint256 lastVerified;
        bool isActive;
    }

    // struct DeviceStorage {
    //     DevicePartition[] partitions;
    //     mapping(uint256 => Device[]) partitionDevices;
    //     uint256 activePartitionIndex;
    //     uint256 totalDevices;
    //     bool locked;
    //     uint256 lastLockTime;
    // }

    struct DeviceStorageLib {
        bool locked;
        uint256 lockTime;
        uint256 totalDevs;
        uint256 activeIdx;
        DevicePartition[] parts;
        mapping(uint256 => Device[]) devsByPart;
    }

    // Cleanup tracking with enum for state management
    struct CleanupTracker {
        uint256 lastPartIdx;
        uint256 lastDevIdx;
        uint256 lastCleanTime;
        uint256 startTime;
        uint256 processed;
        CleanupStatus status;
    }

    event DevicePartitionCreated(uint256 indexed partitionIndex, uint256 startBlock, uint256 endBlock);
    event DevicePartitionFilled(uint256 indexed partitionIndex);
    event DeviceCleanedUp(
        string indexed walletId,
        uint256 indexed workflowId,
        uint256 lastActiveTimestamp,
        uint256 cleanupTimestamp
    );
    event StorageLocked(uint256 indexed workflowId);
    event StorageUnlocked(uint256 indexed workflowId);
}
