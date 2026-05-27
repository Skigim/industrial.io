# Industrial.io

Industrial.io is a factory-building online MMO centered on shared-world industry, power management, and logistics pressure. The first planned playable slice focuses on building and scaling factories in a persistent world before layering in player markets, hauling contracts, territory control, and PvP pressure.

## Current Status

This repository now contains the first vertical-slice implementation scaffolding.

- Shared contracts, content, transport runtime, simulation, persistence, world service, API service, and client shell are implemented.
- The current goal is to finish wiring the first playable factory loop end to end.

This supports a broader factory-first MVP where players can place a site anchor, extract resources, route items through transport networks, power a compact production chain, and persist region state through an authoritative world service.

## MVP Direction

The approved MVP is designed around these principles:

- shared-world factory building before full market or territory systems
- throughput and power as the main early optimization problems
- logistics that matter physically, including bounded cross-region hand-off buffers
- authoritative simulation with low-cost hosting assumptions
- player trade and territory control as later layers, not day-one scope

## Planned Architecture

The current implementation plan targets a pnpm monorepo with these major pieces:

- React plus Vite for the browser UI shell
- non-React TypeScript runtime code for rendering and real-time client logic
- a dedicated world simulation service
- a separate API service
- shared packages for contracts, content, transport, simulation, and persistence
- PostgreSQL for durable world state

## Key Documents

- [Core Factory MMO Design](docs/superpowers/specs/2026-05-23-core-factory-mmo-design.md)
- [Core Factory MMO Implementation Plan](docs/superpowers/plans/2026-05-23-core-factory-mmo-implementation-plan.md)

## Repository Layout

- `docs/superpowers/specs/` contains approved design specifications.
- `docs/superpowers/plans/` contains implementation plans derived from approved specs.
- `skills/` contains the vendored Superpowers workflow skill set used in this repository.
- `.github/copilot-instructions.md` wires those workflow rules into GitHub Copilot for this project.

## Workflow Notes

This repository uses the Superpowers workflow for design, planning, implementation, verification, and review. The vendored skills remain part of the repo on purpose because they define the development process used to shape the project.

## Next Step

Complete the remaining vertical-slice wiring from `docs/superpowers/plans/2026-05-23-core-factory-mmo-implementation-plan.md`.

## Local Development

Environment defaults:

- `DATABASE_URL=postgres://industrial:industrial@localhost:5432/industrial`
- API server: `HOST=127.0.0.1`, `PORT=3001`
- World server: `HOST=127.0.0.1`, `PORT=3002`
- Client dev server: `http://127.0.0.1:5173`; set `VITE_WORLD_WS_URL=ws://127.0.0.1:3002/ws` only when the browser cannot use the default proxied `/ws` endpoint on the Vite dev server, such as from another container, a remote device, or while debugging a direct backend websocket connection

1. `corepack pnpm install`
2. `docker compose up -d postgres`
3. Initialize the database schema: `corepack pnpm --filter @industrial/persistence exec drizzle-kit push --config drizzle.config.ts`
4. Start the API server in its own terminal: `corepack pnpm --filter @industrial/api dev`
5. Start the world server in a second terminal: `corepack pnpm --filter @industrial/world dev`
6. Start the client in a third terminal: `corepack pnpm --filter @industrial/client dev`
7. Run the browser smoke test in another terminal after the three dev servers are up: `corepack pnpm --filter @industrial/client playwright test`
