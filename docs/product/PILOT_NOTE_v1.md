> **SUPERSEDED / ON HOLD (6 Nov 2026, later):** Enahoro reversed this: the pilot will use real attendee data, deleted afterwards. The controls below were written for test data only and must be re-done once the infra option is chosen (see H-13). A v2 will follow.

# Pilot note (v1, 6 Nov 2026): Tom Associates pilot runs on test data
Decision: Enahoro confirmed D-016 on 6 Nov 2026. The pilot has real attendees (about 120), but **no real guest personal data enters the system**. Neon (the database) never holds real personal data. Azure migration happens at launch.

## Controls (from Osaretin, built in Sprint 1)
- **Prepared guest lists:** guests are made-up names loaded by the organiser. Attendees do not fill in forms with their own details.
- **Warning on every form:** "Test system: do not enter real names or contact details" while the app is not in production mode.
- **Access needs hidden:** real attendees are not asked. Organisers may enter sample answers on fake guests only.
- **No free text from real people:** plus-one names and survey comments are off, or carry the same warning.
- **Startup check:** the app refuses to start in production mode if the database is Neon.
- **Logs:** Sentry and PostHog are off. Server logs are kept 30 days at most. Real attendees' IP addresses and device details may appear in logs, which is why the limit exists.
- **Email:** DEMO only. Nothing leaves the system; a later sandbox test sends only to team test addresses.
- **Door check-in:** staff check people in with prepared fake tickets. The link between a person and a ticket stays in the organiser's own paper or sheet. Whether attendees do anything more is being confirmed with Enahoro.

## Built vs mocked (Sprint 1)
Sign-in: DEMO. Email: DEMO. Everything else is built on fake data and is not live with real guests.

Jira: HPE-34, HPE-82, HPE-86, HPE-90 and the new task HPE-91 (pilot logging and switch).
