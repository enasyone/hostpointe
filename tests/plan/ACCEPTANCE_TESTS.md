# Acceptance tests (owner: Babajide Ogunleye, Codex)

Each test becomes an automated test in `tests/`. Status starts as **Pending** and becomes **Pass** only when it runs green against a real, persistent backend (not browser demo data).

| # | Test | Phase | Status |
|---|---|---|---|
| AT-01 | Create a personal birthday on a phone screen, share the invite, RSVP without an account, receive a valid QR code, check in exactly once | 1 | Pending |
| AT-02 | Create a 3-day Tom Associates event with three days of sessions and 20 fake attendees | 1 | Pending |
| AT-03 | The same attendee checks in on Day 1 and Day 2; a second Day 1 scan is blocked; Day 3 stays pending | 1 | Pending |
| AT-04 | Each first check-in sends at most one welcome message (even after retries); a failed send is retried and logged | 1 | Pending |
| AT-05 | Two lecture surveys and one catering survey are submitted; dashboard totals and response counts are correct; groups under 5 are hidden | 1 | Pending |
| AT-06 | A weekly service is created; one date is skipped and another moved; earlier attendance is unchanged | 1 | Pending |
| AT-07 | Directions open the right venue in Google Maps and Apple Maps, without asking for background location | 1 | Pending |
| AT-08 | The weather card shows source, update time and uncertainty, and shows "unavailable" (never made-up data) if the provider fails | 1 | Pending |
| AT-09 | A QR code from another event or tenant is refused; expired and revoked passes are denied | 1 | Pending |
| AT-10 | Tenant A can't see, list or export tenant B's guests, even with forged API requests | 1 | Pending |
| AT-11 | A guest without a smartphone or NFC is admitted through staff-assisted name lookup | 1 | Pending |
| AT-12 | Safe Pickup: a child is released only when the guardian's code matches; a mismatch is blocked and logged | 1 | Pending |
| AT-13 | A WhatsApp or email message is never sent without recorded consent; opt-out is respected | 1 | Pending |
| AT-14 | Keyboard and screen-reader users can create an event, RSVP and check in with the same results; video has captions | 1 | Pending |
| AT-15 | Personal and corporate templates are equally visible from onboarding | 1 | Pending |
| AT-16 | Layout works at 320, 375, 768, 1024 and 1440 px, with no hidden actions and no sideways scrolling | 1 | Pending |
| AT-17 | Door-tag tap checks in on the tested iPhone and Android models; phone-as-card is labelled "requires native or Wallet integration" | 1 | Pending |
| AT-18 | Cancellation, changed venue or date, timezone and daylight-saving boundaries, offline gate reconnection and QR revocation all behave correctly | 1 | Pending |
| AT-19 | Payments: Stripe and Paystack sandbox payments reconcile to the ledger daily; webhook replays are rejected; refunds are correct | 1b | Pending |
| AT-20 | AI questionnaire drafting fails gracefully without spending credits if the provider is down | 2 | Pending |
| AT-21 | Media upload rejects unsafe or unsupported files; private images are never reachable through a guessable URL | 2 | Pending |
| AT-22 | Security scan, privacy review and a backup-restore drill pass before production release | Release | Pending |
