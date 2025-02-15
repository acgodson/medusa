// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

/**
 * @title MedusaErrors
 * @notice Library containing all error definitions used in MedusaRegistry
 * @dev Extracted from MedusaRegistry without any modifications
 */
library MedusaErrors {
    // General errors
    error GenericError(string message);
    error InvalidInput(string message);
    error SecurityError(string message);
    error ValidationError(string message);
    
    // Helper functions to standardize error messages
    function throwGenericError(string memory message) internal pure {
        revert GenericError(message);
    }

    function throwInvalidInput(string memory message) internal pure {
        revert InvalidInput(message);
    }

    function throwSecurityError(string memory message) internal pure {
        revert SecurityError(message);
    }

    function throwValidationError(string memory message) internal pure {
        revert ValidationError(message);
    }
}