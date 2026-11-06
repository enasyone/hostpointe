# P0-07 row-level security proof

Date: 2026-11-06  
Owner: Babajide Ogunleye, Quality Assurance Lead  
Environment: Neon development, PostgreSQL 18.6  
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

## Evidence and limitation

The Quality Assurance session was blocked from Neon Domain Name System resolution by its managed sandbox. God executed a disposable Node.js and `pg` harness outside the repository with network access. The harness transliterated the queries and assertions from `tests/integration/p0-07-rls.live.test.ts` one-for-one, loaded the pooled application connection in-process, printed no credentials, used fake data only, and was deleted after execution.

This is sufficient evidence to pass the P0-07 database row-level security layer. The repository Vitest file itself has not yet run. The `pg` dependency is now present on Segun's scaffold branch, but Continuous Integration still needs the formal migration command before `pnpm test`; otherwise the test database has no schema.

P0-07 overall is **not complete**: Microsoft Entra External ID sign-in remains blocked on the Azure account. AT-10 also remains Pending because it requires forged requests through the real Application Programming Interface, not only direct database isolation.
