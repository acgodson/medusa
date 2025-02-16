import { PrivyClient } from "@privy-io/server-auth";
import { createViemAccount } from "@privy-io/server-auth/viem";
import {
  Address,
  createPublicClient,
  createWalletClient,
  http,
  PublicClient,
} from "viem";
import { bscTestnet } from "viem/chains";
import { createSmartAccountClient } from "permissionless";
import { toSimpleSmartAccount } from "permissionless/accounts";
import { createPimlicoClient } from "permissionless/clients/pimlico";
import { entryPoint07Address } from "viem/account-abstraction";

export class ServerWallet {
  public privy: PrivyClient;
  private publicClient: PublicClient;
  private smartAccountPromise: Promise<any> | null = null;

  constructor(appId: string, appSecret: string, rpcUrl: string) {
    this.privy = new PrivyClient(appId, appSecret);
    this.publicClient = createPublicClient({
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

        const pimlicoUrl = `https://api.pimlico.io/v2/binance-testnet/rpc?apikey=${process.env.PIMLICO_API_KEY}`;

        // Create Pimlico paymaster client
        const pimlicoPaymaster = createPimlicoClient({
          transport: http(pimlicoUrl),
          entryPoint: {
            address: entryPoint07Address,
            version: "0.7",
          },
        });

        // Initialize the smart account
        const simpleSmartAccount = await toSimpleSmartAccount({
          client: walletClient,
          owner: viemAccount,
          entryPoint: {
            address: entryPoint07Address,
            version: "0.7",
          },
        });

        console.log(simpleSmartAccount);

        // Create bundler and smart account client
        const smartAccountClient = createSmartAccountClient({
          account: simpleSmartAccount,
          chain: bscTestnet,
          bundlerTransport: http(pimlicoUrl),
          paymaster: pimlicoPaymaster,
          userOperation: {
            estimateFeesPerGas: async () => {
              return (await pimlicoPaymaster.getUserOperationGasPrice()).fast;
            },
          },
        });

        return smartAccountClient;
      })();
    }
    return this.smartAccountPromise;
  }

  async getAddress(walletId: string) {

  }

  async executeOperation(
    walletId: string,
    address: Address,
    contractAddress: `0x${string}`,
    data: `0x${string}`
  ) {
    const smartAccountClient = await this.createSmartAccount(walletId, address);

    try {
      console.log("Preparing transaction with params:", {
        smartAccountAddress: smartAccountClient.account.address,
        contractAddress,
        dataLength: data.length,
      });

      // Send the transaction using the smart account client
      const txHash = await smartAccountClient.sendTransaction({
        account: smartAccountClient.account,
        to: contractAddress,
        data: data,
        value: BigInt(0),
      });

      console.log(txHash);

      // Wait for the transaction to be mined
      const receipt = await this.publicClient.waitForTransactionReceipt({
        hash: txHash,
      });

      console.log("receipt transaction hash", receipt.transactionHash);

      return {
        transactionHash: txHash,
        smartAccountAddress: smartAccountClient.account.address,
      };
    } catch (error) {
      console.error("Failed to send transaction:", error);
      throw error;
    }
  }
}
