# Data model v0 (P0-07, P0-08)

**Status: proposed, not yet applied to any shared database.** Decisions are in ADR-0002, ADR-0003 and ADR-0004. Compliance review: `docs/compliance/reviews/REVIEW-0001-data-model-v0.md`.

| File | Purpose |
|---|---|
| `database/migrations/0001_tenancy_and_core_model.sql` | Tables, row-level security, grants, and a rollback section that destroys all data in these tables |
| `verify-schema.mjs` (this folder) | Design check, used for review. **Not a project test:** `tests/` belongs to Codex |

**Tables:** tenants, users, roles, memberships, events, event_series, event_occurrences, sessions, guests, credentials, check_ins, audit_events.

## How it was checked
86 checks pass: rollback and re-apply, tenant A against tenant B on every table, forged writes, duplicate check-ins, composite foreign keys, append-only tables, the sign-in function, guest anonymising, audit metadata limits and the purge role.

To re-run: `npm i @electric-sql/pglite`, then `node verify-schema.mjs <path to the migration file>`.

## Known limits
- The 86 checks ran only on PGlite 0.5.15 (PostgreSQL 18.6 compiled to WebAssembly).
- On 6 Nov 2026 Ibrahim ran the migration up, down and up on the Neon dev branch (PostgreSQL 18.6) through node-pg-migrate 9.0.0, as `hostpointe_owner`. It passed, and all 12 tables are owned by that login. This proves the migration applies and rolls back, not the isolation rules.
- It has not run on PostgreSQL 16, which Docker Compose and CI use, nor on Azure.
- The check script uses fake data and is not the acceptance test. The P0-07 proof test and AT-10 belong to Babajide; AT-10 must run against the real API.
- No API code uses this yet.
