import { PrivyClient } from "@privy-io/server-auth";
import { createViemAccount } from "@privy-io/server-auth/viem";
import { Address, Client, createPublicClient, http, parseGwei } from "viem";
import { baseSepolia } from "viem/chains";
import {
  createBundlerClient,
  toCoinbaseSmartAccount,
  createPaymasterClient,
} from "viem/account-abstraction";

export class ServerWallet {
  public privy: PrivyClient;
  private client: Client;
  private smartAccountPromise: Promise<any> | null = null;

  constructor(appId: string, appSecret: string, rpcUrl: string) {
    this.privy = new PrivyClient(appId, appSecret);
    this.client = createPublicClient({
      chain: baseSepolia,
      transport: http(rpcUrl),
    });
  }

  async createSmartAccount(walletId: string, address: Address) {
    if (!this.smartAccountPromise) {
      this.smartAccountPromise = (async () => {
        console.log("Creating smart account for wallet:", walletId);

        // Create viem account using Privy's helper
        const viemAccount = await createViemAccount({
          walletId,
          address,
          privy: this.privy,
        });

        console.log("Viem account created:", {
          address: viemAccount.address,
          type: viemAccount.type,
        });

        const smartAccount = await toCoinbaseSmartAccount({
          client: this.client,
          owners: [viemAccount], // Use the viem account as the signer
        });

        console.log("Smart account created:", {
          address: smartAccount.address,
          type: smartAccount.type,
          methods: Object.keys(smartAccount),
        });

        return smartAccount;
      })();
    }
    return this.smartAccountPromise;
  }

  async executeOperation(
    walletId: string,
    address: Address,
    contractAddress: `0x${string}`,
    data: `0x${string}`
  ) {
    const smartAccount = await this.createSmartAccount(walletId, address);

    const paymasterClient = createPaymasterClient({
      transport: http(
        `https://api.developer.coinbase.com/rpc/v1/base-sepolia/${process.env.NEXT_PUBLIC_COINBASE_RPC}`
      ),
    });

    const bundlerClient = createBundlerClient({
      chain: baseSepolia,
      paymaster: paymasterClient,
      transport: http(
        `https://api.developer.coinbase.com/rpc/v1/base-sepolia/${process.env.NEXT_PUBLIC_COINBASE_RPC}`
      ),
    });

    const callGasLimit = parseGwei("0.005");
    const verificationGasLimit = parseGwei("0.003");
    const preVerificationGas = parseGwei("0.002");
    const maxFeePerGas = parseGwei("0.25");
    const maxPriorityFeePerGas = parseGwei("0.05");

    try {
      console.log("Preparing user operation with params:", {
        smartAccountAddress: smartAccount.address,
        contractAddress,
        dataLength: data.length,
      });

      const preparedOp = await bundlerClient.prepareUserOperation({
        account: smartAccount,
        calls: [{ to: contractAddress, data }],
        maxFeePerGas,
        maxPriorityFeePerGas,
        callGasLimit,
        verificationGasLimit,
        preVerificationGas,
      });

      const signature = await smartAccount.signUserOperation(preparedOp);

      return await bundlerClient.sendUserOperation({
        account: smartAccount,
        calls: [{ to: contractAddress, data }],
        maxFeePerGas,
        maxPriorityFeePerGas,
        callGasLimit,
        verificationGasLimit,
        preVerificationGas,
        signature,
      });
    } catch (error) {
      console.error("Failed to send user operation:", error);
      throw error;
    }
  }
}
