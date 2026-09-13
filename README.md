# KnowBalledge

A complete football guessing game with a cinematic stadium, era selection, League and Country challenges, server-side answers, sequential clues, two guesses per clue, autocomplete, scoring, results, share text and device preferences.

## Run locally

Node 22.13+ and the pinned pnpm version in `package.json` are required. Install with `pnpm install --frozen-lockfile`, then `pnpm build`. Apply the initial local schema once:

```sh
node --import ./scripts/sites-env.mjs ./node_modules/wrangler/bin/wrangler.js d1 execute DB --local --config dist/server/wrangler.json --persist-to .wrangler/state --file drizzle/0000_clammy_randall.sql
```

Run `pnpm dev`. The managed Sites environment uses its supervised preview instead. Use Sites hosting for deployment; D1 schema migrations are applied separately to production. `.openai/hosting.json` declares `DB` and the Site identity. API keys stay out of source and the browser.

## Demo data and scope

Without an imported cache, the game uses **48 famous players** and explicit club spells from **2015/16–2024/25**. The small fixture intentionally follows the brief's offline development allowance. It is not a verified professional player database: physical measurements are illustrative profile values, not season-by-season historical measurements. Incomplete/current-era guesses are never fabricated: 2025/26 and 2026/27 stay visible but unavailable until their squads are imported. Every Season samples uniformly among seasons available for the selected category and reveals the chosen season as an additional first clue.

All five leagues and twelve requested nationalities are supported where an eligible player exists. Empty selections are disabled. The same player can appear in different historical seasons; recent-player avoidance compares the stable player ID. If a pool is exhausted it resets gracefully.

## Licensed production data

`lib/data/mockDataService.ts` and `productionFootballDataService.ts` are separate providers. An imported D1 cache takes priority over the demo fixture. Gameplay never requests the external provider directly.

1. Copy `.env.example` to `.env.local` and configure a licensed Sportmonks token with historical squad/statistics coverage.
2. Optionally set `FEATURED_PLAYER_IDS` to a small comma-separated list of Sportmonks player IDs for injured/notable players. Import thresholds default to three appearances or 150 minutes.
3. Run `node --env-file=.env.local scripts/import-football.mjs`. The script discovers supported league seasons, lists the teams that actually participated, requests each historical squad, normalizes identities and positions, excludes missing hint fields, and caches raw API responses for 24 hours. API errors stop import without changing the live cache.
4. Review `.data/players.json` and `.data/football-cache.sql`. Import the latter into the selected D1 database as a data operation, not as a schema migration. Use the same Wrangler command above with `--file .data/football-cache.sql` for the local database. Hosted imports require the authorized D1 management path for that deployment.
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
- `lib/server/db.ts`: the D1 boundary.
- `app/api/[...path]/route.ts`: seasons, categories, search, start, resume, and guess endpoints.
- `db/schema.ts` and `drizzle/`: persistent sessions and imported cache.
- `scripts/import-football.mjs`: offline licensed historical import.

A match is a 24-hour opaque session scoped to an HttpOnly same-site visitor cookie. The browser receives only unlocked clues until completion. Conditional version updates prevent two simultaneous submissions from consuming attempts incorrectly. Guesses are validated by stable IDs; search supports accents, full names and aliases. Invalid/repeated choices do not consume a guess. Refresh restores a match on its URL.

Preferences, personal best and the previous 20 revealed player IDs are intentionally device-local. No account, leaderboard, paid API credential, live importer schedule or daily challenge is provisioned. For a future daily mode, select deterministically on the server from an immutable, sorted eligible snapshot using HMAC(date, secret), and retain the selected daily row; do not expose the salt to the client.

## Scoring and states

Standard stages award 1000, 800, 600, 400, 200 points. Every Season adds a 1200-point season stage. A correct first attempt at the current clue earns 100 extra. There is no speed bonus. The state engine allows at most two guesses per stage and ends after ten wrong guesses (twelve in Every Season).

Menus → loading → guessing → wrong first/next clue → won/lost → result. The UI displays only public game state. A feature-detected read-only `read_match` WebMCP tool returns the same visible clues, never the answer before the result.

## Verification

Use `node node_modules/typescript/bin/tsc --noEmit` for type checks and `pnpm build` for the Worker build. The focused engine check covers hint order, attempt limits, each scoring stage, duplicate guesses, final loss, no hidden player in public state, accents, recent exclusions, and Every Season. Browser QA exercises the complete start-to-result flow, keyboard autocomplete, settings, result sharing, and responsive layouts.

### Completed QA — 13 September 2026

- Desktop: title → 2021/22 → League → Ligue 1 → all five clues → ten-guess loss; replay selected another player, whose first-clue win awarded 1,100 points. Keyboard autocomplete, leave confirmation, session restoration and the share confirmation passed.
- Mobile viewport 390 × 844: title → 2015/16 → Country → Brazil → all five clues → Neymar win for 300 points; Play Again reset the match; ten wrong guesses produced the loss result. Imperial height/weight and reduced-motion settings were exercised, then returned to metric/default motion.
- Mobile viewport 430 × 932: title and selection layouts passed; Every Season → League → Premier League displayed the extra season clue and 1,300 available points. Both phone widths had no horizontal overflow.
- Type checking, focused engine assertions and the Worker build passed. Source review checked server-only answers, session ownership, version-checked guesses, fixture eligibility and disabled unavailable seasons. The client bundle scan found no mock player database or provider token.

Phone checks used browser viewports, not physical phones; native mobile keyboards and audible sound quality were not assessed. WebMCP was feature-detected but unavailable in the QA browser, so its runtime registration could not be exercised. The licensed importer remains untested against a live account until a token is supplied. `scripts/qa-viewport.html` retains the temporary viewport harness outside the published assets.
