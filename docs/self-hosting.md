# Self-Hosting

RblxDash can run in a simple self-host mode from this repository.

## Current scope

- PostgreSQL is required.
- Built-in local auth is available when `SELF_HOSTED=true`.
- Stripe is optional when `SELF_HOSTED=true`.
- In self-host mode, hosted billing is disabled and plan limits are unlocked.

## Quick start with Docker

1. Copy `.env.example` to `.env`.
2. Keep `SELF_HOSTED=true`.
3. Fill the required values:
   - `LOCAL_AUTH_SECRET`
   - `NEXT_PUBLIC_APP_URL`
   - These public values are baked into the Docker image at build time, so set them before running `docker compose up --build`
4. Start the stack:

```bash
docker compose up --build -d
```

5. Open `http://localhost:3000`.
6. Create the first account at `http://localhost:3000/register`.

## Manual start without Docker

1. Create a PostgreSQL database.
2. Copy `.env.example` to `.env`.
3. Set `DATABASE_URL` to your database.
4. Keep `SELF_HOSTED=true`.
5. Set `LOCAL_AUTH_SECRET`.
6. Install and start:

```bash
npm install
npm run db:deploy
npm run build
npm run start
```

7. Open `/register` and create the first local account.

## Optional services

- Clerk: only needed if you want hosted Clerk auth instead of local self-host auth
- Stripe: only needed for hosted checkout and billing portal support
- Roblox OAuth: only needed for Roblox account linking
- Resend: only needed for transactional email
- Upstash Redis: only needed for external rate-limit storage
- Sentry: only needed for hosted error tracking

## Recommended first production pass

- Set `SELF_HOSTED=true`
- Set `LOCAL_AUTH_SECRET`
- Leave Stripe empty
- Leave Clerk empty unless you want hosted auth
- Configure PostgreSQL backups
- Put the app behind HTTPS
- Add Roblox OAuth later if you need it
