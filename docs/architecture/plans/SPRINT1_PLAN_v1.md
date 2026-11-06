# Sprint 1 technical plan, version 1

**Author:** Adaeze Okonkwo · **Date:** 6 Nov 2026 · **Status:** draft for Uchenna to split into Jira tasks · **Stories:** HPE-77 to HPE-80, traced to PF-F1, PF-F2, PF-F3

**Starts after:** the scaffold and migration 0001 are on `main` (P0-02, P0-03, P0-08).

**Assumes:** personal RSVP links, the default per Uchenna (6 Nov 2026). An open link would change tasks 2 and 6.

## Pilot: real data on Neon Free (D-017, ADR-0006)
Real attendees enter real data. An earlier test-data rule in this file is withdrawn; it is in git history. Development and tests still use fake data only, on `dev`.

**Open, needs an answer before any real attendee:**
1. **Sign-in.** The DEMO sign-in is for development only. It will not be used to protect real data: it would let anyone reach attendees' details, and Osaretin's minimum says it stays off. Real sign-in is required.
2. **Hosting.** Azure Container Apps is deferred with HPE-11, so the pilot has no place to run.
3. **Email provider, and backup target,** both without Azure Blob or, possibly, Azure.

**Minimum before the first real attendee** (Osaretin, `docs/compliance/PILOT_DATA_PLAN.md`):
- Real sign-in with a session timeout.
- Erasure on Neon Free (HPE-76), with no Blob: Osaretin's fallback, a manual register, for the pilot only. On each erasure, named DevOps staff add guest ID, tenant ID, time and action to a private register the same day. Names and contact details never go in it. The restore runbook applies it before reopening. Audit events still record each erasure, and deleting a guest with no attendance writes one too. The automatic log returns with Azure Blob, as a gate for launch. Agreed by Osaretin, kept by Segun and deleted at pilot end.
- Email only, with a provider tested in sandbox. No WhatsApp. Access needs off unless needed.
- Neon's signed data processing agreement, and Tom Associates' written authorisation of Neon: a legal requirement, not covered by D-017's risk acceptance.
- Privacy notice shown first, and a breach runbook. Non-technical items are in Osaretin's plan.
- Deletion within 30 days of the last pilot day, with a signed record.

## Tasks, in order
| # | Task | Owner | Story | Needs |
|---|---|---|---|---|
| 1 | DEMO sign-in: API guard and sign-in page, labelled DEMO. App refuses to start with it when `APP_ENV=production` | Ibrahim, Chinedu | 77, 79 | — |
| 2 | Migration 0002: venues, guest_invites, consent_records, access_needs, suppressions, duplicate rule, invite-token function, with rollback | Ibrahim. Review: Adaeze, Osaretin | 77, 78, 79, 80 | — |
| 3 | `packages/domain`: local time plus timezone to UTC, timezone validation, one-off event shape | Adaeze. Review: Ibrahim | 77 | — |
| 4 | Create-event API: event, series and first occurrence in one transaction; OpenAPI | Ibrahim | 77 | 1, 2, 3 |
| 5 | Create-event page, 320 px and up, asks personal or corporate with no default | Chinedu | 77 | 4 |
| 6 | RSVP API and page via invite token. Duplicate does not reveal an earlier RSVP. Separate optional consent line for access needs | Ibrahim, Chinedu. Review: Osaretin | 78 | 2 |
| 7 | Load prepared fake guest list and create invite links | Ibrahim, Chinedu | 78, 79 | 2 |
| 8 | Guest list and default export without access needs; separate audited Access plan export for owner and admin; export protected from spreadsheet formulas | Ibrahim, Chinedu. Review: Osaretin | 79 | 6 |
| 9 | Email port and DEMO adapter; job queued in the RSVP transaction; suppression check first; provider recommendation | Amina | 80 | 2, 6 |
| 10 | Tests for all of the above, including tenant isolation on new tables, and DEMO sign-in refused in production | Babajide, Obinna | all | as built |
| 11 | Pilot logging: keep logs short-lived (30 days at most), named in the deletion plan; access needs off unless needed | Segun, Chinedu | 78 | 6 |

## Known limits
- **Sign-in and email are DEMO in development** until a real sign-in and a real provider are tested, and neither DEMO may serve the pilot. This goes in the built-vs-mocked note.
- **Workers on Neon Free** run only when needed, because an always-on worker uses up the allowance (ADR-0006).
- **Before any real guest, still required:** the minimum above, plus the items in ADR-0004 and ADR-0006.
