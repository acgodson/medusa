import { PrivyClient } from "@privy-io/server-auth";
import { Client, Hex, createPublicClient, http, parseGwei } from "viem";
import { baseSepolia } from "viem/chains";

export class ServerWallet {
  public privy: PrivyClient;
  private client: Client | any;

  constructor(appId: string, appSecret: string, rpcUrl: string) {
    this.privy = new PrivyClient(appId, appSecret);
    this.client = createPublicClient({
      chain: baseSepolia,
      transport: http(rpcUrl),
    });
  }

  async selfBroadcast(signResult: any) {
    // const publicClient = createPublicClient({
    //   chain: baseSepolia,
    //   transport: http(
    //     `https://api.developer.coinbase.com/rpc/v1/base-sepolia/${process.env.NEXT_PUBLIC_COINBASE_RPC}`
    //   ),
    // });
    // broadcast signed transaction using the public client
    const hash = await this.client.sendRawTransaction({
      serializedTransaction: signResult.signedTransaction as Hex,
    });
    const receipt = await this.client.waitForTransactionReceipt({ hash });
    console.log(receipt);
    return {
      success: true,
      transactionHash: hash,
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
        maxFeePerGas: "0x59682f00",
        maxPriorityFeePerGas: "0x4a817c80",
        gasLimit: "0xf4240",
        value: 0,
        nonce: `0x${nonce.toString(16)}`,
      },
    });

    if (!signResult?.signedTransaction) {
      throw new Error("Failed to get signed transaction from Privy wallet");
    }

    return await this.selfBroadcast(signResult);
  }
}
