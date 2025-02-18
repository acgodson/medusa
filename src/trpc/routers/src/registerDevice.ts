import { z } from "zod";
import { ServerWallet } from "@/lib/medusa/wallets/server-smart-wallet";
import { baseProcedure } from "@/trpc/init";
import { PrivyClient } from "@privy-io/server-auth";
import { encodeFunctionData, getAddress } from "viem";
import { bscTestnet } from "viem/chains";
import DeviceNFTArtifacts from "../../../../contracts/artifacts/DeviceNFT.json";

export const registerDevice = baseProcedure
  .input(
    z.object({
      workflowId: z.number(),
      owner: z.string(),
    })
  )
  .mutation(async ({ input }) => {
    try {
      // 1. Create Device Wallet using Privy
      const privy = new PrivyClient(
        process.env.PRIVY_APP_ID!,
        process.env.PRIVY_APP_SECRET!
      );

      const deviceWallet = await privy.walletApi.create({
        chainType: "ethereum",
      });

      const walletId = deviceWallet.id;
      const eoa = deviceWallet.address;

      if (!walletId || !eoa) {
        throw new Error("Error creating server wallet");
      }

      // 2. Create server Smart Wallet Instance
      const serverWallet = new ServerWallet(
        process.env.PRIVY_APP_ID!,
        process.env.PRIVY_APP_SECRET!,
        bscTestnet.rpcUrls.default.http[0]
      );

      // 3. Add Device to NFT Contract
      const nftData = encodeFunctionData({
        abi: DeviceNFTArtifacts.abi,
        functionName: "addDevice",
        args: [getAddress(input.owner)],
      });

      const nftTxn = await serverWallet.executeOperation(
        walletId,
        eoa as `0x${string}`,
        process.env.DEVICE_NFT_CONTRACT as `0x${string}`,
        nftData
      );
      return {
        status: "device_created",
        walletId,
        address: nftTxn.smartAccountAddress,
        nftTxHash: nftTxn.transactionHash,
      };
    } catch (error: any) {
      console.error("Device registration failed:", error);
      throw new Error(`Failed to register device: ${error.message}`);
    }
  });

//       const response = await fetch("https://api.privy.io/v1/wallets", {
//         method: "POST",
//         headers: {
//           Authorization: `Basic ${Buffer.from(
//             `${process.env.PRIVY_APP_ID}:${process.env.PRIVY_APP_SECRET}`
//           ).toString("base64")}`,
//           "privy-app-id": process.env.PRIVY_APP_ID!,
//           "Content-Type": "application/json",
//         },
//         body: JSON.stringify({
//           chain_type: "ethereum",
//           // policy_ids: [process.env.PRIVY_POLICY_ID],
//         }),
//       });

//       const walletData = await response.json();
//       const walletId = walletData.id;
//       const address = walletData.address;
