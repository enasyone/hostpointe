# ADR-0003: Scheduling model

**Status:** Proposed · **Date:** 6 Nov 2026 · **Author:** Adaeze Okonkwo · **Implements:** D-007 · **Tested by:** AT-03, AT-06, AT-18

## Context
Multi-day events (Tom Associates, 3 days) and repeating events (a weekly service) must not be confused. Dates must survive daylight saving, moved dates and venues in different timezones. Attendance must be counted against the day people experienced, not a UTC (Coordinated Universal Time) day.

## Decision

| Level | Meaning | Example |
|---|---|---|
| **Event** | The thing being organised | "Annual Conference" |
| **EventSeries** | The rule producing dates: an RRULE (recurrence rule, RFC 5545), or NULL when dates are listed by hand | `FREQ=DAILY;COUNT=3` |
| **EventOccurrence** | One real date people attend; attendance attaches here | Day 2 |
| **Session** | A timed part of a date | "Keynote, 10:00" |

Every event has at least one series and one occurrence, including a one-off. So check-in code has one path, with no special case for simple events.

### Time rules
1. **Store three things:** the IANA (Internet Assigned Numbers Authority) timezone, the local wall-clock time and the UTC instant (`starts_at`).
2. **Wall-clock time is the truth for future dates.** "Every Sunday at 10:00 in London" stays 10:00 across daylight saving. UTC instants are calculated from it, and recalculated for future dates if timezone rules change.
3. **`local_date` identifies the day.** It is generated from `local_start`. Never derive a day from `starts_at`: 00:30 in Lagos on 10 December is 23:30 UTC on 9 December.
4. **Each occurrence stores its own timezone**, because a series can move between venues.

### Occurrences are real rows
- Occurrences are stored, not calculated on read, because attendance, surveys and messages attach to them. The scheduler creates upcoming repeat dates ahead of time.
- `recurrence_local_start` is a date's permanent identity (RECURRENCE-ID in RFC 5545) and never changes.
- **Moving a date** changes `local_start`, `starts_at` and `ends_at`. Identity and attendance stay.
- **Skipping a date** sets `status = 'cancelled'` and keeps the row.
- **Editing a rule** only touches future occurrences with no attendance. Past dates and dates with attendance are never rewritten.
- `ON DELETE RESTRICT` means an occurrence with attendance cannot be deleted.

### Ownership
RRULE expansion, DST (daylight saving time) handling and "which date is this scan for" are pure functions in `packages/domain`, tested by Codex. DST gaps and overlaps get one documented rule there: a time that does not exist moves forward by the gap, and an ambiguous time uses the first instance.

## Consequences
- `guests.rsvp_status` is the event-wide answer. A weekly series needs an answer per date, so that arrives as a separate `rsvps` table (guest and occurrence) with the RSVP story, and this column stays as the default.
- Generating occurrences is a scheduled job, so a far-future date may not exist yet. Reads must not assume otherwise.
- `timezone` is validated in `packages/domain`, not by a database constraint, because a CHECK against the timezone list could break a restore when tzdata changes. An invalid value would fail when used.

## Alternatives rejected
- **Calculating occurrences on read:** nothing stable to attach attendance to, and rule edits would rewrite history.
- **UTC only:** cannot keep "10:00 every Sunday" across daylight saving, and breaks local-day attendance.
