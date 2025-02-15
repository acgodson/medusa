// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

/**
 * @title MedusaConstants
 * @notice Library containing all constants used in MedusaRegistry
 * @dev System limitations and boundaries for testnet deployment
 *
 * Storage and Device Limitations:
 * @dev ABSOLUTE_MAX_DEVICES_PER_WORKFLOW: Maximum number of devices allowed per workflow
 * Set to 1000 for testnet to prevent DOS attacks and ensure manageable gas costs
 *
 * @dev MAX_PARTITIONS: Maximum number of partitions per workflow storage
 * Set to 10 for testnet to limit storage fragmentation and maintain efficient operations
 *
 * @dev CLEANUP_BATCH_SIZE: Number of devices processed in each cleanup operation
 * Set to 20 for testnet to ensure cleanup operations complete within block gas limits
 *
 * @dev DEVICES_PER_PARTITION: Maximum devices stored in each partition
 * Set to 100 for testnet to balance between storage efficiency and gas costs
 *
 * Time-based Limitations:
 * @dev STORAGE_LOCK_TIMEOUT: Maximum duration a storage lock can be held
 * @dev MIN_EXECUTION_INTERVAL: Minimum time between device executions
 * @dev MAX_EXECUTION_INTERVAL: Maximum time between device executions
 *
 * These constants are specifically tuned for testnet deployment and may be
 * adjusted for mainnet based on performance analysis and gas optimization data.
 */
library MedusaConstants {
    // Role constants
    bytes32 public constant BLACKLIST_ROLE = keccak256("BLACKLIST_ROLE");
    bytes32 public constant PAUSER_ROLE = keccak256("PAUSER_ROLE");

    // String and size limits
    uint256 internal constant MAX_STRING_LENGTHS = 64;
    uint256 public constant MAX_DESCRIPTION_LENGTH = 256;
    uint256 public constant MIN_PARTITION_SIZE = 100;

    //Workflow limits
    uint256 public constant MAX_WORKFLOWS_PER_ADMIN = 100;
    uint256 public constant MAX_PAGE_SIZE = 20;

    // Device limits
    uint256 public constant ABSOLUTE_MAX_DEVICES_PER_WORKFLOW = 1000;
    uint256 public constant MAX_DEVICE_LIMIT = 10000;
    uint256 public constant MAX_EXECUTIONS = 2 ** 32;

    // Time-related constants
    uint256 public constant MIN_CLEANUP_THRESHOLD = 30 days;
    uint256 public constant MAX_CLEANUP_THRESHOLD = 365 days;
    uint256 public constant MIN_EXECUTION_INTERVAL = 1 minutes;
    uint256 public constant MAX_EXECUTION_INTERVAL = 1 days;

    // Cleanup constants
    uint256 public constant CLEANUP_MAX_ITERATIONS = 50;

    // Storage constants
    uint256 public constant DEVICES_PER_PARTITION = 100;
    uint256 public constant MAX_PARTITIONS = 10;
    uint256 public constant CLEANUP_BATCH_SIZE = 20;
    uint256 public constant STORAGE_LOCK_TIMEOUT = 2 minutes;
}
