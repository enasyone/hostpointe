# ADR-0002: Tenancy, sign-in and row-level security

**Status:** Accepted (6 Nov 2026, god) · **Date:** 6 Nov 2026 · **Author:** Adaeze Okonkwo · **Implements:** P0-07 · **Tested by:** AT-10

## Context
A leak between tenants is the worst failure this platform can have (AGENTS.md treats it as an immediate escalation). One forgotten `WHERE tenant_id = ...` must not be enough to cause one.

## Decision

### Shared database, isolated by row
All tenants share one database and schema. Every tenant-owned table has a `tenant_id`, and PostgreSQL row-level security (RLS) enforces isolation.

1. **Separate database identities.** Migrations run as the table owner. The API connects as a member of `hostpointe_app`, which owns nothing and cannot bypass RLS. The audit purge job uses `hostpointe_purge` (ADR-0004).
2. **Fail closed.** Policies compare `tenant_id` to `app.current_tenant_id()`. With no context set, that is NULL and no rows match.
3. **`FORCE ROW LEVEL SECURITY`** on tenant tables, so the owner is bound as well. The one exception is `users`, because the sign-in function runs as the owner. `roles` is a fixed catalogue with no tenant data and no RLS.
4. **Per transaction only.** The API sets context with `set_config('app.tenant_id', $1, true)` inside each transaction. Never session-level `SET`, because a pooled connection would carry it into another request.
5. **Composite foreign keys** include `tenant_id` (and `event_id` where relevant). A row cannot point at another tenant's data, even if a policy has a bug.
6. **No `TRUNCATE`** for the API role. `check_ins` and `audit_events` are insert-and-read only.

RLS protects against application bugs. It does not protect against a fully compromised API process, which could set any context. Secrets handling and the threat model (P0-10) cover that case.

### Sign-in
- **Organisers and staff** sign in with Microsoft Entra External ID. **Guests never have an account.**
- There is one Entra External ID directory for the whole product. A Hostpointe tenant is a row in `tenants`, not an Entra tenant.
- The API validates the token's signature, issuer, audience and expiry on every request.
- A person is identified by issuer and the token's immutable user ID, never by email address, which can change.
- First sign-in goes through `app.upsert_user_from_identity`, a narrow `SECURITY DEFINER` function. It is the only way to reach a user row with no user context.

### Choosing the tenant
1. Validate the token and set `app.user_id`.
2. Read the tenant the client asked for from the request.
3. **Confirm a membership exists for that user and tenant.** Refuse with 404, not 403, so that the response does not reveal the tenant exists.
4. Set `app.tenant_id`, then read the role from the membership.

A tenant ID from the client is only a request. Membership is the proof. With user context alone, a user can list only their own memberships and tenants.

### Roles
`roles` is a fixed catalogue (`owner`, `admin`, `staff`, `viewer`) changed only by migrations. Each membership has one role. Roles are enforced in the API. Custom roles wait until a problem-map row needs them.

### Public guest pages (Phase 1)
RSVP and pass pages have no signed-in user. They resolve an opaque invite token through a narrow `SECURITY DEFINER` function that returns only the tenant and event IDs, then proceed under normal RLS. Ibrahim adds this with the RSVP story, with review from Adaeze and Osaretin. No general "bypass" role is allowed.

### Migrations
Plain SQL, because policies and composite keys are first-class here and an ORM would hide them. The runner is node-pg-migrate (Ibrahim's choice): one file in `database/migrations` with an up and a down section. Backfills that cross tenants need their own reviewed migration. They must not weaken a policy.

## Consequences
- Every API database call must run inside a transaction with context set. Ibrahim provides one helper for this, and it should be the only route to the database.
- Connection pooling must be compatible with per-transaction settings. PgBouncer in transaction mode is compatible, because `set_config(..., true)` ends with the transaction.
- pg-boss jobs have no request context, so each job carries `tenant_id` and sets context before touching tenant data.

## Alternatives rejected
- **One database or schema per tenant:** does not fit the B1MS free tier, and makes every migration many migrations.
- **Application-level filtering only:** one missed filter becomes a leak.

## Open for human action
Creating the Entra External ID directory needs Enahoro's Azure account (see P0-04).
