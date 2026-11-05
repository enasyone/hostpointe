# Phase 0 backlog: Foundation (weeks 1–4)

**Goal:** a working, empty-but-solid foundation. Repo, pipelines, Azure, sign-in and tenancy, data model, design tokens, threat model and test plan, so that Phase 1 features can be built safely.

**Gate (Enahoro approves):**
- The screens and data flows are documented.
- The threat model and DPIA (Data Protection Impact Assessment) are drafted.
- The acceptance tests exist as automated stubs.
- CI (continuous integration) is green.
- Staging is deployed on Azure inside the free tier.

## Stories
| ID | Story | Owner | Acceptance criteria |
|---|---|---|---|
| P0-01 | Record all approved decisions | Uchenna | `docs/decisions/DECISIONS.md` matches the approved comparison doc; Jira decision log created |
| P0-02 | Monorepo scaffold | Segun (with Adaeze) | pnpm + Turborepo; `apps/web` (Next.js), `apps/api` (NestJS), `packages/ui`, `packages/domain`, `packages/integrations`; `pnpm dev` runs both apps locally with one command |
| P0-03 | CI pipeline | Segun | GitHub Actions runs lint, typecheck, build, Codex tests and a security scan on every PR (pull request); main branch protected (PR plus review required) |
| P0-04 | Azure foundation (needs Enahoro's Azure account) | Segun | Bicep deploys to UK South: Container Apps environment, PostgreSQL B1MS, Blob Storage, Key Vault, App Insights; £10 budget alert; nothing outside the free tier without approval |
| P0-05 | Environments and secrets | Segun | dev / staging / production; secrets only in Key Vault; `.env.example` placeholders only |
| P0-06 | Architecture decision records | Adaeze | ADRs (architecture decision records) for the modular monolith, tenancy and row-level security, the scheduling model, credentials and check-in invariants, and the integrations adapter pattern |
| P0-07 | Tenancy and sign-in foundation | Adaeze | Entra External ID set up for organisers; tenant, membership and role tables; row-level security proven by a test (tenant A can't read tenant B) |
| P0-08 | Data model v0 | Adaeze | Schema and migrations (with rollback) for Tenant, User, Event, EventSeries, EventOccurrence, Session, Guest, Credential, CheckIn, AuditEvent; unique check-in constraint in the database |
| P0-09 | Design tokens | Adaeze | Colours, fonts, spacing and high-contrast and large-text tokens taken from the approved v2 prototype into `packages/ui` |
| P0-10 | Threat model and DPIA draft | Osaretin | Data map, risks and controls for guest data, children's data (Safe Pickup), messaging consent and UK–Nigeria transfers |
| P0-11 | Test strategy and acceptance-test stubs | Babajide | `tests/plan` complete; all 20 acceptance tests created as pending automated tests; CI reports them |
| P0-12 | Door-tag device lab plan | Babajide | Phone list (at least 10 popular UK and Nigerian iPhone and Android models), NTAG 424 DNA sample order list, test script |
| P0-13 | Jira and GitHub link-up, Sprint 1 plan | Uchenna | Jira Scrum project with epics per phase; GitHub for Jira app connected; Sprint 1 (start of Phase 1) planned |
| P0-14 | Human tasks tracker | Uchenna | Tracked with owner Enahoro: Azure account (upgrade to pay-as-you-go), Microsoft for Startups application, Meta Business verification for WhatsApp, NDPC (Nigeria Data Protection Commission) registration, ICO (Information Commissioner's Office) registration, Stripe and Paystack test accounts, register hostpointe.co.uk and hostpointe.events, UK IPO (Intellectual Property Office) and Nigerian trademark searches |
| P0-15 | Daily and milestone report templates | Uchenna | First daily summary sent; milestone report template agreed |
