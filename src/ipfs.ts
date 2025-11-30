/**
 * IPFS integration for PROOF Protocol
 * Uses kubo-rpc-client for data storage
 */

import { create as createKuboClient, KuboRPCClient } from 'kubo-rpc-client';
import { CID } from 'multiformats/cid';

export interface IPFSConfig {
  host?: string;
  port?: number;
  protocol?: string;
  headers?: Record<string, string>;
  timeout?: number;
}

export interface IPFSUploadResult {
  cid: string;
  url: string;
  size: number;
  timestamp: number;
}

export class IPFSService {
  private client: KuboRPCClient;
  private gatewayUrl: string;

  constructor(config: IPFSConfig = {}) {
    // Default to Infura IPFS for production reliability
    const authHeader = process.env.INFURA_IPFS_API_KEY
      ? `Basic ${Buffer.from(
          `${process.env.INFURA_PROJECT_ID}:${process.env.INFURA_IPFS_API_KEY}`
        ).toString('base64')}`
      : '';

    const headers: Record<string, string> = config.headers || {};
    if (authHeader) {
      headers.authorization = authHeader;
    }

    const defaultConfig = {
      host: config.host || 'ipfs.infura.io',
      port: config.port || 5001,
      protocol: config.protocol || 'https',
      headers,
      timeout: config.timeout || 60000 // 1 minute timeout
    };

    // Create Kubo RPC client
    this.client = createKuboClient({
      url: `${defaultConfig.protocol}://${defaultConfig.host}:${defaultConfig.port}`,
      headers: defaultConfig.headers,
      timeout: defaultConfig.timeout
    });

    // Set gateway URL for retrieving content
    this.gatewayUrl = process.env.IPFS_GATEWAY_URL || 'https://ipfs.io/ipfs/';
  }

  /**
   * Upload data to IPFS
   * @param data The data to upload (object will be JSON stringified)
   * @param options Upload options
   * @returns IPFS upload result with CID and URL
   */
  async upload(data: any, options: { encrypt?: boolean } = {}): Promise<IPFSUploadResult> {
    try {
      // Convert data to JSON string if it's an object
      const content = typeof data === 'string' ? data : JSON.stringify(data, null, 2);

      // Optional encryption before upload
      let finalContent = content;
      if (options.encrypt && process.env.ENCRYPTION_KEY) {
        finalContent = await this.encrypt(content);
      }

      // Add to IPFS
      const result = await this.client.add(
        {
          content: Buffer.from(finalContent),
          path: 'proof-record.json'
        },
        {
          pin: true, // Pin the content to prevent garbage collection
          cidVersion: 1, // Use CIDv1 for better compatibility
          wrapWithDirectory: false
        }
      );

      // Return upload result
      return {
        cid: result.cid.toString(),
        url: `${this.gatewayUrl}${result.cid.toString()}`,
        size: result.size,
        timestamp: Date.now()
      };
    } catch (error: any) {
      console.error('IPFS upload error:', error);
      throw new Error(`Failed to upload to IPFS: ${error.message}`);
    }
  }

  /**
   * Retrieve data from IPFS
   * @param cid The Content Identifier
   * @param options Retrieval options
   * @returns The stored data
   */
  async retrieve(cid: string, options: { decrypt?: boolean } = {}): Promise<any> {
    try {
      // Retrieve from IPFS
      const chunks = [];
      for await (const chunk of this.client.cat(cid)) {
        chunks.push(chunk);
      }

      let content = Buffer.concat(chunks).toString('utf8');

      // Optional decryption after retrieval
      if (options.decrypt && process.env.ENCRYPTION_KEY) {
        content = await this.decrypt(content);
      }

      // Try to parse as JSON, otherwise return as string
      try {
        return JSON.parse(content);
      } catch {
        return content;
      }
    } catch (error: any) {
      console.error('IPFS retrieval error:', error);
      throw new Error(`Failed to retrieve from IPFS: ${error.message}`);
    }
  }

  /**
   * Pin content to prevent garbage collection
   * @param cid The Content Identifier to pin
   */
  async pin(cid: string): Promise<void> {
    try {
      await this.client.pin.add(cid);
      console.log(`Pinned content: ${cid}`);
    } catch (error: any) {
      console.error('IPFS pin error:', error);
      throw new Error(`Failed to pin content: ${error.message}`);
    }
  }

  /**
   * Unpin content to allow garbage collection
   * @param cid The Content Identifier to unpin
   */
  async unpin(cid: string): Promise<void> {
    try {
      await this.client.pin.rm(cid);
      console.log(`Unpinned content: ${cid}`);
    } catch (error: any) {
      console.error('IPFS unpin error:', error);
      throw new Error(`Failed to unpin content: ${error.message}`);
    }
  }

  /**
   * Check if content is available
   * @param cid The Content Identifier to check
   */
  async isAvailable(cid: string): Promise<boolean> {
    try {
      // Try to retrieve the content to check if it exists
      const stream = this.client.cat(cid, { length: 1 });
      for await (const chunk of stream) {
        return chunk.length > 0;
      }
      return false;
    } catch {
      return false;
    }
  }

  /**
   * Get content size
   * @param cid The Content Identifier
   */
  async getSize(cid: string): Promise<number> {
    try {
      // Get stats using files.stat instead of deprecated object.stat
      const stats = await this.client.files.stat(`/ipfs/${cid}`);
      return stats.cumulativeSize || stats.size || 0;
    } catch (error: any) {
      // Fallback: read content to get size
      try {
        let size = 0;
        for await (const chunk of this.client.cat(cid)) {
          size += chunk.length;
        }
        return size;
      } catch {
        throw new Error(`Failed to get size: ${error.message}`);
      }
    }
  }

  /**
   * Encrypt content using AES-256-GCM
   * WARNING: This is a basic implementation. For production use, consider:
   * - Key rotation
   * - Secure key storage (HSM, KMS)
   * - Additional authenticated data (AAD)
   */
  private async encrypt(content: string): Promise<string> {
    if (!process.env.ENCRYPTION_KEY) {
      throw new Error('Encryption key not configured. Set ENCRYPTION_KEY environment variable (32 bytes hex or 64 char string).');
    }

    const crypto = await import('crypto');

    // Derive a proper 32-byte key from the environment variable
    const keyBuffer = crypto.createHash('sha256').update(process.env.ENCRYPTION_KEY).digest();

    // Generate a random IV (12 bytes for GCM)
    const iv = crypto.randomBytes(12);

    // Create cipher
    const cipher = crypto.createCipheriv('aes-256-gcm', keyBuffer, iv);

    // Encrypt
    let encrypted = cipher.update(content, 'utf8', 'base64');
    encrypted += cipher.final('base64');

    // Get auth tag
    const authTag = cipher.getAuthTag();

    // Combine IV + authTag + encrypted data
    const combined = Buffer.concat([iv, authTag, Buffer.from(encrypted, 'base64')]);

    return `ENCRYPTED_V2:${combined.toString('base64')}`;
  }

  /**
   * Decrypt content encrypted with AES-256-GCM
   */
  private async decrypt(content: string): Promise<string> {
    if (!process.env.ENCRYPTION_KEY) {
      throw new Error('Encryption key not configured. Set ENCRYPTION_KEY environment variable.');
    }

    // Handle legacy base64-only "encryption" for backwards compatibility
    if (content.startsWith('ENCRYPTED:')) {
      console.warn('WARNING: Legacy base64 encoding detected. This is NOT secure encryption. Re-encrypt your data.');
      const encoded = content.replace('ENCRYPTED:', '');
      return Buffer.from(encoded, 'base64').toString('utf8');
    }

    if (!content.startsWith('ENCRYPTED_V2:')) {
      return content; // Not encrypted
    }

    const crypto = await import('crypto');

    // Derive key
    const keyBuffer = crypto.createHash('sha256').update(process.env.ENCRYPTION_KEY).digest();

    // Decode combined data
    const combined = Buffer.from(content.replace('ENCRYPTED_V2:', ''), 'base64');

    // Extract IV (12 bytes), authTag (16 bytes), and encrypted data
    const iv = combined.subarray(0, 12);
    const authTag = combined.subarray(12, 28);
    const encryptedData = combined.subarray(28);

    // Create decipher
    const decipher = crypto.createDecipheriv('aes-256-gcm', keyBuffer, iv);
    decipher.setAuthTag(authTag);

    // Decrypt
    let decrypted = decipher.update(encryptedData);
    decrypted = Buffer.concat([decrypted, decipher.final()]);

    return decrypted.toString('utf8');
  }

  /**
   * Upload batch of records efficiently
   */
  async uploadBatch(records: any[]): Promise<IPFSUploadResult[]> {
    const results: IPFSUploadResult[] = [];

    // Upload in parallel with concurrency limit
    const batchSize = 5;
    for (let i = 0; i < records.length; i += batchSize) {
      const batch = records.slice(i, i + batchSize);
      const batchResults = await Promise.all(
        batch.map(record => this.upload(record))
      );
      results.push(...batchResults);
    }

    return results;
  }

  /**
   * Create a verification certificate as HTML
   */
  async createCertificate(data: {
    recordId: string;
    transactionHash: string;
    timestamp: number;
    requestUrl: string;
    responseStatus: number;
    network: string;
  }): Promise<IPFSUploadResult> {
    const html = `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>PROOF Protocol - Verification Certificate</title>
  <style>
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;
      max-width: 800px;
      margin: 0 auto;
      padding: 40px 20px;
      background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
      min-height: 100vh;
    }
    .certificate {
      background: white;
      border-radius: 12px;
      padding: 40px;
      box-shadow: 0 20px 40px rgba(0,0,0,0.1);
    }
    .header {
      text-align: center;
      border-bottom: 2px solid #f0f0f0;
      padding-bottom: 30px;
      margin-bottom: 30px;
    }
    .logo {
      width: 60px;
      height: 60px;
      background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
      border-radius: 12px;
      margin: 0 auto 20px;
      display: flex;
      align-items: center;
      justify-content: center;
      color: white;
      font-weight: bold;
      font-size: 24px;
    }
    h1 {
      color: #333;
      margin: 10px 0;
      font-size: 28px;
    }
    .subtitle {
      color: #666;
      font-size: 14px;
    }
    .field {
      margin: 20px 0;
      display: flex;
      align-items: flex-start;
    }
    .label {
      font-weight: 600;
      color: #555;
      min-width: 140px;
      margin-right: 20px;
    }
    .value {
      flex: 1;
      color: #333;
      word-break: break-all;
      font-family: 'Courier New', monospace;
      background: #f8f9fa;
      padding: 8px 12px;
      border-radius: 6px;
    }
    .verification {
      background: #e8f5e9;
      border: 2px solid #4caf50;
      border-radius: 8px;
      padding: 20px;
      margin: 30px 0;
      text-align: center;
    }
    .verification h3 {
      color: #2e7d32;
      margin: 0 0 10px;
    }
    .footer {
      text-align: center;
      margin-top: 30px;
      padding-top: 20px;
      border-top: 2px solid #f0f0f0;
      color: #666;
      font-size: 12px;
    }
    .qr-code {
      text-align: center;
      margin: 20px 0;
    }
    a {
      color: #667eea;
      text-decoration: none;
    }
    a:hover {
      text-decoration: underline;
    }
  </style>
</head>
<body>
  <div class="certificate">
    <div class="header">
      <div class="logo">P</div>
      <h1>PROOF Protocol Certificate</h1>
      <div class="subtitle">Blockchain-Verified API Request</div>
    </div>

    <div class="verification">
      <h3>✓ Verified on Blockchain</h3>
      <div>This API request has been permanently recorded on the ${data.network} blockchain</div>
    </div>

    <div class="field">
      <div class="label">Record ID:</div>
      <div class="value">${data.recordId}</div>
    </div>

    <div class="field">
      <div class="label">Transaction Hash:</div>
      <div class="value">
        <a href="https://polygonscan.com/tx/${data.transactionHash}" target="_blank">
          ${data.transactionHash}
        </a>
      </div>
    </div>

    <div class="field">
      <div class="label">Timestamp:</div>
      <div class="value">${new Date(data.timestamp).toISOString()}</div>
    </div>

    <div class="field">
      <div class="label">Request URL:</div>
      <div class="value">${data.requestUrl}</div>
    </div>

    <div class="field">
      <div class="label">Response Status:</div>
      <div class="value">${data.responseStatus}</div>
    </div>

    <div class="field">
      <div class="label">Network:</div>
      <div class="value">Polygon Mainnet</div>
    </div>

    <div class="footer">
      <p>This certificate proves that an API request was made and its response was recorded immutably on the blockchain.</p>
      <p>Generated by PROOF Protocol • <a href="https://www.proof-protocol.eu">proof-protocol.eu</a></p>
      <p>Certificate generated on ${new Date().toISOString()}</p>
    </div>
  </div>
</body>
</html>
    `;

    return await this.upload(html, { encrypt: false });
  }
}

// Singleton instance for convenience
let defaultService: IPFSService | null = null;

export function getIPFSService(config?: IPFSConfig): IPFSService {
  if (!defaultService) {
    defaultService = new IPFSService(config);
  }
  return defaultService;
}

// Export default instance factory
export default {
  create: (config?: IPFSConfig) => new IPFSService(config),
  getDefault: getIPFSService
};