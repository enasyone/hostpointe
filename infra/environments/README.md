# Environments and secrets (P0-05)

| Env | Purpose | Azure resource group | Key Vault | Deploys |
|---|---|---|---|---|
| dev | local and shared dev | `rg-hostpointe-dev` | `kv-hostpointe-dev` | manual |
| staging | pre-release checks | `rg-hostpointe-stg` | `kv-hostpointe-stg` | automatic on merge to `main` |
| production | live | `rg-hostpointe-prod` | `kv-hostpointe-prod` | only after Enahoro approves (GitHub environment reviewer) |

Status: **plan only**. Nothing is created in Azure until P0-04 is unblocked by Enahoro's Azure account confirmation and any cost is reported to Michael first.

## Secret rules
- Secrets live only in Azure Key Vault (cloud) and a git-ignored `.env` (local). Names match `.env.example`, which holds placeholders only.
- Apps read secrets through Key Vault references (managed identity); GitHub deploys with OIDC (OpenID Connect) federation, so no cloud keys are stored in GitHub.
- GitHub secrets hold only non-Azure CI tokens, if any.
- Each environment has its own vault and its own values. Never copy production values down.

## Database login roles (from Adaeze, row-level security)
Row-level security only works as designed if app logins are not superusers or table owners. Per environment, create three separate logins:
| Login | Member of | Used by | Notes |
|---|---|---|---|
| owner login | owns the tables | migrations only (node-pg-migrate, run in CI/deploy) | never given to a running app |
| API login | `hostpointe_app` | the NestJS API and workers | not superuser, not owner |
| purge login | `hostpointe_purge` | the scheduled audit purge job | not superuser, not owner |
Each login's password is a separate Key Vault secret per environment. `database/migrations/` is reserved for Adaeze's SQL files (runner chosen by Ibrahim: node-pg-migrate).

## Database: Neon replaces Azure PostgreSQL (D-016, ADR-0006 Accepted)
- PostgreSQL runs on Neon, not Azure Database for PostgreSQL B1MS. Bicep will NOT create a PostgreSQL server. The rest of P0-04 (Container Apps, Blob Storage, Key Vault, Application Insights) is unchanged and still waits on the Azure account.
- Neon branches map to environments: `dev` (exists, agents use only this), a `staging` branch and the project's default branch (named `production`) for live. Creating further branches or moving off the free plan needs Michael's cost check first; agents never touch the `production` branch.
- Connection strings (three role logins per branch, see above) are stored in Azure Key Vault for deployed environments and in the git-ignored `.env` locally. Neon uses TLS; the API uses the pooled host with `set_config('app.tenant_id', $1, true)` inside a transaction for tenant context (session-level SET is forbidden), pg-boss workers (`WORKER_DATABASE_URL`) and migrations use the direct host.
- Region confirmed: AWS eu-west-2 (London). Osaretin's review is done with conditions: see ADR-0006. Still open: a tested restore (free plan restore window is only 6 hours).
