# KnowBalledge: Vercel migration

This is the final standard Next.js conversion of the existing project. The UI, CSS, animations, assets, mock player dataset, route paths, and scoring engine are unchanged. The migration creates no commits, does not push to GitHub, and does not deploy a new website. Git objects/references and staged entries are unchanged; a tool refreshed the index stat cache. No `.git` files are included in the export.

## Apply this ZIP to your existing repository

The ZIP contains files at its root: `package.json`, `app/`, `components/`, etc. Extract its contents into the root of your `HuyTheDev2509/KnowBalledge` checkout. Preserve your existing `.git` directory. Replace modified files and remove the obsolete files listed below; copying the ZIP over old files alone will leave those obsolete files behind. Keep your real `.env.local` private, and never upload it.

In Vercel use Next.js, Node 22.x or 24.x, `pnpm install --frozen-lockfile`, `pnpm build`, and `.next`. Clear old dashboard overrides pointing to Vite/vinext, Wrangler or `dist`. The checked-in `vercel.json` provides the compatible settings. Connect Upstash Redis and redeploy with both `UPSTASH_REDIS_REST_URL` and `UPSTASH_REDIS_REST_TOKEN` (or the supported `KV_REST_API_URL` / `KV_REST_API_TOKEN` pair). Use a write-capable REST token. No Sportmonks key is needed for demo gameplay.

## What changed

Cloudflare D1 sessions are replaced by Redis on Vercel. Atomic Lua version checks, owner isolation, and 24-hour TTL preserve server-side answer secrecy, resume, and concurrent-guess protection. Local runs automatically use Node's built-in SQLite. The historical importer still writes reviewed JSON; a separate publishing script sends that cache to Redis. Server-only module boundaries keep storage credentials out of client bundles.

The API request-origin comparison now checks the actual Host header, retaining protocol validation and avoiding Next.js's loopback hostname normalization mismatch. No game UI or scoring changes were needed.

`pnpm build` runs `next build`, and `pnpm start` runs `next start`. The development helper runs Next.js and normalizes optional preview-host flags; it does not invoke Vite, vinext, or Cloudflare. `--production` is available only for testing an already-built app in a supervised preview.

## Modified files

- `.env.example`
- `.gitignore`
- `README.md`
- `app/api/[...path]/route.ts`
- `lib/data/productionFootballDataService.ts`
- `lib/server/db.ts`
- `next.config.ts`
- `package.json`
- `pnpm-lock.yaml`
- `pnpm-workspace.yaml`
- `scripts/import-football.mjs`
- `tsconfig.json`

## Added files

- `VERCEL-MIGRATION.md`
- `lib/server/redis.mjs`
- `scripts/dev.mjs`
- `scripts/publish-football.mjs`
- `scripts/test-api.mjs`
- `scripts/test-production.mjs`
- `vercel.json`

## Removed obsolete files

- `.openai/hosting.json`
- `app/chatgpt-auth.ts`
- `build/sites-vite-plugin.LICENSE`
- `build/sites-vite-plugin.ts`
- `cloudflare-env.d.ts`
- `db/index.ts`
- `db/schema.ts`
- `drizzle.config.ts`
- `drizzle/0000_clammy_randall.sql`
- `drizzle/meta/0000_snapshot.json`
- `drizzle/meta/_journal.json`
- `examples/d1/app/api/notes/route.ts`
- `examples/d1/db/schema.ts`
- `scripts/build-verified.sh`
- `scripts/execution-profile.mjs`
- `scripts/install-ci.mjs`
- `scripts/install-ci.sh`
- `scripts/install-pnpm.sh`
- `scripts/pnpm-install.mjs`
- `scripts/run-framework.mjs`
- `scripts/sites-env.mjs`
- `scripts/sites-env.sh`
- `vite.config.ts`

## Verification

- Frozen-lockfile installation and standard Next.js production compilation/type checks passed.
- `.next/routes-manifest.json`, `.next/BUILD_ID`, app pages and dynamic API routes were generated.
- Production API tests passed using local SQLite and a real local Redis server behind a TLS REST adapter with `VERCEL=1`; Redis Lua updates and 24-hour expiry were exercised.
- Browser production QA passed title, season, Country/Brazil, autocomplete, all five hints, win, loss, replay, Every Season, and League/Premier League.
- The engine assertions passed all scoring stages/attempts, maximum guesses, duplicate rejection, hidden answers, aliases, Every Season and recent-player exclusion.
- No live Vercel/Upstash account credentials or Sportmonks token were supplied. Actual hosting integration must be connected in your Vercel project; the Sportmonks subscription/import remains untested with real credentials.
- The final ZIP excludes `.git`, dependencies, builds, local test databases, request caches, and real secrets. `.env.example` contains only blank configuration values and non-secret import thresholds.
