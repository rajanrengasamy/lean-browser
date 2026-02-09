# Documentation Index

Welcome to the lean-browser documentation! This index will help you find what you need.

## Getting Started

Start here if you're new to lean-browser:

1. [Main README](../README.md) - Installation, quick start, and overview
2. [Basic Examples](../examples/basic-usage.sh) - Simple CLI usage examples
3. [Research Workflow](../examples/research-workflow.js) - Your first programmatic example

## Core Documentation

### [Architecture Guide](./ARCHITECTURE.md)

**For developers who want to understand how lean-browser works**

- System architecture diagrams
- Component overview (browser, extractor, formatter, actions)
- Data flow through the pipeline
- Extension points for customization
- Performance considerations
- Testing architecture

**Read this if you want to:**

- Understand the codebase structure
- Contribute to lean-browser
- Build custom extractors or formatters
- Optimize performance

### [API Reference](./API.md)

**Complete programmatic API documentation**

- All exported functions with parameters and return types
- TypeScript-style type definitions
- Usage examples for every function
- Error handling patterns
- Working code examples

**Read this if you want to:**

- Use lean-browser in your Node.js application
- Understand available options
- Build custom integrations
- Reference function signatures

### [Troubleshooting Guide](./TROUBLESHOOTING.md)

**Common issues and how to solve them**

- Quick diagnostic checklist
- Cloudflare and bot detection workarounds
- Timeout handling strategies
- Memory management tips
- Missing elements debugging
- Error messages explained
- Debug mode instructions

**Read this if you're experiencing:**

- Pages not loading
- Missing form elements
- Out of memory errors
- Timeout issues
- Anti-bot detection problems

### [Performance Guide](./PERFORMANCE.md)

**Optimization strategies and benchmarks**

- Performance benchmarks
- Browser pooling configuration
- Token budget strategies
- Memory management techniques
- Network optimization
- Concurrency patterns
- Monitoring and profiling

**Read this if you want to:**

- Speed up your scraping workflows
- Handle high-throughput scenarios
- Optimize memory usage
- Configure browser pooling
- Implement rate limiting

## Examples

All examples are executable Node.js scripts with detailed comments.

### Web Automation

- [**login-workflow.js**](../examples/login-workflow.js)
  - Complete login automation
  - 2FA handling
  - Form element detection
  - Screenshot verification
  - Run: `node examples/login-workflow.js`

- [**form-filling.js**](../examples/form-filling.js)
  - Fill text inputs, textareas, selects
  - Handle checkboxes and radio buttons
  - Multi-step forms
  - Form validation
  - Dynamic forms (fields appear based on selections)
  - Run: `node examples/form-filling.js contact`

- [**scraping-with-pagination.js**](../examples/scraping-with-pagination.js)
  - Scrape Hacker News with pagination
  - Numbered pagination
  - Infinite scroll
  - Smart pagination detection
  - "Load More" buttons
  - Data deduplication
  - Run: `node examples/scraping-with-pagination.js hn`

### Visual Testing

- [**screenshot-comparison.js**](../examples/screenshot-comparison.js)
  - Full page screenshots
  - Element screenshots
  - Before/after comparison
  - Responsive design testing
  - Scroll position captures
  - Visual regression testing
  - Theme variations (dark/light)
  - Run: `node examples/screenshot-comparison.js responsive https://example.com`

### Integration

- [**mcp-integration.js**](../examples/mcp-integration.js)
  - Simulating MCP tool calls
  - Multi-tool workflows
  - Adaptive tool selection
  - Token budget optimization
  - Error handling patterns
  - Rate limiting
  - Run: `node examples/mcp-integration.js workflow`

### Error Handling

- [**error-handling.js**](../examples/error-handling.js)
  - Basic error handling
  - Retry with exponential backoff
  - Circuit breaker pattern
  - Graceful degradation
  - Timeout handling
  - Error logging and monitoring
  - Safe cleanup
  - Run: `node examples/error-handling.js retry https://example.com`

### Quick Examples

- [**basic-usage.sh**](../examples/basic-usage.sh) - Shell script with CLI examples
- [**research-workflow.js**](../examples/research-workflow.js) - Multi-page research
- [**token-optimization.js**](../examples/token-optimization.js) - Token budget comparison

## Quick Reference

### Common Tasks

| Task                | Documentation                                                  | Example                                              |
| ------------------- | -------------------------------------------------------------- | ---------------------------------------------------- |
| Basic page fetch    | [README](../README.md#cli-usage)                               | `lean-browser https://example.com`                   |
| Form automation     | [API: Actions](./API.md#actions-module)                        | [form-filling.js](../examples/form-filling.js)       |
| Multi-page scraping | [Example](../examples/scraping-with-pagination.js)             | `node examples/scraping-with-pagination.js`          |
| Screenshot capture  | [README: Screenshots](../README.md#screenshot-capture)         | `lean-browser screenshot https://example.com`        |
| MCP integration     | [README: MCP](../README.md#mcp-integration)                    | [mcp-integration.js](../examples/mcp-integration.js) |
| Error handling      | [Troubleshooting](./TROUBLESHOOTING.md)                        | [error-handling.js](../examples/error-handling.js)   |
| Performance tuning  | [Performance Guide](./PERFORMANCE.md)                          | Browser pooling, resource blocking                   |
| Custom extraction   | [Architecture: Extensions](./ARCHITECTURE.md#extension-points) | Custom formatters and extractors                     |

### By Use Case

#### I want to read web articles for my AI agent

1. Start with [README](../README.md)
2. Use `fetch_page_text` MCP tool or `--mode text` CLI
3. Adjust token budget with `--tokens`

#### I want to automate form filling

1. Read [form-filling.js](../examples/form-filling.js)
2. Use `--mode interactive` to see form elements
3. Use action DSL to fill fields
4. Reference [Actions API](./API.md#actions-module)

#### I want to scrape data from multiple pages

1. Read [scraping-with-pagination.js](../examples/scraping-with-pagination.js)
2. Implement pagination detection
3. Use [Performance Guide](./PERFORMANCE.md) for optimization
4. Add rate limiting from [error-handling.js](../examples/error-handling.js)

#### I'm experiencing errors or timeouts

1. Start with [Troubleshooting Guide](./TROUBLESHOOTING.md)
2. Check [Quick Diagnostic Checklist](./TROUBLESHOOTING.md#quick-diagnostic-checklist)
3. Try debug mode: `lean-browser https://example.com --headed`
4. Review [Error Handling Examples](../examples/error-handling.js)

#### I need better performance

1. Read [Performance Guide](./PERFORMANCE.md)
2. Enable browser pooling (automatic in most cases)
3. Use `--block-ads` and `--block-resources`
4. Configure concurrency and rate limiting

#### I want to contribute

1. Read [CONTRIBUTING.md](../CONTRIBUTING.md)
2. Study [Architecture Guide](./ARCHITECTURE.md)
3. Look at [Extension Points](./ARCHITECTURE.md#extension-points)
4. Check existing examples for patterns

## Additional Resources

### Configuration

- [Environment Variables](../README.md#environment-variables)
- [CLI Options](../README.md#cli-options)
- [Browser Pool Configuration](./PERFORMANCE.md#browser-pool-configuration)

### Security

- [SSRF Protection](../README.md#ssrf-protection)
- Security best practices in [Architecture Guide](./ARCHITECTURE.md#security-considerations)

### Testing

- [Test Strategy](./ARCHITECTURE.md#testing-architecture)
- Run tests: `npm test`

## Getting Help

### Before asking for help:

1. Check [Troubleshooting Guide](./TROUBLESHOOTING.md)
2. Read [FAQ](../README.md#faq)
3. Review relevant examples
4. Search [GitHub Issues](https://github.com/YOUR_USERNAME/lean-browser/issues)

### How to ask for help:

Include in your question:

- Your environment (OS, Node.js version, lean-browser version)
- What you're trying to do
- What you expected to happen
- What actually happened
- Error messages (full output)
- Minimal reproduction code

See [Troubleshooting: Getting Help](./TROUBLESHOOTING.md#getting-help) for the template.

## Documentation Status

| Document           | Lines | Status   | Last Updated |
| ------------------ | ----- | -------- | ------------ |
| README.md          | 673   | Complete | Feb 2026     |
| ARCHITECTURE.md    | 676   | Complete | Feb 2026     |
| API.md             | 1,265 | Complete | Feb 2026     |
| TROUBLESHOOTING.md | 801   | Complete | Feb 2026     |
| PERFORMANCE.md     | 798   | Complete | Feb 2026     |
| CONTRIBUTING.md    | 63    | Complete | Feb 2026     |
| Examples (total)   | 2,782 | Complete | Feb 2026     |

**Total Documentation**: 7,000+ lines

## Contributing to Documentation

Found a typo? Missing example? Unclear explanation?

1. Documentation lives in `/docs` and `/examples`
2. Follow existing formatting and style
3. Add examples for complex topics
4. Test all code examples
5. Update this index if adding new docs

See [CONTRIBUTING.md](../CONTRIBUTING.md) for full guidelines.

---

**Happy browsing!** If you find lean-browser useful, please star the repository and share with others.
