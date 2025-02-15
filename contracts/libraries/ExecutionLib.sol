// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/utils/math/SafeMath.sol";

/**
 * @title ExecutionLib
 * @author Godson Ani
 * @notice Library handling device execution state tracking
 * @dev Core execution management library for the MedusaRegistry system
 * version 1.0.0-testnet
 * copyright 2025 Medusa Registry. All rights reserved.
 */
library ExecutionLib {
    using SafeMath for uint256;

    struct ExecutionStorage {
        mapping(string => uint256) deviceExecutionCounter;
        mapping(string => uint256) lastExecutionTimestamp;
    }

    function updateExecution(ExecutionStorage storage self, string calldata walletId) internal returns (uint256) {
        uint256 currentTimestamp = block.timestamp;
        uint256 currentCount = self.deviceExecutionCounter[walletId];
        uint256 newCount = currentCount + 1;

        self.lastExecutionTimestamp[walletId] = currentTimestamp;
        self.deviceExecutionCounter[walletId] = newCount;

        return newCount;
    }

    function getLastExecutionTimestamp(ExecutionStorage storage self, string calldata walletId)
        internal
        view
        returns (uint256)
    {
        return self.lastExecutionTimestamp[walletId];
    }

    function getExecutionCount(ExecutionStorage storage self, string calldata walletId)
        internal
        view
        returns (uint256)
    {
        return self.deviceExecutionCounter[walletId];
    }
}
