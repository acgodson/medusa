// SPDX-License-Identifier: MIT
/*
 * Copyright (C) 2025 Medusa Registry
 */
pragma solidity ^0.8.20;

/**
 * @title IMedusaEvents
 * @author Godson Ani
 * @notice Interface containing global event definitions used in MedusaRegistry
 * version 1.0.0-testnet
 * copyright 2025 Medusa Registry. All rights reserved.
 */
interface IMedusaEvents {
    event DeviceRegistered(
        uint256 indexed workflowId,
        string walletId,
        address indexed deviceAddress,
        address indexed registrar
    );

    event DeviceDeregistered(uint256 indexed workflowId, string walletId, address indexed deregistrar);

    event DeviceRemoved(uint256 indexed workflowId, string walletId, uint256 partition, uint256 timestamp);

    event StorageCleanup(address indexed user, uint256 indexed workflowId, uint256 deletedCount, uint256 timestamp);

    event RecordUpdated(string indexed walletId, uint256 indexed workflowId, uint256 counter);

    event WorkflowPauseToggled(uint256 indexed workflowId, bool isPaused);

    event DeviceBlacklisted(string walletId, address indexed deviceAddress, address indexed blacklister, bool status);
}
