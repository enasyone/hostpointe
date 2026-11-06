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
