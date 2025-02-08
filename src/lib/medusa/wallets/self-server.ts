import { PrivyClient } from "@privy-io/server-auth";
import {
  Address,
  Client,
  Hash,
  Hex,
  LocalAccount,
  SignableMessage,
  TypedDataDefinition,
  createPublicClient,
  encodeAbiParameters,
  http,
  parseGwei,
} from "viem";
import { baseSepolia } from "viem/chains";
import {
  createBundlerClient,
  toCoinbaseSmartAccount,
  createPaymasterClient,
} from "viem/account-abstraction";

// Extend the base account type to include raw signing
interface ExtendedAccount extends LocalAccount {
  rawSign?: (message: Hex) => Promise<Hex>;
}

export class WalletBridge {
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

  async createServerSigner(walletId: string): Promise<ExtendedAccount> {
    const walletInfo = await this.privy.walletApi.getWallet({ id: walletId });
    const privyClient = this.privy;

    const bridgeInstance = this;

    const signer: ExtendedAccount | any = {
      address: walletInfo.address as Address,
      type: "local",

      async signMessage({ message }: { message: SignableMessage }) {
        console.log("Signing message:", message);
        try {
          const response: any = await privyClient.walletApi.rpc({
            walletId,
            //@ts-ignore
            method: "personal_sign",
            //@ts-ignore
            params: [
              typeof message === "string" ? message : message.raw.toString(),
              walletInfo.address,
            ],
          });

          if (!response || !response.data || !response.data.signature) {
            throw new Error("Invalid signature response");
          }

          const signature = response.data.signature;
          return signature.startsWith("0x")
            ? (signature as Hex)
            : (`0x${signature}` as Hex);
        } catch (error) {
          console.error("signMessage failed:", error);
          throw error;
        }
      },

      async signTransaction(transaction: any) {
        console.log("Signing transaction:", transaction);
        try {
          const response: any = await privyClient.walletApi.rpc({
            walletId,
            //@ts-ignore
            method: "eth_signTransaction",
            //@ts-ignore
            params: {
              transaction: {
                ...transaction,
                chainId: baseSepolia.id, // Make sure chainId is included
              },
            },
          });

          if (!response || !response.data || !response.data.signature) {
            throw new Error("Invalid signature response");
          }

          const signature: any = response.data.signature;
          return signature.startsWith("0x")
            ? (signature as Hex)
            : (`0x${signature}` as Hex);
        } catch (error) {
          console.error("signTransaction failed:", error);
          throw error;
        }
      },

      async signTypedData<
        const TTypedData extends TypedDataDefinition | Record<string, unknown>,
        TPrimaryType extends
          | keyof TTypedData
          | "EIP712Domain" = keyof TTypedData
      >(typedData: TypedDataDefinition<TTypedData, TPrimaryType>) {
        console.log("Signing typed data:", typedData);
        try {
          const response: any = await privyClient.walletApi.rpc({
            walletId,
            //@ts-ignore
            method: "eth_signTypedData_v4",
            //@ts-ignore
            params: [walletInfo.address, JSON.stringify(typedData)],
          });

          if (!response || !response.data || !response.data.signature) {
            throw new Error("Invalid signature response");
          }

          const signature = response.data.signature;
          return signature.startsWith("0x")
            ? (signature as Hex)
            : (`0x${signature}` as Hex);
        } catch (error) {
          console.error("signTypedData failed:", error);
          throw error;
        }
      },

      async rawSign(message: Hex) {
        console.log("Raw signing message:", message);
        try {
          const response: any = await privyClient.walletApi.rpc({
            walletId,
            method: "personal_sign",
            params: { message },
          });

          if (!response?.data?.signature) {
            throw new Error("Invalid signature response");
          }

          const signature = response.data.signature;
          return signature.startsWith("0x")
            ? (signature as Hex)
            : (`0x${signature}` as Hex);
        } catch (error: any) {
          console.error("Raw sign failed:", error);
          throw error;
        }
      },
    };

    // Add sign method that uses rawSign
    signer.sign = async ({ hash }: { hash: Hash }) => {
      if (!signer.rawSign) {
        throw new Error("Raw signing not supported");
      }
      console.log("Sign called with hash:", hash);
      return signer.rawSign(hash);
    };

    return signer;
  }

  async createSmartAccount(walletId: string) {
    if (!this.smartAccountPromise) {
      this.smartAccountPromise = (async () => {
        console.log("Creating smart account for wallet:", walletId);
        const serverSigner = await this.createServerSigner(walletId);
        console.log(
          "Server signer created with methods:",
          Object.keys(serverSigner)
        );

        if (!serverSigner.sign) {
          throw new Error("Signer must implement sign method");
        }

        const smartAccount = await toCoinbaseSmartAccount({
          client: this.client,
          owners: [serverSigner as LocalAccount],
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

      // const userOp = await bundlerClient.sendUserOperation({
      //   account: smartAccount,
      //   calls: [{ to: contractAddress, data }],
      //   maxFeePerGas,
      //   maxPriorityFeePerGas,
      //   callGasLimit,
      //   verificationGasLimit,
      //   preVerificationGas,
      // });

      const preparedOp = await bundlerClient.prepareUserOperation({
        account: smartAccount,
        calls: [{ to: contractAddress, data }],
        maxFeePerGas,
        maxPriorityFeePerGas,
        callGasLimit,
        verificationGasLimit,
        preVerificationGas,
      });

      // Compare with your signature
      const sign = await smartAccount.signUserOperation(preparedOp);

      const x = await bundlerClient.sendUserOperation({
        account: smartAccount,
        calls: [{ to: contractAddress, data }],
        maxFeePerGas,
        maxPriorityFeePerGas,
        callGasLimit,
        verificationGasLimit,
        preVerificationGas,
        signature: sign,
      });
    } catch (error) {
      console.error("Failed to send user operation:", error);
      throw error;
    }
  }
}
