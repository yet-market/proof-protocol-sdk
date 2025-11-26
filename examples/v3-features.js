/**
 * PROOF Protocol SDK V3 - Example Usage
 * Demonstrates new V3 features: privacy controls, progressive burns, access management
 */

const { ProofClient, VisibilityLevel } = require('@proof-protocol/sdk');

async function main() {
  // Initialize client
  const proof = new ProofClient({
    privateKey: process.env.PRIVATE_KEY,
    network: 'polygon', // Polygon mainnet with V3 contracts
    autoApprove: true
  });

  console.log('✅ ProofClient initialized with V3 contracts');
  console.log('   Registry: 0x5Fa8A332170B7Dc759Baac5a81CbF8eE0573599e');

  // Example 1: PUBLIC Record (default, visible to everyone)
  console.log('\n📝 Example 1: Recording PUBLIC API call...');
  const publicResponse = await proof.record(
    fetch('https://api.binance.com/api/v3/ticker/price?symbol=BTCUSDT'),
    {
      visibility: VisibilityLevel.PUBLIC,
      metadata: { type: 'price-check', asset: 'BTC' }
    }
  );

  console.log('✅ PUBLIC record created!');
  console.log('   Record ID:', publicResponse.proof.recordId);
  console.log('   Explorer:', publicResponse.proof.explorerUrl);
  console.log('   Anyone can verify this record');

  // Example 2: PRIVATE Record (only recorder can see)
  console.log('\n🔒 Example 2: Recording PRIVATE API call...');
  const privateResponse = await proof.record(
    fetch('https://api.example.com/user/balance'),
    {
      visibility: VisibilityLevel.PRIVATE,
      metadata: { type: 'sensitive-data', user: 'internal' }
    }
  );

  console.log('✅ PRIVATE record created!');
  console.log('   Record ID:', privateResponse.proof.recordId);
  console.log('   Only you can verify this record');

  // Example 3: SHARED Record (share with specific addresses)
  console.log('\n👥 Example 3: Recording SHARED API call...');
  const sharedResponse = await proof.record(
    fetch('https://api.example.com/trade/execute'),
    {
      visibility: VisibilityLevel.SHARED,
      metadata: { type: 'trade', counterparty: '0x...' }
    }
  );

  console.log('✅ SHARED record created!');
  console.log('   Record ID:', sharedResponse.proof.recordId);

  // Grant access to auditor
  const auditorAddress = '0x1234567890abcdef1234567890abcdef12345678'; // Example
  console.log('\n   Granting access to auditor:', auditorAddress);
  await proof.grantAccess(sharedResponse.proof.recordId, auditorAddress);
  console.log('   ✅ Access granted!');

  // Later, revoke access
  console.log('   Revoking access...');
  await proof.revokeAccess(sharedResponse.proof.recordId, auditorAddress);
  console.log('   ✅ Access revoked!');

  // Example 4: Get V3 Pricing Info (progressive burns)
  console.log('\n💰 Example 4: Getting V3 pricing information...');
  const pricingInfo = await proof.getPricingInfo();

  console.log('✅ Pricing Info:');
  console.log('   Record price:', pricingInfo.recordPrice, 'PROOF');
  console.log('   PROOF price:', pricingInfo.proofPriceUSD, 'USD');
  console.log('   Current burn rate:', pricingInfo.currentBurnRate + '%');
  console.log('   Using manual price:', pricingInfo.usingManualPrice);

  console.log('\n📊 Burn rate explanation:');
  console.log('   50% burn rate when PROOF < $0.001');
  console.log('   80% burn rate when PROOF > $0.10');
  console.log('   Linear between thresholds (progressive deflation)');

  // Example 5: Batch Recording with Privacy
  console.log('\n📦 Example 5: Batch recording with privacy...');
  const batchRecords = [
    {
      request: { url: 'https://api.example.com/1', method: 'GET' },
      response: { status: 200, data: 'response1' }
    },
    {
      request: { url: 'https://api.example.com/2', method: 'GET' },
      response: { status: 200, data: 'response2' }
    }
  ];

  const batchReceipt = await proof.batchRecord(batchRecords, VisibilityLevel.PUBLIC);
  console.log('✅ Batch recorded!');
  console.log('   Transaction:', batchReceipt.transactionHash);
  console.log('   Records:', batchRecords.length);
  console.log('   Cost:', batchReceipt.cost.proofTokens, 'PROOF (bulk discount applied)');

  // Example 6: Verify a Record
  console.log('\n🔍 Example 6: Verifying a record...');
  const verified = await proof.verify(publicResponse.proof.recordId);

  if (verified) {
    console.log('✅ Record verified!');
    console.log('   Timestamp:', new Date(Number(verified.timestamp) * 1000).toISOString());
    console.log('   Recorder:', verified.recorder);
    console.log('   IPFS:', verified.ipfsHash);
  } else {
    console.log('❌ Record not found');
  }

  // Example 7: Get User Statistics
  console.log('\n📈 Example 7: Getting user statistics...');
  const stats = await proof.getStatistics();

  console.log('✅ Statistics:');
  console.log('   Records created:', stats.recordCount);
  console.log('   PROOF balance:', stats.proofBalance);
  console.log('   Total spent:', stats.totalSpent, 'PROOF');

  // Example 8: Check Balance
  console.log('\n💵 Example 8: Checking balances...');
  const balance = await proof.getBalance();

  console.log('✅ Balances:');
  console.log('   PROOF:', balance.proof);
  console.log('   POL:', balance.pol);

  console.log('\n🎉 All V3 examples completed!');
  console.log('\nKey V3 Features:');
  console.log('✅ Privacy controls (PUBLIC/PRIVATE/SHARED)');
  console.log('✅ Access management for shared records');
  console.log('✅ Progressive burn rates (50-80%)');
  console.log('✅ Bulk discounts for batch recording');
  console.log('✅ Transparent pricing with USD reference');
}

// Run examples
main()
  .then(() => {
    console.log('\n✅ Examples completed successfully!');
    process.exit(0);
  })
  .catch((error) => {
    console.error('\n❌ Error:', error.message);
    process.exit(1);
  });
