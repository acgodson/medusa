import { PrivyClient } from "@privy-io/server-auth";
import { createViemAccount } from "@privy-io/server-auth/viem";
import {
  Address,
  Client,
  createPublicClient,
  createWalletClient,
  http,
} from "viem";
import { bscTestnet } from "viem/chains";
import {
  BiconomySmartAccountV2,
  createPaymaster,
  createSmartAccountClient,
  IPaymaster,
  Paymaster,
  PaymasterMode,
} from "@biconomy/account";

export class ServerWallet {
  public privy: PrivyClient;
  private client: Client;
  private smartAccountPromise: Promise<any> | null = null;

  constructor(appId: string, appSecret: string, rpcUrl: string) {
    this.privy = new PrivyClient(appId, appSecret);
    this.client = createPublicClient({
      chain: bscTestnet,
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

        // Create a wallet client from the viem account
        const walletClient = createWalletClient({
          account: viemAccount,
          chain: bscTestnet,
          transport: http(),
        });

        console.log("Wallet client created for address:", viemAccount.address);

        if (
          !process.env.BICONOMY_BUNDLER_URL ||
          !process.env.BICONOMY_PAYMASTER_URL
        ) {
          throw new Error("Missing Biconomy configuration");
        }

        const biconomyPaymaster: IPaymaster = await createPaymaster({
          paymasterUrl: process.env.BICONOMY_PAYMASTER_URL!,
          strictMode: true,
        });

        // Create Biconomy smart account
        const smartAccount = await createSmartAccountClient({
          signer: walletClient,
          bundlerUrl: process.env.BICONOMY_BUNDLER_URL,
          biconomyPaymasterApiKey: process.env.BICONOMY_PAYMASTER_API_KEY,
          chainId: bscTestnet.id,
          paymasterUrl: process.env.BICONOMY_PAYMASTER_URL,
          paymaster: biconomyPaymaster,
        });

        const smartAccountAddress = await smartAccount.getAccountAddress();
        console.log("Smart account created at address:", smartAccountAddress);

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
    const smartAccount: BiconomySmartAccountV2 = await this.createSmartAccount(
      walletId,
      address
    );

    try {
      console.log("Preparing transaction with params:", {
        smartAccountAddress: await smartAccount.getAccountAddress(),
        contractAddress,
        dataLength: data.length,
      });

      const tx = {
        to: contractAddress as `0x${string}`,
        data: data,
      };
      const userOpParams = {
        paymasterServiceData: {
          mode: PaymasterMode.SPONSORED,
          calculateGasLimits: true,
          smartAccountInfo: {
            name: "BICONOMY",
            version: "2.0.0",
          },
        },
      };

      const smartAccountAddress = await smartAccount.getAccountAddress();

      const biconomyPaymaster: IPaymaster = await createPaymaster({
        paymasterUrl: process.env.BICONOMY_PAYMASTER_URL!,
        strictMode: true,
      });

      let userOp: any;

      userOp = {
        sender: smartAccountAddress,
        nonce: 1,
        callData: data,
        paymasterServiceData: {
          mode: PaymasterMode.SPONSORED,
          calculateGasLimits: true,
          smartAccountInfo: {
            name: "BICONOMY",
            version: "2.0.0",
          },
        },
      };

      // const paymasterAndDataResponse =
      // await biconomyPaymaster.getPaymasterAndData(userOp);

      // userOp.paymasterAndData = paymasterAndDataResponse.paymasterAndData;

      console.log("Building user operation with params:", userOp);

      // Build the user operation
      // const userrOp = await smartAccount.buildUserOp([tx], userOpParams);

      // Send the user operation
      // const userOpResponse = await smartAccount.sendUserOp(userrOp);

      const userOpResponse = await smartAccount.sendTransaction([tx], {
        paymasterServiceData: {
          mode: PaymasterMode.SPONSORED,
          calculateGasLimits: true,
          smartAccountInfo: {
            name: "BICONOMY",
            version: "2.0.0",
          },
        },
      });

      // Wait for transaction
      const transactionDetails = await userOpResponse.wait();

      return {
        userOpHash: userOpResponse.userOpHash,
        transactionHash: transactionDetails.receipt.transactionHash,
        smartAccountAddress,
      };
    } catch (error) {
      console.error("Failed to send user operation:", error);
      throw error;
    }
  }
}
