import { ethers, Contract, Wallet, JsonRpcProvider } from 'ethers';
import crypto from 'crypto';
import { ProofConfig, APIRecord, RecordOptions, ProofReceipt, VisibilityLevel } from './types';
import { PROOF_TOKEN_ABI, PROOF_REGISTRY_ABI } from './abis';
import { IPFSService } from './ipfs';

/**
 * ProofClient - Main SDK class for PROOF Protocol
 * Enables 1-line integration for blockchain-based API verification
 */
export class ProofClient {
  private provider: JsonRpcProvider;
  private signer: Wallet;
  private proofToken: Contract;
  private proofRegistry: Contract;
  private config: ProofConfig;
  private ipfs: IPFSService;

  constructor(config: ProofConfig) {
    this.config = {
      ...config,
      network: config.network || 'amoy', // Default to Amoy testnet
      autoApprove: config.autoApprove !== false, // Default true
      batchSize: config.batchSize || 100,
      ipfsGateway: config.ipfsGateway || 'https://ipfs.io/ipfs/'
    };

    // Initialize provider
    const rpcUrl = this.getRpcUrl();
    this.provider = new JsonRpcProvider(rpcUrl);

    // Initialize signer
    if (config.privateKey) {
      this.signer = new Wallet(config.privateKey, this.provider);
    } else {
      throw new Error('Private key required for ProofClient initialization');
    }

    // Initialize contracts (addresses would be loaded from config or constants)
    const addresses = this.getContractAddresses();
    this.proofToken = new Contract(addresses.token, PROOF_TOKEN_ABI, this.signer);
    this.proofRegistry = new Contract(addresses.registry, PROOF_REGISTRY_ABI, this.signer);

    // Initialize IPFS service
    this.ipfs = new IPFSService({
      host: config.ipfsHost,
      port: config.ipfsPort,
      protocol: config.ipfsProtocol,
      headers: config.ipfsHeaders
    });
  }

  /**
   * Main method: Record an API call on the blockchain
   * @param fetchPromise - The fetch promise to execute and record
   * @param options - Optional recording options
   * @returns Enhanced response with proof receipt
   */
  async record<T = any>(
    fetchPromise: Promise<Response>,
    options: RecordOptions = {}
  ): Promise<Response & { proof: ProofReceipt }> {
    try {
      // 1. Execute the API call
      const startTime = Date.now();
      const response = await fetchPromise;
      const endTime = Date.now();

      // 2. Clone response for processing (response can only be read once)
      const responseClone = response.clone();

      // 3. Extract request/response data
      const requestData = {
        url: response.url,
        method: options.method || 'GET',
        headers: options.headers || {},
        timestamp: startTime,
        body: options.body || null
      };

      const responseData = {
        status: response.status,
        statusText: response.statusText,
        headers: Object.fromEntries(response.headers.entries()),
        body: await responseClone.text(),
        timestamp: endTime,
        duration: endTime - startTime
      };

      // 4. Create hashes
      const requestHash = this.hashData(requestData);
      const responseHash = this.hashData(responseData);

      // 5. Upload to IPFS (mock for now - would integrate with IPFS service)
      const ipfsHash = await this.uploadToIPFS({
        request: requestData,
        response: responseData,
        metadata: options.metadata || {}
      });

      // 6. Ensure token approval
      if (this.config.autoApprove) {
        await this.ensureTokenApproval();
      }

      // 7. Get visibility level (default to PUBLIC for V3)
      const visibility = options.visibility !== undefined ? options.visibility : VisibilityLevel.PUBLIC;

      // 8. Store on blockchain (V3 with privacy controls)
      const tx = await this.proofRegistry.storeAPIRecord(
        requestHash,
        responseHash,
        ipfsHash,
        visibility
      );

      // 8. Wait for confirmation
      const receipt = await tx.wait();

      // 9. Extract event data
      const event = receipt.logs.find((log: any) => {
        try {
          const parsed = this.proofRegistry.interface.parseLog(log);
          return parsed?.name === 'RecordStored';
        } catch {
          return false;
        }
      });

      const recordId = event ? this.proofRegistry.interface.parseLog(event)?.args.recordId || tx.hash : tx.hash;

      // 10. Create verification certificate
      const certificate = await this.ipfs.createCertificate({
        recordId: recordId.toString(),
        transactionHash: receipt.hash,
        timestamp: startTime,
        requestUrl: requestData.url,
        responseStatus: responseData.status,
        network: this.config.network || 'amoy'
      });

      // 11. Create proof receipt
      const proofReceipt: ProofReceipt = {
        recordId: recordId.toString(),
        transactionHash: receipt.hash,
        blockNumber: receipt.blockNumber,
        timestamp: startTime,
        gasUsed: receipt.gasUsed.toString(),
        explorerUrl: this.getExplorerUrl(receipt.hash),
        certificateUrl: certificate.url,
        ipfsUrl: `${this.config.ipfsGateway}${ipfsHash}`,
        cost: {
          proofTokens: '10', // From contract
          gasInPOL: ethers.formatEther(receipt.gasUsed * receipt.gasPrice)
        }
      };

      // 12. Attach proof to response
      (response as any).proof = proofReceipt;

      // Emit event for monitoring
      this.emit('recorded', proofReceipt);

      return response as Response & { proof: ProofReceipt };
    } catch (error) {
      this.handleError(error);
      throw error;
    }
  }

  /**
   * Verify a recorded API call
   * @param recordId - The record ID to verify
   */
  async verify(recordId: string): Promise<APIRecord | null> {
    try {
      const [exists, record] = await this.proofRegistry.verifyRecord(recordId);

      if (!exists) {
        return null;
      }

      return {
        requestHash: record.requestHash,
        responseHash: record.responseHash,
        timestamp: record.timestamp.toString(),
        recorder: record.recorder,
        ipfsHash: record.ipfsHash,
        exists: true
      };
    } catch (error) {
      this.handleError(error);
      throw error;
    }
  }

  /**
   * Batch record multiple API calls (gas efficient)
   * @param records - Array of API records to store
   */
  async batchRecord(records: Array<{
    request: any;
    response: any;
    metadata?: any;
  }>, visibility?: VisibilityLevel): Promise<ProofReceipt> {
    try {
      // Hash all records
      const requestHashes = records.map(r => this.hashData(r.request));
      const responseHashes = records.map(r => this.hashData(r.response));

      // Upload batch to IPFS
      const ipfsHash = await this.uploadToIPFS({
        records,
        timestamp: Date.now(),
        count: records.length
      });

      // Ensure approval for batch cost
      await this.ensureTokenApproval(records.length);

      // Get visibility level (default to PUBLIC)
      const visibilityLevel = visibility !== undefined ? visibility : VisibilityLevel.PUBLIC;

      // Store batch on blockchain (V3 with privacy)
      const tx = await this.proofRegistry.storeBatchRecords(
        requestHashes,
        responseHashes,
        ipfsHash,
        visibilityLevel
      );

      const receipt = await tx.wait();

      return {
        recordId: receipt.hash,
        transactionHash: receipt.hash,
        blockNumber: receipt.blockNumber,
        timestamp: Date.now(),
        gasUsed: receipt.gasUsed.toString(),
        explorerUrl: this.getExplorerUrl(receipt.hash),
        certificateUrl: `${this.config.certificateBaseUrl}batch/${receipt.hash}`,
        ipfsUrl: `${this.config.ipfsGateway}${ipfsHash}`,
        cost: {
          proofTokens: (records.length * 8).toString(), // Bulk discount
          gasInPOL: ethers.formatEther(receipt.gasUsed * receipt.gasPrice)
        }
      };
    } catch (error) {
      this.handleError(error);
      throw error;
    }
  }

  /**
   * Get user's PROOF token balance
   */
  async getBalance(): Promise<{ proof: string; pol: string }> {
    const proofBalance = await this.proofToken.balanceOf(this.signer.address);
    const polBalance = await this.provider.getBalance(this.signer.address);

    return {
      proof: ethers.formatEther(proofBalance),
      pol: ethers.formatEther(polBalance)
    };
  }

  /**
   * Get statistics for an address
   */
  async getStatistics(address?: string): Promise<{
    recordCount: number;
    proofBalance: string;
    totalSpent: string;
  }> {
    const addr = address || this.signer.address;
    const recordCount = await this.proofRegistry.userRecordCount(addr);
    const balance = await this.proofToken.balanceOf(addr);

    return {
      recordCount: recordCount.toString(),
      proofBalance: ethers.formatEther(balance),
      totalSpent: ethers.formatEther(recordCount * 10n * 10n**18n) // 10 PROOF per record
    };
  }

  /**
   * V3: Grant access to a SHARED record
   * @param recordId - Record ID
   * @param viewer - Address to grant access to
   */
  async grantAccess(recordId: string, viewer: string): Promise<string> {
    try {
      const tx = await this.proofRegistry.grantAccess(recordId, viewer);
      const receipt = await tx.wait();
      return receipt.hash;
    } catch (error) {
      this.handleError(error);
      throw error;
    }
  }

  /**
   * V3: Revoke access from a SHARED record
   * @param recordId - Record ID
   * @param viewer - Address to revoke access from
   */
  async revokeAccess(recordId: string, viewer: string): Promise<string> {
    try {
      const tx = await this.proofRegistry.revokeAccess(recordId, viewer);
      const receipt = await tx.wait();
      return receipt.hash;
    } catch (error) {
      this.handleError(error);
      throw error;
    }
  }

  /**
   * V3: Get current burn rate and pricing info
   */
  async getPricingInfo(): Promise<{
    recordPrice: string;
    proofPriceUSD: string;
    currentBurnRate: number;
    usingManualPrice: boolean;
  }> {
    try {
      const [recordPrice, proofPriceUSD, burnRate, usingManualPrice] =
        await this.proofRegistry.getPricingInfo();

      return {
        recordPrice: ethers.formatEther(recordPrice),
        proofPriceUSD: ethers.formatUnits(proofPriceUSD, 8), // 8 decimals for USD
        currentBurnRate: Number(burnRate),
        usingManualPrice
      };
    } catch (error) {
      this.handleError(error);
      throw error;
    }
  }

  // Private helper methods

  private getRpcUrl(): string {
    const networks: { [key: string]: string } = {
      'amoy': 'https://rpc-amoy.polygon.technology/',
      'polygon': 'https://polygon-rpc.com/',
      'local': 'http://localhost:8545'
    };

    return this.config.rpcUrl || networks[this.config.network || 'amoy'];
  }

  private getContractAddresses(): { token: string; registry: string } {
    // V3 Contract addresses - deployed on Polygon mainnet
    const addresses: { [key: string]: { token: string; registry: string } } = {
      'amoy': {
        token: process.env.PROOF_TOKEN_ADDRESS || '0x4c9A2a4D1686f7F468400E0c8fcB86d3FCbF5B21', // Same token on all networks
        registry: process.env.PROOF_REGISTRY_ADDRESS || '0x5Fa8A332170B7Dc759Baac5a81CbF8eE0573599e' // ProofRegistryV3
      },
      'polygon': {
        token: '0x4c9A2a4D1686f7F468400E0c8fcB86d3FCbF5B21', // ProofToken (mainnet)
        registry: '0x5Fa8A332170B7Dc759Baac5a81CbF8eE0573599e' // ProofRegistryV3 (mainnet)
      },
      'local': {
        token: '0x5FbDB2315678afecb367f032d93F642f64180aa3',
        registry: '0xe7f1725E7734CE288F8367e1Bb143E90bb3F0512'
      }
    };

    return addresses[this.config.network || 'amoy'];
  }

  private getExplorerUrl(txHash: string): string {
    const explorers: { [key: string]: string } = {
      'amoy': `https://amoy.polygonscan.com/tx/${txHash}`,
      'polygon': `https://polygonscan.com/tx/${txHash}`,
      'local': `http://localhost:3000/tx/${txHash}`
    };

    return explorers[this.config.network || 'amoy'];
  }

  private hashData(data: any): string {
    const jsonString = JSON.stringify(data);
    return '0x' + crypto.createHash('sha256').update(jsonString).digest('hex');
  }

  private async uploadToIPFS(data: any): Promise<string> {
    // Upload data to IPFS and return the CID
    const result = await this.ipfs.upload(data, {
      encrypt: this.config.encryptData || false
    });
    return result.cid;
  }

  private async ensureTokenApproval(recordCount: number = 1): Promise<void> {
    const recordPrice = await this.proofRegistry.recordPrice();
    const totalCost = recordPrice * BigInt(recordCount);

    const currentAllowance = await this.proofToken.allowance(
      this.signer.address,
      await this.proofRegistry.getAddress()
    );

    if (currentAllowance < totalCost) {
      const tx = await this.proofToken.approve(
        await this.proofRegistry.getAddress(),
        ethers.MaxUint256 // Infinite approval for convenience
      );
      await tx.wait();
    }
  }

  private handleError(error: any): void {
    if (error.code === 'INSUFFICIENT_FUNDS') {
      throw new Error('Insufficient PROOF tokens. Please purchase more tokens.');
    }
    if (error.code === 'NETWORK_ERROR') {
      throw new Error('Network error. Please check your connection.');
    }
    // Log other errors for debugging
    console.error('ProofClient error:', error);
  }

  private emit(event: string, data: any): void {
    // Event emitter for monitoring and hooks
    if (this.config.onRecord && event === 'recorded') {
      this.config.onRecord(data);
    }
  }
}