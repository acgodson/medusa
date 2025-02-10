import { z } from "zod";
import { createTool } from "@covalenthq/ai-agent-sdk";

const BASE_URL = "https://api.lighthouse.storage/api/ipns";

export const createIPNSTool = (lighthouseApiKey: string) =>
  createTool({
    id: "storage-tool",
    description: "Store and manage data on IPFS and IPNS via Lighthouse API",
    schema: z.object({
      operation: z.enum([
        "upload",
        "generateKey",
        "publishRecord",
        "getAllKeys",
        "removeKey",
      ]),
      data: z.string().optional(),
      ipnsName: z.string().optional(),
      cid: z.string().optional(),
    }),

    execute: async (params: any) => {
      const headers = {
        Authorization: `Bearer ${lighthouseApiKey}`,
        "Content-Type": "application/json",
      };

      try {
        switch (params.operation) {
          case "generateKey":
            const keyResponse = await fetch(`${BASE_URL}/generate_key`, {
              method: "GET",
              headers,
            });

            if (!keyResponse.ok) {
              throw new Error(
                `Failed to generate key: ${keyResponse.status} ${keyResponse.statusText}`
              );
            }

            const keyData = await keyResponse.json();
            console.log("Generated key response:", keyData);
            return JSON.stringify(keyData);

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

            const pubResponse = await fetch(
              `${BASE_URL}/publish_record?cid=${params.cid}&keyName=${params.ipnsName}`,
              {
                method: "GET",
                headers,
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
            const keysResponse = await fetch(`${BASE_URL}/get_ipns_records`, {
              method: "GET",
              headers,
            });

            if (!keysResponse.ok) {
              throw new Error(
                `Failed to get keys: ${keysResponse.status} ${keysResponse.statusText}`
              );
            }

            const keysData = await keysResponse.json();
            console.log("Get all keys response:", keysData);
            return JSON.stringify(keysData);

          case "removeKey":
            if (!params.ipnsName) {
              throw new Error("IPNS name is required for key removal");
            }

            const removeResponse = await fetch(
              `${BASE_URL}/remove_key?keyName=${params.ipnsName}`,
              {
                method: "GET",
                headers,
              }
            );

            if (!removeResponse.ok) {
              throw new Error(
                `Failed to remove key: ${removeResponse.status} ${removeResponse.statusText}`
              );
            }

            const removeData = await removeResponse.json();
            return JSON.stringify({
              success: true,
              data: removeData,
            });

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
