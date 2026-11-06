# Runbook: move the database from Neon to Azure Database for PostgreSQL (draft v1)

**Status:** DRAFT. Not rehearsed. Azure does not exist yet (P0-04 blocked), so every step below is untested.
**Why it exists:** ADR-0006 decision 2 says leaving Neon must stay cheap: `pg_dump`, `pg_restore` and a changed connection string. This is that procedure.
**Owner:** Segun. **Approvals needed:** Michael (any Azure spend), Enahoro (go-live cutover), Osaretin (new processor and location in the DPIA, Data Protection Impact Assessment).

## 0. Preconditions (check all before starting)
- [ ] Azure account confirmed, P0-04 done, Bicep deployed to the target environment.
- [ ] Target: Azure Database for PostgreSQL Flexible Server, UK South, **major version 18**. Confirm 18 is offered on the chosen size in UK South (not yet confirmed, see the P0-04 note).
- [ ] Every extension used on Neon is on Azure's allow-list for 18 (run `select extname from pg_extension` on Neon; compare with Microsoft's extensions page; allow-list them in the `azure.extensions` server parameter). Migration 0001 uses none.
- [ ] Rehearsal done on a copy of **fake** data first (steps 2 to 6 against `dev`), with timings recorded.
- [ ] A fresh Neon backup exists (step 1) and the restore test (step 6) has passed.
- [ ] Agreed maintenance window and the app can show a "read-only / maintenance" state. Check-in must keep working offline (ADR-0004); tell staff before the window.

## 1. Back up the source
- **Login:** use `BACKUP_DATABASE_URL` (`hostpointe_backup`: read-only via `pg_read_all_data`, `BYPASSRLS`, no write rights, used by nothing else). Do **not** use `hostpointe_owner`: row-level security is forced on our tables, so `pg_dump` (which turns `row_security` off) errors for the owner. Do **not** pass `--enable-row-security`: with no tenant set it can produce a dump with no rows. On Neon `dev` this login exists and was checked by query: `rolbypassrls = true`, not superuser, not in `neon_superuser`, and `CREATE TABLE` and `DELETE` are refused. On Azure the admin user plays this part until a backup login is created there.
- Use the **direct** host, never the pooler, and a `pg_dump` client of major version 18 or newer.
- `pg_dump --format=custom --no-owner --no-privileges --file=hostpointe-YYYYMMDD.dump "$BACKUP_DATABASE_URL"`.
- Encrypt before it leaves the machine (`age` with a public key; the private key is held only by named DevOps staff).
- Real-data rules (Osaretin's `RETENTION.md`): keep 14 days then delete automatically (Blob lifecycle rule); UK South private container, no public access, no copies outside the UK; encrypted at rest and in transit; access for the backup job and named DevOps staff only; the backup login is logged and its password sits in Key Vault and is rotated; no dumps on laptops. Restore drills use fake data, or the restored copy is deleted the same day.
- Record the dump's SHA-256, the branch, the time and the migration version (`select * from pgmigrations`).
- **Fake-data proof before Azure exists:** a private GitHub Actions workflow may run the same steps (artifact retention 14 days) and restore into a throwaway `postgres:18` container. This proves the steps only; real data never goes there. Seed fake tenants and guests first: empty tables pass without proving anything.

## 2. Prepare the target server
- Bicep creates the server, TLS required, firewall limited to the API's outbound addresses and the operator's address. Admin password in Key Vault.
- Create the three logins **with SQL**, same design as Neon and Compose (see `infra/environments/README.md`): `hostpointe_owner` (owns the database, CREATEROLE), `hostpointe_api` (member of `hostpointe_app`), `hostpointe_purge_job` (member of `hostpointe_purge`). None may be a superuser or have BYPASSRLS. Azure does not give a true superuser; the admin user is in `azure_pg_admin`.
- Create the empty database owned by `hostpointe_owner`.

## 3. Restore
- `pg_restore --no-owner --no-privileges --role=hostpointe_owner --dbname="$TARGET_OWNER_URL" --jobs=4 hostpointe-YYYYMMDD.dump`
- Because the dump uses `--no-owner --no-privileges`, ownership comes from `--role`, and **grants must be re-applied**. Safest way: let migrations own the grants. Restore, then re-run the grant section of the migrations as the owner, or run `pnpm --filter @hostpointe/database migrate:up` against a schema-only restore and load data only (`pg_dump --data-only`). Decide in the rehearsal which is cleaner and record it here.

## 3b. Re-apply erasures (required whenever real guests exist)
A restore must never bring an erased person back. Before reopening, apply every `guest.anonymised` / erasure-log entry dated after the dump: read the erasure log (append-only files in Azure Blob, ADR-0004; until it is built, the manual register kept by DevOps and compliance) and call `app.anonymise_guest(guest_id)` for each. Write an entry for this re-application in the erasure log. If the database was lost, the log outside the database is the only record. The erasure log is required before the first real guest and is **not built yet**.

## 4. Verify the target (all must pass)
- Seeded fake data present (not empty tables). Row counts per table equal the source (script compares `count(*)` for every table).
- `select count(*) from pgmigrations` and the last migration name match.
- Row-level security: connect as `hostpointe_api`, confirm `rolsuper = false`, `rolbypassrls = false`, then run the P0-07 tenant-isolation test (tenant A cannot read tenant B). Also the live RLS test against the new server.
- Check-in uniqueness constraint exists and rejects a duplicate.
- Sequences and identity columns continue after the highest existing value.
- Audit purge login can delete only `audit_events` older than the retention rule.
- Application smoke test against the new server from a staging copy of the API.

## 5. Cutover (production only, with Enahoro's approval)
1. Announce the window. Put the API in maintenance/read-only mode (offline gate mode keeps doors working).
2. Take a final dump (step 1) after writes stop. Restore it (step 3). Verify (step 4).
3. Update the three connection strings in **Key Vault** (`DATABASE_URL`, `MIGRATION_DATABASE_URL`, `WORKER_DATABASE_URL`, `PURGE_DATABASE_URL`) to the Azure server. There is no pooler by default on Azure: if connection counts need it, enable the built-in PgBouncer on port 6432 for API traffic, and keep workers and migrations on 5432 direct (same rule as Neon).
4. Restart the API and workers so they pick up the new secrets. Run the smoke test and a real RSVP and check-in on a test event.
5. Leave maintenance mode. Watch Application Insights for errors and latency for at least an hour.

## 6. Rollback
- Keep Neon **unchanged and read-only** (do not drop anything) for at least 14 days after cutover.
- Before the point of no return (first real writes to Azure): revert the Key Vault strings to Neon and restart. No data is lost.
- After writes have started on Azure: new data exists only on Azure. A rollback then means dumping Azure and restoring into Neon with the same steps reversed; do not attempt it without Adaeze and Ibrahim.
- Deleting the Neon project or branches is destructive and needs Michael's approval; do it only after the 14 days and a verified Azure backup.

## 7. After the move
- Turn on Azure's automated backups and point-in-time restore (Flexible Server keeps 7 to 35 days); run a restore drill and log the date (AT-22).
- Update ADR-0006 status (superseded), `STACK.md`, `.env.example` comments, CI service image if the version changed, and tell Osaretin and Uchenna.
- Remove `NEON_*` secrets from the environment and rotate any secret that touched the move.

## Known unknowns (fill in during the rehearsal)
- Dump and restore duration for the real data size.
- Whether Azure's extension allow-list or version limits block anything not yet used.
- Whether the Azure B-series size is enough for the pg-boss workers and check-in load.
- Network latency from Container Apps to the database after the move (should improve).
