# Contributing

Thanks for your interest in contributing! We appreciate all contributions, whether it's a bug fix, new feature, or documentation improvement.

## Reporting Bugs

Check existing issues first to avoid duplicates. When filing a bug report, include:
- SDK version
- Node.js version
- Operating system
- Code example that reproduces the issue
- Expected vs actual behavior
- Error messages and stack traces

## Suggesting Features

Before submitting a feature request:
- Check if it already exists
- Check existing requests
- Make sure it fits the project scope

## Pull Requests

1. Fork the repository and create your branch from `main`
2. Install dependencies: `npm install`
3. Make your changes
4. Add tests for your changes
5. Run tests: `npm test`
6. Build: `npm run build`
7. Commit with a clear message
8. Push to your fork and submit a pull request

### Guidelines

- Keep changes focused
- Write clear commit messages
- Update documentation if needed
- Add tests for new features
- Follow existing code style
- Update CHANGELOG.md

### Commit Message Format

```
type: brief description

Fixes #123
```

Types:
- `feat`: New feature
- `fix`: Bug fix
- `docs`: Documentation changes
- `style`: Code style changes (formatting, etc.)
- `refactor`: Code refactoring
- `test`: Adding or updating tests
- `chore`: Build process or auxiliary tool changes

## Development Setup

Prerequisites: Node.js >= 18.0.0, npm, and git.

### Local Setup

```bash
# Clone your fork
git clone https://github.com/YOUR_USERNAME/proof-protocol-sdk.git
cd proof-protocol-sdk

# Install dependencies
npm install

# Run tests
npm test

# Build the project
npm run build

# Watch mode (for development)
npm run dev
```

### Running Tests

```bash
# Run all tests
npm test

# Run tests in watch mode
npm run test:watch

# Run tests with coverage
npm run test:coverage
```

## Testing Guidelines

- Write tests for new features
- Test both success and error cases
- Use descriptive test names
- Mock external dependencies

## Questions?

Email: proof@yet.lu
GitHub Issues: Bug reports and feature requests

Thanks for contributing!
