# ADR-0004: Credentials and check-in invariants

**Status:** Accepted (6 Nov 2026, god) · **Date:** 6 Nov 2026 · **Author:** Adaeze Okonkwo · **Implements:** P0-08 · **Tested by:** AT-01, AT-03, AT-04, AT-09, AT-11, AT-17, AT-18

**Compliance:** Osaretin approved the data model with conditions (`docs/compliance/reviews/REVIEW-0001-data-model-v0.md`).

## Decision

### Invariants
| # | Rule | Enforced by |
|---|---|---|
| 1 | One check-in per guest, occurrence and session (session empty = the whole date) | Database: `check_ins_one_per_guest_occurrence_session` |
| 2 | A retry from a device never creates a second row | Database: `check_ins_idempotency_unique` |
| 3 | A check-in cannot mix guests, dates, sessions or credentials from different tenants or events | Database: composite foreign keys |
| 4 | Every check-in except staff lookup names a credential | Database: CHECK |
| 5 | Check-ins are never edited or deleted by the API | Database: grants |
| 6 | A date with attendance cannot be deleted | Database: `ON DELETE RESTRICT` |
| 7 | A guest has at most one active credential of each kind | Database: partial unique index |
| 8 | A revoked credential always has a revocation time | Database: CHECK |
| 9 | No personal data in a QR payload | `packages/domain` token format, checked by tests |
| 10 | Expired, revoked or wrong-event credentials are refused | Check-in service |
| 11 | The welcome message is sent at most once | Same transaction as the first check-in, with a de-duplication key |
| 12 | Check-in depends only on PostgreSQL | Architecture: messaging runs after commit, through pg-boss |

Rule 10 lives in the service, not a database trigger, because an offline scan made before a revocation can arrive after it. The service compares `scanned_at` to `revoked_at`.

### Credential format
- **QR:** a signed token holding only the credential ID, a signing key ID and a short time step for rotation. No name, email, phone, event title or tenant name. The key lives in Azure Key Vault (`QR_SIGNING_KEY`), and the key ID lets keys rotate.
- **Short code:** human-enterable fallback, stored only as a keyed hash in `lookup_hash`.
- **Door tag (NTAG 424 DNA):** tag identifier stored only as a keyed hash. Secure tap verification is designed in Phase 1 and proven on real phones under AT-17 before anyone claims it works.
- **Staff lookup:** no credential. Staff find the guest by name, so a guest with no smartphone is still admitted (AT-11).

A foreign QR code is refused naturally: it fails the signature check, or RLS makes the credential invisible to that tenant's staff. Either way the scanner shows one "not valid here" result that reveals nothing about the other event.

### Check-in transaction
1. Verify the credential.
2. `INSERT ... ON CONFLICT DO NOTHING`.
3. If a row was inserted, queue the welcome message and write the audit event in the same transaction. If not, return "already checked in" with the original time.

Repeat scans are normal at a door, so they are a clean result, not an error. Queueing uses pg-boss with the same database connection as the check-in. Ibrahim must prove this under AT-04.

### Offline gates
The staff app queues scans with a device-made `idempotency_key` and `scanned_at`, then merges on reconnect. Rule 1 settles conflicts: the first row to arrive stands, and the later device sees "already checked in". `received_at` keeps the server's time, because device clocks can be wrong. Detailed design comes with the Phase 1 story.

### Erasure and retention (from REVIEW-0001)
- **Erasure of a guest with attendance means anonymising in place.** A guest with no attendance and no consent records may simply be deleted; a guest with consent records is anonymised, because those records are append-only. The exception is the owner-run deletion at pilot end or tenant offboarding, which deletes those records too (Osaretin, REVIEW-0002). `app.anonymise_guest` replaces the name with a placeholder, clears email and phone, revokes the guest's credentials and clears their hashes. Check-in rows stay, so attendance counts stay correct.
- **When:** on request within 30 days, and automatically 12 months after the event's last occurrence. An organiser may choose shorter. The scheduled job and the request flow are still to be built.
- **Audit events:** kept 24 months. Only the scheduled purge job may delete them, through `hostpointe_purge`, which can remove rows older than 24 months and nothing else.
- **Audit metadata:** a database check allows only listed keys and short lower-case values, because an append-only table cannot be erased. A new key needs a migration, and so a compliance review.

### Still required before real guests use this (from REVIEW-0001)
- Tenant offboarding job (C-3), before the first paid customer.
- Osaretin reviews the public invite-token function (C-4).
- Staff `users` rows anonymised 12 months after the end of the person's last membership, or on their request, whichever is sooner.
- No messages sent until the consent migration lands (N-2), with one exception added by Osaretin (GUIDANCE-0002, 6 Nov 2026): the RSVP confirmation email may go earlier as a service message on a recorded lawful basis. It goes once, only to the address on that RSVP, with no marketing and no access needs, names the organiser with a privacy link, and runs a suppression check first. Reminders, updates, WhatsApp and anything to imported guests still wait for consent.
- Venue address may be a private home, which is the host's personal data (Osaretin). For `personal` events, blank `venues.address` 12 months after the event's last occurrence or at once on request, keeping the name. Show the full address only to guests with a personal link who have RSVPed yes, never on public pages.
- Access needs are health data (GUIDANCE-0002): own table, fixed choices, separate explicit consent, owner and admin only, audited separate export, never in emails, QR codes, analytics, logs or AI. Hard delete 30 days after the last occurrence or promptly on withdrawal. `app.anonymise_guest` must delete them and write an erasure-log entry.

### Erasure log (added 6 Nov 2026, Osaretin's rules in `RETENTION.md`; required before the first real guest; not built)
- Every erasure writes one entry to an append-only log in Azure Blob: guest ID, tenant ID, time, action. No name or contact details. After any restore, the log is applied before reopening, so an erased person cannot come back.
- Deleting a guest with no attendance writes the same entry, through the same function or a `guest.deleted` event, with a test.
- A database function cannot write to Blob, so the entry goes through a pg-boss job queued in the erasure's own transaction, with retries, and a logged failure.
- Blob lifecycle rules delete whole files, not lines, so use one file a day and delete each after 35 days. The erasure path alone may write; the restore job and named DevOps staff may read. The log is treated as personal data.
- Only fallback if this is late: a manual register of erased IDs kept by DevOps and compliance, applied after any restore.

### Deliberately not in v0
- **Safe Pickup and all children's data:** separate tables in a separate migration, with Osaretin's review. D-003 rules out location tracking until Phase 4.
- **Consent records:** arrive with messaging (AT-13).
- **Correcting a mistaken check-in:** rule 5 leaves no way to undo one. If the product needs it, add a separate reversal record in a new migration and keep the original row.

## Consequences
Fast path and duplicate handling live in the database, which supports the 500 ms target for 95% of scans. That target is unproven until k6 runs against real infrastructure.

## Alternatives rejected
- **Partial unique indexes instead of `NULLS NOT DISTINCT`:** two indexes and a more awkward `ON CONFLICT`. The chosen form needs PostgreSQL 15 or later, which Azure offers.
- **Personal data or event details in the QR code:** forbidden by the architecture invariants.
