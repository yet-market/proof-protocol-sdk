/**
 * Contract ABIs for PROOF Protocol
 * These are simplified ABIs with only the functions we need for the SDK
 */

export const PROOF_TOKEN_ABI = [
  // Read functions
  "function balanceOf(address owner) view returns (uint256)",
  "function allowance(address owner, address spender) view returns (uint256)",
  "function totalSupply() view returns (uint256)",
  "function decimals() view returns (uint8)",
  "function symbol() view returns (string)",
  "function name() view returns (string)",

  // Write functions
  "function approve(address spender, uint256 amount) returns (bool)",
  "function transfer(address to, uint256 amount) returns (bool)",
  "function transferFrom(address from, address to, uint256 amount) returns (bool)",

  // Events
  "event Transfer(address indexed from, address indexed to, uint256 value)",
  "event Approval(address indexed owner, address indexed spender, uint256 value)"
];

export const PROOF_REGISTRY_ABI = [
  // Read functions (V3)
  "function baseRecordPrice() view returns (uint256)",
  "function userRecordCount(address user) view returns (uint256)",
  "function verifyRecord(bytes32 recordId) view returns (bool exists, tuple(bytes32 requestHash, bytes32 responseHash, uint256 timestamp, address recorder, string ipfsHash, uint8 visibility, bool exists) record)",
  "function calculateBatchPrice(uint256 count, address recorder) view returns (uint256)",
  "function getUserRecords(address user) view returns (bytes32[])",
  "function getStatistics() view returns (uint256 totalRecords, uint256 contractBalance, uint256 currentBurnRate, uint256 currentPrice)",
  "function getPricingInfo() view returns (uint256 recordPrice, uint256 proofPriceUSD, uint256 burnRate, bool usingManualPrice)",
  "function getCurrentBurnRate() view returns (uint256)",
  "function sharedAccess(bytes32 recordId, address viewer) view returns (bool)",

  // Write functions (V3 with visibility parameter)
  "function storeAPIRecord(bytes32 requestHash, bytes32 responseHash, string ipfsHash, uint8 visibility) returns (bytes32)",
  "function storeBatchRecords(bytes32[] requestHashes, bytes32[] responseHashes, string ipfsHash, uint8 visibility) returns (bytes32)",
  "function grantAccess(bytes32 recordId, address viewer)",
  "function revokeAccess(bytes32 recordId, address viewer)",

  // Events (V3)
  "event RecordStored(bytes32 indexed recordId, address indexed recorder, bytes32 requestHash, bytes32 responseHash, uint256 timestamp, string ipfsHash, uint8 visibility)",
  "event BatchRecordStored(bytes32 indexed batchId, address indexed recorder, uint256 recordCount, uint256 timestamp, string ipfsHash, uint8 visibility)",
  "event TokensCollected(address indexed from, uint256 amount, uint256 burned, uint256 burnRate)",
  "event AccessGranted(bytes32 indexed recordId, address indexed viewer)",
  "event AccessRevoked(bytes32 indexed recordId, address indexed viewer)"
];