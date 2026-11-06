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
type IntegrationMode = 'live' | 'sandbox' | 'demo';

type IntegrationResult<T> =
  | { ok: true; value: T; source: string; mode: IntegrationMode }
  | {
      ok: false;
      reason: 'unavailable' | 'rejected' | 'timeout' | 'rate_limited' | 'misconfigured';
      retryable: boolean;
      retryAfterMs?: number;      // rate_limited only
      detail?: string;            // safe for the delivery log: no provider types, no personal data
      providerRequestId?: string; // for the delivery log
      source: string;
      mode: IntegrationMode;
    };
```
- Provider failures are ordinary values that the caller has to handle.
- `misconfigured` means bad or expired credentials. It is never retryable and must raise an alert.
- For messaging, `ok: true` means **accepted by the provider, not delivered**. Delivery status arrives later by webhook.
- Timeouts are mandatory. The default is 5 seconds for interactive calls. Background jobs may use a longer, configured timeout.
- Outbound calls that move money or send messages carry an idempotency key (a value that makes a repeat of the same request harmless) from the caller, so a retry cannot double charge or double send.

### Outages never block RSVP or check-in
- RSVP and check-in never call a provider inside their transaction.
- Outbound work goes through pg-boss, queued in the same transaction as the change that caused it, with retries and a logged final failure.
- Each port has a stated fallback:

| Port | If the provider is down |
|---|---|
| Messaging | Queue and retry; the check-in still succeeds; organiser can see failures. Fall back to another channel (WhatsApp to email) only when the guest's consent covers that channel. A circuit breaker per provider stops a dead provider filling the queue with slow timeouts |
| Weather | Show cached real data only if labelled with its source and last-updated time; otherwise show "unavailable". Never made-up data (AT-08) |
| Maps | Plain direction links need no API (AT-07) |
| AI | Fail without spending credits (AT-20) |
| Payments | Paid ticket is pending; free RSVP and check-in are unaffected |

### DEMO and sandbox adapters
Three modes:
- `live`: real provider, real credentials.
- `sandbox`: real provider, test credentials.
- `demo`: no provider at all.

Rules:
- Every port may have one DEMO adapter. It carries `mode: 'demo'`, and the UI must show a DEMO label wherever its output appears.
- A demo messaging adapter never sends anything outside the process.
- The delivery log row stores the mode, so demo sends are never counted as real.
- The factory refuses to start with a `demo` or `sandbox` adapter in production.
- An integration counts as working only after a real test against the provider, in `sandbox` or `live` mode. A `demo` pass never counts. This goes in the "built vs mocked" note at each milestone.

### Webhooks
Every inbound webhook is:
1. **Authenticated:** signature checked over the raw body before any parsing, using a constant-time compare. Two secrets are accepted during rotation. A bad signature gets a 401 and nothing is stored.
2. **Size-limited:** the body has a maximum size.
3. **Replay-protected:** provider timestamps checked where the provider supplies them, with a tolerance such as 5 minutes.
4. **Idempotent:** a table unique on provider and provider event ID, inserted in the same transaction as the effect.

Some providers (Paystack, possibly A1Pay) send no timestamp. There, replay protection rests on the idempotency table, plus fetching the event again from the provider's API before acting on money.

The receiver stores the event and acknowledges quickly, and a job does the work. That table arrives with the first webhook story.

### Data and money
- Guest data is not sent to AI by default. An AI port takes only the fields a feature explicitly passes, and any feature passing guest data needs Osaretin's review.
- AI credits are reserved atomically in PostgreSQL before the call and released on failure, so they cannot be overspent.
- Messaging ports must receive proof of consent from the caller. The check lives in the messaging module, the one route to a `MessageSender` (AT-13).
- Secrets come from `.env` locally and Key Vault in the cloud, never from code.

## Review
Amina Danjuma reviewed the design and asked for seven changes and two fallback additions (6 Nov 2026), all included above. Her review was by reading: nothing has been tested against a real provider. Consent and payments parts need Osaretin's review when built.

The rule that the factory also refuses `sandbox` in production was added by Adaeze when applying the changes.

Amina approved the result on 6 Nov 2026 (commit 9ab775b). Build note from her: the factory decides what "production" means from an explicit environment setting, such as `APP_ENV=production`, so staging can run `sandbox` adapters.

## Consequences
Provider choices stay reversible, including the open WhatsApp decision. Each integration costs a little more up front than a direct SDK call.

## Alternatives rejected
- **Calling provider SDKs from modules:** provider types spread, and no single place enforces timeouts, fallbacks or DEMO labelling.
- **Throwing on provider failure:** easy to forget in a path that must not fail, such as check-in.
