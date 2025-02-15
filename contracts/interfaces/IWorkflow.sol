// SPDX-License-Identifier: MIT
/*
 * Copyright (C) 2025 Medusa Registry
 */
pragma solidity ^0.8.20;

/**
 * @title IWorkflow
 * @author Godson Ani
 * @notice Interface defining workflow-specific structures and events
 * @dev Core workflow definitions for the MedusaRegistry system
 * version 1.0.0-testnet
 * copyright 2025 Medusa Registry. All rights reserved.
 */
interface IWorkflow {
    enum WorkflowStatus {
        Active,
        Paused,
        Archived
    }

    struct CreateWorkflowInput {
        uint256 wid;
        string title;
        string description;
        string schemaId;
        uint256 executionInterval;
    }

    struct Workflow {
        uint256 id;
        string title;
        string description;
        uint256 contributorCount;
        uint256 timestamp;
        WorkflowStatus status;
        uint256 deviceLimit;
        string schemaId;
        uint256 partitionSize;
        uint256 executionInterval;
        address owner;
    }

    struct WorkflowListItem {
        uint256 id;
        string title;
        bool isArchived;
        bool isPaused;
        uint256 contributorCount;
    }

    struct AdminWorkflows {
        uint256[] activeWorkflows;
        mapping(uint256 => bool) exists;
        uint256 totalWorkflows;
        mapping(uint256 => bool) isArchived;
    }

    event WorkflowCreated(uint256 indexed id, string title, address owner, string schemaId);
    // event WorkflowArchived(uint256 indexed id, address owner);
    event WorkflowArchived(uint256 indexed workflowId, address indexed owner);

    event WorkflowStatusUpdated(uint256 indexed workflowId, WorkflowStatus status);

    event WorkflowOwnershipTransferred(
        uint256 indexed workflowId,
        address indexed previousOwner,
        address indexed newOwner
    );

    event WorkflowExecutionIntervalUpdated(uint256 indexed workflowId, uint256 newInterval);

    error WorkflowError(string message);
}
