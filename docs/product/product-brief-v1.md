# Gatherwise by Datapointe: Product Design, Workflow and Strategy Brief

**Version:** Brief v1, covering prototype v2 · **Date:** 5 November 2026 · **Owner:** Datapointe Limited (UK) · **Working name:** Gatherwise (not final, and trademark checks are still to do)

> **Context for any AI assistant reading this:** This file describes an event management platform being designed by Datapointe Limited. Datapointe is a UK company based in Milton Keynes and works with a sister technology company in Lagos, Nigeria. A clickable prototype (v2) exists, and its design is approved as the baseline. Please build on this brief rather than starting over. All prototype data is simulated.

---

## 1. What the product is

Gatherwise is a mobile-first web platform for planning and running events. Individuals and companies can schedule, invite, ticket, check in, safeguard and get feedback from the people at their events, without hiring a third-party event company.

**Positioning:** free RSVP and guest management (like RSVPify), plus low-fee paid ticketing (like Eventbrite), plus a safeguarding layer for children, plus AI-generated media, all in one product priced for both GBP (British pounds) and NGN (Nigerian naira).

**Launch markets:** the UK and Nigeria at the same time.
- UK payments: Stripe (Stripe Connect for paying organisers).
- Nigeria payments: Paystack (split payments and sub-accounts), plus A1Pay, a Nigerian payment product from Blended Technology Solutions, Datapointe's Lagos-based sister company.

**Delivery approach:** a responsive PWA (Progressive Web App) first, then native iOS and Android apps.

### Name options (unconfirmed)
| Candidate | Rationale |
|---|---|
| Gatherwise (current working name) | Suggests smart planning and safety |
| Ayo | Yoruba for "joy"; strong in Nigeria (high risk of clashing with existing names) |
| Kinvite | "Kin" + "invite"; family and safety feel |
| Hostpointe | Ties to the Datapointe brand |
| Owanbe | Culturally strong in Nigeria, but too narrow for UK corporate clients |

Recommended pattern: "[Name] by Datapointe". Run UK IPO (Intellectual Property Office), WIPO (World Intellectual Property Organization), Nigerian trademark, domain and app-store checks before committing to a name.

---

## 2. Design principles

1. **Mobile-first.** Primary actions sit in the thumb zone. Below 880 px the sidebar becomes a bottom tab bar, and screens use a single column at 480 px or less.
2. **No login for guests.** RSVP, buy a ticket or answer a questionnaire in one screen.
3. **Accessible by default.** Target WCAG (Web Content Accessibility Guidelines) 2.2 at level AA. Touch targets are 44 px or more (above the 24 px minimum). Every drag action has a non-drag alternative. Sign-in uses magic links or passkeys, so there are no passwords or puzzles.
4. **Honest pricing.** All fees are shown up front, with nothing added at checkout. This also complies with the UK DMCC (Digital Markets, Competition and Consumers) Act 2024 rules against drip pricing.
5. **Every feature solves a named problem** (see section 5).
6. **Templates set the tone.** A funeral never gets party wording.

### Visual system (prototype)
- **Fonts:** Plus Jakarta Sans for the interface; Fraunces (serif) for display text on elegant flyers.
- **Colours:**
  - Ink #16141D, background #F6F4EF, surface #FFFFFF
  - Brand violet #5B3DF5, accent coral #FF6B3D
  - Status: OK #11845B, warning #B57A00, danger #D9363E
- **Shapes:** card corner radius 18 px, button corner radius 12 px, soft shadows.
- **Sidebar:** dark ink #15131C, with a conic-gradient logo mark (coral → violet → teal).
- **High-contrast mode:** black background, yellow #FFE600 highlights and white outlines.
- **Large-text mode:** text about 20% bigger.
- **Reduced-motion mode:** turns off all animations, and respects the operating system's reduced-motion setting.

### Accessibility features
- **Blind and visually impaired users:**
  - Semantic HTML and ARIA (Accessible Rich Internet Applications) labels, tested with VoiceOver, TalkBack and NVDA (NonVisual Desktop Access).
  - "Listen to this invitation" text-to-speech on every invite.
  - Spoken ticket codes.
  - Auto-generated, editable alt text on every AI image.
  - Large-print and tactile ticket options.
- **Deaf and hard-of-hearing users:**
  - Captions on every video announcement (shown by default).
  - Live captioning for sessions.
  - BSL (British Sign Language) and NSL (Nigerian Sign Language) interpreter booking.
  - Visual and vibration alerts.
  - Text-first support channels.
- **Attendee access-request fields on every RSVP:** wheelchair access, step-free route, interpreter, captions, large print, quiet room, assistance dog, companion ticket, and dietary or allergy needs. These feed an automatic **Access Plan** checklist for the organiser.

---

## 3. Prototype screens (v2, approved)

Navigation: Home · Create event · Manage event · AI Studio · Guest view · Check-in & wristbands · Questionnaires · Insights · Safeguarding · Plans & fees · Accessibility settings. On mobile the bottom tabs are Home, Check-in, Create (+), Insights and More. A UK £ / NG ₦ switch in the header changes currency and payment providers.

| Screen | What it does |
|---|---|
| **Home** | Greeting, KPIs (key performance indicators): RSVPs, tickets sold, revenue and children safeguarded. Event cards with badges (type, city, Safeguarding, "3 days", "↻ Weekly"), a check-in flow chart and a "needs attention" list |
| **Create event (about 60 seconds)** | Template picker (4 templates). Title, type, date, venue, number of days, repeat rule (none, weekly, fortnightly, monthly), and RSVP / paid tickets / both. "Auto-fill with AI" writes the description and agenda in the template's tone. Safeguarding Mode toggle. Live flyer preview |
| **Manage event** | Tabs: Overview (stats, share link, WhatsApp/SMS/email, listen to invitation, *Get me there* card, event song); Days & sessions or Series; Guests (search, add, import, reminders); Tickets & codes (tiers, price rules, promo codes, access-code generator with QR preview); Seating (keyboard-friendly table planner, auto-seat by group); Access plan; Safeguarding settings |
| **AI Studio** | Prompt and style (Elegant, Vibrant, Minimal, Afro-pop) → 4 flyer drafts in seconds (4 credits). Editable alt text. 10-second captioned video announcement with voice-over and royalty-free music (2 credits). Queue a full AI video (15 credits). Upload your own photo or video |
| **Guest view (mobile, no login)** | Cover image and details. Listen to the invitation. Spotify song card. *Get me there* card. RSVP yes/maybe/no, choice of parts or days, plus-ones, aso-ebi size (aso-ebi is matching fabric worn by guests at Nigerian events). Children's details and consent for kids' events. Access needs. For tickets: tier, quantity, payment method (Stripe, or Paystack card/transfer/USSD (Unstructured Supplementary Service Data, dial-code banking), or A1Pay), and an all-in fee breakdown. Ends with a ticket whose QR code changes every 30 seconds, plus "speak my code" and Add to Wallet |
| **Check-in** | Modes: **Phone tap (door tag)**, QR scan, NFC (Near Field Communication) wristband, name search, encode wristband. Day selector for multi-day events. Offline mode with a sync queue. Big result card (✓ / ⚠ / ✕) with vibration. WhatsApp welcome preview with venue pins. Recent-scans log |
| **Questionnaires** | Pick a session → AI drafts a 30-second questionnaire (ratings, pace choice, one open question). Anonymous by default. Schedule it to send when the session ends. Live attendee preview with star buttons. Day pulse and end-of-event survey are scheduled automatically |
| **Insights** | Attendance per day, response rate, average score and NPS (Net Promoter Score). Lecturer and session scores with 95% confidence whiskers (groups under 5 responses are hidden). Food, environment and organisation by day, with a 3.5 alert line. AI themes from comments, recommended fixes, and trends across events. PDF and CSV (comma-separated values) export |
| **Safeguarding console** | Live hall map with child dots (simulated BLE, Bluetooth Low Energy). Zones and restricted exits, with a UHF (Ultra-High Frequency) RFID (Radio Frequency Identification) exit gate. Wandering-child alert banner, sound and vibration, plus guardian notification. Safe Pickup verification (the guardian's code must match the child's band). Audit log. "Tracking active" indicator |
| **Plans & fees** | 5 plans in GBP and NGN, an AI credit table, top-ups, a Wedding Pass, and a ticket-fee calculator against Eventbrite, Ticket Tailor, Tix Africa and Selar |

Sample events in the prototype: Tolu & David's Wedding (Lagos, multi-ceremony), Datapointe Tech Breakfast (Milton Keynes, tickets), Ada's 7th Birthday Party (Safeguarding), Owambe Night Live (Lagos concert, NGN tickets), Tom Associates Leadership Seminar (Lagos, 3 days), and Sunday Celebration Service (weekly, recurring).

---

## 4. Key workflows

### 4.1 Tom Associates pilot (a real client): multi-day corporate seminar
The pilot assumes 3 days, about 120 participants and 3 lectures a day. The real details are still to be confirmed.
1. **Reach out (14 days before).** Import participants from CSV or HR (human resources). Each gets a WhatsApp and email invitation with a personal QR code, a 6-character backup code and a Wallet pass. Staff NFC cards or wristbands are linked if used.
2. **Getting there (the day before and the morning).** The reminder carries directions from the person's location, the day's weather and a "leave by" time worked out from live traffic.
3. **Arrive and tap (Day 1).** The attendee taps their phone on the NFC door sticker (or staff scan a QR code or tap a wristband). Registration completes instantly. A WhatsApp welcome arrives with pins for the toilets, canteen, prayer room, session hall and first aid, plus the agenda.
4. **Every morning (Days 2–3).** One tap records attendance with a timestamp (on time or late). HR attendance and CPD (Continuing Professional Development) reports are produced automatically.
5. **After each lecture.** An AI-built 30-second questionnaire goes out, anonymous by default. It covers usefulness, clarity, pace and intent to apply, plus one open comment.
6. **End of each day.** A "day pulse" asks for 3 ratings: food, venue comfort and organisation. A score below 3.5 out of 5 alerts the organiser that evening.
7. **End of event.** Thank-you message, photo highlights, certificates and a 2-minute survey with NPS.
8. **Dashboard.** Lecturer, lecture, food, environment and attendance statistics, with trends over time.

### 4.2 Wedding (Nigeria and the diaspora)
Create from a template → multi-ceremony RSVP (introduction or traditional, church, reception) → aso-ebi sizes → WhatsApp invites with audio and captioned video → seating planner → QR or NFC check-in → photo gallery with guest uploads.

### 4.3 Children's party and children's church (Safe Pickup)
The guardian registers each child with name, age, allergies and consent. At the door, the child gets a wristband and the guardian gets a pickup label with the **same random code**. Optional: NFC taps at zone doors, a BLE live map, and UHF exit-gate alerts. At pickup, staff release the child only if the codes match; a mismatch leads to an ID check and calls in the safeguarding officer. Location trails are deleted automatically 48 hours after the event, and incident records are kept.

### 4.4 Recurring church service
Create once with "Weekly" → one permanent link and QR poster always shows the next date → skip or move individual dates → calendar feed (iCal RRULE, the standard repeat-rule format) → attendance trend → first-timer follow-up → opt-in "we missed you" nudges → Safe Pickup for children's church every week.

### 4.5 Funeral or remembrance
Gentle tone → wake, service, interment and reception as separate parts → order of service → livestream for relatives abroad, with time zones → moderated tribute wall and condolence book → donations ledger → hymns from the royalty-free library.

### 4.6 Launch or major event
Ticket tiers, VIP and press lists, embargoed RSVPs → NFC gates and live capacity → crowd heat-map → sponsor dashboard → post-event reel built from the gallery.

---

## 5. Problem → feature map

| Problem | Feature | Plan |
|---|---|---|
| Guests get lost or arrive late | Directions from the guest's location via Google Maps, Apple Maps or Waze, with a live ETA (estimated time of arrival) | Free |
| Traffic or incidents on the route | Route watch: incident alerts and a "leave by" time | Mini and above |
| Weather spoils the event | Event-day forecast with advice for guests, plus contingency tips for the organiser | Free (guest), Pro (organiser alerts) |
| Events run over several days | Multi-day events: one registration, attendance per day | Personal Pro and above |
| Weekly events re-created by hand | Recurring series | Free (up to 4 dates a month), Pro (unlimited) |
| Registration queues | Phone tap-in on the door tag, or wristband tap | Free (QR), Planner (NFC) |
| Attendees can't find facilities | WhatsApp welcome with map pins | Free |
| Unknown lecturer or session quality | AI questionnaires after each lecture, anonymous by default | Pro and above |
| Food and venue issues surface too late | Day pulse with low-score alerts | Planner and above |
| No proof of value for bosses or sponsors | Insights dashboard with statistics | Corporate |
| Flat atmosphere | Spotify song card, plus royalty-free music in AI videos | Free / Mini |
| Children wander in big halls | Safeguarding Mode, in 4 tiers | Free → Corporate |
| Every event type needs different wording | Event-type templates | Free (basic), Pro (full) |
| High ticket fees | 2.5% + 30p (UK) / 3.5% + ₦100 (Nigeria), processing included | All |
| Expensive printed flyers and designers | AI Studio flyers in seconds | Mini and above |

---

## 6. Technical decisions and findings

### 6.1 Identity and tracking: a tiered mix
| Tier | Stack | Use |
|---|---|---|
| 0 · Safe Pickup | QR codes plus matching child and guardian codes | Parties, churches (free) |
| 1 · Tap Zones | NFC wristbands (NTAG 424 DNA chips, which can't be cloned) tapped at zone doors | Kids' areas, conferences |
| 2 · Live Location | BLE wristbands with an SOS button and gateways in each zone; geofence alerts | Large halls, festivals (hire add-on) |
| 3 · Exit Guard | UHF RFID portals at exits; alert if a child's band passes without a paired guardian band | Venues with defined exits (hire add-on) |

UWB (Ultra-Wideband) is skipped as overkill for most events. AirTag-style trackers are not suitable, because they depend on nearby iPhones and are designed for owners, not organisers.

**Web NFC** works only in Chrome on Android. iPhone check-in staff need the native app (Apple's Core NFC), a Bluetooth reader, or QR codes.

### 6.2 Can the phone be the NFC tag?
- **Recommended: the phone reads a door tag.** A tamper-proof NFC sticker (NTAG 424 DNA, which creates a fresh code on every tap) sits at each entrance. The attendee taps their phone, a one-time signed link opens, and their account is checked in. This works on iPhone and Android in the UK and Nigeria today, with no Apple approval and no readers to buy. Anti-cheating: the rolling code, an optional location check with consent, and one tap per person per day.
- **Phone acts as a card (HCE, Host-based Card Emulation):** works on Android now. On iPhone, third-party HCE is only available in the EEA (European Economic Area). The UK CMA (Competition and Markets Authority) proposed on 20 October 2026 that Apple must open NFC to other apps; the consultation closes 17 November 2026. Revisit after that.
- **Wallet NFC passes:** Apple VAS (Value Added Services) needs an NFC pass certificate and certified readers. Google Smart Tap works only with certified terminals. This is a premium option for big venues.

### 6.3 Music (Spotify)
Allowed: the Spotify embed widget (a tap-to-play card), and shared playlists played by the DJ from their own Spotify account. **Not allowed:** synchronising Spotify tracks with video, slideshows or ads. So AI videos use a **licensed royalty-free music library** chosen by mood (Afrobeats celebration, highlife, gentle hymn, corporate upbeat, kids' party, calm piano). Apple Music can be offered as a second embed.

### 6.4 Maps, traffic and weather
- **Directions:** universal links to Google Maps, Apple Maps and Waze. These are free, and the guest's location stays on their device.
- **Live ETA:** Google Routes API (application programming interface) with traffic. Traffic-aware routing is in Google's pricier "Pro" tier, so it is called only for reminders.
- **Incidents:** TomTom Traffic Incidents API, which covers both Nigeria and the UK.
- **Weather:** Open-Meteo, which needs a commercial licence for production. Apple WeatherKit and the UK Met Office are alternatives. Results are cached per venue per hour.
- **Advice rules:**
  - Rain 40% or more → umbrella and canopies.
  - 32°C or more → water stations and light clothing.
  - 8°C or less → warm coat and cloakroom.
  - Wind 30 km/h (kilometres per hour) or more → secure decor and gele (head wraps).
  - Harmattan haze (dusty dry-season wind in Nigeria) → dust and visibility note.
  - Funerals get gentler wording.

### 6.5 AI media
- **Images:** fast and cheap (under 1p to about 17p each), e.g. OpenAI GPT Image or Google Imagen. "In seconds" is realistic.
- **Video:** e.g. Google Veo 3.1. An 8-second clip costs about $0.40 to $3.20+ and takes tens of seconds to minutes. Generative video is therefore credit-metered and queued with a progress bar and notification. Template videos (photo, text and music) are instant.
- **Do not build on Sora**, which OpenAI discontinued in 2026. Put a model router in front of all providers so they can be swapped.
- **Safety:** provider moderation plus our own filters. No generating real likenesses of minors. C2PA content credentials where supported. A human approval step before anything is sent to guest lists.

### 6.6 Payments
- **Stripe Connect (UK):** destination charges, with "you handle pricing" on Express accounts. Budget about £2 per month for each organiser who receives payouts. Standard UK cards cost 1.5% + 20p.
- **Paystack (Nigeria):** 1.5% + ₦100, capped at ₦2,000. Each organiser gets a sub-account, and multi-split payments handle vendors (planner, caterer, decorator). Set `bearer_type` (who pays the fees) explicitly.
- **A1Pay:** a second Nigerian payment route, for resilience and cost.
- **For all events:** support bank transfer, virtual accounts and USSD. Hold ticket revenue until the event date, with early release for trusted organisers.

### 6.7 Compliance
- **UK GDPR (General Data Protection Regulation) and the ICO (Information Commissioner's Office) Children's Code:** location off by default (standard 10), an obvious sign when tracking is active, and a DPIA (Data Protection Impact Assessment) required for tracking children.
- **Nigeria Data Protection Act 2023 (NDPA):** parental consent for children's data (s.31) and a DPIA for high-risk processing (s.28). The platform will quickly count as a "data controller of major importance", which means registering with the NDPC (Nigeria Data Protection Commission), appointing a DPO (Data Protection Officer) and filing annual compliance audit returns. UK↔Nigeria data transfers need safeguards.
- **Product controls:**
  - Safeguarding off by default, with guardian consent.
  - Only guardians and named officers can see a child's location.
  - Audit log of every view.
  - Location trails deleted 24–72 hours after the event.
  - Children's data in a separate encrypted store.
  - Choice of UK or Nigeria data residency.
- **Feedback anonymity:** results for groups under 5 are hidden, lecturers see only their own scores, and survey answers are stored separately from check-in records.

---

## 7. Architecture

**Clients (4 front doors):** Guest web app (RSVP, tickets, passes, directions, surveys) · Organiser dashboard (events, templates, insights, reports) · Staff check-in app (QR, NFC, wristbands, offline queue) · NFC door tags (NTAG 424 DNA).

**API gateway:** sign-in by magic link or passkey; organisation roles and permissions.

**Core services (★ = new or extended in v2):**
1. ★ Events & series: single, multi-day, multi-ceremony and recurring events; templates
2. ★ Check-in & tap-in: door tags, daily attendance, wristbands, offline sync
3. ★ Journey service: directions, traffic, weather, advice rules, hourly cache
4. ★ Feedback & surveys: AI questionnaires, day pulse, end-of-event survey
5. ★ Insights & statistics: scores, confidence ranges, trends, exports
6. Messaging: WhatsApp Business API, email, SMS, push
7. Ticketing & payments: Stripe, Paystack and A1Pay adapter, idempotent webhooks (safe to receive twice) and a ledger
8. ★ AI media & music: model router, moderation, job queue, royalty-free music
9. Safeguarding: Safe Pickup, a gateway for BLE and RFID readings, geofence engine, alerts

**Data layer:**
- PostgreSQL with row-level security per organisation.
- Redis for sessions and rate limits.
- An event stream (Kafka/Redpanda) into time-series and warehouse storage, with automatic purging of location data.
- Object storage and a CDN (content delivery network) for media.
- A separate anonymous survey store.

**External services:** Google Maps, Apple Maps and Waze links; Google Routes; TomTom Traffic; Open-Meteo or Met Office; Spotify embed; WhatsApp Business; Apple and Google Wallet; Stripe, Paystack and A1Pay; AI image and video models.

**Stack:**
- Next.js/React PWA, with a service worker and IndexedDB for the offline scanner.
- React Native or Expo for the native apps (Core NFC, HCE on Android, BLE).
- NestJS (TypeScript) or Go services; GraphQL for the apps, REST and webhooks for partners.
- Hosting in a UK region (AWS London or Azure UK South), plus an African region or contractual transfer safeguards for Nigerian data.
- Terraform, OpenTelemetry, and OWASP ASVS L2 (a web-security verification standard).
- Signed QR payloads that rotate (JWT/HMAC signatures with short expiry).
- Card data kept out of our systems through hosted payment fields, reducing the PCI (card-industry security) scope.

---

## 8. Pricing (proposed)

| Plan | UK / month | Nigeria / month | Highlights | AI credits |
|---|---|---|---|---|
| Free | £0 | ₦0 | Unlimited free events, 100 guests per event, RSVP, QR check-in, Safe Pickup, directions and weather, Spotify card, 1 recurring series | 0 (templates only) |
| Mini | £3.99 | ₦2,500 | 250 guests, WhatsApp/SMS bundle, route watch, royalty-free music in AI videos | 30 |
| Personal Pro | £9.99 | ₦7,500 | Multi-day and recurring events, seating, funeral and kids' templates, post-event survey | 120 |
| Event Planner | £29 | ₦25,000 | Multi-client workspace, per-lecture questionnaires, day pulse, NFC door tags, team roles, white-label, lower ticket fee | 400 |
| Corporate | from £149 | from ₦150,000 | Insights across events, HR and CPD reports, sponsor dashboard, Wallet NFC passes, SSO (single sign-on), API, BLE hire, SLA (service-level agreement), DPA (data processing agreement) | Pooled |

- **AI credits:** standard image 1 · premium image 3 · template video 2 · 8-second AI video (Lite) 15 · 8-second AI video (Standard) 60. Top-up: 50 credits for £5 / ₦3,000.
- **One-off Wedding Pass:** £29 / ₦20,000.
- **Ticket fees (processing included; free tickets always free):** UK 2.5% + 30p, Nigeria 3.5% + ₦100.
- **Competitor benchmarks (public pages, November 2026; re-check before publishing):** Eventbrite UK 6.95% + £0.59; Tix Africa 8% + ₦100; Selar 4% + ₦50; Ticket Tailor £0.60 + VAT per ticket.
- **Add-ons:** NFC door-tag packs, wristband and BLE gateway hire, on-site staff.

---

## 9. Go-to-market

1. **Nigeria:** weddings and owambe (lavish Nigerian parties). Partner with 30–50 Lagos and Abuja planners, with the Planner tier free for 3 months in return for case studies. Lead with WhatsApp-native invites and aso-ebi coordination.
2. **UK:** churches, schools and PTAs (parent-teacher associations), community and diaspora events. Lead with free RSVP plus Safe Pickup and recurring services. Use the UK–Nigeria diaspora wedding corridor.
3. **Corporate pilot:** Tom Associates seminars, as the proof point for tap-in, questionnaires and insights.
4. **Ticketing switchers:** a public fee calculator against Eventbrite, Tix and Ticket Tailor.
5. **Hardware as a service:** NFC and BLE kit rental per event, a recurring revenue line competitors don't offer.

---

## 10. Roadmap

1. **Phase 1, pilot-ready (weeks 1–8):** multi-day events, NFC door-tag tap-in, QR fallback, welcome pins, per-lecture questionnaires, basic insights, directions and weather. *Gate: the Tom Associates pilot runs end to end.*
2. **Phase 2 (weeks 9–14):** recurring series, route watch, funeral and kids' templates, AI feedback summaries, PDF reports.
3. **Phase 3 (weeks 15–22):** native Android app with HCE badges, Wallet passes, launch template and sponsor dashboard, insights across events.
4. **Phase 4:** iPhone HCE badges if the UK CMA requires Apple to open NFC.

Earlier MVP (minimum viable product) scope, from the research: free RSVP, Stripe and Paystack ticketing, QR check-in, Safe Pickup, AI image studio, WhatsApp invites and WCAG 2.2 AA, in about 12–16 weeks.

---

## 11. Open questions

- **Tom Associates:** participant count and dates; venue and city; whether we can fit NFC stickers at the entrances and get a floor plan; existing staff NFC ID cards; preferred channel (WhatsApp or email); who owns the participant list; lecturer names and session titles; whether certificates or CPD hours are needed; who sees lecturer scores; any earlier feedback data.
- **Final brand name** and trademark checks.
- **A1Pay** fees and API capabilities.
- **BLE hardware partner:** shortlist Kontakt.io for standard BLE, and Quuppa or BlueIOT for sub-metre accuracy. Pilot in a real hall before promising "real-time" location.
- **Legal review:** UK and Nigerian counsel to review the DPIA and consent flows (this brief is not legal advice).

---

## 12. Sources

- Apple, HCE for apps in the EEA: https://developer.apple.com/support/hce-transactions-in-apps
- Google Wallet event tickets: https://developers.google.com/wallet/tickets/events
- CodeREADr, Wallet passes for events: https://www.codereadr.com/blog/generating-apple-and-google-wallet-passes-what-ticketing-companies-and-event-organizers-need-to-know/
- Silicon UK, CMA on iPhone NFC: https://www.silicon.co.uk/mobility/smartphones/cma-apple-pay-631935
- Spotify Developer Terms: https://developer.spotify.com/terms
- Google Routes API traffic options: https://developers.google.com/maps/documentation/routes/traffic-opt
- TomTom Traffic API coverage: https://docs.tomtom.com/traffic-api/documentation/tomtom-maps/v1/product-information/market-coverage
- Open-Meteo pricing: https://open-meteo.com/en/pricing
- Paystack pricing: https://paystack.com/pricing
- Stripe Connect pricing: https://stripe.com/gb/connect/pricing
- Tix Africa pricing: https://tix.africa/pricing
- ICO Children's Code, geolocation: https://ico.org.uk/for-organisations/uk-gdpr-guidance-and-resources/childrens-information/childrens-code-guidance-and-resources/age-appropriate-design-a-code-of-practice-for-online-services/10-geolocation/
- Web NFC browser support: https://webnfc.org/documentation/browser-support
