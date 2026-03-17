# Contributing to RblxDash

Thank you for considering contributing to RblxDash! This document explains how to get started.

## Getting Started

1. **Fork** the repository on GitHub
2. **Clone** your fork:
   ```bash
   git clone https://github.com/YOUR_USERNAME/RblxDash.git
   cd RblxDash
   ```
3. **Install dependencies**: `npm install`
4. **Set up environment**: `cp .env.example .env` and fill in your credentials
5. **Set up database**: `npx prisma generate && npx prisma db push`
6. **Seed demo data** (optional): `npm run db:seed`
7. **Start dev server**: `npm run dev`

## Making Changes

1. Create a branch from `main`:
   ```bash
   git checkout -b your-feature-name
   ```
2. Make your changes
3. Run the checks:
   ```bash
   npm run lint    # Linting
   npm test        # Unit tests
   npm run build   # Ensure it builds
   ```
4. Commit with a descriptive message
5. Push to your fork and open a Pull Request

## Pull Request Guidelines

- Keep PRs focused — one feature or fix per PR
- Add tests for new functionality
- Update documentation if you change behavior
- Ensure CI passes before requesting review
- Reference the related issue if applicable (e.g., "Fixes #42")

## Code Standards

- **TypeScript** everywhere — avoid `any`, use proper types
- **ESLint** must pass (`npm run lint`)
- **Tailwind CSS** for all styling — no inline styles in new code
- Keep components small and focused
- Use the structured logger (`createLogger`) instead of raw `console.log` in library code

## Bug Reports

Check [Issues](https://github.com/misericorde0712/RblxDash/issues) first to avoid duplicates. When reporting:

- Describe what you expected vs. what happened
- Steps to reproduce
- Browser/OS/Node version if relevant
- Screenshots if it's a UI issue

## Feature Requests

Open an issue with the **feature request** label. Explain:

- What problem it solves
- Why it's useful for Roblox studios
- Example use cases

## Security Vulnerabilities

**Do not open a public issue.** See [SECURITY.md](SECURITY.md) for responsible disclosure.

## License

By contributing, you agree that your contributions will be licensed under the [GNU AGPL-3.0](LICENSE).
