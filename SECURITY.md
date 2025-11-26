# Security Policy

## Reporting Security Issues

Please do not report security vulnerabilities through public GitHub issues. Instead, email us directly at: **security@yet.lu**

Include in your report:
- Description of the vulnerability
- Steps to reproduce
- Potential impact
- Suggested fix if you have one

We'll respond within 48 hours and keep you updated on our progress.

## Supported Versions

| Version | Supported |
| ------- | --------- |
| 1.x.x   | Yes       |
| 0.x.x   | No        |

## Security Best Practices

### Do:
- Use environment variables for API keys and private keys
- Keep the SDK updated
- Use HTTPS for all API communications
- Validate and sanitize input data

### Don't:
- Commit API keys or private keys to version control
- Share your API keys publicly
- Use production keys in test environments
- Disable SSL certificate verification
- Log sensitive data

## Secure Configuration Example

```javascript
// Good - use environment variables
const proof = new ProofClient({
  apiKey: process.env.PROOF_API_KEY,
  privateKey: process.env.PROOF_PRIVATE_KEY
});

// Bad - hardcoded keys
const proof = new ProofClient({
  apiKey: "pk_live_abc123...",
  privateKey: "0x..."
});
```

## Contact

Security issues: security@yet.lu
General support: proof@yet.lu
Website: https://proofprotocol.eu
