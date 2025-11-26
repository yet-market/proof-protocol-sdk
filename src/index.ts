/**
 * PROOF Protocol SDK
 * Simple blockchain-based API request verification
 *
 * @example
 * ```typescript
 * import { ProofClient } from '@proof-protocol/sdk';
 *
 * const proof = new ProofClient({
 *   privateKey: process.env.PRIVATE_KEY,
 *   network: 'amoy'
 * });
 *
 * // Record any API call with one line
 * const response = await proof.record(fetch('https://api.example.com/data'));
 * console.log('Proof ID:', response.proof.recordId);
 * ```
 */

import { ProofClient } from './ProofClient';

export { ProofClient } from './ProofClient';
export { ProofMiddleware } from './middleware';
export * from './types';

// Re-export commonly used types for convenience
export type {
  ProofConfig,
  ProofReceipt,
  APIRecord,
  RecordOptions,
  TokenBalance,
  UserStatistics
} from './types';

// V3: Export visibility level enum
export { VisibilityLevel } from './types';

// Export version
export const VERSION = '2.0.0'; // V3 contracts with privacy controls

// Export default instance factory
import type { ProofClient as ProofClientType } from './ProofClient';
import type { ProofConfig as ProofConfigType } from './types';

export function createProofClient(config: ProofConfigType): ProofClientType {
  return new ProofClient(config);
}

// Default export
export default ProofClient;