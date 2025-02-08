import { createDataStorageTool } from "./tools/dataStorageTool";
import { createIPNSTool } from "./tools/IPNSTool";
import { createPrivyWalletTool } from "./tools/privyWalletTool";
import { createProcessingTool } from "./tools/sensorProcessingTool";
import { createSmartWalletTool } from "./tools/smartWalletTool";
import { keccak256, encodeAbiParameters, Hex } from "viem";

export {
  createDataStorageTool,
  createPrivyWalletTool,
  createIPNSTool,
  createSmartWalletTool,
  createProcessingTool,
};


export function getUserOpHash(userOp: any, entryPoint: Hex) {
  return keccak256(
    encodeAbiParameters(
      [
        { type: "address" }, // sender
        { type: "uint256" }, // nonce
        { type: "bytes" }, // initCode
        { type: "bytes" }, // callData
        { type: "uint256" }, // callGasLimit
        { type: "uint256" }, // verificationGasLimit
        { type: "uint256" }, // preVerificationGas
        { type: "uint256" }, // maxFeePerGas
        { type: "uint256" }, // maxPriorityFeePerGas
        { type: "bytes" }, // paymasterAndData
      ],
      [
        userOp.sender,
        userOp.nonce,
        userOp.initCode || "0x",
        userOp.callData,
        userOp.callGasLimit,
        userOp.verificationGasLimit,
        userOp.preVerificationGas,
        userOp.maxFeePerGas,
        userOp.maxPriorityFeePerGas,
        userOp.paymasterAndData || "0x",
      ]
    )
  );
}