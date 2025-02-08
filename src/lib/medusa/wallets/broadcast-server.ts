import { PrivyClient } from "@privy-io/server-auth";
import {
  Client,
  Hex,
  createPublicClient,
  createWalletClient,
  http,
  parseGwei,
} from "viem";
import { baseSepolia } from "viem/chains";
import {
  createBundlerClient,
  toCoinbaseSmartAccount,
  createPaymasterClient,
} from "viem/account-abstraction";
import { privateKeyToAccount } from "viem/accounts";

export class WalletBridge {
  public privy: PrivyClient;
  private client: Client;
  private smartAccountPromise: Promise<any> | null = null;
  private adminAccount: any;

  constructor(
    appId: string,
    appSecret: string,
    rpcUrl: string,
    adminPrivateKey: string
  ) {
    this.privy = new PrivyClient(appId, appSecret);
    this.client = createPublicClient({
      chain: baseSepolia,
      transport: http(rpcUrl),
    });
    // Create admin account from private key
    this.adminAccount = privateKeyToAccount(adminPrivateKey as `0x${string}`);
  }

  async createSmartAccount() {
    if (!this.smartAccountPromise) {
      this.smartAccountPromise = (async () => {
        const smartAccount = await toCoinbaseSmartAccount({
          client: this.client,
          owners: [this.adminAccount],
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

  async localBroadcast(account: any, contractAddress: string, signResult: any) {
    // Use the admin account directly
    const publicClient = createPublicClient({
      chain: baseSepolia,
      transport: http(
        `https://api.developer.coinbase.com/rpc/v1/base-sepolia/${process.env.NEXT_PUBLIC_COINBASE_RPC}`
      ),
    });

    // Then broadcast the signed transaction using the public client
    const hash = await publicClient.sendRawTransaction({
      serializedTransaction: signResult.signedTransaction as Hex,
    });

    const receipt = await publicClient.waitForTransactionReceipt({ hash });

    console.log(receipt);
    return {
      success: true,
      transactionHash: hash,
      //   receipt,
    };
  }

  async executeOperation(walletId: string, contractAddress: Hex, data: Hex) {
    // Get the Privy wallet address first
    const walletInfo = await this.privy.walletApi.getWallet({ id: walletId });
    if (!walletInfo?.address) {
      throw new Error("Could not get wallet address");
    }

    const publicClient = createPublicClient({
      chain: baseSepolia,
      transport: http(
        `https://api.developer.coinbase.com/rpc/v1/base-sepolia/${process.env.NEXT_PUBLIC_COINBASE_RPC}`
      ),
    });

    // Get the current nonce for this address
    const nonce = await publicClient.getTransactionCount({
      address: walletInfo.address as `0x${string}`,
    });

    // First, get Privy to sign the transaction
    const signResult = await this.privy.walletApi.ethereum.signTransaction({
      walletId,
      transaction: {
        to: contractAddress,
        data: data,
        chainId: baseSepolia.id,
        // type: 2, // EIP-1559
        maxFeePerGas: "0x59682f00",
        maxPriorityFeePerGas: "0x4a817c80", // 2 Gwei
        gasLimit: "0xf4240",
        value: 0,
        nonce: `0x${nonce.toString(16)}`,
      },
    });

    if (!signResult?.signedTransaction) {
      throw new Error("Failed to get signed transaction from Privy wallet");
    }

    return await this.localBroadcast(
      this.adminAccount,
      contractAddress,
      signResult
    );

    const smartAccount = await this.createSmartAccount();

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

    try {
      const callGasLimit = parseGwei("0.005");
      const verificationGasLimit = parseGwei("0.003");
      const preVerificationGas = parseGwei("0.002");
      const maxFeePerGas = parseGwei("0.25");
      const maxPriorityFeePerGas = parseGwei("0.05");

      // Then send with all the parameters from prepared operation
      const userOpHash = await bundlerClient.sendUserOperation({
        account: smartAccount,
        calls: [{ to: contractAddress, data }],
        maxFeePerGas,
        maxPriorityFeePerGas,
        callGasLimit,
        verificationGasLimit,
        preVerificationGas,
      });

      const receipt = await bundlerClient.waitForUserOperationReceipt({
        hash: userOpHash,
      });

      // Convert BigInt values to strings in the receipt
      const convertBigInts = (obj: any): any => {
        if (obj === null) return null;
        if (typeof obj === "bigint") return obj.toString();
        if (Array.isArray(obj)) return obj.map(convertBigInts);
        if (typeof obj === "object") {
          return Object.fromEntries(
            Object.entries(obj).map(([key, value]) => [
              key,
              convertBigInts(value),
            ])
          );
        }
        return obj;
      };

      const serializedReceipt = convertBigInts({
        userOpHash: receipt.userOpHash,
        receipt: receipt.receipt,
        logs: receipt.logs,
      });

      return {
        success: true,
        transactionHash: userOpHash,
        receipt: serializedReceipt,
      };
    } catch (error) {
      console.error("Failed to send user operation:", error);
      throw error;
    }
  }
}
