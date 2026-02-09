# Contributing to lean-browser

Thanks for your interest in contributing!

## Getting Started

1. Fork the repository
2. Clone your fork: `git clone https://github.com/YOUR_USERNAME/lean-browser.git`
3. Install dependencies: `npm install`
4. Install Playwright browsers: `npx playwright install chromium`

## Development

```bash
# Run tests
npm test

# Run only unit tests
npm run test:unit

# Run only integration tests
npm run test:integration

# Lint
npm run lint

# Format
npm run format
```

## Making Changes

1. Create a feature branch: `git checkout -b feature/your-feature`
2. Make your changes
3. Add tests for new functionality
4. Ensure all tests pass: `npm test`
5. Ensure lint is clean: `npm run lint`
6. Ensure formatting is correct: `npm run format:check`
7. Commit your changes with a descriptive message
8. Push and open a Pull Request

## Code Style

- ES Modules (import/export)
- Prettier formatting (auto-applied)
- ESLint rules enforced
- Prefer small, focused functions
- Keep dependencies minimal

## Reporting Issues

Please include:

- Node.js version (`node --version`)
- OS and version
- Steps to reproduce
- Expected vs actual behavior
- The URL you were fetching (if applicable)

## License

By contributing, you agree that your contributions will be licensed under the MIT License.
