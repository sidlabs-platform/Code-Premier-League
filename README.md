# Code Premier League

Code Premier League (CPL) is an unofficial educational cricket auction. Hosts run registration, an optional developer quiz, live player auctions, deterministic scoring, and a final leaderboard while participants join from mobile or desktop browsers.

> **Educational-use notice.** This is an unofficial, non-commercial simulation. Real cricketer names are used descriptively to identify individuals; no affiliation with, sponsorship by, or endorsement from any player, team, board, or league is implied. All ratings, prices, bids, and outcomes are generated for this app and are not official statistics or valuations. No copyright or trademark infringement is intended. CPL has no real-money flows, betting, wallets, or payments.

## Quickstart: Local Mode

Requirements: Node.js 22+ and npm.

```bash
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

No credentials or environment variables are required. Room state is written to `.data/cpl-rooms.json`, so browser refreshes and ordinary server restarts recover the current session. Delete that file only when you intentionally want a clean local slate.

Useful commands:

```bash
npm run lint
npm run typecheck
npm test
npm run build
npx playwright install chromium
npm run test:e2e
```

## Host runbook

1. From `/`, use **Host a room** and keep the recommended defaults, or open `/demo` for one-click auto-play.
2. Share the six-character room code, join URL, or QR panel from `/host/[roomCode]`.
3. Confirm teams appear in **Teams on channel**, then close registration.
4. If quiz mode is enabled, start the five-question sprint. Reveal each answer before advancing.
5. Select a player and start the auction. Valid bids reset the server-owned countdown.
6. Pause, resume, force-close, or mark a player unsold when needed.
7. End the auction, review scores, and publish the leaderboard.
8. Screen-share `/spectate/[roomCode]` for a clean read-only broadcast, or `/results/[roomCode]` for the final table.

Auto-play uses four automated teams and deterministic, budget-aware bids. It is always labeled **Auto-play** and automatically pauses when a live participant joins.

## Routes

| Route | Purpose |
|---|---|
| `/` | Landing and host room creation |
| `/join` | Participant join flow |
| `/room/[roomCode]` | Participant quiz, auction, squad, and results state |
| `/host/[roomCode]` | Host control room |
| `/spectate/[roomCode]` | Read-only broadcast view |
| `/results/[roomCode]` | Explainable leaderboard |
| `/demo` | One-click local auto-play |

## Local architecture

- **Authoritative mutations:** Next.js Node route handlers validate all joins, quiz answers, bids, sales, and room transitions.
- **Concurrency:** room mutations run through a per-room promise lock. Competing bids resolve in server arrival order.
- **Bid integrity:** idempotency keys prevent duplicate mutations; duplicate display names, self-outbids, over-budget bids, full squads, and overseas-limit violations are rejected server-side.
- **Realtime feel:** clients poll versioned, `no-store` snapshots every 400ms during active auctions and every 1.2s otherwise.
- **Clock:** the server owns absolute auction deadlines. Every valid bid resets the deadline.
- **Recovery:** host and participant tokens persist in browser local storage; room state persists to `.data/cpl-rooms.json`.
- **Currency:** DevCoins are integer DevLakh units internally. `100` units display as `1 DevCrore`.

The local store is intentionally isolated behind `src/lib/store.ts`; UI routes use only the room snapshot and action API.

## Deterministic scoring

Final scores are normalized to 100:

| Dimension | Weight |
|---|---:|
| Batting | 22% |
| Bowling | 22% |
| Team balance | 16% |
| Form | 10% |
| Pressure | 10% |
| Fielding | 8% |
| Venue adaptability | 7% |
| Budget efficiency | 5% |

Explicit penalties cover missing role minimums, no wicketkeeper, overseas-limit violations, and incomplete squads. Ties resolve by budget efficiency, then team name, then participant ID. Every result row includes an expandable calculation breakdown.

## Player catalogue

The catalogue snapshot was reviewed on **2026-09-14**. Names, countries, and broad playing roles were curated from:

- [ICC: India annual player contracts](https://www.icc-cricket.com/news/big-changes-announced-in-india-s-annual-player-contracts)
- [ICC: Men’s T20 World Cup 2026 squads](https://www.icc-cricket.com/tournaments/mens-t20-world-cup-2026/news/all-the-squads-for-icc-men-s-t20-world-cup-2026)

The source snapshot can become stale as squads and contracts change. The app does not copy player photographs, team or competition logos, biographies, or proprietary performance data. Initials-only artwork is generated locally. Every base price and game rating is deterministic simulated data defined by the application.

For correction or removal requests, use the repository issue tracker.

## Optional Supabase realtime mode

The local application does not ship an unverified Supabase adapter. `docs/schema.sql` defines the practical PostgreSQL model with primary keys, foreign keys, uniqueness constraints, timestamps, one-open-auction enforcement, and idempotent bid keys.

To harden the app for a Supabase deployment:

1. Create a Supabase project and apply `docs/schema.sql`.
2. Move `RoomStore` operations behind a storage interface.
3. Implement each mutation as a PostgreSQL transaction or RPC that locks the active auction row.
4. Publish room event changes through Supabase Realtime.
5. Replace token hashes with authenticated user/anonymous-session claims and Row Level Security.
6. Add distributed rate limiting and move auction deadline resolution to a durable worker.

Do not deploy the current process-local implementation to serverless or multi-instance hosting and expect cross-instance consistency.

## Testing

Vitest covers:

- currency conversion and display,
- bid increment and validation,
- budget, squad, and overseas checks,
- deterministic scoring and tie handling,
- weight normalization and explicit penalties,
- serialized competing bids,
- self-outbid rejection,
- idempotent sale finalization.

Playwright covers the critical production-build smoke flow: host creates a room, two participants join, bidding occurs, an invalid bid is rejected, a sale updates the winning squad and balance, and the final leaderboard renders.

## Known limitations

- This is an educational MVP, not a production game service.
- One Node process is the authoritative writer. Multi-process and serverless deployments require a transactional shared store.
- JSON persistence is suitable for local sessions, not untrusted or high-volume workloads.
- Polling is intentionally used instead of WebSockets to reduce infrastructure requirements.
- Host and participant bearer tokens are browser-local credentials; production should use real authentication, rotation, CSRF protection, and audited authorization.
- The player catalogue and quiz are seeded in source rather than managed through an admin CMS.
- Auto-play is deterministic and intended for guided practice, not as an AI opponent.
- The QR panel uses the current browser origin. For phone participation, expose the host machine on an accessible LAN URL.
