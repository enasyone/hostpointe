# Hostpointe automated test strategy

Owner: Babajide Ogunleye, Quality Assurance Lead

## Purpose

This strategy turns the canonical acceptance catalogue in `ACCEPTANCE_TESTS.md` into automated evidence. The catalogue currently contains 22 tests; the P0-11 card's reference to 20 is an outdated count. Every catalogue entry has a matching pending test in `tests/acceptance/acceptance.pending.test.ts` so the test runner reports the unimplemented scope.

An acceptance test becomes **Pass** only after it runs green against a real, persistent test backend. Browser-only demo data does not qualify.

## Test layers

| Layer | Tool | Scope |
|---|---|---|
| Unit | Vitest | Domain rules, validation, idempotency and boundary conditions |
| Integration | Vitest | Application Programming Interface (API), database constraints, queues, webhooks and external-adapter fakes |
| End-to-end | Playwright | Organiser, guest and gate-staff journeys against a persistent test backend |
| Accessibility | Playwright and axe-core | Keyboard, screen-reader semantics, focus, names, contrast and captions |
| Performance | k6 | Check-in latency; 95% of scans complete in under 500 milliseconds |
| Security | Semgrep and OWASP ZAP | Static checks and authenticated/unauthenticated web security checks |

## Priority and coverage

Automate first: AT-01, AT-03, AT-04, AT-09, AT-10, AT-12, AT-19. These cover duplicate check-in, welcome-message idempotency, tenant isolation, foreign QR refusal, Safe Pickup matching and payment reconciliation.

Playwright layout coverage must include 320, 375, 768, 1024 and 1440 pixel viewports. Use Chromium, Firefox and WebKit where behaviour can differ. Door-tag testing also requires the physical devices in `DOOR_TAG_DEVICE_LAB.md`.

## Test data and environments

- Use generated fake tenants, organisers, guests, guardians, children, events and payments only.
- Automated tests always use fake seed data, including when they run against the eventual pilot environment.
- Under D-017, the planned real-data pilot uses Neon Free with Enahoro's recorded risk acceptance and Osaretin's non-concurrence preserved. Sprint 1 work may proceed; HPE-91 remains on hold.
- Before any real guest is admitted, require every minimum control in `docs/compliance/PILOT_DATA_PLAN.md`, including erasure logging, privacy notice and controls, DEMO sign-in disabled, and a fake-data deletion rehearsal against the pilot environment. Development results do not certify those controls.
- After the pilot, verify the approved deletion scope within 30 days and retain a signed deletion record. Automated checks use a representative fake dataset; handling and confirmation of real records follows the approved operational plan.
- Give every test run a unique prefix and clean up only records bearing that prefix.
- Use provider sandboxes and local fakes. Never send a real message or charge a real payment method.
- Freeze the clock for date, timezone, daylight-saving and retry tests.
- Preserve failure artefacts: trace, screenshot, video, request log and relevant fake identifiers.

## Database isolation and check-in contract

The P0-07/P0-08 integration suite must run against real PostgreSQL after the migration is applied. PGlite schema checks are useful design feedback but are not acceptance evidence.

- Connect through a login that is a member of `hostpointe_app`; never connect as a superuser, table owner or role with `BYPASSRLS`, because that can make a row-level security test pass falsely.
- Seed tenant A and tenant B with fake events and guests using a migration/fixture connection, then perform assertions through the application role.
- Begin a transaction and call `set_config('app.tenant_id', <uuid>, true)` and `set_config('app.user_id', <uuid>, true)` before tenant-owned queries. Prove transaction-local context does not leak when a pooled connection is reused.
- Under tenant A context, prove tenant B rows cannot be selected, inserted, updated or deleted on every tenant-owned table. With no context, prove reads return no tenant rows. Malformed context must fail closed.
- AT-10 remains a separate end-to-end forged Application Programming Interface (API) request test. Database row-level security alone does not satisfy it.
- For AT-03, prove the database accepts one whole-day check-in for Day 1 and one for Day 2, rejects a second Day 1 row through `check_ins_one_per_guest_occurrence_session`, and leaves Day 3 empty. Also prove a reused device idempotency key is rejected by `check_ins_idempotency_unique` and cross-event combinations fail their composite foreign keys.

The executable pending inventory for this contract is `tests/integration/tenancy-and-check-in.pending.test.ts`. Replace its todo declarations when the PostgreSQL fixture and landed migration are available.

## Privacy erasure, retention and audit contract

Run these checks against the landed `database/migrations/0001_tenancy_and_core_model.sql` on real PostgreSQL, using fake guests and audit data only.

- As `hostpointe_app` with tenant A context, `app.anonymise_guest` must replace the guest name with the non-identifying placeholder, clear email and phone, set `anonymised_at`, revoke every credential, clear credential lookup hashes, keep all check-in rows and create one allowed audit event. A repeat call returns false and changes nothing.
- Calling `app.anonymise_guest` for tenant B while tenant A context is active returns false and leaves tenant B's guest, credentials, check-ins and audit history unchanged.
- As `hostpointe_purge`, prove the role is not a superuser, owner or `BYPASSRLS` role. It can select only the `occurred_at` column and delete audit rows strictly older than 24 months across tenants. Recent and exact-boundary rows remain. Setting any tenant context must not widen access.
- Prove `hostpointe_purge` cannot read audit content columns, insert or update audit events, truncate the table, or access other application tables.
- Audit metadata accepts only `request_id`, `method`, `from_status` and `to_status`. Every value must be a lower-case token matching `[a-z0-9_-]{1,64}`. Reject unknown or identifying keys, email/name-like values, uppercase/space/punctuation, non-string values, nested content and overlong values.

These pending cases live in `tests/integration/privacy-retention.pending.test.ts` until the PostgreSQL fixture is available.

## Migration 0002 venues, invites, consent and suppressions contract

Run `tests/integration/migration-0002.pending.test.ts` against PostgreSQL 18 after migrations 0001 and 0002.

- Shared normalised email addresses and phone numbers are valid for multiple guests in one event. The indexes are non-unique and support duplicate warnings only; never assert that a shared contact is rejected.
- An occurrence may use only a venue from its tenant. Venue timezone is a form default; the occurrence timezone remains authoritative.
- Personal invite tokens are stored only as 32-byte hashes. Allow one live invite per guest, then permit reissue after revocation. Deleting a deletable guest cascades to its invite; consent history continues to restrict guest deletion.
- `app.resolve_invite` returns only tenant, event and guest identifiers for a live unexpired token hash. Unknown, expired and revoked values all return no row. `last_used_at` records a fetch, not a completed RSVP; RSVP state changes only on POST in the API layer.
- Consent rows require an approved `source`, are append-only, and use increasing `seq` to determine current state even when timestamps match.
- The application role may insert and read suppressions but cannot delete them. Re-consent removal requires the later audited flow.
- Prove tenant A cannot read or write tenant B rows in `venues`, `guest_invites`, `consent_records` or `suppressions`. Anonymising a guest must revoke every live invite in the same transaction.

## HPE-90 DEMO sign-in and startup safety contract

The real-data D-017 pilot must run with `APP_ENV=production`; development or staging mode is not acceptable evidence for the pilot gate. `tests/integration/demo-signin.pending.test.ts` owns the automated contract after HPE-82 lands.

- Missing or invalid `APP_ENV` fails closed. Staging and production both refuse DEMO sign-in. Production requires a non-empty `ALLOWED_DB_HOSTS`, rejects invalid database URLs, rejects every database host not on the exact allow-list, and rejects case-insensitive `host` or `hostaddr` query overrides that could bypass URL hostname checks.
- Development/test DEMO mode requires an explicit secret of at least 32 characters. Never put the secret or a token in logs or failure output.
- `PORT` must be a whole number from 1 through 65535; reject zero, negatives, fractions, text and values above 65535.
- When DEMO is disabled, `/demo/sign-in` and `/demo/me` do not exist. Production must return 404 for them while `/health` remains available.
- When enabled for development/test, only the two fake seeded organisers may sign in. The response is visibly labelled DEMO. A valid bearer token resolves the matching fake user/tenant; missing, malformed, tampered and expired tokens return 401.
- Prove token signatures and the eight-hour expiry boundary with a controlled clock. Do not use DEMO authentication with real attendee data.

## Quality gates

- Pull request: unit and integration tests, the acceptance inventory, lint, typecheck and targeted end-to-end tests.
- Phase gate: every in-scope acceptance test is listed with Pass, Fail or Blocked and supporting run evidence.
- Release: full browser, viewport, accessibility, security, performance and backup-restore suites.
- Never weaken an assertion to make Continuous Integration (CI) green. Quarantine a flaky test only with repeated-run evidence, an owner and a defect reference; do not add silent retries.

## Defect workflow

Reproduce each product defect with a failing automated test first. File a GitHub issue labelled `bug` containing steps, expected result, actual result, failing test name and severity. Escalate data loss, cross-tenant exposure, payment errors or child-safety data issues immediately to Michael, then Enahoro.

## P0-11 execution

After P0-02 supplies the monorepo and Vitest script, run:

```sh
pnpm test
```

Expected result: all catalogue and detailed integration entries are reported as pending/todo, with no failures. Replace each pending declaration with an implemented test as its product capability lands.

## Continuous Integration database setup

The `Codex tests` job supplies a clean PostgreSQL 16 database with fake local-only credentials:

- `MIGRATION_DATABASE_URL` connects as `hostpointe_owner`. Test setup uses this connection only to apply the landed migration and seed/clean isolated fake fixtures.
- `DATABASE_URL` connects as `hostpointe_api`, a non-superuser, non-owner member of `hostpointe_app` without `BYPASSRLS`. All application-role assertions use this connection.
- `PURGE_DATABASE_URL` connects as `hostpointe_purge_job`, a non-superuser member of `hostpointe_purge`. Only retention-role assertions use this connection.

Before integration tests run, apply migrations through the project migration runner using `MIGRATION_DATABASE_URL`; do not embed a second migration implementation in `tests/`. Fail immediately if any required URL is absent or if the application/purge login has superuser, ownership or `BYPASSRLS` privileges. The database starts empty in Continuous Integration, so a missing migration step must fail the integration setup rather than silently skipping tests.
