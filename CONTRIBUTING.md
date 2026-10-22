# Contributing to Saydo

Thank you for your interest in contributing to Saydo! This document provides guidelines and instructions for contributing to the project.

## 📋 Table of Contents

- [Code of Conduct](#code-of-conduct)
- [Getting Started](#getting-started)
- [Development Workflow](#development-workflow)
- [Coding Standards](#coding-standards)
- [Testing](#testing)
- [Submitting Changes](#submitting-changes)
- [Reporting Issues](#reporting-issues)

## 🤝 Code of Conduct

Be respectful, inclusive, and collaborative. We welcome contributions from everyone regardless of background or experience level.

## 🚀 Getting Started

### Prerequisites

- Node.js 18+
- npm or yarn
- Expo CLI: `npm install -g expo-cli`
- Docker (for local Supabase)
- Git

### Setup

1. Fork the repository
2. Clone your fork:
   ```bash
   git clone https://github.com/YOUR_USERNAME/voiceToText.git
   cd voiceToText
   ```
3. Install dependencies:
   ```bash
   npm install
   ```
4. Copy environment template:
   ```bash
   cp .env.example .env
   ```
5. Configure your local environment (see README.md)
6. Start local Supabase:
   ```bash
   npm run supabase:start
   ```

## 🔄 Development Workflow

### Branch Strategy

- `main` - Production-ready code
- `feature/*` - New features
- `fix/*` - Bug fixes
- `docs/*` - Documentation updates

### Making Changes

1. Create a new branch:
   ```bash
   git checkout -b feature/your-feature-name
   ```

2. Make your changes following the [coding standards](#coding-standards)

3. Test your changes:
   ```bash
   npm test
   npm run typecheck
   ```

4. Commit your changes with a clear message:
   ```bash
   git commit -m "feat: add user approval for task suggestions"
   ```

5. Push to your fork:
   ```bash
   git push origin feature/your-feature-name
   ```

6. Create a pull request

## 📐 Coding Standards

### General Principles

This project follows the "lazy senior dev" philosophy from `.cursor/rules/01-simple-engineering.mdc`:

1. **YAGNI** - Don't build what isn't needed
2. **Reuse** - Use existing helpers, utilities, and patterns
3. **Stdlib First** - Use standard library features before adding dependencies
4. **Minimal Code** - Write the shortest working code that solves the problem
5. **No Unnecessary Abstractions** - Only abstract when explicitly needed

### TypeScript

- Use strict mode
- Type all function parameters and return values
- Avoid `any` types
- Use interfaces for public APIs, types for internal

### React Native / Expo

- Use functional components with hooks
- Keep components small and focused
- Separate business logic from UI
- Use Expo Router for navigation

### Supabase

- Always use RLS (Row-Level Security) for user data
- Never expose service_role keys to the client
- Validate inputs at trust boundaries
- Use Edge Functions for privileged operations

### AI Integration

- Never log transcripts or audio content
- Validate all AI outputs with Zod schemas
- Keep AI secrets in Supabase Vault, never in client code
- Use provider adapters for SDK-swappability

## 🧪 Testing

### Unit Tests

We use Vitest for unit tests. Tests must be:

- **Behavior-driven**: Assert real business logic, not mock calls
- **Deterministic**: Same result every run
- **Fast**: No network, DB, or I/O
- **Isolated**: Test pure logic, extract it if needed

```bash
# Run all tests
npm test

# Run in watch mode
npm run test:watch
```

### Testing Policy

See `.cursor/rules/07-testing.mdc` and `.cursor/rules/10-fe-behavior-driven.mdc` for detailed testing guidelines.

**Forbidden**:
- Testing that a mock was called (`toHaveBeenCalled`)
- Re-implementing logic in tests
- Smoke tests (`toBeDefined`, "doesn't throw")

**Required**:
- Assert real outputs/errors from business rules
- Test failure modes with same rigor as happy path
- Side-by-side tests for new/changed pure logic

### Type Checking

```bash
npm run typecheck
```

## 📤 Submitting Changes

### Pull Request Checklist

Before submitting a PR, ensure:

- [ ] Code follows project coding standards
- [ ] Tests pass: `npm test`
- [ ] Type checking passes: `npm run typecheck`
- [ ] Documentation is updated if needed
- [ ] Commit messages are clear and descriptive
- [ ] No unrelated changes included
- [ ] No secrets or credentials committed

### Pull Request Template

```markdown
## Description
Brief description of changes

## Type of Change
- [ ] Bug fix
- [ ] New feature
- [ ] Breaking change
- [ ] Documentation update

## Testing
How did you test these changes?

## Checklist
- [ ] Tests added/updated
- [ ] Documentation updated
- [ ] No secrets committed
```

## 🐛 Reporting Issues

### Bug Reports

When reporting a bug, include:

1. **Description**: Clear description of the problem
2. **Steps to Reproduce**: Minimal reproduction steps
3. **Expected Behavior**: What should happen
4. **Actual Behavior**: What actually happens
5. **Environment**:
   - OS and version
   - Node.js version
   - Expo version
   - Device/simulator (if applicable)
6. **Logs**: Relevant error logs or screenshots

### Feature Requests

When requesting a feature:

1. **Description**: Clear description of the feature
2. **Use Case**: Why this feature is needed
3. **Alternatives**: Any alternatives you've considered
4. **Implementation Ideas** (optional): How you think it could be implemented

## 📚 Documentation

When contributing:

- Update relevant documentation in `docs/`
- Keep README.md current if user-facing changes
- Update decision log (docs/17_DECISIONS.md) for architectural changes
- Comment complex logic with `ponytail:` markers for intentional simplifications

## 💬 Getting Help

- Check existing [documentation](./docs/)
- Search [existing issues](https://github.com/harsHdokyc/voiceToText/issues)
- Start a [discussion](https://github.com/harsHdokyc/voiceToText/discussions)

## 📜 License

By contributing, you agree that your contributions will be licensed under the project's license.

---

Thank you for contributing to Saydo! 🎉
