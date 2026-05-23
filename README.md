# Industrial.io

Industrial.io is a factory-building online MMO centered on shared-world industry, power management, and logistics pressure. The first planned playable slice focuses on building and scaling factories in a persistent world before layering in player markets, hauling contracts, territory control, and PvP pressure.

## Current Status

This repository is in pre-implementation planning.

- The core factory MMO design is approved.
- The first implementation plan is approved.
- Product code has not been scaffolded yet.

The current goal is to build a factory-first MVP where players can place a site anchor, extract resources, route items through transport networks, power a compact production chain, and persist region state through an authoritative world service.

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

Begin implementation from the approved plan in `docs/superpowers/plans/2026-05-23-core-factory-mmo-implementation-plan.md`.
