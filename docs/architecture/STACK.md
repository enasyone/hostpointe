# Technical stack and hosting (approved, D-006, D-009 and D-016)

> **Revision 2 (6 Nov 2026, D-016):** the MVP database moved from Azure PostgreSQL Flexible Server to the Neon free plan in London. Azure PostgreSQL becomes the database at launch. Revision 1 is kept in git history.

**Shape:** a modular monolith (one web app and one API, with clear internal modules) plus a few background workers. Region: **Azure UK South**. MVP = free tiers first.

## Free-tier MVP stack
| Layer | Choice | Free allowance (verify before relying on it) | Paid when |
|---|---|---|---|
| Edge: DNS (Domain Name System), CDN (content delivery network), WAF (web application firewall), bot checks | Cloudflare Free + Turnstile | Free plan | Advanced firewall rules |
| Web app (Next.js) + API (NestJS) | Azure Container Apps, Consumption plan, scale to zero | Always free: 180,000 vCPU-seconds, 360,000 GiB-seconds and 2 million requests a month | Higher traffic; 1 replica always running on event days |
| Marketing pages | Azure Static Web Apps (Free) | 100 GB bandwidth, 2 custom domains | Rarely |
| Webhooks and scheduled jobs | Azure Functions + Container Apps Jobs | Functions: always free for 1 million requests | High volume |
| Database (MVP and pilot, D-016) | Neon free plan, region AWS Europe (London) `aws-eu-west-2`; branch `dev` for agents, `main` kept clean | Free: 0.5 GB storage per project, 100 compute-unit hours a month, scale to zero | Move at launch, or earlier past about 700 MB storage or 80 CU-hours a month |
| Database (from launch) | Azure Database for PostgreSQL Flexible Server, UK South | Paid (the existing Azure account gets no 12-month free database) | From launch |
| Database backups | Nightly `pg_dump` from Neon to Azure Blob Storage, with a tested restore | Within Blob free allowance | — |
| Job queue | pg-boss (inside Postgres) | Free | — |
| Files | Azure Blob Storage or Cloudflare R2 | Blob free for 12 months: 5 GB hot storage | Media growth |
| Organiser sign-in | Microsoft Entra External ID (guests need no account) | Free for 50,000 monthly active users | Above that, or premium add-ons |
| Secrets | Azure Key Vault | Free for 12 months: 10,000 transactions | Pennies after year 1 |
| Container images | GitHub Container Registry | Free | — |
| Code, CI/CD (continuous integration and delivery) | GitHub + GitHub Actions | Free plan | Many build minutes |
| Email, WhatsApp, SMS | Azure Communication Services (email and WhatsApp channel) or Meta Cloud API; Termii or Africa's Talking for Nigerian SMS | No free tier | Per message from day one |
| Read-aloud and captions | Azure AI Speech | Always free: 0.5 million characters text-to-speech, 5 hours speech-to-text a month | Above that |
| AI copy, images and video | Azure OpenAI and others, via our AI gateway | No free tier (apply for Microsoft for Startups credits) | Per use, credit-metered |
| Maps | Google Maps and Apple Maps direction links | Free (no API key) | Live traffic (Phase 2) |
| Weather | Open-Meteo | Free for development | Commercial licence at launch |
| Monitoring | Azure Monitor and Application Insights, Sentry Free | Free starting allowances | Above the free log volume |
| Product analytics and feature flags | PostHog Free | Free plan | Scale |
| Payments | Stripe (UK); Paystack and A1Pay (Nigeria) | No monthly fee | Per transaction |
| Push notifications (later) | Azure Notification Hubs or Expo Push | Notification Hubs: always free for 1 million pushes | Scale |

**Important:** Datapointe's existing Azure account is unlikely to get Azure's 12-month free offers, so check them in Cost Management before relying on them. Set a budget alert at £10.

**Database rules (D-016):** use standard Postgres features only (no Neon-specific auth, functions or object storage), so moving to Azure is a routine copy. Warm the database before event-day check-in, because Neon pauses when idle. Secrets (`DATABASE_URL`, `NEON_API_KEY`) live only in the local `.env`, GitHub environment secrets and, later, Key Vault.

## Modules (inside the NestJS API)
IAM (identity and access management) and tenancy · Events and scheduling · Guests and RSVP · Credentials · Check-in · Safe Pickup · Journey and venue · Messaging · Surveys and insights · Ticketing and payments ledger (Phase 1b) · Billing and plans · AI and media (Phase 2) · Planner suite (Phases 2–3) · Audit · SafeZone and hardware adapter (Phase 4, isolated).

## Background workers
Job workers (messages, exports, AI) · Scheduler (reminders, weather refresh, creating upcoming repeat dates, purge jobs) · Webhook receiver (payments, WhatsApp) · Media processor (resize, FFmpeg, virus scan) · PDF renderer (Phase 2) · AI gateway (Phase 2) · Hardware edge gateway (Phase 4).

## Repository layout (target)
```
apps/web            Next.js: guest pages, organiser dashboard, staff check-in PWA
apps/api            NestJS modular monolith
packages/ui         Design system (from the approved v2 prototype)
packages/domain     Types, schemas, scheduling rules
packages/integrations  Provider adapters (messaging, payments, maps, weather, AI)
database/           Schema, migrations, fake seed data
infra/              Bicep templates for Azure
tests/              Codex-owned tests (unit, e2e, security, a11y, perf)
docs/               Decisions, architecture, product, roadmap, compliance
munder-difflin/     Agent hire manifests
```
