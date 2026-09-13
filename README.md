# KnowBalledge

A complete football guessing game with a cinematic stadium, era selection, League and Country challenges, server-side answers, sequential clues, two guesses per clue, autocomplete, scoring, results, share text and device preferences.

## Run locally

Use Node.js 22.13+ (Node 22.x or 24.x) and pnpm 11.19.0.

```sh
pnpm install --frozen-lockfile
pnpm build
pnpm start
```

Open http://localhost:3000. For development, use `pnpm dev`. The development launcher delegates to Next.js and also accepts hosted-preview flags; `pnpm build` runs `next build` directly, and `pnpm start` runs `next start`. Local gameplay works with no environment variables: SQLite creates `.local/knowballedge.sqlite` automatically, and the original demo dataset is bundled server-side. No SQL migration command is required.

## Deploy the existing GitHub repository to Vercel

1. Replace the old source with this export in your existing `HuyTheDev2509/KnowBalledge` checkout, preserving its `.git` directory. Remove the obsolete files listed in `VERCEL-MIGRATION.md`; simply copying over old files does not delete them. Commit and push using your normal Git workflow.
2. In the existing Vercel project, select the directory containing `package.json` as the Root Directory. Choose **Next.js**, Node.js **22.x** or **24.x**, and clear old command/output overrides. `vercel.json` sets install to `pnpm install --frozen-lockfile`, build to `pnpm build`, and output to `.next`. Do not select Vite, use `dist`, or enable static export.
3. Connect **Upstash Redis** to this Vercel project through Storage/Marketplace, or add its REST URL and write token as server-side environment variables. Set `UPSTASH_REDIS_REST_URL` and `UPSTASH_REDIS_REST_TOKEN` for Production and Preview if both are used. Integrations using `KV_REST_API_URL` and `KV_REST_API_TOKEN` are also supported. Never use the read-only token.
4. Redeploy after connecting Redis. No Sportmonks token is needed for the 48-player demo. No database schema setup is needed in Redis.

**Redis is required for hosted matches**, even in demo mode: it preserves hidden answers, 24-hour sessions, refresh/resume, and atomic version checks across separate Vercel function instances. An in-memory map or local file cannot safely replace that on serverless hosting. The app deliberately refuses a local-storage fallback when `VERCEL` is set. The build itself does not need Redis credentials or call Sportmonks.

Keep all real values in `.env.local` locally or Vercel environment settings. Never prefix credentials with `NEXT_PUBLIC_`. The safe `.env.example` contains names and blank values only. This export does not provision a Vercel account/database or change the previously hosted website.

References: [Vercel storage integrations](https://vercel.com/docs/storage), [Upstash REST API](https://upstash.com/docs/redis/features/restapi).

## Demo data and scope

Without an imported cache, the game uses **48 famous players** and explicit club spells from **2015/16–2024/25**. The small fixture intentionally follows the brief's offline development allowance. It is not a verified professional player database: physical measurements are illustrative profile values, not season-by-season historical measurements. Incomplete/current-era guesses are never fabricated: 2025/26 and 2026/27 stay visible but unavailable until their squads are imported. Every Season samples uniformly among seasons available for the selected category and reveals the chosen season as an additional first clue.

All five leagues and twelve requested nationalities are supported where an eligible player exists. Empty selections are disabled. The same player can appear in different historical seasons; recent-player avoidance compares the stable player ID. If a pool is exhausted it resets gracefully.

## Licensed production data

`lib/data/mockDataService.ts` and `productionFootballDataService.ts` are separate providers. An imported Redis cache takes priority over the demo fixture. Gameplay never requests the external provider directly.

1. Copy `.env.example` to `.env.local` and configure a licensed Sportmonks token with historical squad/statistics coverage.
2. Optionally set `FEATURED_PLAYER_IDS` to a small comma-separated list of Sportmonks player IDs for injured/notable players. Import thresholds default to three appearances or 150 minutes.
3. Run `node --env-file=.env.local scripts/import-football.mjs`. The script discovers supported league seasons, lists the teams that actually participated, requests each historical squad, normalizes identities and positions, excludes missing hint fields, and caches raw API responses for 24 hours. API errors stop import without changing the live cache.
4. Review `.data/players.json`. Without Redis configured, the local game reads this file directly. For Vercel, set the Redis REST credentials in your local environment and run `pnpm data:publish` to atomically replace the reviewed historical cache. The importer itself never changes the hosted cache. Existing active matches retain their selected player.
5. Restart/reload: the production data service reads the new cache. Do not mark a season available without successfully imported records. Refresh the offline import periodically through an operator-controlled schedule.

The importer is implemented against the official API documentation but **cannot be live-tested without an API token**. Verify the subscription's statistic type names and include coverage during the first import. Height and weight are current provider profile attributes, not guaranteed historical measurements. Country uses nationality, not country of birth.

Provider references:
- [Historical squad endpoint](https://docs.sportmonks.com/v3/endpoints-and-entities/endpoints/team-squads/get-team-squad-by-team-and-season-id.md)
- [Teams participating in a season](https://docs.sportmonks.com/v3/endpoints-and-entities/endpoints/teams/get-teams-by-season-id.md)
- [Player fields and nationality includes](https://docs.sportmonks.com/v3/endpoints-and-entities/entities/team-player-squad-coach-and-referee.md)

Images: the stadium is original generated artwork stored locally as WebP. League logos and player photos are not scraped. Results use an anonymous profile icon by default. `imageUrl` is supported with an error fallback; production portraits should be copied to authorized local storage and enabled only after image rights are confirmed. The importer leaves portraits absent by default.

## Architecture

- `components/game/`: game UI, custom brand, animated hint card, progress, accessible Base UI autocomplete.
- `lib/game/engine.ts`: pure clue/guess/scoring logic, eligibility and recent-player selection.
- `lib/game/types.ts`: shared safe types and catalog metadata, accent normalization.
- `lib/data/`: independent demo and production adapters.
- `lib/server/db.ts`: durable Redis sessions on Vercel and local SQLite sessions for development.
- `app/api/[...path]/route.ts`: seasons, categories, search, start, resume, and guess endpoints.
- `lib/server/redis.mjs`: HTTPS transport for Redis commands; atomic Lua updates preserve concurrency checks.
- `scripts/publish-football.mjs`: explicitly publish reviewed historical data to Redis.
- `scripts/import-football.mjs`: offline licensed historical import.

A match is a 24-hour opaque session scoped to an HttpOnly same-site visitor cookie. The browser receives only unlocked clues until completion. Conditional version updates prevent two simultaneous submissions from consuming attempts incorrectly. Guesses are validated by stable IDs; search supports accents, full names and aliases. Invalid/repeated choices do not consume a guess. Refresh restores a match on its URL.

Preferences, personal best and the previous 20 revealed player IDs are intentionally device-local. No account, leaderboard, paid API credential, live importer schedule or daily challenge is provisioned. For a future daily mode, select deterministically on the server from an immutable, sorted eligible snapshot using HMAC(date, secret), and retain the selected daily row; do not expose the salt to the client.

## Scoring and states

Standard stages award 1000, 800, 600, 400, 200 points. Every Season adds a 1200-point season stage. A correct first attempt at the current clue earns 100 extra. There is no speed bonus. The state engine allows at most two guesses per stage and ends after ten wrong guesses (twelve in Every Season).

Menus → loading → guessing → wrong first/next clue → won/lost → result. The UI displays only public game state. A feature-detected read-only `read_match` WebMCP tool returns the same visible clues, never the answer before the result.

## Verification

Use `node node_modules/typescript/bin/tsc --noEmit` for type checks and `pnpm build` for the standard Next.js production build. The focused engine check covers hint order, attempt limits, each scoring stage, duplicate guesses, final loss, no hidden player in public state, accents, recent exclusions, and Every Season. Browser QA exercises the complete start-to-result flow, keyboard autocomplete, settings, result sharing, and responsive layouts.

### Original gameplay QA — before infrastructure migration

- Desktop: title → 2021/22 → League → Ligue 1 → all five clues → ten-guess loss; replay selected another player, whose first-clue win awarded 1,100 points. Keyboard autocomplete, leave confirmation, session restoration and the share confirmation passed.
- Mobile viewport 390 × 844: title → 2015/16 → Country → Brazil → all five clues → Neymar win for 300 points; Play Again reset the match; ten wrong guesses produced the loss result. Imperial height/weight and reduced-motion settings were exercised, then returned to metric/default motion.
- Mobile viewport 430 × 932: title and selection layouts passed; Every Season → League → Premier League displayed the extra season clue and 1,300 available points. Both phone widths had no horizontal overflow.
- Type checking, focused engine assertions and the Worker build passed. Source review checked server-only answers, session ownership, version-checked guesses, fixture eligibility and disabled unavailable seasons. The client bundle scan found no mock player database or provider token.

Phone checks used browser viewports, not physical phones; native mobile keyboards and audible sound quality were not assessed. WebMCP was feature-detected but unavailable in the QA browser, so its runtime registration could not be exercised. The licensed importer remains untested against a live account until a token is supplied. `scripts/qa-viewport.html` retains the temporary viewport harness outside the published assets.

### Vercel migration verification

- Standard `pnpm build` passes compilation and TypeScript checks, and generates `.next/routes-manifest.json`, `.next/BUILD_ID`, the App Router pages, and dynamic API handlers.
- `pnpm test:production` starts the built Next.js server and exercises every game API, both selectors, search/accents, all five clues, win/loss, replay, Every Season, resume/ownership, duplicate/invalid guesses, concurrent updates, and origin rejection. Run it against a demo dataset; it creates temporary game sessions that expire automatically.
- The same production API suite also passed with `VERCEL=1` using a temporary local Redis server behind an HTTPS REST adapter, including the real Redis Lua script and 24-hour TTL. An actual Upstash account and deployed Vercel environment were not supplied, so their credentials/connectivity must be verified after connecting the integration.
- Browser QA against the production build passed title → 2015/16 → Country → Brazil → eight wrong guesses/all five clues → Neymar win → Play Again → ten-guess loss. Every Season → League → Premier League also displayed the extra season clue.
- Original UI components, styles, animations, public assets, fixture data, and scoring engine were checked byte-for-byte against the pre-migration source. No commits or Git history changes were made. A tool refreshed the Git index stat cache; staged entries and Git objects/references remain unchanged.

Use `pnpm typecheck` for an independent TypeScript check. For an already-running server, use `pnpm test:api` (defaults to localhost:3000), or set `TEST_BASE_URL` to its local URL. Avoid running the API test against a production database containing licensed imported data: its assertions intentionally expect the demo fixture.
