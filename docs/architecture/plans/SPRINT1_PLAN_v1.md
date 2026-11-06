# Sprint 1 technical plan, version 1

**Author:** Adaeze Okonkwo · **Date:** 6 Nov 2026 · **Status:** draft for Uchenna to split into Jira tasks · **Stories:** HPE-77 to HPE-80, traced to PF-F1, PF-F2, PF-F3

**Starts after:** the scaffold and migration 0001 are on `main` (P0-02, P0-03, P0-08).

**Assumes:** personal RSVP links, the default per Uchenna (6 Nov 2026). An open link would change tasks 2 and 6.

## Correction, 6 Nov 2026: the pilot uses real data
Enahoro: "The simulation will be real with real data. It will be deleted afterwards." The section below rested on a relayed answer that was wrong, so it is **on hold, and is not to be built**. Task 11 and the pilot switch are on hold too. Sprint 1 development itself still uses fake data only.

**A real-data pilot runs in production mode. Minimum before the first real attendee, whichever database is chosen (Osaretin, `docs/compliance/PILOT_DATA_PLAN.md`):**
- Real sign-in (Entra, needs the Azure account), with a session timeout. The DEMO sign-in stays off.
- The erasure log (HPE-76), or as a fallback a manual register of erased IDs.
- Email only, using a real provider tested in sandbox. No WhatsApp. Access needs off unless needed.
- Privacy notice shown first, and a breach runbook. Non-technical items, such as the Tom Associates agreement and DPIA, are in Osaretin's plan.
- Under option (a): dump rules and a tested restore. Under (b): a signed Neon agreement, at least the Launch plan, and a tested restore.
- Deletion within 30 days of the last pilot day, with a signed deletion record, as set out in Osaretin's plan.

The Neon startup check in task 1 waits for the database decision.

## Pilot rule: test data only (on hold, see above)
Enahoro's decision: the Tom Associates pilot has real attendees, but no real guest data enters the system (ADR-0006). The software has to make that hard to break:
- **Prepared guest lists:** guests are made-up names loaded by the organiser. Real attendees do not fill in the RSVP form with their own details.
- **Visible warning:** every RSVP and organiser form says "Test system: do not enter real names or contact details" while `APP_ENV` is not `production`.
- **Access needs hidden in the pilot:** a ticked box from a real person is real health data, even under a fake name. Real attendees are not asked; organisers may enter sample answers on fake guests (Osaretin).
- **No free text from real people:** plus-one names and survey comments are off in the pilot, or carry the same warning. Comments naming a lecturer would be personal data too.
- **Startup check:** the app refuses to start when `APP_ENV=production` and the database host is Neon, with a test.
- **Logs:** real attendees leave IP addresses and device details. Sentry and PostHog stay off in the pilot, and server logs are kept 30 days at most. The pilot note names this.
- **Email goes nowhere real:** the DEMO adapter does not leave the process. A later sandbox test sends only to an allow-list of team test addresses.

Osaretin accepts staff checking real attendees in at the door with prepared fake tickets and no self-entered details; the link between person and ticket stays in the organiser's own paper or sheet. God is confirming with Enahoro whether attendees do anything more.

## Tasks, in order
| # | Task | Owner | Story | Needs |
|---|---|---|---|---|
| 1 | DEMO sign-in: API guard and sign-in page, labelled DEMO. App refuses to start with it when `APP_ENV=production`. Also the Neon startup check | Ibrahim, Chinedu | 77, 79 | — |
| 2 | Migration 0002: venues, guest_invites, consent_records, access_needs, suppressions, duplicate rule, invite-token function, with rollback | Ibrahim. Review: Adaeze, Osaretin | 77, 78, 79, 80 | — |
| 3 | `packages/domain`: local time plus timezone to UTC, timezone validation, one-off event shape | Adaeze. Review: Ibrahim | 77 | — |
| 4 | Create-event API: event, series and first occurrence in one transaction; OpenAPI | Ibrahim | 77 | 1, 2, 3 |
| 5 | Create-event page, 320 px and up, asks personal or corporate with no default | Chinedu | 77 | 4 |
| 6 | RSVP API and page via invite token. Duplicate does not reveal an earlier RSVP. Separate optional consent line for access needs | Ibrahim, Chinedu. Review: Osaretin | 78 | 2 |
| 7 | Load prepared fake guest list and create invite links | Ibrahim, Chinedu | 78, 79 | 2 |
| 8 | Guest list and default export without access needs; separate audited Access plan export for owner and admin; export protected from spreadsheet formulas | Ibrahim, Chinedu. Review: Osaretin | 79 | 6 |
| 9 | Email port and DEMO adapter; job queued in the RSVP transaction; suppression check first; provider recommendation | Amina | 80 | 2, 6 |
| 10 | Tests for all of the above, including tenant isolation on new tables, DEMO sign-in refused in production, and the Neon startup check | Babajide, Obinna | all | as built |
| 11 | Pilot logging: Sentry and PostHog off, server logs 30 days at most, a pilot switch hiding access needs and free text | Segun, Chinedu | 78 | 6 |

## Known limits
- **All of Sprint 1 is DEMO for sign-in and email** until Entra and a real provider are tested. This goes in the built-vs-mocked note.
- **Workers on Neon Free** run only when needed, because an always-on worker uses up the allowance (ADR-0006).
- **Before any real guest, still required:** Azure, the erasure log HPE-76, backups, and the items in ADR-0004 and ADR-0006.
