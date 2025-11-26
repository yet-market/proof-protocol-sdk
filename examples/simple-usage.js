/**
 * Simple usage example of PROOF Protocol SDK
 * This example shows how easy it is to add blockchain verification to API calls
 */

// Import the SDK
const { ProofClient } = require('@proof-protocol/sdk');

async function main() {
  // 1. Initialize the client (one-time setup)
  const proof = new ProofClient({
    privateKey: process.env.PRIVATE_KEY, // Your wallet private key
    network: 'amoy' // Using Amoy testnet (POL gas token)
  });

  // 2. Check your balance
  const balance = await proof.getBalance();
  console.log('Your balances:');
  console.log(`- PROOF tokens: ${balance.proof}`);
  console.log(`- POL (gas): ${balance.pol}`);

  // 3. Record an API call - IT'S THIS SIMPLE!
  console.log('\nMaking and recording an API call...');

  // Before PROOF: const response = await fetch('https://api.example.com/data');
  // With PROOF (just wrap with proof.record):
  const response = await proof.record(
    fetch('https://api.github.com/repos/ethereum/go-ethereum')
  );

  // 4. Use the response normally
  const data = await response.json();
  console.log(`Repository: ${data.full_name}`);
  console.log(`Stars: ${data.stargazers_count}`);

  // 5. Access the blockchain proof
  console.log('\nBlockchain Proof:');
  console.log(`- Proof ID: ${response.proof.recordId}`);
  console.log(`- Transaction: ${response.proof.transactionHash}`);
  console.log(`- Block: ${response.proof.blockNumber}`);
  console.log(`- Explorer: ${response.proof.explorerUrl}`);
  console.log(`- Certificate: ${response.proof.certificateUrl}`);
  console.log(`- IPFS: ${response.proof.ipfsUrl}`);
  console.log(`- Cost: ${response.proof.cost.proofTokens} PROOF + ${response.proof.cost.gasInPOL} POL`);

  // 6. Verify the record later
  console.log('\nVerifying the record...');
  const record = await proof.verify(response.proof.recordId);
  if (record) {
    console.log('✅ Record verified on blockchain!');
    console.log(`- Recorded at: ${new Date(parseInt(record.timestamp) * 1000).toISOString()}`);
    console.log(`- Recorder: ${record.recorder}`);
  }

  // 7. Get your statistics
  const stats = await proof.getStatistics();
  console.log('\nYour statistics:');
  console.log(`- Total API calls recorded: ${stats.recordCount}`);
  console.log(`- PROOF tokens spent: ${stats.totalSpent}`);
  console.log(`- Current PROOF balance: ${stats.proofBalance}`);
}

// Example: Insurance company checking broker license
async function insuranceExample() {
  console.log('\n=== Insurance Broker Verification Example ===\n');

  const proof = new ProofClient({
    privateKey: process.env.PRIVATE_KEY,
    network: 'amoy'
  });

  // Simulate checking a broker's license
  const brokerId = 'BR-2024-12345';
  const licenseCheckUrl = `https://broker-registry.example.com/api/verify/${brokerId}`;

  console.log(`Checking broker license: ${brokerId}`);

  // Record the license check on blockchain
  const response = await proof.record(
    fetch(licenseCheckUrl, {
      headers: {
        'Authorization': `Bearer ${process.env.BROKER_API_KEY}`,
        'Content-Type': 'application/json'
      }
    }),
    {
      metadata: {
        purpose: 'Policy underwriting',
        policyNumber: 'POL-2024-98765',
        brokerName: 'John Doe Insurance Services',
        checkType: 'License Verification'
      }
    }
  );

  const licenseData = await response.json();

  console.log('\nLicense Check Result:');
  console.log(`- Broker: ${licenseData.brokerName}`);
  console.log(`- License: ${licenseData.licenseNumber}`);
  console.log(`- Status: ${licenseData.status}`);
  console.log(`- Expires: ${licenseData.expiryDate}`);

  console.log('\nBlockchain Proof Generated:');
  console.log(`- Immutable Record ID: ${response.proof.recordId}`);
  console.log(`- Timestamp: ${new Date(response.proof.timestamp).toISOString()}`);
  console.log(`- Certificate URL: ${response.proof.certificateUrl}`);

  console.log('\n✅ This verification is now permanently recorded on the blockchain.');
  console.log('   It can be used for regulatory audits and compliance checks.');
}

// Example: Batch recording for efficiency
async function batchExample() {
  console.log('\n=== Batch Recording Example (Gas Efficient) ===\n');

  const proof = new ProofClient({
    privateKey: process.env.PRIVATE_KEY,
    network: 'amoy'
  });

  // Collect multiple API calls
  const apiCalls = [];

  console.log('Making multiple API calls...');
  for (let i = 1; i <= 5; i++) {
    const response = await fetch(`https://api.example.com/data/${i}`);
    const data = await response.json();

    apiCalls.push({
      request: {
        url: response.url,
        method: 'GET',
        timestamp: Date.now()
      },
      response: {
        status: response.status,
        data: data
      },
      metadata: {
        batchNumber: i,
        purpose: 'Bulk verification'
      }
    });
  }

  // Record all at once (much cheaper than individual recordings)
  console.log('\nRecording batch on blockchain...');
  const batchReceipt = await proof.batchRecord(apiCalls);

  console.log('\nBatch recorded successfully!');
  console.log(`- Batch ID: ${batchReceipt.recordId}`);
  console.log(`- Records: ${apiCalls.length} API calls`);
  console.log(`- Cost: ${batchReceipt.cost.proofTokens} PROOF (20% bulk discount applied)`);
  console.log(`- Gas saved: ~80% compared to individual recordings`);
  console.log(`- Certificate: ${batchReceipt.certificateUrl}`);
}

// Run examples
if (require.main === module) {
  main()
    .then(() => insuranceExample())
    .then(() => batchExample())
    .catch(console.error);
}

module.exports = { main, insuranceExample, batchExample };