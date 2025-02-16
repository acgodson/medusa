// SPDX-License-Identifier: MIT
/*
 * Copyright (C) 2025 Medusa Registry
 */
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/access/AccessControl.sol";
import "@openzeppelin/contracts/security/ReentrancyGuard.sol";
import "@openzeppelin/contracts/security/Pausable.sol";
import "@openzeppelin/contracts/utils/math/SafeMath.sol";
import "@openzeppelin/contracts/utils/cryptography/ECDSA.sol";

import "./MedusaRegistryStorage.sol";

import "./utils/Errors.sol";
import "./interfaces/Events.sol";

import "./libraries/DeviceLib.sol";
import "./libraries/ValidationLib.sol";
import "./libraries/WorkflowLib.sol";
import "./libraries/ExecutionLib.sol";

/**
 * @title MedusaRegistry - Device Management and Workflow Orchestration System // @version 1.0.0-testnet
 * @author Godson Ani
 * @notice MedusaRegistry implements a device management and workflow
 * orchestration system with the following key features:
 * - Role-based access control for administrators and workflow owners
 * - Partitioned storage system for gas-efficient device management
 * - Auto-cleanup mechanism for inactive devices
 * - Workflow lifecycle management with pause/resume capabilities
 * - Device blacklisting system
 * - Gas-optimized batch operations
 *
 * @dev Key features:
 * - Reentrancy protection on state-modifying functions
 * - Storage locks to prevent concurrent modifications
 * - Input validation
 * - Bounded operations with clear upper limits
 * - Access control isolation
 * - Cleaning mechanisms
 *
 * @dev Testnet Limitations:
 * - Maximum Devices Per Workflow: 1000 devices (ABSOLUTE_MAX_DEVICES_PER_WORKFLOW)
 * - Maximum Partitions: 10 partitions per workflow (MAX_PARTITIONS)
 * - Cleanup Batch Size: 20 devices per cleanup operation (CLEANUP_BATCH_SIZE)
 * - Storage Lock Timeout: 2 minutes (STORAGE_LOCK_TIMEOUT)
 * - Execution Interval: Between 1 minute and 1 day (MIN/MAX_EXECUTION_INTERVAL)
 *
 * These limitations are in place to ensure gas efficiency during the testnet phase.
 * Values may be adjusted for mainnet deployment based on
 * testnet performance data and gas optimization analysis.
 */

contract MedusaRegistry is AccessControl, ReentrancyGuard, Pausable, MedusaRegistryStorage, IMedusaEvents {
    using SafeMath for uint256;
    using ValidationLib for string;
    using WorkflowLib for WorkflowLib.WorkflowStorage;
    using ExecutionLib for ExecutionLib.ExecutionStorage;
    using DeviceLib for DeviceLib.DeviceState;

    // Storage
    DeviceLib.DeviceState private _deviceState;
    WorkflowLib.WorkflowStorage private _workflowStorage;
    ExecutionLib.ExecutionStorage private _executionStorage;

    modifier onlyWorkflowOwner(uint256 wid) {
        if (_workflowStorage.getWorkflowOwner(wid) != msg.sender) {
            MedusaErrors.throwSecurityError("Not authorized");
        }
        _;
    }

    modifier whenWorkflowNotPaused(uint256 workflowId) {
        if (_workflowStorage.isWorkflowPaused(workflowId)) {
            MedusaErrors.throwSecurityError("Workflow paused");
        }
        _;
    }

    modifier workflowExists(uint256 wid) {
        if (!_workflowStorage.workflowExists(wid)) {
            MedusaErrors.throwInvalidInput("Workflow does not exist");
        }
        _;
    }

    constructor() {
        _grantRole(DEFAULT_ADMIN_ROLE, msg.sender);
        _setRoleAdmin(MedusaConstants.PAUSER_ROLE, DEFAULT_ADMIN_ROLE);
        _setRoleAdmin(MedusaConstants.BLACKLIST_ROLE, DEFAULT_ADMIN_ROLE);

        // Grant initial roles to deployer
        _grantRole(MedusaConstants.PAUSER_ROLE, msg.sender);
        _grantRole(MedusaConstants.BLACKLIST_ROLE, msg.sender);
    }

    /**
     * @notice Creates new workflow with validated parameters and initial state
     * @dev Implements validation for all input parameters and sets up initial workflow state
     * Protected by reentrancy guard and global pause mechanism
     */
    function createWorkflow(
        IWorkflow.CreateWorkflowInput calldata input
    ) external nonReentrant whenNotPaused returns (uint256) {
        ValidationLib.validateString(input.title, MedusaConstants.MAX_STRING_LENGTHS, "title");
        ValidationLib.validateString(input.schemaId, MedusaConstants.MAX_STRING_LENGTHS, "schemaId");
        ValidationLib.validateExecutionInterval(
            input.executionInterval,
            MedusaConstants.MIN_EXECUTION_INTERVAL,
            MedusaConstants.MAX_EXECUTION_INTERVAL
        );
        return
            _workflowStorage.createWorkflow(
                input,
                msg.sender,
                MedusaConstants.ABSOLUTE_MAX_DEVICES_PER_WORKFLOW,
                MedusaConstants.MIN_PARTITION_SIZE
            );
    }

    /**
     * @notice Registers device to a specific workflow with proper access checks
     * @dev Implements multiple validation layers:
     * - Workflow ownership verification
     * - Device limit checks
     * - Blacklist verification
     * - Duplicate registration prevention
     * Protected by reentrancy guard and storage locks
     *
     * @dev SECURITY NOTE: Device registration security is enforced through Privy.io engine policy infrastructure:
     * - walletIds are created and assigned by Privy.io
     * - deviceAddress is tied to server-generated wallet credentials
     * - Only devices with valid Privy-generated credentials can register
     * - Front-running protection is inherent as registration requires admin's valid Privy server-side validation and wallet creation
     */
    function registerDevice(
        uint256 workflowId,
        string calldata walletId,
        address deviceAddress
    )
        external
        nonReentrant
        whenNotPaused
        workflowExists(workflowId)
        whenWorkflowNotPaused(workflowId)
        onlyWorkflowOwner(workflowId)
    {
        bytes32 hashedId = keccak256(bytes(walletId));

        // Set flag immediately before any other operations
        if (_deviceState.registrationInProgress[hashedId]) {
            MedusaErrors.throwValidationError("Device registration already in progress");
        }
        _deviceState.registrationInProgress[hashedId] = true;

        // perform all validations
        ValidationLib.validateAddress(deviceAddress, "deviceAddress");
        ValidationLib.validateString(walletId, MedusaConstants.MAX_STRING_LENGTHS, "walletId");

        IWorkflow.Workflow memory workflow = _workflowStorage.getWorkflow(workflowId);

        if (workflow.status != IWorkflow.WorkflowStatus.Active) {
            _deviceState.registrationInProgress[hashedId] = false;
            MedusaErrors.throwValidationError("Workflow not active");
        }

        if (_deviceState.isDeviceRegistered(hashedId)) {
            _deviceState.registrationInProgress[hashedId] = false;
            MedusaErrors.throwValidationError("Device already registered");
        }

        if (_deviceState.isDeviceBlacklisted(walletId)) {
            _deviceState.registrationInProgress[hashedId] = false;
            MedusaErrors.throwValidationError("Device blacklisted");
        }

        ValidationLib.validateDeviceLimit(workflow.contributorCount, workflow.deviceLimit);

        // All validations passed, proceed with registration
        _deviceState.registerDeviceState(walletId, deviceAddress, workflowId, hashedId);
        _workflowStorage.incrementContributorCount(workflowId);

        Device memory newDevice = Device({
            walletId: walletId,
            deviceAddress: deviceAddress,
            registeredAt: block.timestamp,
            lastActive: block.timestamp,
            blacklisted: false
        });

        _addDevice(workflowId, newDevice);
        DeviceLib.handlePartitionMapping(partIndex, hashedId, devStore[workflowId].activeIdx);

        // Clear flag after successful registration
        _deviceState.registrationInProgress[hashedId] = false;

        emit DeviceRegistered(workflowId, walletId, deviceAddress, msg.sender);
    }

    /**
     * @notice Deregisters device with state cleanup
     * @dev Implements comprehensive cleanup:
     * - Validates device active status
     * - Removes from workflow
     * - Updates contributor count
     * - Cleans storage state
     * Protected by reentrancy and proper access control
     */
    function deregisterDevice(
        uint256 workflowId,
        string calldata walletId
    )
        external
        nonReentrant
        whenNotPaused
        workflowExists(workflowId)
        whenWorkflowNotPaused(workflowId)
        onlyWorkflowOwner(workflowId)
    {
        if (!_deviceState.isDeviceActive(walletId)) {
            MedusaErrors.throwValidationError("Device not registered");
        }
        if (!_deviceState.isDeviceInWorkflow(walletId, workflowId)) {
            MedusaErrors.throwValidationError("Device not in workflow");
        }

        DeviceStorageLib storage store = devStore[workflowId];

        bool deviceRemoved = DeviceLib._removeDeviceFromStorage(store, walletId, store.totalDevs);

        if (!deviceRemoved) {
            MedusaErrors.throwGenericError("Device removal failed");
        }

        _syncCleanupState(workflowId);
        _deviceState.deregisterDeviceState(walletId, workflowId, store);
        _workflowStorage.decrementContributorCount(workflowId);

        emit DeviceDeregistered(workflowId, walletId, msg.sender);
    }

    /**
     * @notice Submits record for device with proper validation and rate limiting
     * @dev Implements multiple security checks:
     * - Device registration validation
     * - Execution cooldown enforcement
     * - Rate limiting through execution counter
     * - Workflow status verification
     */
    function submitRecord(
        string calldata walletId,
        uint256 workflowId
    )
        external
        nonReentrant
        whenNotPaused
        whenWorkflowNotPaused(workflowId)
        workflowExists(workflowId)
        returns (uint256)
    {
        IWorkflow.Workflow memory workflow = _workflowStorage.getWorkflow(workflowId);

        DeviceRegistration storage registration = _deviceState.deviceRegistrations[walletId];

        ValidationLib.validateDeviceForRecord(registration, msg.sender);

        if (!_deviceState.workflowDevices[walletId][workflowId]) {
            MedusaErrors.throwValidationError("workflow validation failed");
        }

        uint256 lastExecution = _executionStorage.lastExecutionTimestamp[walletId];
        uint256 currentCount = _executionStorage.deviceExecutionCounter[walletId];
        uint256 executionInterval = workflow.executionInterval;
        ValidationLib.validateExecutionCooldown(block.timestamp, lastExecution, executionInterval);
        ValidationLib.validateExecutionCount(currentCount);
        uint256 newCount = _executionStorage.updateExecution(walletId);

        DeviceStorageLib storage store = devStore[workflowId];
        DeviceLib.updateDeviceLastActive(store, walletId, block.timestamp, partIndex);

        emit RecordUpdated(walletId, workflowId, newCount);
        return newCount;
    }

    /**
     * @notice Toggles device blacklist status with proper access control
     * @dev Restricted to BLACKLIST_ROLE with proper event emission
     */
    function toggleDeviceBlacklist(
        string calldata walletId
    ) external whenNotPaused onlyRole(MedusaConstants.BLACKLIST_ROLE) {
        ValidationLib.validateString(walletId, MedusaConstants.MAX_STRING_LENGTHS, "walletId");
        address deviceAddress = _deviceState.getDeviceAddress(walletId);
        ValidationLib.validateAddress(deviceAddress, "registered device");

        bool newStatus = _deviceState.toggleBlacklist(walletId);
        emit DeviceBlacklisted(walletId, deviceAddress, msg.sender, newStatus);
    }

    /**
     * @notice Updates workflow execution interval with proper bounds checking
     * @dev Implements validation for new interval within system bounds
     * Protected by reentrancy guard and workflow ownership verification
     */
    function updateWorkflowExecutionInterval(
        uint256 workflowId,
        uint256 newInterval
    ) external nonReentrant whenNotPaused onlyWorkflowOwner(workflowId) {
        _workflowStorage.updateExecutionInterval(
            workflowId,
            newInterval,
            MedusaConstants.MIN_EXECUTION_INTERVAL,
            MedusaConstants.MAX_EXECUTION_INTERVAL
        );
    }

    /**
     * @notice Gets paginated devices for workflow partition
     * @dev Implements pagination through partition system
     * Includes partition validation
     */
    function getWorkflowDevices(
        uint256 workflowId,
        uint256 partitionIndex
    ) external view returns (PaginatedDevices memory) {
        if (!_workflowStorage.workflowExists(workflowId)) {
            MedusaErrors.throwInvalidInput("Invalid workflow ID");
        }

        DeviceStorageLib storage store = devStore[workflowId];

        // Validate partition index
        ValidationLib.validatePartitionIndex(partitionIndex, store.parts.length);

        // Get devices for this partition
        Device[] memory devices = _getDevices(workflowId, partitionIndex);

        return
            PaginatedDevices({
                devices: devices,
                totalPartitions: store.parts.length,
                currentPartition: partitionIndex,
                totalDevices: store.totalDevs,
                hasMore: partitionIndex < (store.parts.length - 1)
            });
    }

    /**
     * @notice Retrieves workflow information including partition data
     * @dev Combines workflow metadata with partition statistics for querying
     * @param workflowId The ID of the workflow to query
     * @return workflow The workflow metadata struct
     * @return totalPartitions Total number of partitions in workflow
     * @return totalDevices Total number of devices across all partitions
     * @return devicesPerPartition Array containing number of devices in each partition
     */
    function getWorkflowInfo(
        uint256 workflowId
    )
        external
        view
        returns (
            IWorkflow.Workflow memory workflow,
            uint256 totalPartitions,
            uint256 totalDevices,
            uint256[] memory devicesPerPartition
        )
    {
        if (!_workflowStorage.workflowExists(workflowId)) {
            MedusaErrors.throwInvalidInput("Invalid workflow ID");
        }

        workflow = _workflowStorage.getWorkflow(workflowId);

        DeviceStorageLib storage store = devStore[workflowId];
        totalPartitions = store.parts.length;
        totalDevices = store.totalDevs;

        devicesPerPartition = new uint256[](totalPartitions);
        for (uint256 i = 0; i < totalPartitions; i++) {
            devicesPerPartition[i] = store.devsByPart[i].length;
        }

        return (workflow, totalPartitions, totalDevices, devicesPerPartition);
    }

    /**
     * @notice Force unlocks workflow storage in case of stuck state
     * @dev Only callable by admin after timeout period
     * @param workflowId The workflow ID whose storage needs unlocking
     */
    function forceUnlock(uint256 workflowId) external onlyRole(DEFAULT_ADMIN_ROLE) {
        _forceUnlock(workflowId);
    }

    /**
     * @notice Updates the cleanup threshold period for inactive devices
     * @dev Only callable by admin, enforces minimum threshold
     * @param newThreshold New threshold period in seconds
     */
    function setCleanupThreshold(uint256 newThreshold) external onlyRole(DEFAULT_ADMIN_ROLE) {
        if (newThreshold < MedusaConstants.MIN_CLEANUP_THRESHOLD) {
            MedusaErrors.throwValidationError("Threshold too low");
        }
        cleanupThresholdPeriod = newThreshold;
    }

    /**
     * @notice Checks if a device is registered in the system
     * @param walletId The unique identifier of the device
     * @return bool True if device is registered, false otherwise
     */
    function isDeviceRegistered(string calldata walletId) external view returns (bool) {
        return _deviceState.isDeviceRegistered(keccak256(bytes(walletId)));
    }

    /**
     * @notice Toggles pause state of a workflow
     * @dev Only callable by workflow owner
     * @param workflowId ID of the workflow to toggle
     */
    function toggleWorkflowPause(uint256 workflowId) external onlyWorkflowOwner(workflowId) {
        bool isPaused = _workflowStorage.toggleWorkflowPause(workflowId);
        emit WorkflowPauseToggled(workflowId, isPaused);
    }

    /**
     * @notice Gets a single device's details
     * @param workflowId The workflow ID
     * @param walletId The device's unique identifier
     * @return Device struct with the device's details
     */
    function getDevice(
        uint256 workflowId,
        string calldata walletId
    ) external view workflowExists(workflowId) returns (Device memory) {
        bytes32 hashedId = keccak256(bytes(walletId));
        // address owner = _workflowStorage.getWorkflowOwner(workflowId);
        uint256 devicePartition = partIndex[hashedId];

        DeviceStorageLib storage store = devStore[workflowId];
        Device[] storage devices = store.devsByPart[devicePartition];

        for (uint256 i = 0; i < devices.length; i++) {
            if (keccak256(bytes(devices[i].walletId)) == hashedId) {
                return devices[i];
            }
        }

        MedusaErrors.throwInvalidInput("Device not found");
    }

    /**
     * @notice Gets a device's execution metrics
     * @param deviceAddress Unique wallet address of device
     * @return count Total number of executions
     * @return lastExecuted Last execution timestamp
     * @return isActive Whether the device is currently active
     */
    function getDeviceExecution(
        address deviceAddress
    ) external view returns (uint256 count, uint256 lastExecuted, bool isActive) {
        string memory walletId = _deviceState.addressToWalletId[deviceAddress];
        if (bytes(walletId).length == 0) {
            MedusaErrors.throwValidationError("Device address not registered");
        }
        DeviceRegistration storage registration = _deviceState.deviceRegistrations[walletId];
        return (
            _executionStorage.deviceExecutionCounter[walletId],
            _executionStorage.lastExecutionTimestamp[walletId],
            registration.isActive
        );
    }

    /**
     * @notice Transfers admin role to new address
     * @dev Caller must be current admin, revokes old admin's role
     * @param newAdmin Address of the new admin
     */
    function transferAdminRole(address newAdmin) external {
        if (!hasRole(DEFAULT_ADMIN_ROLE, msg.sender)) {
            MedusaErrors.throwSecurityError("Caller is not admin");
        }
        ValidationLib.validateAddress(newAdmin, "new admin");
        _grantRole(DEFAULT_ADMIN_ROLE, newAdmin);
        _revokeRole(DEFAULT_ADMIN_ROLE, msg.sender);
    }

    /**
     * @notice Gets paginated list of user's archived workflows
     * @param offset Starting position in the list
     * @param limit Maximum number of items to return
     * @param adminAddress Address of the workflow admin
     */
    function getArchivedWorkflows(
        uint256 offset,
        uint256 limit,
        address adminAddress
    ) external view returns (uint256[] memory workflows, uint256 total, bool hasMore) {
        ValidationLib.validateAddress(adminAddress, "workflowAdmin");
        ValidationLib.validatePaginationParams(offset, limit);
        return _workflowStorage.getArchivedWorkflows(offset, limit, adminAddress);
    }

    /**
     * @notice Gets count of archived workflows for a specific admin
     * @param adminAddress Address of the workflow admin
     */
    function getArchivedWorkflowCount(address adminAddress) external view returns (uint256) {
        ValidationLib.validateAddress(adminAddress, "workflowAdmin");
        return _workflowStorage.getArchivedWorkflowCount(adminAddress);
    }

    /**
     * @notice Archives a workflow
     * @param workflowId ID of workflow to archive
     */
    function archiveWorkflow(uint256 workflowId) external nonReentrant whenNotPaused onlyWorkflowOwner(workflowId) {
        _workflowStorage.archiveWorkflow(workflowId, msg.sender);
        emit IWorkflow.WorkflowArchived(workflowId, msg.sender);
    }

    /**
     * @notice Gets all workflow details including active & archived status
     * @param workflowId The workflow ID to query
     */
    function getDetailedWorkflow(
        uint256 workflowId
    )
        external
        view
        workflowExists(workflowId)
        returns (IWorkflow.Workflow memory workflow, bool isArchived, bool isPaused)
    {
        workflow = _workflowStorage.getWorkflow(workflowId);
        isArchived = _workflowStorage.isWorkflowArchived(workflowId, workflow.owner);
        isPaused = _workflowStorage.isWorkflowPaused(workflowId);
        return (workflow, isArchived, isPaused);
    }

    /**
     * @notice Gets paginated list of all workflows (both active and archived)
     * @param offset Starting position in the list
     * @param limit Maximum number of items to return
     * @param adminAddress Address of the workflow admin
     */
    function getAllWorkflows(
        uint256 offset,
        uint256 limit,
        address adminAddress
    ) external view returns (IWorkflow.WorkflowListItem[] memory workflows, uint256 total, bool hasMore) {
        ValidationLib.validateAddress(adminAddress, "workflowAdmin");
        ValidationLib.validatePaginationParams(offset, limit);
        return _workflowStorage.getAllWorkflows(offset, limit, adminAddress);
    }

    /**
     * @notice Checks if device registration is in progress
     * @param walletId The unique identifier of the device
     * @return bool True if registration is in progress
     */
    function isRegistrationInProgress(string calldata walletId) external view returns (bool) {
        return _deviceState.registrationInProgress[keccak256(bytes(walletId))];
    }

    function pause() external onlyRole(MedusaConstants.PAUSER_ROLE) {
        _pause();
    }

    function unpause() external onlyRole(MedusaConstants.PAUSER_ROLE) {
        _unpause();
    }
}
