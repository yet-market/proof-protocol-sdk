# PROOF Protocol SDK V3 - New Features

## 🎉 What's New in V3

PROOF Protocol V3 introduces major enhancements for enterprise compliance and privacy:

### ✅ Privacy Controls
- **PUBLIC**: Records visible to everyone (blockchain transparency)
- **PRIVATE**: Records only visible to the creator
- **SHARED**: Records shared with specific addresses (auditors, regulators, partners)

### ✅ Progressive Burn Rates
- Dynamic burn rates from 50% to 80% based on PROOF token price
- Stronger deflationary mechanics at higher valuations
- Transparent, automatic adjustment

### ✅ Access Management
- Grant and revoke access to SHARED records
- Perfect for compliance reporting and audits
- Programmatic access control

### ✅ Staking Integration
- 10% fee discount for PROOF stakers
- Automatic detection of staked balance
- Lower costs for committed users

---

## 📝 Privacy Controls

### PUBLIC Records (Default)

```javascript
const { ProofClient, VisibilityLevel } = require('@proof-protocol/sdk');

const proof = new ProofClient({
  privateKey: process.env.PRIVATE_KEY,
  network: 'polygon'
});

// PUBLIC record - anyone can verify
const response = await proof.record(
  fetch('https://api.binance.com/api/v3/ticker/price?symbol=BTCUSDT'),
  {
    visibility: VisibilityLevel.PUBLIC, // Explicitly set (or omit, it's default)
    metadata: { type: 'market-data', asset: 'BTC' }
  }
);

console.log('Public proof:', response.proof.recordId);
// Anyone can call proof.verify(recordId) to see this record
```

**Use cases:**
- Public API data (market prices, weather, etc.)
- Transparency reports
- Public compliance records

---

### PRIVATE Records

```javascript
// PRIVATE record - only you can verify
const response = await proof.record(
  fetch('https://api.yourbank.com/account/balance'),
  {
    visibility: VisibilityLevel.PRIVATE,
    metadata: { accountId: 'ACC-12345', internal: true }
  }
);

console.log('Private proof:', response.proof.recordId);
// Only the creator can call proof.verify(recordId) successfully
```

**Use cases:**
- Internal API calls
- Sensitive customer data
- Personal compliance records
- Proprietary information

---

### SHARED Records

```javascript
// SHARED record - selectively share with specific addresses
const response = await proof.record(
  fetch('https://api.tradingplatform.com/execute-trade'),
  {
    visibility: VisibilityLevel.SHARED,
    metadata: {
      tradeId: 'TRD-789',
      counterparty: 'Bank XYZ',
      amount: 1000000
    }
  }
);

const recordId = response.proof.recordId;

// Grant access to auditor
const auditorAddress = '0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb5';
await proof.grantAccess(recordId, auditorAddress);
console.log('✅ Access granted to auditor');

// Grant access to regulator
const regulatorAddress = '0x3C44CdDdB6a900fa2b585dd299e03d12FA4293BC';
await proof.grantAccess(recordId, regulatorAddress);
console.log('✅ Access granted to regulator');

// Later, revoke access
await proof.revokeAccess(recordId, auditorAddress);
console.log('✅ Access revoked from auditor');
```

**Use cases:**
- MiFID II trade reporting (share with regulator)
- Multi-party transactions (share with counterparty)
- Audit trails (share with auditors)
- Partner integrations

---

## 💰 Progressive Burn Rates

V3 dynamically adjusts burn rates based on PROOF token price:

```javascript
// Get current pricing and burn rate
const pricing = await proof.getPricingInfo();

console.log('Current Configuration:');
console.log('  Record price:', pricing.recordPrice, 'PROOF');
console.log('  PROOF price:', pricing.proofPriceUSD, 'USD');
console.log('  Burn rate:', pricing.currentBurnRate + '%');
console.log('  Manual price:', pricing.usingManualPrice);
```

### How It Works

| PROOF Price | Burn Rate | Effect |
|-------------|-----------|--------|
| < $0.001 | 50% | Base burn rate |
| $0.001 - $0.10 | 50-80% | Linear increase |
| > $0.10 | 80% | Maximum deflation |

**Example:**
- At $0.001 PROOF price: 10 PROOF record → **5 PROOF burned** (50%)
- At $0.055 PROOF price: 10 PROOF record → **6.5 PROOF burned** (65%)
- At $0.10+ PROOF price: 10 PROOF record → **8 PROOF burned** (80%)

This creates a **self-regulating deflationary system** that strengthens as the token appreciates.

---

## 🎫 Access Management

### Grant Access

```javascript
// Share a record with a specific address
const txHash = await proof.grantAccess(recordId, viewerAddress);
console.log('Access granted:', txHash);
```

### Revoke Access

```javascript
// Remove access from an address
const txHash = await proof.revokeAccess(recordId, viewerAddress);
console.log('Access revoked:', txHash);
```

### Common Patterns

**1. Share with Multiple Auditors**
```javascript
const auditors = [
  '0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb5', // External auditor
  '0x3C44CdDdB6a900fa2b585dd299e03d12FA4293BC', // Internal compliance
  '0x90F79bf6EB2c4f870365E785982E1f101E93b906'  // Regulator
];

for (const auditor of auditors) {
  await proof.grantAccess(recordId, auditor);
  console.log(`✅ Access granted to ${auditor}`);
}
```

**2. Temporary Access (Time-Limited)**
```javascript
// Grant access
await proof.grantAccess(recordId, auditorAddress);

// Automatically revoke after 30 days
setTimeout(async () => {
  await proof.revokeAccess(recordId, auditorAddress);
  console.log('Access automatically revoked');
}, 30 * 24 * 60 * 60 * 1000);
```

**3. Event-Based Access**
```javascript
// Grant access only during audit period
if (isAuditPeriod()) {
  await proof.grantAccess(recordId, auditorAddress);
}

// Revoke when audit is complete
onAuditComplete(async () => {
  await proof.revokeAccess(recordId, auditorAddress);
});
```

---

## 💎 Staking Benefits

Users who stake PROOF tokens receive **10% discount** on all record fees:

```javascript
// Without staking: 10 PROOF per record
// With staking: 9 PROOF per record (10% discount)

const pricing = await proof.getPricingInfo();
console.log('Base price:', pricing.recordPrice, 'PROOF');

// Discount automatically applied if you're staking
const response = await proof.record(fetch('...'));
// Actual cost will be 9 PROOF if you have staked tokens
```

**How to stake:**
1. Visit staking dashboard (coming soon)
2. Lock PROOF tokens (minimum 30 days)
3. Earn 10% APY + fee discounts
4. Discounts applied automatically when using SDK

---

## 🏢 Enterprise Use Case: MiFID II Compliance

Complete example for Luxembourg financial services:

```javascript
const { ProofClient, VisibilityLevel } = require('@proof-protocol/sdk');

class MiFIDCompliance {
  constructor(privateKey) {
    this.proof = new ProofClient({
      privateKey,
      network: 'polygon'
    });
  }

  // Record trade execution (share with regulator)
  async recordTrade(tradeData) {
    const response = await this.proof.record(
      fetch('https://trading-api.example.com/execute', {
        method: 'POST',
        body: JSON.stringify(tradeData)
      }),
      {
        visibility: VisibilityLevel.SHARED, // For regulator access
        metadata: {
          type: 'mifid-ii-trade',
          isin: tradeData.isin,
          clientId: tradeData.clientId,
          timestamp: Date.now()
        }
      }
    );

    const recordId = response.proof.recordId;

    // Grant access to CSSF (Luxembourg regulator)
    const cssfAddress = process.env.CSSF_REGULATOR_ADDRESS;
    await this.proof.grantAccess(recordId, cssfAddress);

    // Store recordId for 7-year retention
    await this.storeForRetention(recordId, tradeData.tradeId);

    return {
      tradeId: tradeData.tradeId,
      proofId: recordId,
      certificateUrl: response.proof.certificateUrl
    };
  }

  // Export compliance report for auditor
  async generateComplianceReport(startDate, endDate) {
    const records = await this.getRecordsBetween(startDate, endDate);

    // Batch grant access to auditor
    const auditorAddress = process.env.AUDITOR_ADDRESS;
    for (const record of records) {
      await this.proof.grantAccess(record.id, auditorAddress);
    }

    return {
      period: { startDate, endDate },
      recordCount: records.length,
      auditorAccess: auditorAddress
    };
  }

  // Revoke access after audit
  async revokeAuditAccess(recordIds, auditorAddress) {
    for (const recordId of recordIds) {
      await this.proof.revokeAccess(recordId, auditorAddress);
    }
  }
}
```

---

## 📊 Cost Comparison

| Feature | V1/V2 | V3 |
|---------|-------|-----|
| **Privacy** | Public only | PUBLIC/PRIVATE/SHARED |
| **Burn Rate** | Fixed 50% | Progressive 50-80% |
| **Access Control** | ❌ | ✅ Grant/Revoke |
| **Staking Discount** | ❌ | ✅ 10% off |
| **Base Cost** | 10 PROOF | 10 PROOF (9 if staking) |
| **Bulk Discount** | 20% at 100+ | 20% at 100+ |

**Cost Examples:**

```
Single record (no staking):     10 PROOF × $0.001 = $0.01
Single record (with staking):   9 PROOF × $0.001 = $0.009
Batch 100 (no staking):         800 PROOF × $0.001 = $0.80
Batch 100 (with staking):       720 PROOF × $0.001 = $0.72
```

---

## 🔄 Migration from V1/V2

### Update SDK

```bash
npm install @proof-protocol/sdk@latest
```

### Update Code

**Before (V1/V2):**
```javascript
const response = await proof.record(fetch('...'));
```

**After (V3 - Backward Compatible):**
```javascript
// Same code works! Defaults to PUBLIC visibility
const response = await proof.record(fetch('...'));

// Or use new privacy features
const response = await proof.record(
  fetch('...'),
  { visibility: VisibilityLevel.PRIVATE }
);
```

### Contract Addresses (Updated)

V3 contracts are deployed on Polygon mainnet:

```javascript
ProofToken:       0x4c9A2a4D1686f7F468400E0c8fcB86d3FCbF5B21
ProofRegistryV3:  0x5Fa8A332170B7Dc759Baac5a81CbF8eE0573599e
ProofStaking:     0xeBe8F8606cfAceD1c14825633834573f0E23CFd9
ProofGovernance:  0x5D3a3Fa74683e481b14aCA6c36868bE27E757F1C
```

SDK automatically uses V3 contracts when you update to v2.0.0+.

---

## 🎯 Best Practices

### 1. Choose Appropriate Visibility

- **PUBLIC**: Default for transparency (market data, public records)
- **PRIVATE**: Sensitive internal data
- **SHARED**: Regulatory/audit requirements (grant access as needed)

### 2. Manage Access Carefully

```javascript
// ✅ Good: Explicit access management
await proof.grantAccess(recordId, auditorAddress);
// ... after audit
await proof.revokeAccess(recordId, auditorAddress);

// ❌ Avoid: Leaving access open indefinitely
```

### 3. Monitor Burn Rates

```javascript
// Check pricing before large batch operations
const pricing = await proof.getPricingInfo();
console.log('Current burn rate:', pricing.currentBurnRate + '%');

if (pricing.currentBurnRate > 70) {
  console.warn('High burn rate - consider timing');
}
```

### 4. Use Batch for Efficiency

```javascript
// ✅ Good: Batch 100 records = 1 transaction
await proof.batchRecord(records, VisibilityLevel.PUBLIC);

// ❌ Avoid: 100 individual transactions
for (const record of records) {
  await proof.record(...); // Expensive!
}
```

---

## 📚 Additional Resources

- **V3 Examples**: See `sdk/examples/v3-features.js`
- **API Reference**: See `sdk/README.md`
- **Contract Docs**: See `contracts/ProofRegistryV3.sol`
- **MiFID II Guide**: Coming soon

---

**Questions?** Contact support@proof-protocol.eu
