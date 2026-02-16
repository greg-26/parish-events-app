# Technical Notes

## DynamoDB Key Patterns
- Single-table design with `pk` (partition key) and `sk` (sort key)
- See `amplify/functions/api/handler.ts` (769 lines) for all entity patterns

## File Layout
- `amplify/` — Backend: auth, Lambda functions, CDK infrastructure
- `amplify/functions/api/handler.ts` — Main API (all CRUD + public JSON-LD)
- `amplify/functions/stream-worker/handler.ts` — DynamoDB stream processor
- `src/views/` — ~15 Vue views (parishes, events, priests, locations, calendar, pastoral units)
- `src/services/` — Liturgical calendar, geocoding, conflict detection
- `src/stores/` — Pinia stores (user)
- `src/lib/api.ts` — Frontend API client
- `shared/types/` — Shared type definitions
- `PROJECT_PLAN.md` — Roadmap and status tracker

## Public API
- `GET /public/parish/{id}/events` — Mass Times Protocol JSON-LD (no auth)

## Dev Commands
- `pnpm dev` — Dev server
- `pnpm build` — Production build
- `pnpm test` — Vitest
- `pnpm sb` — Amplify sandbox (requires AWS_PROFILE)
