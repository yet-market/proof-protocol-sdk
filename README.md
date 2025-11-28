# PROOF Protocol SDK

The PROOF Protocol SDK lets you create immutable, timestamped records of API interactions on the blockchain. It's designed for compliance, auditing, and legal verification requirements with minimal code changes.

## Quick Start

### Installation

```bash
npm install @proof-protocol/sdk
```

### Basic Usage

```javascript
const { ProofClient } = require('@proof-protocol/sdk');

// Initialize once
const proof = new ProofClient({
  privateKey: process.env.PRIVATE_KEY,
  network: 'polygon' // Polygon mainnet
});

// Before: const response = await fetch('https://api.example.com/data');
// After: Just wrap with proof.record()
const response = await proof.record(fetch('https://api.example.com/data'));

// Use response normally
const data = await response.json();

// Access blockchain proof
console.log('Proof ID:', response.proof.recordId);
console.log('Transaction:', response.proof.transactionHash);
console.log('Certificate:', response.proof.certificateUrl);
```

Your API call is now permanently recorded on the blockchain.

## Why PROOF Protocol?

- **Legal Compliance**: Create tamper-proof audit trails for regulatory requirements
- **Timestamp Verification**: Prove exactly when an API call was made and what response was received
- **Zero Trust**: No need to trust any single party - blockchain ensures immutability
- **Simple Integration**: One line of code to add blockchain verification
- **Cost Effective**: ~$0.01 per API record on Polygon

## Integration Methods

### Method 1: Direct SDK (Full Control)

```javascript
const { ProofClient } = require('@proof-protocol/sdk');

const proof = new ProofClient({
  privateKey: process.env.PRIVATE_KEY,
  network: 'polygon'
});

// Record any API call
const response = await proof.record(
  fetch('https://api.example.com/data'),
  {
    metadata: {
      purpose: 'Compliance check',
      requestor: 'John Doe',
      department: 'Legal'
    }
  }
);
```

### Method 2: Express Middleware (Automatic)

```javascript
const express = require('express');
const { ProofMiddleware } = require('@proof-protocol/sdk');

const app = express();

// Automatically record all API routes
app.use(ProofMiddleware.express({
  privateKey: process.env.PRIVATE_KEY,
  patterns: ['/api/*'],              // Record these routes
  excludePatterns: ['/api/health'],  // Skip these
  batchInterval: 60000               // Batch for efficiency
}));

// Your existing routes - no changes needed!
app.get('/api/users/:id', (req, res) => {
  res.json({ id: req.params.id, name: 'John' });
  // This response is automatically recorded on blockchain!
});
```

### Method 3: Batch Recording (Cost Efficient)

```javascript
// Record multiple API calls in one transaction (80% gas savings)
const records = [];

for (const id of userIds) {
  const response = await fetch(`/api/user/${id}`);
  records.push({
    request: { url: `/api/user/${id}`, method: 'GET' },
    response: await response.json()
  });
}

// Batch record all at once
const receipt = await proof.batchRecord(records);
console.log(`Recorded ${records.length} API calls for ${receipt.cost.proofTokens} PROOF`);
```

## Use Cases

### Insurance - Broker Verification

```javascript
async function verifyBrokerLicense(brokerId) {
  const response = await proof.record(
    fetch(`https://broker-registry.gov/verify/${brokerId}`),
    {
      metadata: {
        policyNumber: 'POL-2024-12345',
        purpose: 'Underwriting',
        verifiedBy: 'Jane Smith'
      }
    }
  );

  const licenseData = await response.json();

  // For audits: Immutable proof stored at response.proof.recordId
  return {
    isValid: licenseData.status === 'active',
    proofId: response.proof.recordId,
    certificateUrl: response.proof.certificateUrl
  };
}
```

### Healthcare - Credential Verification

```javascript
async function verifyMedicalLicense(npiNumber) {
  const response = await proof.record(
    fetch(`https://npiregistry.cms.hhs.gov/api/?number=${npiNumber}`)
  );

  // Proof can be used for:
  // - Regulatory compliance
  // - Insurance claims
  // - Legal proceedings
  // - Audit trails
}
```

### Financial - KYC/AML Checks

```javascript
async function performKYCCheck(customerId) {
  const response = await proof.record(
    fetch('https://kyc-provider.com/verify', {
      method: 'POST',
      body: JSON.stringify({ customerId }),
      headers: { 'Authorization': `Bearer ${API_KEY}` }
    })
  );

  // Immutable record for regulatory requirements
  const kycResult = await response.json();
  await saveToDatabase({
    customerId,
    kycResult,
    blockchainProof: response.proof.recordId
  });
}
```

## Configuration

```javascript
const proof = new ProofClient({
  // Required
  privateKey: 'your-private-key',      // Wallet private key

  // Network
  network: 'polygon',                     // 'amoy' | 'polygon' | 'local'
  rpcUrl: 'custom-rpc-url',           // Optional custom RPC

  // Features
  autoApprove: true,                   // Auto-approve PROOF tokens
  batchSize: 100,                      // Batch size for bulk operations
  ipfsGateway: 'https://ipfs.io/ipfs/', // IPFS gateway URL

  // Callbacks
  onRecord: (receipt) => {
    console.log('Recorded:', receipt.recordId);
  },
  onError: (error) => {
    console.error('Error:', error);
  }
});
```

## API Reference

### Core Methods

#### `proof.record(fetchPromise, options?)`
Records an API call on the blockchain.

**Parameters:**
- `fetchPromise`: Promise<Response> - The fetch promise to execute
- `options`: RecordOptions (optional)
  - `metadata`: Additional metadata to store
  - `method`: HTTP method
  - `headers`: Request headers
  - `body`: Request body

**Returns:** Response with `proof` property containing:
- `recordId`: Unique blockchain record identifier
- `transactionHash`: Blockchain transaction hash
- `blockNumber`: Block number
- `explorerUrl`: Link to view on Polygonscan
- `certificateUrl`: Shareable verification certificate
- `ipfsUrl`: IPFS storage location
- `cost`: Token and gas costs

#### `proof.verify(recordId)`
Verifies a recorded API call exists on blockchain.

#### `proof.batchRecord(records)`
Records multiple API calls in one transaction (gas efficient).

#### `proof.getBalance()`
Gets PROOF token and POL balance.

#### `proof.getStatistics(address?)`
Gets usage statistics for an address.

## Token Economics

- **Cost**: 10 PROOF tokens per API record (~$0.01)
- **Bulk Discount**: 20% off for 100+ records
- **Token Burn**: 50% of tokens burned on each use (deflationary)
- **Gas**: Minimal POL required for Polygon transactions

## Security

- **Private Key**: Never expose your private key
- **API Keys**: Use environment variables
- **Approval**: SDK auto-approves tokens by default (configurable)
- **Encryption**: Sensitive data encrypted before IPFS storage

## Network

### Polygon Mainnet
- Chain ID: 137
- Token: POL (formerly MATIC)
- Explorer: https://polygonscan.com/
- RPC: https://polygon-rpc.com/

## Examples

See the `/examples` directory for:
- `simple-usage.js` - Basic SDK usage
- `express-integration.js` - Express.js middleware
- `batch-recording.js` - Efficient batch operations
- `insurance-demo.js` - Insurance use case
- `healthcare-demo.js` - Healthcare credentials

## Support

- Documentation: https://proofprotocol.eu/docs
- GitHub: https://github.com/yet-market/proof-protocol-sdk
- Email: proof@yet.lu

## License

MIT License - see LICENSE file for details.