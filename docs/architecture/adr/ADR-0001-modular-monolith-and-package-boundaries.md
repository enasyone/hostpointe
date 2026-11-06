# ADR-0001: Modular monolith and package boundaries

**Status:** Proposed · **Date:** 6 Nov 2026 · **Author:** Adaeze Okonkwo · **Implements:** D-006, P0-02

## Context
D-006 chose one Next.js web app, one NestJS API and PostgreSQL, not microservices. A monolith only stays splittable if its boundaries are enforced by tooling, not by habit.

## Decision

### Workspace
pnpm workspaces and Turborepo. Packages are named `@hostpointe/<name>`. The workspace includes `apps/*`, `packages/*`, `database` and `tests`.

| Path | Owner | Holds | May import | Must never |
|---|---|---|---|---|
| `packages/domain` | Adaeze | Types, validation schemas, scheduling rules, invariants as pure functions | Small pure libraries only (no framework) | Touch the network, database, file system or environment variables |
| `packages/ui` | Chinedu | Design tokens, React components | React, `domain` types only | Import `domain` logic, call the API, hold secrets |
| `packages/integrations` | Amina | Provider ports and adapters (ADR-0005) | `domain` | Import from `apps/*`, or reach the database directly |
| `apps/api` | Ibrahim | NestJS API and worker entry points | `domain`, `integrations` | Import from `apps/web` or `ui` |
| `apps/web` | Chinedu | Guest pages, organiser dashboard, staff check-in PWA (Progressive Web App) | `ui`, `domain`, its generated API client | Import `apps/api` or `integrations`; connect to the database |
| `database` | Ibrahim | Migrations, fake seed data | Nothing | Hold application logic or real data |
| `tests` | Babajide | All automated tests | Anything | Be imported by product code |

Dependencies point one way: `apps → integrations → domain`, `apps/web → ui`, and `ui → domain` (types only). No cycles.

The typed API client is generated from the API's OpenAPI document into `apps/web`. There is no shared client package until a second consumer exists (the Expo apps in D-010).

### Modules inside `apps/api`
- One folder per module in `apps/api/src/modules/<name>`, using the module list in `STACK.md`.
- Each module exposes only `index.ts`. Other modules import that file, never its internals.
- Each table has one owning module. Other modules read or change it through that module's service.
- Workers (messages, scheduler, webhooks) are extra entry points such as `apps/api/src/worker.ts`, built from the same code and image.

### Tooling (Segun, P0-02 and P0-03)
- Root scripts `dev`, `build`, `lint`, `typecheck`, `test` run through Turborepo. `pnpm dev` runs both apps (web on port 3000, API on port 4000).
- CI fails on an illegal import, using dependency-cruiser or an equivalent lint rule. The table above is the rule set.
- TypeScript `strict` everywhere, with one shared base config.
- Pin Node to an in-support long-term-support version in `.nvmrc` and `engines`. This machine has Node 20, whose support ended in April 2026, so pin 22 or 24.
- PostgreSQL 18 everywhere: Docker Compose, CI, the Neon dev branch and Azure. Microsoft's supported-versions page (updated August 2026) lists 18 for Flexible Server. Availability on B1MS in UK South is confirmed when P0-04 deploys.

## Consequences
- One deployable and one transaction boundary, which is what check-in and payments need.
- Splitting a module later means replacing its `index.ts` with a client, with no change to its callers.
- Any change to the table above needs a new ADR.

## Alternatives rejected
- **Microservices:** rejected by D-006.
- **Shared `packages/api-client` now:** a package with one consumer adds build steps and no benefit.
