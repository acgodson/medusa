// import { createIPNSTool } from "@/lib/medusa/zee/tools";

export class LighthouseAPI {
  private apiKey: string;
  private baseUrl = "https://node.lighthouse.storage/api"; // For file uploads
  private ipnsUrl = "https://api.lighthouse.storage/api"; // For IPNS operations

  constructor(apiKey: string) {
    this.apiKey = apiKey;
  }

  async uploadText(content: string): Promise<{ Hash: string }> {
    const formData = new FormData();
    const blob = new Blob([content], { type: "application/json" });
    formData.append("file", blob);

    const response = await fetch(`${this.baseUrl}/v0/add`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${this.apiKey}`,
      },
      body: formData,
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Upload failed: ${response.status} - ${errorText}`);
    }

    const result = await response.json();
    return result;
  }

  async generateKey(): Promise<{ name: string; id: string }> {
    const response = await fetch(`${this.ipnsUrl}/ipns/generate_key`, {
      method: "GET",
      headers: {
        Authorization: `Bearer ${this.apiKey}`,
      },
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error("Generate key error response:", errorText);
      throw new Error(
        `Failed to generate key: ${response.status} - ${errorText}`
      );
    }

    const result = await response.json();
    console.log("Generate key response:", result);

    // The API returns the key details directly, not nested under 'data'
    return {
      name: result.ipnsName,
      id: result.ipnsId,
    };
  }

  async publishRecord(cid: string, keyName: string): Promise<any> {
    const response = await fetch(
      `${this.ipnsUrl}/ipns/publish_record?cid=${cid}&keyName=${keyName}`,
      {
        method: "GET",
        headers: {
          Authorization: `Bearer ${this.apiKey}`,
        },
      }
    );

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(
        `Failed to publish record: ${response.status} - ${errorText}`
      );
    }

    return response.json();
  }

  async handleIpnsOperations(cid: string) {
    try {
      // Generate a new IPNS key
      const keyResponse = await this.generateKey();
      console.log("Generated key:", keyResponse);

      if (!keyResponse?.name || !keyResponse?.id) {
        throw new Error("Invalid key response format");
      }

      // Publish the record
      const publishResponse = await this.publishRecord(cid, keyResponse.name);
      console.log("Publish response:", publishResponse);

      return {
        ipnsName: keyResponse.name,
        ipnsId: keyResponse.id,
      };
    } catch (error) {
      console.error("IPNS operations error:", error);
      throw error;
    }
  }
}
