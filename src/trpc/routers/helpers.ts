import { createIPNSTool } from "@/lib/medusa/zee/tools";

export class RouterHelper {
  private storageTool;

  constructor(lighthouseApiKey: string) {
    this.storageTool = createIPNSTool(lighthouseApiKey);
  }

  async handleIpnsOperations(cid: string, ipnsName?: string) {
    try {
      // Generate IPNS key if not provided
      if (!ipnsName) {
        console.log("No IPNS name provided, generating new key...");
        const keyResult = await this.storageTool.execute({
          operation: "generateKey",
        });

        console.log("Key generation result:", keyResult);

        // Parse and verify the key response
        const parsed = JSON.parse(keyResult);
        if (!parsed?.data?.ipnsName) {
          console.error("Invalid key generation response:", parsed);
          throw new Error("Failed to generate IPNS key: Invalid response");
        }
        ipnsName = parsed.data.ipnsName;
      }

      console.log("Publishing to IPNS with:", { cid, ipnsName });

      // Publish to IPNS
      const publishResult = await this.storageTool.execute({
        operation: "publishRecord",
        cid,
        ipnsName,
      });

      console.log("Publish result:", publishResult);

      // Verify publish response
      const publishResponse = JSON.parse(publishResult);
      if (publishResponse.error) {
        throw new Error(`Publish failed: ${publishResponse.error}`);
      }

      if (!publishResponse?.success && !publishResponse?.data) {
        console.error("Invalid publish response:", publishResponse);
        throw new Error("Failed to publish to IPNS: Invalid response");
      }

      return {
        ipnsName,
        ipnsId: publishResponse.data.Name,
        ipnsGatewayUrl: `https://gateway.lighthouse.storage/ipns/${publishResponse.data.Name}`,
      };
    } catch (error) {
      console.error("IPNS operation error:", error);
      throw new Error(
        `IPNS operations failed: ${
          error instanceof Error ? error.message : "Unknown error"
        }`
      );
    }
  }

  async getAllKeys() {
    try {
      const keysResult = await this.storageTool.execute({
        operation: "getAllKeys",
      });
      return JSON.parse(keysResult);
    } catch (error) {
      console.error("Failed to get IPNS keys:", error);
      throw error;
    }
  }
}
