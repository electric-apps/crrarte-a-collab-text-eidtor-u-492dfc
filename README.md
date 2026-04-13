# Collaborative Text Editor

A real-time collaborative rich-text editor where multiple users can concurrently edit documents using Yjs CRDTs over Durable Streams.

Generated with [one-shot-electric-app](https://github.com/anthropics/one-shot-electric-app) — an Electric SQL + TanStack DB + shadcn/ui scaffold.

## Prerequisites

- Node.js 22+
- pnpm 9+
- Docker (for local Postgres + Electric)

## Setup

```bash
pnpm install
```

### Environment variables

Copy `.env.example` to `.env` and fill in the values:

| Variable | Purpose | How to get it |
|---|---|---|
| `DATABASE_URL` | Postgres connection | Auto-provisioned by `docker compose up` (local) or from your Electric Cloud claim |
| `ELECTRIC_URL` | Electric shape sync endpoint | `http://localhost:3000` (local) or `https://api.electric-sql.cloud` |
| `ELECTRIC_SOURCE_ID` | Electric Cloud source (cloud mode only) | From the Cloud claim URL or `npx @electric-sql/cli` |
| `ELECTRIC_SECRET` | Electric Cloud auth (cloud mode only) | Same source as above |
| `ELECTRIC_YJS_SERVICE_ID` | Yjs collaborative editing service | `npx @electric-sql/cli services create yjs` |
| `ELECTRIC_YJS_SECRET` | Yjs service auth token | `npx @electric-sql/cli services get-secret <id>` |

### Getting Yjs credentials

This app uses `@durable-streams/y-durable-streams` for collaborative editing. You need to provision a Yjs service:

```bash
# Log in (opens a browser)
npx @electric-sql/cli auth

# Create a Yjs service
npx @electric-sql/cli services create yjs --environment <env-id> --name my-yjs

# Get the secret
npx @electric-sql/cli services get-secret <service-id> --json
```

Add `ELECTRIC_YJS_SERVICE_ID` and `ELECTRIC_YJS_SECRET` to your `.env`.

## Running

```bash
# Start local infra (Postgres + Electric)
docker compose up -d

# Run migrations
pnpm drizzle-kit migrate

# Start the dev server
pnpm dev
```

App runs at `http://localhost:5174`.

> Tip: when running inside the agent sandbox, `pnpm dev:start` launches Vite behind a Caddy reverse proxy at `https://localhost:<preview-port>` (HTTP/2 multiplexing — avoids the browser's ~6-connection-per-origin SSE cap). Outside the sandbox, you can just run `pnpm dev` directly.
>
> **First-time HTTPS setup (one-time, zero-warning path):** from the `one-shot-electric-app` repo root run `pnpm trust-cert` once. This installs Caddy's local CA into your system keychain. After that every preview link loads with a green lock. If you skip this step Chrome will show a one-time "Not Secure" warning — click "Advanced -> Proceed".

## Architecture

- **Document metadata sync**: Electric SQL shapes -> TanStack DB collections -> `useLiveQuery`
- **Collaborative editing**: Yjs CRDTs synced via `@durable-streams/y-durable-streams` through a server-side proxy
- **Presence**: Yjs Awareness for cursor positions and online users
- **Mutations**: Optimistic via `collection.insert/update/delete`, reconciled through API routes
- **UI**: shadcn/ui + Tailwind CSS + lucide-react (Electric design system)
- **Validation**: zod/v4

See [`PLAN.md`](./PLAN.md) for the full implementation plan.

## Tests

```bash
pnpm test          # unit + integration tests
pnpm build         # type check + production build
```

## Deploying

The scaffold is dev-oriented. For production deployment patterns, see the [Electric SQL docs](https://electric-sql.com/docs).
