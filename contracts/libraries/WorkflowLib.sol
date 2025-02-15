// SPDX-License-Identifier: MIT
/*
 * Copyright (C) 2025 Medusa Registry
 */
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/utils/math/SafeMath.sol";
import "@openzeppelin/contracts/utils/math/Math.sol";
import "./ValidationLib.sol";
import "../interfaces/IWorkflow.sol";
import "../utils/Constants.sol";
import "../utils/Constants.sol";

/**
 * @title WorkflowLib
 * @author Godson Ani
 * @notice Library handling workflow-related operations
 * @dev Core workflow management library for the MedusaRegistry system
 * version 1.0.0-testnet
 * copyright 2025 Medusa Registry. All rights reserved.
 */
library WorkflowLib {
    using SafeMath for uint256;
    using Math for uint256;

    struct WorkflowStorage {
        mapping(uint256 => IWorkflow.Workflow) workflows;
        mapping(address => IWorkflow.AdminWorkflows) adminWorkflows;
        mapping(uint256 => bool) workflowPaused;
    }

    function createWorkflow(
        WorkflowStorage storage self,
        IWorkflow.CreateWorkflowInput memory input,
        address sender,
        uint256 maxDevicesPerWorkflow,
        uint256 minPartitionSize
    ) internal returns (uint256) {
        if (self.workflows[input.wid].timestamp != 0) {
            revert IWorkflow.WorkflowError("Workflow ID exists");
        }

        self.workflows[input.wid] = IWorkflow.Workflow({
            id: input.wid,
            title: input.title,
            description: input.description,
            contributorCount: 0,
            timestamp: block.timestamp,
            status: IWorkflow.WorkflowStatus.Active,
            deviceLimit: maxDevicesPerWorkflow,
            owner: sender,
            schemaId: input.schemaId,
            partitionSize: minPartitionSize,
            executionInterval: input.executionInterval
        });

        emit IWorkflow.WorkflowCreated(input.wid, input.title, sender, input.schemaId);

        return input.wid;
    }

    function incrementContributorCount(WorkflowStorage storage self, uint256 workflowId) internal {
        self.workflows[workflowId].contributorCount++;
    }

    function decrementContributorCount(WorkflowStorage storage self, uint256 workflowId) internal {
        if (self.workflows[workflowId].contributorCount > 0) {
            self.workflows[workflowId].contributorCount--;
        }
    }

    function transferWorkflowOwnership(
        WorkflowStorage storage self,
        uint256 workflowId,
        address newOwner
    ) internal {
        ValidationLib.validateAddress(newOwner, "new owner");

        address previousOwner = self.workflows[workflowId].owner;
        self.workflows[workflowId].owner = newOwner;

        emit IWorkflow.WorkflowOwnershipTransferred(workflowId, previousOwner, newOwner);
    }

    function updateExecutionInterval(
        WorkflowStorage storage self,
        uint256 workflowId,
        uint256 newInterval,
        uint256 minInterval,
        uint256 maxInterval
    ) internal {
        ValidationLib.validateExecutionInterval(newInterval, minInterval, maxInterval);

        self.workflows[workflowId].executionInterval = newInterval;

        emit IWorkflow.WorkflowExecutionIntervalUpdated(workflowId, newInterval);
    }

    function toggleWorkflowPause(WorkflowStorage storage self, uint256 workflowId) internal returns (bool) {
        self.workflowPaused[workflowId] = !self.workflowPaused[workflowId];
        return self.workflowPaused[workflowId];
    }

    function getWorkflow(WorkflowStorage storage self, uint256 workflowId)
        internal
        view
        returns (IWorkflow.Workflow memory)
    {
        return self.workflows[workflowId];
    }

    function isWorkflowPaused(WorkflowStorage storage self, uint256 workflowId) internal view returns (bool) {
        return self.workflowPaused[workflowId];
    }

    function getWorkflowOwner(WorkflowStorage storage self, uint256 workflowId) internal view returns (address) {
        return self.workflows[workflowId].owner;
    }

    function workflowExists(WorkflowStorage storage self, uint256 workflowId) internal view returns (bool) {
        return self.workflows[workflowId].timestamp != 0;
    }

    function getAllWorkflows(
        WorkflowStorage storage self,
        uint256 offset,
        uint256 limit,
        address admin
    )
        internal
        view
        returns (
            IWorkflow.WorkflowListItem[] memory workflows,
            uint256 total,
            bool hasMore
        )
    {
        IWorkflow.AdminWorkflows storage adminIndex = self.adminWorkflows[admin];
        uint256 pageSize = Math.min(limit, MedusaConstants.MAX_PAGE_SIZE);

        // If no workflows, return early
        if (adminIndex.totalWorkflows == 0) {
            return (new IWorkflow.WorkflowListItem[](0), 0, false);
        }

        // Calculate valid range
        uint256 start = offset;
        uint256 end = Math.min(offset + pageSize, adminIndex.totalWorkflows);

        // Prevent out of bounds
        if (start >= adminIndex.totalWorkflows) {
            return (new IWorkflow.WorkflowListItem[](0), adminIndex.totalWorkflows, false);
        }

        // Create result array
        workflows = new IWorkflow.WorkflowListItem[](end - start);

        // Bounded loop for copying
        uint256 resultIndex = 0;
        for (uint256 i = start + 1; i <= end; i++) {
            if (adminIndex.exists[i]) {
                IWorkflow.Workflow storage workflow = self.workflows[i];
                workflows[resultIndex] = IWorkflow.WorkflowListItem({
                    id: workflow.id,
                    title: workflow.title,
                    isArchived: adminIndex.isArchived[i],
                    isPaused: self.workflowPaused[i],
                    contributorCount: workflow.contributorCount
                });
                resultIndex++;
            }
        }

        return (workflows, adminIndex.totalWorkflows, end < adminIndex.totalWorkflows);
    }

    // Archive workflow (doesn't delete, just marks as archived)
    function archiveWorkflow(
        WorkflowStorage storage self,
        uint256 workflowId,
        address admin
    ) internal {
        IWorkflow.AdminWorkflows storage adminIndex = self.adminWorkflows[admin];
        require(adminIndex.exists[workflowId], "Workflow not found");
        require(!adminIndex.isArchived[workflowId], "Already archived");
        for (uint256 i = 0; i < adminIndex.activeWorkflows.length; i++) {
            if (adminIndex.activeWorkflows[i] == workflowId) {
                // Swap and pop
                if (i != adminIndex.activeWorkflows.length - 1) {
                    adminIndex.activeWorkflows[i] = adminIndex.activeWorkflows[adminIndex.activeWorkflows.length - 1];
                }
                adminIndex.activeWorkflows.pop();
                break;
            }
        }
        adminIndex.isArchived[workflowId] = true;
        emit IWorkflow.WorkflowArchived(workflowId, admin);
    }

    function getArchivedWorkflows(
        WorkflowStorage storage self,
        uint256 offset,
        uint256 limit,
        address admin
    )
        internal
        view
        returns (
            uint256[] memory archivedWorkflows,
            uint256 total,
            bool hasMore
        )
    {
        IWorkflow.AdminWorkflows storage adminIndex = self.adminWorkflows[admin];
        uint256 pageSize = Math.min(limit, MedusaConstants.MAX_PAGE_SIZE);

        // First count archived workflows
        uint256 archivedCount = 0;
        uint256[] memory tempArchived = new uint256[](adminIndex.totalWorkflows);

        // Start from 1 to match workflow IDs (assuming they start from 1)
        for (uint256 i = 1; i <= adminIndex.totalWorkflows; i++) {
            if (adminIndex.exists[i] && adminIndex.isArchived[i]) {
                tempArchived[archivedCount] = i;
                archivedCount++;
            }
        }

        // Calculate valid range
        uint256 start = offset;
        uint256 end = Math.min(offset + pageSize, archivedCount);

        if (start >= archivedCount) {
            return (new uint256[](0), archivedCount, false);
        }

        // Create result array
        archivedWorkflows = new uint256[](end - start);

        // Bounded copy
        for (uint256 i = 0; i < end - start; i++) {
            archivedWorkflows[i] = tempArchived[start + i];
        }

        return (archivedWorkflows, archivedCount, end < archivedCount);
    }

    function getArchivedWorkflowCount(WorkflowStorage storage self, address admin) internal view returns (uint256) {
        IWorkflow.AdminWorkflows storage adminIndex = self.adminWorkflows[admin];

        // Gas optimization: If no workflows exist, return early
        if (adminIndex.totalWorkflows == 0) {
            return 0;
        }

        // Ensure we don't exceed max workflows
        uint256 maxIteration = Math.min(adminIndex.totalWorkflows, MedusaConstants.MAX_WORKFLOWS_PER_ADMIN);

        uint256 count = 0;
        // bounded by MAX_WORKFLOWS_PER_ADMIN
        for (uint256 i = 1; i <= maxIteration; i++) {
            if (adminIndex.exists[i] && adminIndex.isArchived[i]) {
                count++;
            }
        }
        return count;
    }

    function isWorkflowArchived(
        WorkflowStorage storage self,
        uint256 workflowId,
        address owner
    ) internal view returns (bool) {
        IWorkflow.AdminWorkflows storage adminIndex = self.adminWorkflows[owner];
        return adminIndex.exists[workflowId] && adminIndex.isArchived[workflowId];
    }
}
