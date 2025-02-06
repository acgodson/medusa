import { PrivyClient } from "@privy-io/server-auth";
import {
  Address,
  Client,
  Hash,
  Hex,
  LocalAccount,
  createPublicClient,
  http,
} from "viem";
import { baseSepolia } from "viem/chains";
import {
  createBundlerClient,
  toCoinbaseSmartAccount,
  createPaymasterClient,
} from "viem/account-abstraction";

export class WalletBridge {
  public privy: PrivyClient;
  private client: Client;

  constructor(appId: string, appSecret: string, rpcUrl: string) {
    this.privy = new PrivyClient(appId, appSecret);
    this.client = createPublicClient({
      chain: baseSepolia,
      transport: http(rpcUrl),
    });
  }

  async createServerSigner(walletId: string): Promise<LocalAccount> {
    const walletInfo = await this.privy.walletApi.getWallet({ id: walletId });
    const privyClient = this.privy;

    const signer: LocalAccount = {
      address: walletInfo.address as Address,
      type: "local",
      source: "privy",
      publicKey: "0x" as Hex,

      async signMessage({ message }: any) {
        const { data } = await privyClient.walletApi.rpc({
          walletId,
          //@ts-ignore
          method: "personal_sign",
          params: { message }
        });
        return data.signature as `0x${string}`;
      },
      
      async signTransaction(transaction: any) {
        const { data }: any = await privyClient.walletApi.rpc({
          walletId,
              //@ts-ignore
          method: "eth_signTransaction",
          params: { transaction }
        });
        return data.signature as `0x${string}`;
      },
      async signTypedData(typedData: any) {
        const response: any = await privyClient.walletApi.rpc({
          walletId,
          //@ts-ignore
          method: "eth_signTypedData_v4",
          params: typedData,
        });
        if ("error" in response) {
          throw new Error(response.error.message);
        }
        return response.data as Hex;
      },
    };

    return signer;
  }

  async createSmartAccount(walletId: string) {
    const serverSigner = await this.createServerSigner(walletId);
    return toCoinbaseSmartAccount({
      client: this.client,
      owners: [serverSigner],
    });
  }

  async executeOperation(walletId: string, contractAddress: Hex, data: Hex) {
    const smartAccount = await this.createSmartAccount(walletId);
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

    return bundlerClient.sendUserOperation({
      account: smartAccount,
      calls: [{ to: contractAddress, data }],
    });
  }
}
