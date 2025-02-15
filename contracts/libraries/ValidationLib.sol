// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "../utils/Constants.sol";
import "../interfaces/IMedusaRegistryStorage.sol";

/**
 * @title ValidationLib
 * @notice Library for all validation functions
 * @dev Extracted from MedusaRegistry
 */
library ValidationLib {
    error ValidationError(string message);

    function validateString(string memory str, uint256 maxLength, string memory fieldName) internal pure {
        if (bytes(str).length == 0) {
            revert ValidationError(string(abi.encodePacked(fieldName, " cannot be empty")));
        }
        if (bytes(str).length > maxLength) {
            revert ValidationError(string(abi.encodePacked(fieldName, " exceeds max length")));
        }
    }

    function validateAddress(address addr, string memory fieldName) internal pure {
        if (addr == address(0)) {
            revert ValidationError(string(abi.encodePacked(fieldName, " cannot be zero address")));
        }
    }

    function validateDeviceForRecord(
        IMedusaStorage.DeviceRegistration storage registration,
        address sender
    ) internal view returns (bool) {
        if (!registration.isActive) {
            revert ValidationError("Device is not active");
        }
        if (registration.deviceAddress != sender) {
            revert ValidationError("Invalid sender");
        }

        return true;
    }

    function validateExecutionInterval(uint256 interval, uint256 minInterval, uint256 maxInterval) internal pure {
        if (interval < minInterval || interval > maxInterval) {
            revert ValidationError("Invalid execution interval");
        }
    }

    function validateDeviceLimit(uint256 currentCount, uint256 maxLimit) internal pure {
        if (currentCount >= maxLimit) {
            revert ValidationError("Device limit reached");
        }
    }

    function validateExecutionCooldown(
        uint256 currentTimestamp,
        uint256 lastExecution,
        uint256 executionInterval
    ) internal pure {
        if (currentTimestamp < lastExecution + executionInterval || currentTimestamp == lastExecution) {
            revert ValidationError("Execution cooldown period not elapsed");
        }
    }

    function validateExecutionCount(uint256 currentCount) internal pure {
        if (currentCount >= MedusaConstants.MAX_EXECUTIONS) {
            revert ValidationError("Execution limit reached");
        }
        if (currentCount >= type(uint256).max - 1) {
            revert("Execution counter would overflow");
        }
    }

    function validatePartitionIndex(uint256 partitionIndex, uint256 length) internal pure {
        // Validate partition index
        if (partitionIndex >= length) {
            revert ValidationError("Invalid partition index");
        }
    }

    function validatePaginationParams(uint256 offset, uint256 limit) internal pure {
        if (limit == 0) revert ValidationError("Invalid limit");
        if (offset > type(uint256).max - limit) revert ValidationError("Invalid offset");
    }
}
