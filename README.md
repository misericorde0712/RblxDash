# RblxDash

Open-source game operations dashboard for Roblox studios. Live metrics, player analytics, moderation, economy tracking, and a REST API — all in one place.

## Features

- **Live dashboard** — Real-time server health, player counts, and event rates
- **Player tracking** — Profiles with join history, play time, online status, and session data
- **Moderation** — Ban, kick, and timeout players from the dashboard with in-game delivery via webhooks
- **Analytics** — Activity, economy flows, monetization, and progression funnels
- **Logs** — Searchable event log with JSON payload inspection
- **REST API** — Full v1 API for external integrations (Studio plan)
- **Team workspaces** — Role-based access control (Moderator, Admin, Owner) with invite system
- **Discord alerts** — Notifications for moderation failures and dead webhooks
- **Audit log** — Full trail of workspace actions

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Framework | Next.js 16 (App Router) |
| Language | TypeScript (strict) |
| Database | PostgreSQL + Prisma ORM |
| Auth | Local auth for self-host, Clerk for hosted mode |
| Payments | Stripe (optional) |
| Charts | Recharts |
| Styling | Tailwind CSS v4 |
| Email | Resend |
| Deployment | Vercel |

## Quick Start

### Requirements

- Node.js >= 20
- PostgreSQL database
- `LOCAL_AUTH_SECRET` for self-hosted local auth
- [Clerk](https://clerk.com) account (optional unless you want hosted auth)
- [Stripe](https://stripe.com) account (optional, only for billing)

### 1. Clone & install

```bash
git clone https://github.com/misericorde0712/RblxDash.git
cd RblxDash
npm install
```

### 2. Configure environment

```bash
cp .env.example .env
```

Edit `.env` with your own credentials. Each variable is documented in the file. For encryption keys, use the generation commands in the comments.
For production, set `NEXT_PUBLIC_APP_URL=https://rblxdash.com`.
For self-hosting, keep `SELF_HOSTED=true`, set `LOCAL_AUTH_SECRET`, then create your first account at `/register`.

### 3. Set up the database

```bash
npx prisma generate
npx prisma db push
```

Optionally, seed with demo data:

```bash
npm run db:seed
```

### 4. Start the dev server

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

## Scripts

| Command | Description |
|---------|-------------|
| `npm run dev` | Start development server |
| `npm run build` | Production build |
| `npm run start` | Start production server |
| `npm run lint` | Run ESLint |
| `npm test` | Run tests (Vitest) |
| `npm run test:watch` | Run tests in watch mode |
| `npm run db:seed` | Seed database with demo data |

## Documentation

- Main docs index: [`docs/README.md`](docs/README.md)
- Self-hosting guide: [`docs/self-hosting.md`](docs/self-hosting.md)
- Roblox example files: [`examples/roblox-demo/README.md`](examples/roblox-demo/README.md)

## Project Structure

```
docs/
├── community/            # Community-facing launch and forum copy
├── creator-kit/          # Demo, tutorial, and marketing support docs
├── planning/             # Product and implementation planning docs
└── testing/              # Manual validation checklists
examples/
└── roblox-demo/          # Example Luau files for Roblox Studio
src/
├── app/
│   ├── (auth)/           # Auth pages (sign-in, sign-up)
│   ├── (dashboard)/      # Dashboard pages (19 pages)
│   ├── api/              # API routes (50+ endpoints)
│   │   ├── v1/           # Public REST API
│   │   ├── webhook/      # Roblox webhook ingestion
│   │   ├── stripe/       # Stripe webhooks
│   │   └── ...
│   ├── changelog/        # Public changelog
│   └── ...
├── components/           # React components
│   └── ui/               # Reusable UI primitives
├── lib/                  # Services, utils, configs
│   ├── auth.ts           # Auth & org context
│   ├── billing.ts        # Stripe billing logic
│   ├── rate-limit.ts     # Rate limiter
│   ├── logger.ts         # Structured logging
│   ├── i18n.ts           # Internationalization
│   └── ...
└── types/                # TypeScript types
prisma/
├── schema.prisma         # Database schema (22 models)
├── seed.ts               # Demo data seed
└── migrations/           # Migration history
```

## Plans

| Feature | Free | Pro ($15/mo) | Studio ($40/mo) |
|---------|------|-------------|-----------------|
| Games | 1 | 5 | Unlimited |
| Workspaces | 1 | 3 | Unlimited |
| Log retention | 7 days | 30 days | 90 days |
| Modules | Players, Logs | All | All |
| REST API | — | — | Full access |
| Team members | — | Unlimited | Unlimited |

## Self-Hosting

RblxDash is designed to be self-hosted. You need:

1. A PostgreSQL database (e.g., [Neon](https://neon.tech), [Supabase](https://supabase.com), or your own)
2. A `LOCAL_AUTH_SECRET` for the built-in self-host auth flow
3. A Clerk application only if you want hosted Clerk auth instead of local auth
4. A Stripe account if you want billing (optional for self-hosting)
5. Any Node.js hosting (Vercel, Railway, VPS, etc.)

Set all environment variables from `.env.example` and deploy.

For the simplest deployment path, use [`docs/self-hosting.md`](docs/self-hosting.md). The repository now includes `Dockerfile`, `docker-compose.yml`, a `SELF_HOSTED=true` mode, built-in local auth, and a path that works without Stripe or Clerk.

## Contributing

We welcome contributions! See [CONTRIBUTING.md](CONTRIBUTING.md) for guidelines.

Before submitting a PR:
- Run `npm run lint` and fix any issues
- Run `npm test` and ensure all tests pass
- Add tests for new functionality

## Security

If you discover a security vulnerability, please see [SECURITY.md](SECURITY.md) for responsible disclosure instructions. **Do not open a public issue.**

## License

[GNU AGPL-3.0](LICENSE) — You can use, modify, and distribute this software freely. If you run a modified version as a network service, you must make the source code available to users of that service.
