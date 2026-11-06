# Problem-to-feature map (v2, 6 Nov 2026)
v2 clarifies the PF-F2 pilot gate (v1 stays unchanged). Working copy of section 5 of `product-brief-v1.md`, with row IDs so stories and Jira tickets can cite them (rule 6). The brief stays the source for plan tiers. New revision = new numbered file.

## Rows
| ID | Problem | Feature | Phase |
|---|---|---|---|
| PF-01 | Guests get lost or arrive late | Directions and live ETA (estimated time of arrival) | 1 |
| PF-02 | Traffic or incidents on the route | Route watch, "leave by" time | 2 |
| PF-03 | Weather spoils the event | Event-day forecast and advice | 1 |
| PF-04 | Events run over several days | Multi-day events, attendance per day | 1 |
| PF-05 | Weekly events re-created by hand | Recurring series | 1 |
| PF-06 | Registration queues | Door-tag or QR tap-in | 1 |
| PF-07 | Attendees can't find facilities | WhatsApp welcome with map pins | 1 |
| PF-08 | Unknown lecturer or session quality | Anonymous questionnaires after each lecture | 1 |
| PF-09 | Food and venue issues surface too late | Day pulse with low-score alerts | 2 |
| PF-10 | No proof of value for bosses or sponsors | Insights dashboard | 1 basic, 2 full |
| PF-11 | Flat atmosphere | Spotify card, royalty-free music | 2 |
| PF-12 | Children wander in big halls | Safe Pickup (D-003), then safeguarding tiers | 1 / 4 |
| PF-13 | Every event type needs different wording | Event-type templates | 1 basic |
| PF-14 | High ticket fees | Low-fee ticketing | 1b |
| PF-15 | Expensive printed flyers | AI flyers | 2 |

## Foundation rows (added by Uchenna; need Enahoro or Michael to confirm they are in scope)
| ID | Problem | Feature | Needed by |
|---|---|---|---|
| PF-F1 | No event, no guests: every row above needs an event to attach to | Create an event (with series and occurrence, D-007) | PF-04, 05, 06 |
| PF-F2 | Organisers can't know who is coming or what they need | RSVP, guest list, access needs (fixed choices) | PF-06, PF-07. Pilot gate means the end-to-end flow works on prepared fake guest data; real attendees do not enter their own details (D-016 confirmation) |
| PF-F3 | Guests need confirmation and reminders | Email now, WhatsApp later (D-004) | PF-07 |
| PF-C1 | Guests have a legal right to erasure; restores must not bring them back | Erasure log outside the database (compliance control) | Before first real guest |

## Sprint 1 trace
HPE-77 create event: PF-F1 (enables PF-04, PF-05). HPE-78 RSVP: PF-F2. HPE-79 guest list: PF-F2. HPE-80 email confirmation: PF-F3. HPE-76 erasure log: PF-C1.
