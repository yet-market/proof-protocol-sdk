# Publishing to npm

## Pre-Publication Checklist

- TypeScript build working
- Tests passing
- package.json configured correctly
- npm account ready
- Test with `npm link` first

## Steps

### Login to npm

```bash
npm login
npm whoami
```

### Test Locally

```bash
npm link
# In test project: npm link @proof-protocol/sdk
```

### Build and Publish

```bash
npm run build
npm publish --dry-run
npm publish --access public
```

Note: `--access public` required for scoped packages.

### Verify

```bash
npm view @proof-protocol/sdk
npm install @proof-protocol/sdk
```

## Troubleshooting

**Package already exists**: Use scoped package name
**No permission**: Check `npm whoami`
**Version exists**: Run `npm version patch`

## After Publishing

- Create GitHub release
- Enable 2FA: `npm profile enable-2fa auth-and-writes`
- Run `npm audit` regularly
