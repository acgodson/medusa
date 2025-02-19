import {
  bytesFromBase64,
  Client,
  Long,
  RedundancyType,
  VisibilityType,
} from "@bnb-chain/greenfield-js-sdk";
import { ReedSolomon } from "@bnb-chain/reed-solomon";
import { customAlphabet } from "nanoid";

type BroadcastOptions = {
  useServerWallet?: boolean;
  walletId?: string;
};

type FileData = {
  name: string;
  type: string;
  size: number;
  buffer: Buffer;
};

const generateSlug = customAlphabet(
  "0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz",
  6
);

export class GreenfieldStorage {
  private client: Client;
  private adminAddress: string;
  private adminPrivateKey: string;
  private maxRetries = 7;
  private retryDelay = 2000;
  private rs: ReedSolomon;

  constructor(
    rpcUrl: string,
    chainId: string,
    adminAddress: string,
    adminPrivateKey: string
  ) {
    this.client = Client.create(rpcUrl, chainId);
    this.adminAddress = adminAddress;
    this.adminPrivateKey = adminPrivateKey;
    this.rs = new ReedSolomon();
  }

  private async retryOperation(
    operation: () => Promise<any>,
    retries = this.maxRetries
  ): Promise<any> {
    try {
      return await operation();
    } catch (error) {
      if (retries > 0) {
        console.log(
          `Operation failed, retrying... (${this.maxRetries - retries + 1}/${
            this.maxRetries
          })`
        );
        await new Promise((resolve) => setTimeout(resolve, this.retryDelay));
        return this.retryOperation(operation, retries - 1);
      }
      throw error;
    }
  }

  private jsonToFileData(json: object, filename: string): FileData {
    const jsonString = JSON.stringify(json);
    const buffer = Buffer.from(jsonString, "utf-8");
    return {
      name: filename,
      type: "application/json",
      size: buffer.length,
      buffer: buffer,
    };
  }

  private async broadcastTransaction(tx: any, simulateInfo: any) {
    return await tx.broadcast({
      denom: "BNB",
      gasLimit: Number(simulateInfo?.gasLimit),
      gasPrice: simulateInfo?.gasPrice || "5000000000",
      payer: this.adminAddress,
      granter: "",
      privateKey: `0x${this.adminPrivateKey}`,
    });
  }

  async createWorkflowBucket(
    workflowId: string,
    spAddress: string,
    options?: BroadcastOptions
  ) {
    try {
      const bucketName = `workflow-${workflowId}`.toLowerCase();

      const walletAddress = this.adminAddress;

      if (!walletAddress) {
        throw new Error("Failed to get wallet address");
      }

      const tx = await this.client.bucket.createBucket({
        bucketName,
        creator: walletAddress,
        visibility: VisibilityType.VISIBILITY_TYPE_PUBLIC_READ,
        chargedReadQuota: Long.fromString("0"),
        primarySpAddress: spAddress,
        paymentAddress: this.adminAddress,
      });

      const simulateInfo = await this.retryOperation(() =>
        tx.simulate({ denom: "BNB" })
      );

      const response = await this.retryOperation(() =>
        this.broadcastTransaction(tx, simulateInfo)
      );
      console.log("bucket created, txn hash: ", response.transactionHash);
      return {
        bucketName,
        txHash: response.transactionHash,
      };
    } catch (error: any) {
      console.error("Failed to create workflow bucket:", error);
      throw error;
    }
  }

  async createObject(
    bucketName: string,
    data: object,
    options?: BroadcastOptions
  ) {
    try {
      const slug = generateSlug();

      const objectName = `siren-${slug}.json`;

      const fileData = this.jsonToFileData(data, objectName);
      console.log("Storing data:", data);

      const expectCheckSums = this.rs.encode(fileData.buffer);

      const walletAddress = this.adminAddress;

      if (!walletAddress) {
        throw new Error("Failed to get wallet address");
      }

      const operationData = {
        bucketName: bucketName,
        objectName: objectName,
        creator: walletAddress,
        visibility: VisibilityType.VISIBILITY_TYPE_PUBLIC_READ,
        payloadSize: fileData.size,
        expectChecksums: expectCheckSums,
      };

      const tx = await this.client.object.createObject({
        ...operationData,
        contentType: "json",
        payloadSize: Long.fromInt(operationData.payloadSize),
        redundancyType: RedundancyType.REDUNDANCY_EC_TYPE,
        expectChecksums: operationData.expectChecksums.map((x: any) =>
          bytesFromBase64(x)
        ),
      });

      const simulateInfo = await this.retryOperation(() =>
        tx.simulate({ denom: "BNB" })
      );

      const response = await this.retryOperation(() =>
        this.broadcastTransaction(tx, simulateInfo)
      );

      return {
        objectName,
        txHash: response.transactionHash,
      };
    } catch (error: any) {
      console.error("Failed to store data:", error);
      throw error;
    }
  }

  // ... rest of the methods remain the same ...
  async getBucketMetadata(bucketName: string) {
    try {
      const bucketInfo = await this.client.bucket.headBucket(bucketName);
      return bucketInfo;
    } catch (error) {
      console.error("Failed to get bucket metadata:", error);
      throw error;
    }
  }

  async getObjectMetadata(bucketName: string, objectName: string) {
    try {
      const objectInfo = await this.client.object.headObject(
        bucketName,
        objectName
      );
      return objectInfo;
    } catch (error) {
      console.error("Failed to get object metadata:", error);
      throw error;
    }
  }
  async listObjects(bucketName: string) {
    try {
      // Get the primary SP info using the global virtual group family id
      const spInfo = await this.client.sp.getSPUrlByBucket(bucketName);
      const response = await this.client.object.listObjects({
        bucketName,
        endpoint: spInfo,
      });
      return response;
    } catch (error) {
      console.error("Failed to list objects:", error);
      throw error;
    }
  }

  async getObject(bucketName: string, objectName: string) {
    try {
      const { objectInfo }: any = await this.client.object.headObject(
        bucketName,
        objectName
      );

      const metadata = {
        owner: objectInfo.owner,
        bucketName: objectInfo.bucketName,
        objectName: objectInfo.objectName,
        contentType: objectInfo.contentType,
        payloadSize: objectInfo.payloadSize,
        ObjectStatus: objectInfo.ObjectStatus,
        isUpdating: objectInfo.isUpdating,
        createdAt: objectInfo.createdAt,
      };

      const response = await this.client.object.getObject(
        {
          bucketName,
          objectName,
        },
        {
          type: "ECDSA",
          privateKey: `0x${this.adminPrivateKey}`,
        }
      );

      let content: any;

      const text = await (response as any).body.text();
      content = JSON.parse(text);

      console.log("content", content);
      return {
        exists: true,
        hasContent: true,
        content,
        metadata,
        status: "complete",
      };
    } catch (error: any) {
      // If even metadata doesn't exist
      if (error.message?.includes("not found") || error.statusCode === 404) {
        return {
          exists: false,
          hasContent: false,
          message: "Object does not exist",
          status: "not_found",
        };
      }
      console.error("Failed to get object:", error);
      throw error;
    }
  }

  async uploadObject(
    bucketName: string,
    objectName: string,
    data: any,
    txnHash: string
  ) {
    try {
      const preparedData = this.jsonToFileData(data, objectName);
      console.log("Storing data:", data);
      const fileData = preparedData.buffer.toString("base64");
      const buffer = Buffer.from(fileData, "base64");

      console.log("Uploading object:", {
        bucketName,
        objectName,
        size: buffer.length,
      });

      const uploadRes = await this.retryOperation(() =>
        this.client.object.uploadObject(
          {
            bucketName: bucketName,
            objectName: objectName,
            body: {
              name: objectName,
              type: "json",
              size: buffer.length,
              content: buffer,
            },
            txnHash: txnHash,
          },
          {
            //TODO and switch for changing signer
            type: "ECDSA",
            privateKey: `0x${this.adminPrivateKey}`,
          }
        )
      );

      return uploadRes;
    } catch (error) {
      console.error("Failed to upload object:", error);
      throw error;
    }
  }
}
