# ADR-0006: Neon replaces Azure PostgreSQL for now

**Status:** Proposed · **Date:** 6 Nov 2026 · **Author:** Adaeze Okonkwo · **Decided by:** Enahoro Asikhia (D-016)

**Supersedes:** the Database row in `STACK.md` (Azure Database for PostgreSQL Flexible Server, B1MS) and that part of D-009. Everything else in D-009 stands: compute, storage, secrets and monitoring stay on Azure UK South.

## Context
Azure work (P0-04) is blocked on Enahoro's Azure account. A Neon `dev` branch was created under HPE-31 as a stopgap, and migration 0001 ran up, down and up on it (PostgreSQL 18.6). Enahoro has now chosen Neon as the current PostgreSQL host, not only for development.

The tenancy and data model (ADR-0002, ADR-0003, ADR-0004) do not change. Neon is standard PostgreSQL, and row-level security, composite keys, grants and migrations work as designed. What changes is where data lives, how connections behave and what each plan provides.

Facts below come from Neon's documentation (plans, regions and connection pooling pages, read 6 Nov 2026). Prices and limits can change, so check them again before relying on them.

## Decision
1. **PostgreSQL 18 on Neon**, using the standard `pg` driver. Docker Compose and CI keep a local PostgreSQL 18 and do not connect to Neon.
2. **No Neon-only features in application code**, including Neon's serverless driver. That keeps "for now" true: leaving means `pg_dump`, `pg_restore` and a changed connection string.
3. **Region must be AWS Europe (London), `aws-eu-west-2`, before any real personal data.** Neon cannot host in Azure UK South: new Azure projects are no longer offered. A project's region is fixed when it is created, so a project elsewhere means a new project and a data move.

### Connections
| Use | Connection | Why |
|---|---|---|
| API requests | Pooled (PgBouncer in transaction mode) | Up to 10,000 client connections |
| Migrations, `pg_dump`, `pg_restore` | Direct | Neon's documentation requires it |
| pg-boss workers | Direct | Session-level advisory locks and `LISTEN` do not work on the pooled connection |
| Purge job | Pooled or direct | One short transaction |

- **Tenant context is unchanged.** `set_config('app.tenant_id', $1, true)` inside a transaction is safe on the pooled connection, and is now the only allowed form. Session-level `SET` is unsupported there, and must never be used for tenant context.
- SQL-level `PREPARE` is unsupported on the pooled connection. Protocol-level prepared statements are supported.
- A pg-boss job queued inside a check-in transaction must use that transaction's pooled connection. Ibrahim proves this under AT-04.

### Environments are branches
| Environment | Neon branch | Data |
|---|---|---|
| Local, CI | None (Compose, CI service) | Fake only |
| dev | `dev` | Fake only |
| staging | `staging` (not created, needs a cost check) | Fake only |
| production | `production` (the project's default branch) | Real |

- **A branch copies its parent's data. Once `production` holds real guests, no branch may be created from it** unless a separate review approves it, because the copy would hold real personal data with weaker access. Build `dev` and `staging` from fake seed data. Before real data arrives, recreate any branch that descends from `production`, or confirm it holds only fake data.
- Each branch gets its own three logins (owner, API, purge), created with SQL. Roles made through Neon's console, API or CLI may gain `neon_superuser`, which bypasses row-level security; this must be checked with the query in the P0-07 test setup.
- Migrations reach each environment through CI or deploy steps only, never by hand. Agents use `dev` and never touch `production`.
- Connection strings live in Azure Key Vault for deployed environments, and in the git-ignored `.env` locally.

### Plan requirements
| Need | Free | Launch | Scale |
|---|---|---|---|
| Restore window | 6 hours | Up to 7 days | Up to 30 days |
| Scale-to-zero | After 5 minutes, cannot be disabled | Can be disabled | Configurable |
| Storage and compute | 1 GB; 100 CU-hours per project | Paid per use | Paid per use |
| Compliance certifications | None | None listed | SOC 2, ISO 27001, ISO 27701, GDPR and others |
| IP allow list, private networking | No | No | Yes |
| Availability guarantee (SLA) | No | No | Yes |

- **Free is for fake data only.** It is not acceptable for real guests, because of the 6-hour restore window, no availability guarantee, and a compute allowance that can run out.
- **The plan for real guests is an open spend decision for Michael and Enahoro,** informed by Osaretin's review below. I recommend Scale for production, because of the certifications, IP allow list and availability guarantee.

## Conditions before real guests use it
| # | Condition | Owner |
|---|---|---|
| 1 | Confirm the project is in `aws-eu-west-2`, or create a new project there | Segun |
| 2 | Add Neon to the data map and DPIA (Data Protection Impact Assessment): processor contract, AWS London location, UK–Nigeria transfers | Osaretin |
| 3 | Choose the paid plan | Michael and Enahoro |
| 4 | Backup and restore drill on Neon (AT-22) | Babajide, Segun |
| 5 | Measure check-in from Azure UK South to Neon against the 500 ms target for 95% of scans (k6) | Obinna |
| 6 | Restrict database access: IP allow list if the plan has it, TLS required either way | Segun |

## Consequences
- **Bicep creates no PostgreSQL server.** The rest of P0-04 is unchanged.
- **Two clouds.** The API on Azure UK South reaches the database on AWS London over the public internet with TLS. Latency and data transfer charges are unmeasured. A failure of either cloud now affects check-in, so offline gate mode (ADR-0004) matters more.
- **Cold starts.** After idle, a suspended database has to wake before the first query. Production needs scale-to-zero disabled, at least on event days, which needs a paid plan.
- **Workers can use up the Free allowance.** A pg-boss worker polling constantly keeps the database awake. At the smallest size (0.25 CU), a full month of 730 hours is about 182 CU-hours, above the 100 included. So on Free, do not run an always-on worker against `dev`; stop it when not in use.
- **Azure sign-in to the database is unavailable.** Managed identity does not apply to Neon, so password logins from Key Vault are used and need rotating.
- `ADR-0002`'s reasoning about the B1MS tier remains as written, since shared-schema tenancy is still the right choice on Neon.
- Tests in `tests/` run on the Compose or CI PostgreSQL by default. A run against Neon `dev` is needed for proof on the hosted engine.

## Alternatives rejected
- **Wait for Azure PostgreSQL:** Enahoro's decision, and it would hold P0-07 testing behind a blocked account.
- **Keep Azure as the long-term target and use Neon for dev only:** replaced by D-016. It can be revisited with a new ADR, and decision 2 keeps that cheap.
