# Boardly

Boardly is a guest-first collaborative whiteboard MVP built with Next.js 16, TypeScript, tldraw, Better Auth, and Cloudflare Durable Objects.

Guests can open a whiteboard instantly at `/whiteboard`, draw locally with no sign-in, and later save that board into an authenticated account for permanent storage and multiplayer collaboration.

## Stack

- Next.js 16 App Router
- TypeScript
- Tailwind CSS v4
- Motion
- tldraw
- Better Auth
- Cloudflare Workers
- Cloudflare Durable Objects
- Cloudflare D1
- Drizzle ORM

## Features

- Landing page with instant whiteboard CTA
- Guest whiteboard with session-scoped local persistence
- Infinite canvas with tldraw tools and keyboard shortcuts
- Authenticated dashboard with board list
- Create, rename, duplicate, and delete boards
- Save a guest board into a logged-in account
- Share-link invites for collaborators
- Realtime collaboration with live presence and cursors
- Persistent board snapshots backed by D1
- PNG export from the editor

## Project Structure

- `app/` Next.js routes, pages, and the `/api/*` proxy to the worker
- `components/` landing, auth, dashboard, invite, editor, and reusable UI
- `lib/` client API helpers, server session helpers, guest board persistence, and utilities
- `shared/` cross-runtime types used by the app and worker
- `worker/` Better Auth, D1 schema, board APIs, and Durable Object realtime room

## Environment Variables

The required variables are documented in [.env.example](/C:/Users/ACER/Desktop/Practice/NextJS/boardly/.env.example).

### Keep private

Do not commit these values:

- `BETTER_AUTH_SECRET`
- `REALTIME_SECRET`
- `CLOUDFLARE_ACCOUNT_ID`
- `CLOUDFLARE_D1_DATABASE_ID`
- `CLOUDFLARE_API_TOKEN`

### Safe app config

These are configuration values, not secrets:

- `BOARDLY_APP_URL`
- `BOARDLY_WORKER_URL`

## Local Development

1. Install dependencies:

```bash
npm install
```

2. Copy [.env.example](/C:/Users/ACER/Desktop/Practice/NextJS/boardly/.env.example) into your local env files:

- Use `.env.local` for the Next.js app.
- Use `.env` or `.dev.vars` for Wrangler local worker development.

3. Create a D1 database:

```bash
npx wrangler d1 create boardly
```

4. Paste the returned D1 `database_id` into:

- `CLOUDFLARE_D1_DATABASE_ID` in your local env file for Drizzle/Wrangler tooling
- `database_id` in [wrangler.toml](/C:/Users/ACER/Desktop/Practice/NextJS/boardly/wrangler.toml)

5. Add worker secrets for deployed environments:

```bash
npx wrangler secret put BETTER_AUTH_SECRET
npx wrangler secret put REALTIME_SECRET
```

6. Apply the migration:

```bash
npx wrangler d1 execute boardly --local --file=worker/migrations/0001_init.sql
```

7. Start the worker:

```bash
npm run dev:worker
```

8. In another terminal, start Next.js:

```bash
npm run dev:web
```

9. Open [http://localhost:3000](http://localhost:3000).

## Deploying To Vercel

This app uses:

- Vercel for the Next.js frontend
- Cloudflare Workers for auth, APIs, realtime, and persistence

Since your Cloudflare worker is already deployed, the main Vercel requirement is pointing the frontend at that worker.

### 1. Add the Vercel project

1. Import the GitHub repo into Vercel.
2. Let Vercel detect `Next.js`.
3. Keep the app root as the repository root.

### 2. Add the required Vercel environment variable

In Vercel Project Settings > Environment Variables, add:

- `BOARDLY_WORKER_URL`
- `NEXT_PUBLIC_TLDRAW_LICENSE_KEY`

Use your deployed worker URL, for example:

```env
BOARDLY_WORKER_URL=https://your-worker-subdomain.workers.dev
NEXT_PUBLIC_TLDRAW_LICENSE_KEY=your-tldraw-license-key
```
*(Note: Tldraw v4 strictly requires a license key for production deployments. Get a free non-commercial key at tldraw.dev)*

Add it to:

- `Production`
- `Preview`
- `Development` if you also use `vercel dev`

### 3. Deploy the frontend

Trigger a deployment from Vercel after adding the variable.

If you change `BOARDLY_WORKER_URL` later, redeploy the project so the new value is picked up.

## Updating Cloudflare For Vercel

Once Vercel gives you a production URL, update the Cloudflare worker config so auth callbacks and invite links point back to the frontend correctly.

### Cloudflare worker variables

In Cloudflare Workers & Pages > your worker > Settings > Variables and Secrets:

- Set `BOARDLY_APP_URL` to your Vercel production URL
- Set `BOARDLY_WORKER_URL` to your deployed worker URL

Example:

```env
BOARDLY_APP_URL=https://your-project.vercel.app
BOARDLY_WORKER_URL=https://your-worker-subdomain.workers.dev
```

### Cloudflare worker secrets

Make sure these secrets exist in Cloudflare:

- `BETTER_AUTH_SECRET`
- `REALTIME_SECRET`

If you need to set them via CLI:

```bash
npx wrangler secret put BETTER_AUTH_SECRET
npx wrangler secret put REALTIME_SECRET
```

### Cloudflare bindings

Your deployed worker must still have:

- the D1 binding `DB`
- the Durable Object binding `BOARD_ROOM`

Those remain configured through [wrangler.toml](/C:/Users/ACER/Desktop/Practice/NextJS/boardly/wrangler.toml) and your Cloudflare deployment.

## Production Checklist

Before pushing to GitHub:

- Keep `.env*` and `.dev.vars*` out of git
- Do not commit real secret values
- Do not commit a real Cloudflare API token
- Replace any real production IDs or URLs you do not want public

Before going live:

- Vercel has `BOARDLY_WORKER_URL`
- Vercel has `NEXT_PUBLIC_TLDRAW_LICENSE_KEY`
- Cloudflare has `BOARDLY_APP_URL`
- Cloudflare secrets are set
- D1 binding points at the correct production database
- Worker invite links open your Vercel frontend, not localhost

## Realtime Architecture

- Guest boards never touch the backend and stay in browser session storage.
- Permanent boards live in D1 and are loaded through the worker API.
- Each board has a Durable Object room that acts as the authoritative realtime coordinator.
- Snapshot updates are broadcast to all connected collaborators and persisted with debounce.
- Presence data stays ephemeral and is not written to the database.

## Main Routes

- `/` landing page
- `/whiteboard` instant guest board
- `/sign-in` sign in
- `/sign-up` sign up
- `/boards` authenticated dashboard
- `/boards/[boardId]` authenticated collaborative board
- `/invite/[token]` invite acceptance flow

## Verification

These checks currently pass:

```bash
node node_modules/typescript/bin/tsc --noEmit
node node_modules/eslint/bin/eslint.js .
node node_modules/next/dist/bin/next build
```

## Notes

- Collaboration requires login by design.
- Invite flow is link-based for the MVP and does not send email.
- Guest sessions are temporary and scoped to the current browser session.
