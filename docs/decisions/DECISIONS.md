# Decision log (approved by Enahoro Asikhia)

Each decision is final until a new numbered decision replaces it. Earlier decisions are never edited, only superseded.

| # | Date | Decision | Why |
|---|---|---|---|
| D-001 | 5 Nov 2026 | Launch in the **UK and Nigeria together** (GBP and NGN) | Pilot client in Lagos; the core market spans the UK–Nigeria corridor |
| D-002 | 5 Nov 2026 | Business model: **free RSVP plus paid ticketing**, with **paid tickets in Phase 1b** (right after the MVP (minimum viable product)) | Matches the agreed model without making the first release too big |
| D-003 | 5 Nov 2026 | **Safe Pickup** (matching child and guardian codes, no location tracking) ships in the **first release**. All location tracking waits for Phase 4 | Low risk, high value; tracking needs field trials and a DPIA (Data Protection Impact Assessment) |
| D-004 | 5 Nov 2026 | **WhatsApp ships in the first release** alongside email, using approved templates and opt-in | WhatsApp is the main channel in Nigeria |
| D-005 | 5 Nov 2026 | Name: **Hostpointe by Datapointe**, subject to trademark checks. "Gatherwise" was dropped because Gatherwise, Inc. already uses it for event software | Avoid trademark conflict |
| D-006 | 5 Nov 2026 | Architecture: **modular monolith** (Next.js web + NestJS API + PostgreSQL), not microservices | Faster, cheaper and safer for check-in and payments; modules can be split later |
| D-007 | 5 Nov 2026 | Adopt the scheduling model **Event → EventSeries (RRULE) → EventOccurrence → Session** | Multi-day and recurring events must not be confused |
| D-008 | 5 Nov 2026 | Add the **planner suite** (run-of-show timelines, vendor views, leads, client portal, proposals, contracts, invoicing) in Phases 2–3 | Strengthens the planner tiers |
| D-009 | 6 Nov 2026 | Host on **Azure UK South**, free tiers for the MVP, with free extras (Cloudflare, GitHub, Sentry, PostHog) | Low cost until launch |
| D-010 | 6 Nov 2026 | Native **Android and iOS apps later in React Native (Expo)** | Shares TypeScript with the web app |
| D-011 | 6 Nov 2026 | Build with the **Munder Difflin** agent harness: **Claude Code builds, Codex tests**. Lean team of 8 agents plus 1 on-call compliance reviewer, phased in | Separation of duties with low coordination overhead |
| D-012 | 6 Nov 2026 | **GitHub Issues and Projects** for daily work; **Jira Scrum** as the official record, run by Uchenna | Work stays next to the code; there is still a formal audit trail |
| D-013 | 6 Nov 2026 | Reporting: a **daily summary** plus a **milestone report** at each phase gate | Enahoro's preference |
| D-014 | 6 Nov 2026 | Feedback is **anonymous by default** | More honest answers and lower privacy risk |
| D-015 | 6 Nov 2026 | Comparison, consolidated strategy and build setup **APPROVED**; Phase 0 started | Final approval |
| D-016 | 6 Nov 2026 | **Database for MVP and pilot: Neon free Postgres in Europe (London), `aws-eu-west-2`.** Move to Azure PostgreSQL Flexible Server (UK South) at launch, or earlier once storage passes about 700 MB, compute regularly passes 80 of 100 CU-hours a month, or longer backups are needed. Rules: standard Postgres only, no Neon-specific features (auth, functions, object storage); nightly backup to Azure Blob from day one; warm the database before event-day check-in | The existing Azure account doesn't get the 12-month free database; Neon keeps the MVP at £0, and moving later is a routine Postgres copy |
| D-017 | 6 Nov 2026 | **Pilot stays on Neon Free with real guest data (option c in ADR-0006).** The pilot data is deleted afterwards. Enahoro accepts the risk in writing. **Osaretin's written objection is on record and is not resolved: it is overridden by Enahoro's decision** under the escalation rule (legal and safeguarding questions go to Enahoro). Still required: a signed data processing agreement with Neon and its sub-processor list (needs a Datapointe signatory), and a pilot data deletion plan. D-016's move to Azure at launch still stands | Enahoro wants the pilot to run on real data without waiting for Azure; the Neon Free plan keeps it at £0 |


D-017 record of acceptance: Enahoro's words on file (via god, 6 Nov 2026): "The simulation will be real with real data. It will be deleted afterwards." The choice of option (c) with risk accepted in writing was relayed by god. **Enahoro's own written risk-acceptance wording is NOT yet in this file: it still has to be supplied and pasted here verbatim.** Osaretin's written objection: to be referenced from her review file in docs/compliance/reviews.

D-016 known gap (6 Nov 2026): the D-016 row says nightly backup goes to Azure Blob from day one. Enahoro later said there is no Blob yet and asked for a free option, so the backup target for real pilot data is OPEN (Azure Blob vs a private repo). Adaeze corrected STACK.md and ADR-0006 (PR #6). The D-016 row is left as written; if Enahoro's NEON-DEC answer changes the target, a new numbered decision will supersede that clause. Jira: HPE-34.

D-016 detail: ADR-0006 (Accepted 6 Nov 2026) in `docs/architecture`; conditions before real guests are tracked in Jira HPE-34.

D-016 confirmation (6 Nov 2026, Enahoro): D-016 stands as written. The move to Azure happens at launch, not earlier. The Tom Associates pilot, even with about 120 attendees, runs on test (fake) data, not real guest personal data, so Neon never holds real personal data. This resolves the open question in ADR-0006 (option (a) in effect, without moving the pilot to Azure). No new decision number. Dev-only DEMO sign-in approved for Sprint 1. Personal invite links per guest are the default.

**NOTE: the paragraph above (test data only, DEMO sign-in, 'pilot gate') is OUT OF DATE. See the reversal below. DEMO sign-in is for development only.**

**REVERSED later on 6 Nov 2026 (Enahoro):** "The simulation will be real with real data. It will be deleted afterwards." Real attendee data WILL go into the system during the pilot, so the test-data-only confirmation above no longer holds. Open again until Enahoro picks: Azure before the pilot, a paid Neon plan, or accepting Free-plan risk in writing (Michael). Also needs a rough pilot date. Everything real-data-related in ADR-0006 and the DPIA applies again. The pilot data is to be deleted afterwards (deletion plan needed).

## Still open (Enahoro to decide)
- The consolidated 6-tier pricing as a working hypothesis.
- Team budget and target launch date.
- Tom Associates pilot details: participants, dates, venue and who sees lecturer scores.
- Hosting the pilot on Azure from day one (default) vs a simpler host first.
- WhatsApp route: Meta Cloud API direct vs Azure Communication Services or another reseller.
