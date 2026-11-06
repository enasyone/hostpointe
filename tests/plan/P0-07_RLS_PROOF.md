# P0-07 row-level security proof

Date: 2026-11-06  
Owner: Babajide Ogunleye, Quality Assurance Lead  
Environments: Neon development PostgreSQL 18.6; Continuous Integration PostgreSQL 18
Application login: `hostpointe_api`

## Result: PASS — database isolation layer only

All six row-level security assertions passed against the real Neon development database with rollback-only fake data.

| Check | Result |
|---|---|
| Application login is not superuser, has no `BYPASSRLS`, and owns no tenant tables | Pass |
| Tenant A lists only tenant A's guest | Pass |
| Tenant A cannot read tenant B's guest by identifier | Pass |
| Tenant A cannot update tenant B's guest | Pass |
| No tenant context returns zero tenant-owned rows | Pass |
| A fresh transaction has no leaked tenant context | Pass |

## Evidence

The Quality Assurance session was blocked from Neon Domain Name System resolution by its managed sandbox. God executed a disposable Node.js and `pg` harness outside the repository with network access. The harness transliterated the queries and assertions from `tests/integration/p0-07-rls.live.test.ts` one-for-one, loaded the pooled application connection in-process, printed no credentials, used fake data only, and was deleted after execution.

PR #7 then provided repository-native evidence. Continuous Integration started a real PostgreSQL 18 service, applied migrations 0001 and 0002, and ran `tests/integration/p0-07-rls.live.test.ts`: 2 tests passed in 43 milliseconds. Five pending stub files were correctly reported as skipped rather than counted as passes.

This passes the P0-07 database row-level security layer and closes P0-08's database proof. It replaces the earlier limitation that the repository Vitest file had not run.

## Remaining scope

P0-07 overall remains blocked because the Microsoft Entra External ID sign-in half is deferred with the Azure setup. AT-10 also remains Pending because it requires forged requests through the real Application Programming Interface, not only direct database isolation.
