# Sprint 1 technical plan, version 1

**Author:** Adaeze Okonkwo · **Date:** 6 Nov 2026 · **Status:** draft for Uchenna to split into Jira tasks · **Stories:** HPE-77 to HPE-80, traced to PF-F1, PF-F2, PF-F3

**Starts after:** the scaffold and migration 0001 are on `main` (P0-02, P0-03, P0-08).

**Assumes:** personal RSVP links, recommended by Uchenna and me. Enahoro has not answered this. An open link would change tasks 2 and 6.

## Pilot rule: test data only
Enahoro's decision: the Tom Associates pilot has real attendees, but no real guest data enters the system (ADR-0006). The software has to make that hard to break:
- **Prepared guest lists:** guests are made-up names loaded by the organiser. Real attendees do not fill in the RSVP form with their own details.
- **Visible warning:** every RSVP and organiser form says "Test system: do not enter real names or contact details" while `APP_ENV` is not `production`.
- **No free text for people:** access needs are fixed choices (GUIDANCE-0002).
- **Email goes nowhere real:** the DEMO adapter does not leave the process. A later sandbox test sends only to an allow-list of team test addresses.

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
| 10 | Tests for all of the above, including tenant isolation on new tables and DEMO sign-in refused in production | Babajide, Obinna | all | as built |

## Known limits
- **All of Sprint 1 is DEMO for sign-in and email** until Entra and a real provider are tested. This goes in the built-vs-mocked note.
- **Workers on Neon Free** run only when needed, because an always-on worker uses up the allowance (ADR-0006).
- **Before any real guest, still required:** Azure, the erasure log HPE-76, backups, and the items in ADR-0004 and ADR-0006.
