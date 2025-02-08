// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/security/ReentrancyGuard.sol";

contract MedusaRegistry is Ownable, ReentrancyGuard {
    struct Workflow {
        string ipnsName;
        string ipnsId;
        address creator;
        bool active;
        uint256 contributorCount;
        uint256 timestamp;
    }

    uint256 private _workflowCounter;
    mapping(string => uint256) public deviceExecutionCounter;

    // Workflow mappings
    mapping(uint256 => Workflow) public workflows;

    // workflow ipns filter
    mapping(string => uint256) public ipnsToWorkflowId;
    mapping(uint256 => string) public workflowIdToIpns;

    // user devices by workflow
    mapping(address => mapping(uint256 => string[])) public userWorkflowDevices;

    // device nullifiers
    mapping(string => bool) public registeredDevices;
    mapping(string => mapping(uint256 => bool)) public workflowDevices;

    // Events
    event WorkflowCreated(
        uint256 indexed id,
        address indexed creator,
        string ipnsId
    );
    event DeviceRegistered(
        uint256 indexed workflowId,
        string walletId,
        address indexed userAddress
    );
    event RecordUpdated(
        string indexed walletId,
        uint256 indexed workflowId,
        uint256 executionCount
    );
    event RecordDeactivated(
        uint256 indexed workflowId,
        address indexed deactivator
    );

    error WorkflowNotActive();
    error DeviceAlreadyRegistered();
    error DeviceNotRegistered();
    error DeviceNotRegisteredForWorkflow();
    error InvalidWorkflowId();
    error NotAuthorized();
    error EmptyIPNSData();

    constructor() Ownable(msg.sender) {}

    function createWorkflow(string calldata _ipnsName, string calldata _ipnsId)
        external
        nonReentrant
        returns (uint256)
    {
        if (bytes(_ipnsName).length == 0 || bytes(_ipnsId).length == 0) {
            revert EmptyIPNSData();
        }

        _workflowCounter++;
        uint256 newWorkflowId = _workflowCounter;

        workflows[newWorkflowId] = Workflow({
            creator: msg.sender,
            active: true,
            contributorCount: 0,
            ipnsName: _ipnsName,
            ipnsId: _ipnsId,
            timestamp: block.timestamp
        });

        workflowIdToIpns[newWorkflowId] = _ipnsId;
        ipnsToWorkflowId[_ipnsId] = newWorkflowId;

        emit WorkflowCreated(newWorkflowId, msg.sender, _ipnsId);
        return newWorkflowId;
    }

    function registerDevice(uint256 workflowId, string calldata walletId)
        external
        nonReentrant
    {
        if (!workflows[workflowId].active) {
            revert WorkflowNotActive();
        }
        if (registeredDevices[walletId]) {
            revert DeviceAlreadyRegistered();
        }
        if (bytes(walletId).length == 0) {
            revert EmptyIPNSData();
        }

        userWorkflowDevices[msg.sender][workflowId].push(walletId);
        registeredDevices[walletId] = true;
        workflowDevices[walletId][workflowId] = true;
        workflows[workflowId].contributorCount++;

        emit DeviceRegistered(workflowId, walletId, msg.sender);
    }

    function submitRecord(string calldata walletId, uint256 workflowId)
        external
        nonReentrant
        returns (uint256)
    {
        if (!registeredDevices[walletId]) {
            revert DeviceNotRegistered();
        }
        if (!workflowDevices[walletId][workflowId]) {
            revert DeviceNotRegisteredForWorkflow();
        }
        if (!workflows[workflowId].active) {
            revert WorkflowNotActive();
        }

        deviceExecutionCounter[walletId]++;
        uint256 newCount = deviceExecutionCounter[walletId];

        emit RecordUpdated(walletId, workflowId, newCount);
        return newCount;
    }

    function deactivateWorkflow(uint256 workflowId) external nonReentrant {
        if (workflowId == 0 || workflowId > _workflowCounter) {
            revert InvalidWorkflowId();
        }

        Workflow storage workflow = workflows[workflowId];

        if (!workflow.active) {
            revert WorkflowNotActive();
        }
        if (workflow.creator != msg.sender && owner() != msg.sender) {
            revert NotAuthorized();
        }

        workflow.active = false;
        delete ipnsToWorkflowId[workflow.ipnsId];
        delete workflowIdToIpns[workflowId];

        emit RecordDeactivated(workflowId, msg.sender);
    }

    // View functions for better UX
    function getWorkflowDevices(uint256 workflowId, address user)
        external
        view
        returns (string[] memory)
    {
        return userWorkflowDevices[user][workflowId];
    }

    function isDeviceRegistered(string calldata walletId)
        external
        view
        returns (bool)
    {
        return registeredDevices[walletId];
    }
}
