# Hostpointe by Datapointe

Event management platform for personal and corporate users in the UK and Nigeria: invitations, RSVP, paid tickets, check-in (QR (Quick Response) codes, NFC (Near Field Communication) door tags and wristbands), Safe Pickup for children, WhatsApp messaging, feedback questionnaires, insights and AI (Artificial Intelligence) media.

**Owner:** Datapointe Limited · **Product owner:** Enahoro Asikhia · **Status:** Phase 0 (Foundation), started 6 Nov 2026

## How this repository is built

The code is built by a team of AI agents run in the [Munder Difflin](https://github.com/enasyone/munder-difflin) agent harness:

- **Claude Code** agents write all product code (the Build Squad).
- **Codex** agents write, run and report all automated tests (the Test Squad).
- **Michael** (the Munder Difflin orchestrator, Enahoro's clone) routes work between them.
- **Enahoro** approves every phase gate.

| Folder / file | What it is |
|---|---|
| `CLAUDE.md` | Rules every Claude Code agent follows |
| `AGENTS.md` | Rules every Codex agent follows |
| `munder-difflin/hires/` | The 9 agent "hire" manifests to import into Munder Difflin |
| `docs/decisions/` | The approved decision log |
| `docs/architecture/` | Technical stack and hosting (Azure UK South, free tiers) |
| `docs/roadmap/` | Phase 0 backlog (seeds Jira) and phase plan |
| `docs/product/` | Product brief and the approved UX (user experience) prototype |
| `tests/plan/` | Test strategy and the acceptance tests |

## Phase plan

| Phase | Scope | Gate |
|---|---|---|
| 0 Foundation | Repo, CI/CD (continuous integration and delivery), Azure, auth and tenancy, data model, threat model, test plan | Enahoro approves screens, data flows, threat model and tests |
| 1 Core MVP (minimum viable product) | Personal and corporate events, multi-day and recurring scheduling, invites (email and WhatsApp), QR and door-tag check-in, Safe Pickup, maps and weather, surveys v1 | Birthday and Tom Associates journeys pass end to end |
| 1b Payments | Stripe, Paystack, A1Pay, ticket fees, payouts, reconciliation | Reconciliation tests pass |
| 2 Intelligence | AI media, AI questionnaires, insights, planner suite part 1 | No duplicate messages; tenant isolation verified |
| 3 Depth | Seating, certificates, Wallet passes, AI video, planner suite part 2, native apps | Release review |
| 4 Hardware | NFC and UHF readers, BLE (Bluetooth Low Energy) zones, SafeZone | Field trial and safeguarding review |
