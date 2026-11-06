# ADR-0006: Neon for the MVP and pilot, Azure PostgreSQL at launch

> **Revision 2 (6 Nov 2026):** corrected to the authoritative D-016. Revision 1 treated Neon as an open-ended replacement for Azure. D-016 uses Neon for the MVP and pilot only, with a move to Azure at launch or at set triggers. Revision 1 is kept in git history, and the file name is unchanged so links keep working.

**Status:** Revision 1 Accepted (6 Nov 2026, god); revision 2 awaits Osaretin's review and god's acceptance · **Date:** 6 Nov 2026 · **Author:** Adaeze Okonkwo · **Decided by:** Enahoro Asikhia (D-016) · **Reviewed:** Segun (approved), Osaretin (approved with conditions, DPIA section 5b)

**Supersedes:** for the MVP and pilot only, the database part of D-009. From launch the database is Azure PostgreSQL Flexible Server, UK South. Everything else in D-009 stands: compute, storage, secrets and monitoring stay on Azure UK South.

## Context
Azure work (P0-04) is blocked on Enahoro's Azure account. A Neon `dev` branch was created under HPE-31 as a stopgap, and migration 0001 ran up, down and up on it (PostgreSQL 18.6). D-016 then made Neon's free plan the database for the MVP and pilot, because the existing Azure account gets no 12-month free database and Neon keeps the MVP at £0.

The tenancy and data model (ADR-0002, ADR-0003, ADR-0004) do not change. Neon is standard PostgreSQL, and row-level security, composite keys, grants and migrations work as designed. What changes is where data lives, how connections behave and what each plan provides.

Facts below come from Neon's documentation (plans, regions and connection pooling pages, read 6 Nov 2026). Prices and limits can change, so check them again before relying on them.

## Decision
1. **PostgreSQL 18 on Neon**, using the standard `pg` driver. Docker Compose and CI keep a local PostgreSQL 18 and do not connect to Neon.
2. **Standard PostgreSQL only.** No Neon-specific auth, functions or object storage, and no Neon serverless driver in application code. The move to Azure then stays a routine copy: `pg_dump`, `pg_restore` and a changed connection string. Segun's runbook is `infra/runbooks/neon-to-azure-postgres.md` (draft, not rehearsed).
3. **Region must be AWS Europe (London), `aws-eu-west-2`, before any real personal data.** Neon cannot host in Azure UK South: new Azure projects are no longer offered. A project's region is fixed when it is created, so a project elsewhere means a new project and a data move.

### When we move to Azure
Move to Azure Database for PostgreSQL Flexible Server, UK South, **at launch**, or earlier if any of these happens:
- Storage passes about 700 MB (Free limit: 1 GB).
- Compute regularly passes 80 of the 100 CU-hours (compute-unit hours) a month.
- We need longer backups than Neon's 6-hour restore window plus the nightly dump.

Segun checks Neon usage against these triggers and reports them at each milestone. PostgreSQL 18 on the chosen Azure size in UK South is not yet confirmed. The move is a new processor and location, so it needs Osaretin's review, and Michael's approval for the Azure spend.

### Nightly backup
From day one, a nightly `pg_dump` over the direct connection goes to a private Azure Blob container, with a tested restore (D-016, AT-22).
- **Dependency:** this needs Azure Blob, and P0-04 is still blocked on the Azure account.
- **Login:** `hostpointe_owner` cannot dump our tables, because row-level security is forced on them. `pg_dump` turns `row_security` off and PostgreSQL then raises an error instead of returning filtered rows. Tested on PGlite 18.6 with `SELECT`, not with `pg_dump` itself: the owner under `FORCE` got "query would be affected by row-level security policy", and a `BYPASSRLS` login read the row. The backup therefore needs its own read-only login with `BYPASSRLS`, used by nothing else. Do not use `--enable-row-security`: with no tenant set it can produce a dump with no rows in it. Whether Neon allows a role created with SQL to hold `BYPASSRLS` is not yet checked; Segun confirms on `dev`.
- **Personal data:** once real guests exist, each dump is a copy of their data. Retention, encryption and erasure for dumps need Osaretin's review before then.

### Warm-up before check-in
Free scale-to-zero starts after 5 minutes idle and cannot be disabled, so one warm-up is not enough. A scheduled ping starts before doors open and runs at intervals under 5 minutes until check-in ends. At the smallest size (0.25 CU), that costs about 0.25 CU-hours per hour of event. Check-in must also tolerate a slow first query (offline gate mode, ADR-0004). Not built; owner Segun, with Ibrahim for the API side.

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
| production, until the move | `production` (the project's default branch) | Real, subject to the open question below |

- **A branch copies its parent's data. Once `production` holds real guests, no branch may be created from it** unless a separate review approves it, because the copy would hold real personal data with weaker access. The same rule covers point-in-time restores into new branches, snapshots and exported dumps. Real-data dumps never go on developer laptops. Build `dev` and `staging` from fake seed data. Before real data arrives, recreate any branch that descends from `production`, or confirm it holds only fake data.
- Each branch gets its own three logins (owner, API, purge), created with SQL. Roles made through Neon's console, API or CLI may gain `neon_superuser`, which bypasses row-level security; so confirm for each login that `rolsuper` and `rolbypassrls` are false and that it holds no `neon_superuser` membership.
- Migrations reach each environment through CI or deploy steps only, never by hand. Agents use `dev` and never touch `production`.
- Connection strings live in Azure Key Vault for deployed environments, and in the git-ignored `.env` locally.

### Plan requirements
| Need | Free | Launch | Scale |
|---|---|---|---|
| Restore window | 6 hours | Up to 7 days | Up to 30 days |
| Scale-to-zero | After 5 minutes, cannot be disabled | Can be disabled | Configurable |
| Storage and compute | 1 GB; 100 CU-hours per project (read again 6 Nov 2026) | Paid per use | Paid per use |
| Compliance certifications | None | None listed | SOC 2, ISO 27001, ISO 27701, GDPR and others |
| IP allow list, private networking | No | No | Yes |
| Availability guarantee (SLA) | No | No | Yes |

**Open question for Enahoro: may the pilot hold real guests on the Free plan?** D-016 puts the pilot on Neon Free. Revision 1 and Osaretin's review say Free is for fake data only. This revision does not settle that.
- **Against Free for real guests:** 6-hour restore window, no availability guarantee, and a compute allowance that can run out. Osaretin's guidance: no certification is a legal requirement, but they are evidence for the Article 32 security duty. Launch is acceptable for an adults-only pilot once the processing agreement is signed. Scale should be in place before children's data or Safe Pickup goes live.
- **D-003 ships Safe Pickup in the first release,** so if the pilot uses Safe Pickup, this guidance points to Scale or to Azure.
- **Options:** (a) make the first real guest data a fourth move trigger, so Neon only ever holds fake data and no Neon agreement or paid plan is needed; (b) pay for Neon during the pilot; (c) keep Free with real guests, which needs Osaretin's written acceptance. Adaeze recommends (a), subject to Michael's cost check of Azure.

## Conditions before real guests use Neon
These apply only if real guests go on Neon, which depends on the open question above. Osaretin has not read Neon's terms, so the contract items are guidance to confirm.

| # | Condition | Owner |
|---|---|---|
| 1 | Project is in `aws-eu-west-2`: **met**, confirmed by Segun from the Neon API, 6 Nov 2026 | Segun |
| 2 | Neon added to the data map and DPIA (Data Protection Impact Assessment): **done** by Osaretin. AWS London is acceptable | Osaretin |
| 2a | Signed data processing agreement with Neon, naming the UK–US transfer route, because Neon is US-owned: security measures, sub-processors including AWS, breach notice that lets us meet the 72-hour ICO (Information Commissioner's Office) deadline, deletion on exit. Check which plan includes it; keep a dated copy | Michael or Enahoro signs |
| 2b | Privacy notice says erased data stays in backups until the restore window ends | Osaretin |
| 3 | Settle the open question above, and the plan if it is a paid one | Enahoro, with Michael for spend |
| 4 | Backup and restore drill on Neon (AT-22) | Babajide, Segun |
| 5 | Measure check-in from Azure UK South to Neon against the 500 ms target for 95% of scans (k6) | Obinna |
| 6 | Restrict database access: TLS is in place (`sslmode=require`); an IP allow list needs the Scale plan | Segun |
| 7 | Nightly backup running and restored once, with Osaretin's review of dump retention | Segun, Osaretin |
| 8 | Warm-up in place before any event-day check-in | Segun, Ibrahim |

## Consequences
- **Bicep creates no PostgreSQL server until the move.** P0-04 also gains the backup container. The rest of P0-04 is unchanged.
- **Two clouds until the move.** The API on Azure UK South reaches the database on AWS London over the public internet with TLS. Latency and data transfer charges are unmeasured. A failure of either cloud now affects check-in, so offline gate mode (ADR-0004) matters more.
- **Cold starts.** After idle, a suspended database has to wake before the first query. On Free this is handled by the warm-up above. A paid plan could disable scale-to-zero instead.
- **Workers can use up the Free allowance.** A pg-boss worker polling constantly keeps the database awake. At the smallest size (0.25 CU), a full month of 730 hours is about 182 CU-hours, above the 100 included. So on Free, do not run an always-on worker against `dev`; stop it when not in use. An always-on worker in production would pass the 80 CU-hour trigger by itself, and D-004 puts WhatsApp, which uses the queue, in the first release. So either workers run only in set windows, or that trigger fires as soon as real messaging starts.
- **Azure sign-in to the database is unavailable until the move.** Managed identity does not apply to Neon, so password logins from Key Vault are used and need rotating.
- `ADR-0002`'s reasoning about the B1MS tier remains as written, since shared-schema tenancy is still the right choice on Neon.
- Tests in `tests/` run on the Compose or CI PostgreSQL by default. A run against Neon `dev` is needed for proof on the hosted engine.

## Alternatives rejected
- **Wait for Azure PostgreSQL:** it would hold P0-07 testing behind a blocked account, and the existing account gets no free database.
- **Stay on Neon after launch:** not chosen by D-016. Azure from launch keeps the database with the rest of the stack.
