# IPFS Setup Guide for PROOF Protocol SDK

## Overview

PROOF Protocol uses IPFS (InterPlanetary File System) to store API request/response data off-chain, with only hashes stored on the blockchain. This reduces gas costs while maintaining data integrity.

## IPFS Provider Options

### Option 1: Infura IPFS (Recommended for Production)

Infura provides reliable, hosted IPFS infrastructure with high availability.

#### Setup Steps:

1. **Create Infura Account**
   - Go to [Infura.io](https://infura.io)
   - Sign up for a free account
   - Create a new project

2. **Get IPFS Credentials**
   - Navigate to your project settings
   - Find the IPFS section
   - Copy your Project ID and API Secret

3. **Configure SDK**
   ```javascript
   const proof = new ProofClient({
     privateKey: process.env.PRIVATE_KEY,
     network: 'amoy',
     ipfsHost: 'ipfs.infura.io',
     ipfsPort: 5001,
     ipfsProtocol: 'https',
     ipfsHeaders: {
       authorization: `Basic ${Buffer.from(
         `${INFURA_PROJECT_ID}:${INFURA_API_SECRET}`
       ).toString('base64')}`
     }
   });
   ```

4. **Environment Variables**
   ```bash
   INFURA_PROJECT_ID=your-project-id
   INFURA_IPFS_API_KEY=your-api-secret
   ```

### Option 2: Pinata (Alternative)

Pinata is another reliable IPFS pinning service.

1. **Create Pinata Account**
   - Go to [Pinata.cloud](https://pinata.cloud)
   - Sign up and get API keys

2. **Configure SDK**
   ```javascript
   const proof = new ProofClient({
     privateKey: process.env.PRIVATE_KEY,
     network: 'amoy',
     ipfsHost: 'api.pinata.cloud',
     ipfsPort: 443,
     ipfsProtocol: 'https',
     ipfsHeaders: {
       'pinata-api-key': PINATA_API_KEY,
       'pinata-secret-api-key': PINATA_SECRET_KEY
     }
   });
   ```

### Option 3: Local IPFS Node (Development)

For development, you can run your own IPFS node.

1. **Install IPFS**
   ```bash
   # Install Kubo (IPFS implementation)
   # macOS
   brew install ipfs

   # Linux
   wget https://dist.ipfs.io/kubo/v0.38.0/kubo_v0.38.0_linux-amd64.tar.gz
   tar -xvzf kubo_v0.38.0_linux-amd64.tar.gz
   cd kubo
   sudo bash install.sh

   # Windows
   # Download from https://dist.ipfs.io/#kubo
   ```

2. **Initialize and Start IPFS**
   ```bash
   # Initialize IPFS repository
   ipfs init

   # Configure CORS (required for browser access)
   ipfs config --json API.HTTPHeaders.Access-Control-Allow-Origin '["*"]'
   ipfs config --json API.HTTPHeaders.Access-Control-Allow-Methods '["PUT", "POST"]'

   # Start IPFS daemon
   ipfs daemon
   ```

3. **Configure SDK for Local Node**
   ```javascript
   const proof = new ProofClient({
     privateKey: process.env.PRIVATE_KEY,
     network: 'amoy',
     ipfsHost: 'localhost',
     ipfsPort: 5001,
     ipfsProtocol: 'http'
   });
   ```

## Data Storage Pattern

### What Gets Stored

When you call `proof.record()`, the following data is stored on IPFS:

```json
{
  "request": {
    "url": "https://api.example.com/data",
    "method": "GET",
    "headers": { ... },
    "timestamp": 1699564800000,
    "body": null
  },
  "response": {
    "status": 200,
    "statusText": "OK",
    "headers": { ... },
    "body": "{ \"data\": \"value\" }",
    "timestamp": 1699564801000,
    "duration": 1000
  },
  "metadata": {
    "purpose": "Compliance check",
    "requestor": "John Doe"
  }
}
```

### Data Encryption

Sensitive data can be encrypted before IPFS upload:

```javascript
const proof = new ProofClient({
  privateKey: process.env.PRIVATE_KEY,
  network: 'amoy',
  encryptData: true // Enable encryption
});

// Set encryption key in environment
process.env.ENCRYPTION_KEY = 'your-256-bit-key';
```

## IPFS Gateway Configuration

### Public Gateways

The SDK uses IPFS gateways to retrieve content via HTTP:

```javascript
const proof = new ProofClient({
  privateKey: process.env.PRIVATE_KEY,
  ipfsGateway: 'https://ipfs.io/ipfs/' // Default public gateway
});

// Alternative gateways:
// - https://gateway.ipfs.io/ipfs/
// - https://cloudflare-ipfs.com/ipfs/
// - https://gateway.pinata.cloud/ipfs/
```

### Private Gateway (Production)

For production, consider using a dedicated gateway:

1. **Infura Dedicated Gateway**
   ```javascript
   ipfsGateway: `https://${PROJECT_ID}.infura-ipfs.io/ipfs/`
   ```

2. **Pinata Dedicated Gateway**
   ```javascript
   ipfsGateway: 'https://gateway.pinata.cloud/ipfs/'
   ```

## Cost Considerations

### Storage Costs

- **Infura**: Free tier includes 5GB storage and 5GB bandwidth/month
- **Pinata**: Free tier includes 1GB storage and 100 API requests
- **Local Node**: Free but requires infrastructure

### Best Practices

1. **Batch Operations**: Use `proof.batchRecord()` to reduce IPFS operations
2. **Data Compression**: Compress large payloads before storage
3. **Selective Storage**: Only store essential data fields
4. **Regular Cleanup**: Unpin old data that's no longer needed

## Troubleshooting

### Common Issues

1. **Connection Refused**
   ```
   Error: connect ECONNREFUSED 127.0.0.1:5001
   ```
   **Solution**: Ensure IPFS daemon is running (`ipfs daemon`)

2. **CORS Error**
   ```
   Access to fetch at 'http://localhost:5001' has been blocked by CORS
   ```
   **Solution**: Configure IPFS CORS headers (see Local IPFS setup)

3. **Authentication Failed**
   ```
   Error: Invalid authentication credentials
   ```
   **Solution**: Check your API keys and authorization headers

4. **Timeout Errors**
   ```
   Error: Request timed out
   ```
   **Solution**: Increase timeout in SDK config or check network connectivity

### Debugging

Enable debug logging:

```javascript
const proof = new ProofClient({
  privateKey: process.env.PRIVATE_KEY,
  onError: (error) => {
    console.error('IPFS Error:', error);
  }
});
```

## Testing IPFS Integration

### Basic Test

```javascript
// Test IPFS upload
async function testIPFS() {
  const proof = new ProofClient({
    privateKey: process.env.PRIVATE_KEY,
    network: 'amoy'
  });

  const testData = {
    test: true,
    timestamp: Date.now(),
    message: 'IPFS integration test'
  };

  try {
    const ipfs = proof.ipfs; // Access internal IPFS service
    const result = await ipfs.upload(testData);
    console.log('Upload successful:', result.cid);

    // Retrieve and verify
    const retrieved = await ipfs.retrieve(result.cid);
    console.log('Retrieved data:', retrieved);
  } catch (error) {
    console.error('IPFS test failed:', error);
  }
}
```

### Performance Test

```javascript
// Test batch upload performance
async function testBatchPerformance() {
  const proof = new ProofClient({
    privateKey: process.env.PRIVATE_KEY
  });

  const records = Array(10).fill(null).map((_, i) => ({
    request: { url: `/test/${i}`, method: 'GET' },
    response: { status: 200, body: `Test ${i}` }
  }));

  console.time('Batch Upload');
  const results = await proof.ipfs.uploadBatch(records);
  console.timeEnd('Batch Upload');

  console.log(`Uploaded ${results.length} records`);
  console.log('Average size:',
    results.reduce((sum, r) => sum + r.size, 0) / results.length
  );
}
```

## Security Considerations

1. **Never expose IPFS API credentials in client-side code**
2. **Use environment variables for sensitive configuration**
3. **Enable encryption for sensitive data**
4. **Implement access controls on your IPFS gateway**
5. **Regular security audits of stored data**

## Migration Guide

### From Mock to Real IPFS

If you were using the SDK with mock IPFS:

1. **Update Dependencies**
   ```bash
   npm install kubo-rpc-client multiformats
   ```

2. **Configure IPFS Provider**
   ```javascript
   // Before (mock)
   const proof = new ProofClient({
     privateKey: process.env.PRIVATE_KEY
   });

   // After (real IPFS)
   const proof = new ProofClient({
     privateKey: process.env.PRIVATE_KEY,
     ipfsHost: 'ipfs.infura.io',
     ipfsPort: 5001,
     ipfsProtocol: 'https',
     ipfsHeaders: {
       authorization: `Basic ${Buffer.from(
         `${INFURA_PROJECT_ID}:${INFURA_API_SECRET}`
       ).toString('base64')}`
     }
   });
   ```

3. **Test Integration**
   - Run the test scripts above
   - Verify data is accessible via gateway
   - Check that certificates are generated correctly

## Support

For IPFS-related issues:
- IPFS Documentation: https://docs.ipfs.tech/
- Kubo RPC Client: https://github.com/ipfs/js-kubo-rpc-client
- Infura Support: https://infura.io/docs
- Pinata Support: https://docs.pinata.cloud/