/**
 * Express.js integration example for PROOF Protocol
 * Shows how to automatically record all API calls to blockchain
 */

const express = require('express');
const { ProofMiddleware } = require('@proof-protocol/sdk');

const app = express();
app.use(express.json());

// ============================================
// OPTION 1: One-line integration for ALL routes
// ============================================
app.use(ProofMiddleware.express({
  privateKey: process.env.PRIVATE_KEY,
  patterns: ['/api/*'], // Only record API routes
  excludePatterns: ['/api/health', '/api/metrics'], // Skip health checks
  batchInterval: 60000 // Batch recordings every minute for efficiency
}));

// Your existing API routes - NO CHANGES NEEDED!
app.get('/api/broker/:id', async (req, res) => {
  // Simulate broker verification
  const brokerData = {
    id: req.params.id,
    name: 'John Doe Insurance Services',
    license: 'LIC-2024-12345',
    status: 'Active',
    verified: true,
    expiryDate: '2025-12-31'
  };

  // This response is AUTOMATICALLY recorded on blockchain!
  res.json(brokerData);
});

app.post('/api/verify-policy', async (req, res) => {
  const { policyNumber, holderName } = req.body;

  // Simulate policy verification
  const policyData = {
    policyNumber,
    holderName,
    status: 'Active',
    premium: 1200,
    coverage: 500000,
    verified: true,
    verifiedAt: new Date().toISOString()
  };

  // Automatically recorded on blockchain!
  res.json(policyData);
});

app.get('/api/claim/:claimId', async (req, res) => {
  // Simulate claim lookup
  const claimData = {
    claimId: req.params.claimId,
    status: 'Under Review',
    amount: 25000,
    filedDate: '2024-10-15',
    lastUpdated: new Date().toISOString()
  };

  // Automatically recorded!
  res.json(claimData);
});

// ============================================
// OPTION 2: Manual control per route
// ============================================
const { ProofClient } = require('@proof-protocol/sdk');
const proofClient = new ProofClient({
  privateKey: process.env.PRIVATE_KEY,
  network: 'polygon'
});

app.get('/api/manual-example/:id', async (req, res) => {
  try {
    // Your normal API logic
    const data = {
      id: req.params.id,
      message: 'This is a manual recording example',
      timestamp: new Date().toISOString()
    };

    // Manually record specific data
    const mockResponse = new Response(JSON.stringify(data), {
      status: 200,
      headers: { 'Content-Type': 'application/json' }
    });

    const recordedResponse = await proofClient.record(
      Promise.resolve(mockResponse),
      {
        metadata: {
          endpoint: req.path,
          method: req.method,
          ip: req.ip
        }
      }
    );

    // Send response with proof information
    res.json({
      ...data,
      proof: {
        recordId: recordedResponse.proof.recordId,
        transactionHash: recordedResponse.proof.transactionHash,
        explorerUrl: recordedResponse.proof.explorerUrl,
        certificateUrl: recordedResponse.proof.certificateUrl
      }
    });
  } catch (error) {
    console.error('Recording failed:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// ============================================
// OPTION 3: Custom middleware for specific routes
// ============================================
const recordMiddleware = new ProofMiddleware({
  privateKey: process.env.PRIVATE_KEY,
  patterns: ['*'] // Record everything that uses this middleware
});

// Only these routes will be recorded
app.get('/api/important-data',
  recordMiddleware.express(),
  async (req, res) => {
    res.json({
      data: 'This endpoint is blockchain-recorded',
      importance: 'high'
    });
  }
);

// Health check endpoint (not recorded due to excludePatterns above)
app.get('/api/health', (req, res) => {
  res.json({ status: 'healthy', uptime: process.uptime() });
});

// ============================================
// Statistics endpoint
// ============================================
app.get('/api/stats', async (req, res) => {
  try {
    const stats = await proofClient.getStatistics();
    const balance = await proofClient.getBalance();

    res.json({
      recordCount: stats.recordCount,
      proofBalance: balance.proof,
      polBalance: balance.pol,
      totalSpent: stats.totalSpent,
      message: `This API has recorded ${stats.recordCount} calls on blockchain`
    });
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch statistics' });
  }
});

// ============================================
// Server startup
// ============================================
const PORT = process.env.PORT || 3000;

app.listen(PORT, async () => {
  console.log(`\n🚀 PROOF Protocol Express Server`);
  console.log(`================================`);
  console.log(`Server running on port ${PORT}`);
  console.log(`Network: Polygon mainnet (POL gas token)`);
  console.log(`\nEndpoints:`);
  console.log(`  GET  /api/broker/:id        - Verify broker (auto-recorded)`);
  console.log(`  POST /api/verify-policy     - Verify policy (auto-recorded)`);
  console.log(`  GET  /api/claim/:claimId    - Check claim (auto-recorded)`);
  console.log(`  GET  /api/manual-example/:id - Manual recording example`);
  console.log(`  GET  /api/important-data    - Custom middleware example`);
  console.log(`  GET  /api/health           - Health check (NOT recorded)`);
  console.log(`  GET  /api/stats            - Blockchain statistics`);
  console.log(`\nAll /api/* routes are automatically recorded on blockchain!`);
  console.log(`Each API call costs 10 PROOF tokens (~$0.01)`);
  console.log(`\nTry: curl http://localhost:${PORT}/api/broker/12345`);
  console.log(`================================\n`);

  // Check balance on startup
  try {
    const balance = await proofClient.getBalance();
    console.log(`Wallet Balance:`);
    console.log(`  PROOF: ${balance.proof} tokens`);
    console.log(`  POL: ${balance.pol} (for gas)`);

    if (parseFloat(balance.proof) < 100) {
      console.log(`\n⚠️  Warning: Low PROOF balance. Buy more at https://www.proof-protocol.eu`);
    }
    if (parseFloat(balance.pol) < 0.1) {
      console.log(`⚠️  Warning: Low POL balance. Acquire POL tokens for gas.`);
    }
  } catch (error) {
    console.log(`\n⚠️  Could not check balance. Make sure PRIVATE_KEY is set.`);
  }
});

// Graceful shutdown
process.on('SIGTERM', () => {
  console.log('\nShutting down PROOF Protocol server...');
  process.exit(0);
});

module.exports = app;