/**
 * Type definitions for PROOF Protocol SDK
 */

export interface ProofConfig {
  // Required - private key for signing blockchain transactions
  privateKey: string;

  // Network configuration
  network?: 'polygon' | 'local';
  rpcUrl?: string; // Custom RPC URL

  // Optional settings
  autoApprove?: boolean; // Auto-approve tokens (default: true)
  batchSize?: number; // Batch size for bulk operations
  ipfsGateway?: string; // IPFS gateway URL
  certificateBaseUrl?: string; // Base URL for certificates

  // IPFS configuration
  ipfsHost?: string; // IPFS host (default: ipfs.infura.io)
  ipfsPort?: number; // IPFS port (default: 5001)
  ipfsProtocol?: string; // IPFS protocol (default: https)
  ipfsHeaders?: Record<string, string>; // IPFS headers for authentication
  encryptData?: boolean; // Encrypt data before IPFS upload

  // Callbacks
  onRecord?: (receipt: ProofReceipt) => void;
  onError?: (error: Error) => void;
}

// Privacy levels for V3
export enum VisibilityLevel {
  PUBLIC = 0,
  PRIVATE = 1,
  SHARED = 2
}

export interface RecordOptions {
  method?: string;
  headers?: { [key: string]: string };
  body?: any;
  metadata?: { [key: string]: any };
  visibility?: VisibilityLevel; // V3: Privacy control
  sharedWith?: string[]; // V3: Addresses to share with (for SHARED visibility)
}

export interface ProofReceipt {
  recordId: string;
  transactionHash: string;
  blockNumber: number;
  timestamp: number;
  gasUsed: string;
  explorerUrl: string;
  certificateUrl: string;
  ipfsUrl: string;
  cost: {
    proofTokens: string;
    gasInPOL: string;
  };
}

export interface APIRecord {
  requestHash: string;
  responseHash: string;
  timestamp: string;
  recorder: string;
  ipfsHash: string;
  exists: boolean;
  visibility?: VisibilityLevel; // V3: Privacy level
}

export interface BatchRecord {
  records: Array<{
    request: any;
    response: any;
    metadata?: any;
  }>;
  timestamp: number;
  count: number;
}

export interface TokenBalance {
  proof: string;
  pol: string;
}

export interface UserStatistics {
  recordCount: number;
  proofBalance: string;
  totalSpent: string;
}

/**
 * Enhanced Response type that includes the proof receipt
 * Used as the return type for ProofClient.record()
 */
export interface ProofResponse extends Response {
  proof: ProofReceipt;
}

// Express middleware types
export interface ProofMiddlewareOptions {
  client?: any; // ProofClient instance (avoid circular dependency)
  privateKey?: string; // Required if client not provided
  patterns?: string[]; // URL patterns to record
  excludePatterns?: string[]; // URL patterns to exclude
  batchInterval?: number; // Batch recording interval in ms
  batchSize?: number; // Max batch size before processing (default: 100)
}

// Error types
export class ProofError extends Error {
  code: string;

  constructor(message: string, code: string) {
    super(message);
    this.name = 'ProofError';
    this.code = code;
  }
}

export class InsufficientTokensError extends ProofError {
  required: string;
  balance: string;

  constructor(required: string, balance: string) {
    super(`Insufficient PROOF tokens. Required: ${required}, Balance: ${balance}`, 'INSUFFICIENT_TOKENS');
    this.required = required;
    this.balance = balance;
  }
}

export class NetworkError extends ProofError {
  constructor(message: string) {
    super(message, 'NETWORK_ERROR');
  }
}