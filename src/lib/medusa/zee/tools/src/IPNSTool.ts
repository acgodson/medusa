import { z } from "zod";
import { createTool } from "@covalenthq/ai-agent-sdk";
import lighthouse from "@lighthouse-web3/sdk";

export const createIPNSTool = (lighthouseApiKey: string) =>
  createTool({
    id: "storage-tool",
    description: "Store and manage data on IPFS and IPNS via Lighthouse",
    schema: z.object({
      operation: z.enum([
        "upload",
        "generateKey",
        "publishRecord",
        "getAllKeys",
      ]),
      data: z.string().optional(),
      ipnsName: z.string().optional(),
      cid: z.string().optional(),
    }),

    execute: async (params) => {
      try {
        switch (params.operation) {
          case "generateKey":
            const keyResponse = await lighthouse.generateKey(lighthouseApiKey);
            console.log("Generated key response:", keyResponse);
            return JSON.stringify(keyResponse);

          case "publishRecord":
            if (!params.cid || !params.ipnsName) {
              console.error("Missing required params:", { params });
              throw new Error("CID and IPNS name are required for publishing");
            }

            console.log("Attempting to publish with params:", {
              cid: params.cid,
              ipnsName: params.ipnsName,
              apiKeyLength: lighthouseApiKey?.length,
            });

            // Try using the REST API directly since SDK is timing out
            const pubResponse = await fetch(
              `https://api.lighthouse.storage/api/ipns/publish_record?cid=${params.cid}&keyName=${params.ipnsName}`,
              {
                method: "GET",
                headers: {
                  Authorization: `Bearer ${lighthouseApiKey}`,
                  "Content-Type": "application/json",
                },
              }
            );

            if (!pubResponse.ok) {
              const errorText = await pubResponse.text();
              console.error("Publish response error:", {
                status: pubResponse.status,
                statusText: pubResponse.statusText,
                error: errorText,
              });
              throw new Error(
                `Failed to publish: ${pubResponse.status} ${pubResponse.statusText}`
              );
            }

            const publishData = await pubResponse.json();

            return JSON.stringify({
              success: true,
              data: publishData,
            });

          case "getAllKeys":
            const keysResponse = await lighthouse.getAllKeys(lighthouseApiKey);
            console.log("Get all keys response:", keysResponse);
            return JSON.stringify(keysResponse);

          default:
            return JSON.stringify({ error: "Invalid operation" });
        }
      } catch (error: any) {
        console.error("Storage tool error:", error);
        return JSON.stringify({
          error: error.message,
          details: error.toString(),
        });
      }
    },
  });
