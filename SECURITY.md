# Security Policy

## Reporting a Vulnerability

If you discover a security vulnerability in RblxDash, **please do not open a public issue**.

Instead, report it privately:

1. **Email**: Send details to **security@rblxdash.com** (or your preferred contact)
2. **GitHub**: Use [GitHub's private vulnerability reporting](https://github.com/misericorde0712/RblxDash/security/advisories/new)

### What to include

- Description of the vulnerability
- Steps to reproduce
- Potential impact
- Suggested fix (if you have one)

### What to expect

- **Acknowledgment** within 48 hours
- **Status update** within 7 days
- **Fix timeline** depending on severity (critical: <72h, high: <7 days, medium: <30 days)

We will credit you in the release notes unless you prefer to remain anonymous.

## Supported Versions

| Version | Supported |
|---------|-----------|
| Latest (`main`) | Yes |
| Older releases | Best effort |

## Scope

The following are in scope:

- Authentication/authorization bypasses
- SQL injection, XSS, CSRF
- API key or secret exposure
- Privilege escalation
- Data leaks between organizations

The following are **out of scope**:

- Vulnerabilities in third-party services (Clerk, Stripe, Roblox)
- Social engineering
- Denial of service (unless it's a bug in our rate limiting)
- Issues in dependencies (report these upstream)

## Security Features

RblxDash implements the following security measures:

- **Authentication**: Clerk with JWT verification
- **Authorization**: Role-based access control (RBAC) with 3-tier roles
- **API keys**: SHA-256 hashed, never stored in plaintext
- **Encryption**: AES-256-GCM for OAuth tokens and Open Cloud API keys
- **Rate limiting**: Per-IP and per-key rate limits on all routes
- **Security headers**: CSP, HSTS, X-Frame-Options, X-Content-Type-Options
- **Input validation**: Zod schemas on all API inputs
- **Webhook auth**: Per-game secrets with rotation support
