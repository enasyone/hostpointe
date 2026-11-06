# ADR-0005: Integrations adapter pattern

**Status:** Proposed · **Date:** 6 Nov 2026 · **Author:** Adaeze Okonkwo · **Applies to:** `packages/integrations`, CLAUDE.md rules 5, 7 and 9 · **Tested by:** AT-04, AT-08, AT-13, AT-19, AT-20

## Context
Hostpointe depends on email, WhatsApp, SMS, payments, maps, weather and AI providers, and the WhatsApp route is still undecided. An outage must never block RSVP or check-in, and nothing simulated may be mistaken for real.

## Decision

### Ports and adapters
- A **port** is a TypeScript interface named for what we need, such as `MessageSender` or `WeatherSource`, with our own types. Provider types never leave the adapter.
- An **adapter** implements one port for one provider.
- API modules depend on ports. A single factory picks the adapter from configuration, so changing provider changes no module.
- Adapters have no database access and do not read tenant context. Everything they need is passed in, including credentials resolved from Key Vault.

### Every call returns a result, not an exception
```ts
type IntegrationResult<T> =
  | { ok: true; value: T; source: string; mode: 'live' | 'demo' }
  | { ok: false; reason: 'unavailable' | 'rejected' | 'timeout'; retryable: boolean };
```
Timeouts are mandatory, with a default of 5 seconds for interactive calls. Provider failures are ordinary values that the caller has to handle.

### Outages never block RSVP or check-in
- RSVP and check-in never call a provider inside their transaction.
- Outbound work goes through pg-boss, queued in the same transaction as the change that caused it, with retries and a logged final failure.
- Each port has a stated fallback:

| Port | If the provider is down |
|---|---|
| Messaging | Queue and retry; the check-in still succeeds; organiser can see failures |
| Weather | Show "unavailable", never made-up data (AT-08) |
| Maps | Plain direction links need no API (AT-07) |
| AI | Fail without spending credits (AT-20) |
| Payments | Paid ticket is pending; free RSVP and check-in are unaffected |

### DEMO adapters
- Every port may have one DEMO adapter. It carries `mode: 'demo'`, and the UI must show a DEMO label wherever its output appears.
- The factory refuses to start with a DEMO adapter in production.
- An integration counts as working only after a real test against the provider. This goes in the "built vs mocked" note at each milestone.

### Webhooks
Every inbound webhook is:
1. **Authenticated:** signature checked over the raw body before any parsing.
2. **Replay-protected:** provider timestamps checked where the provider supplies them.
3. **Idempotent:** a table unique on provider and provider event ID, inserted in the same transaction as the effect.

The receiver stores the event and acknowledges quickly, and a job does the work. That table arrives with the first webhook story.

### Data and money
- Guest data is not sent to AI by default. An AI port takes only the fields a feature explicitly passes, and any feature passing guest data needs Osaretin's review.
- AI credits are reserved atomically in PostgreSQL before the call and released on failure, so they cannot be overspent.
- Messaging ports must receive proof of consent from the caller. The check lives in the messaging module, the one route to a `MessageSender` (AT-13).
- Secrets come from `.env` locally and Key Vault in the cloud, never from code.

## Consequences
Provider choices stay reversible, including the open WhatsApp decision. Each integration costs a little more up front than a direct SDK call.

## Alternatives rejected
- **Calling provider SDKs from modules:** provider types spread, and no single place enforces timeouts, fallbacks or DEMO labelling.
- **Throwing on provider failure:** easy to forget in a path that must not fail, such as check-in.
