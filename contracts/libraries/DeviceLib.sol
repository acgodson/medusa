// SPDX-License-Identifier: MIT
/*
 * Copyright (C) 2025 Medusa Registry
 */
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/utils/math/SafeMath.sol";
import "../interfaces/IMedusaRegistryStorage.sol";
import "../utils/Constants.sol";

/**
 * @title DeviceLib
 * @author Godson Ani
 * @notice Unified library handling device management and registration
 * @dev Core device management library for the MedusaRegistry system
 * version 1.0.0-testnet
 * opyright 2025 Medusa Registry. All rights reserved.
 */
library DeviceLib {
    using SafeMath for uint256;

    struct DeviceState {
        // device record
        mapping(string => IMedusaStorage.DeviceRegistration) deviceRegistrations;
        // device eligibility filter
        mapping(bytes32 => bool) registeredDevices;
        mapping(string => mapping(uint256 => bool)) workflowDevices;
        mapping(string => bool) blacklistedDevices;
        // device details filrer
        mapping(string => address) walletIdToAddress;
        mapping(address => string) addressToWalletId;
        // device  state filter
        mapping(bytes32 => bool) registrationInProgress;
    }

    /**
     * @notice Registration Management Functions
     */
    function registerDeviceState(
        DeviceState storage self,
        string calldata walletId,
        address deviceAddress,
        uint256 workflowId,
        bytes32 hashedId
    ) internal returns (IMedusaStorage.Device memory) {
        // If anything fails, the whole transaction reverts and flag is never set
        self.registrationInProgress[hashedId] = true;

        // Registration state updates
        self.registeredDevices[hashedId] = true;
        self.workflowDevices[walletId][workflowId] = true;
        self.walletIdToAddress[walletId] = deviceAddress;
        self.addressToWalletId[deviceAddress] = walletId;

        // Update device registration
        IMedusaStorage.DeviceRegistration storage registration = self.deviceRegistrations[walletId];
        registration.deviceAddress = deviceAddress;
        registration.registeredAt = block.timestamp;
        registration.lastVerified = block.timestamp;
        registration.isActive = true;

        // Clear the flag immediately after registration
        self.registrationInProgress[hashedId] = false;

        // Create and return device struct
        return
            IMedusaStorage.Device({
                walletId: walletId,
                deviceAddress: deviceAddress,
                registeredAt: block.timestamp,
                lastActive: block.timestamp,
                blacklisted: false
            });
    }

    function deregisterDeviceState(
        DeviceState storage self,
        string calldata walletId,
        uint256 workflowId,
        IMedusaStorage.DeviceStorageLib storage store
    ) internal returns (bool) {
        // Update registration state
        self.deviceRegistrations[walletId].isActive = false;
        self.workflowDevices[walletId][workflowId] = false;

        // Remove from storage
        return _removeDeviceFromStorage(store, walletId, store.totalDevs);
    }

    /**
     * @notice Device Storage Management Functions
     */
    function handlePartitionMapping(
        mapping(bytes32 => uint256) storage partIndex,
        bytes32 hashedId,
        uint256 activePartitionIndex
    ) internal {
        partIndex[hashedId] = activePartitionIndex;
    }

    function _removeDeviceFromStorage(
        IMedusaStorage.DeviceStorageLib storage store,
        string calldata walletId,
        uint256 initialTotalDevices
    ) internal returns (bool) {
        for (uint256 i = 0; i < store.parts.length; i++) {
            IMedusaStorage.Device[] storage devices = store.devsByPart[i];
            for (uint256 j = 0; j < devices.length; j++) {
                if (keccak256(bytes(devices[j].walletId)) == keccak256(bytes(walletId))) {
                    if (j != devices.length - 1) {
                        devices[j] = devices[devices.length - 1];
                    }
                    devices.pop();
                    store.totalDevs = initialTotalDevices.sub(1);
                    return true;
                }
            }
        }
        return false;
    }

    function updateDeviceLastActive(
        IMedusaStorage.DeviceStorageLib storage store,
        string calldata walletId,
        uint256 timestamp,
        mapping(bytes32 => uint256) storage partIndex
    ) internal {
        bytes32 walletIdHash = keccak256(bytes(walletId));
        uint256 partitionIndex = partIndex[walletIdHash];

        if (partitionIndex >= store.parts.length) {
            return;
        }
        IMedusaStorage.Device[] storage devices = store.devsByPart[partitionIndex];
        for (uint256 j = 0; j < devices.length; j++) {
            if (keccak256(bytes(devices[j].walletId)) == walletIdHash) {
                devices[j].lastActive = timestamp;
                break;
            }
        }
    }

    /**
     * @notice State Query Functions
     */
    function isDeviceRegistered(DeviceState storage self, bytes32 hashedId) internal view returns (bool) {
        return self.registeredDevices[hashedId];
    }

    function isDeviceBlacklisted(DeviceState storage self, string calldata walletId) internal view returns (bool) {
        return self.blacklistedDevices[walletId];
    }

    function isDeviceActive(DeviceState storage self, string calldata walletId) internal view returns (bool) {
        return self.deviceRegistrations[walletId].isActive;
    }

    function isDeviceInWorkflow(
        DeviceState storage self,
        string calldata walletId,
        uint256 workflowId
    ) internal view returns (bool) {
        return self.workflowDevices[walletId][workflowId];
    }

    function getDeviceAddress(DeviceState storage self, string calldata walletId) internal view returns (address) {
        return self.walletIdToAddress[walletId];
    }

    function toggleBlacklist(DeviceState storage self, string calldata walletId) internal returns (bool) {
        self.blacklistedDevices[walletId] = !self.blacklistedDevices[walletId];
        return self.blacklistedDevices[walletId];
    }
}
