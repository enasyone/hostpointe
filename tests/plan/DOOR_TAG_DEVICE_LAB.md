# Door-tag device lab plan

Owner: Babajide Ogunleye, Quality Assurance Lead  
Acceptance coverage: AT-17, with AT-03 and AT-09 security checks repeated on physical devices

## Goal

Prove that a genuine NTAG 424 DNA Near Field Communication (NFC) door tag opens the intended Hostpointe check-in route and that the backend accepts a valid tap exactly once while refusing copied, altered, revoked and cross-event data.

The lab must test both UK and Nigerian usage patterns, current and older operating systems, premium and budget Android hardware, thick cases, weak connectivity and accessibility settings. Confirm NFC support on the exact regional stock-keeping unit before buying; some budget model variants omit NFC.

## Phone matrix

Acquire or borrow at least one device from every row marked P0. Record exact model number, operating-system build, browser, case and NFC setting in each run.

| Priority | Market coverage | Device | Why it is in the lab |
|---|---|---|---|
| P0 | UK and Nigeria | iPhone 11 | Common older/used iPhone baseline |
| P0 | UK and Nigeria | iPhone 12 | Common used iPhone and compact antenna geometry |
| P0 | UK and Nigeria | iPhone 14 | Recent mainstream iPhone |
| P0 | UK and Nigeria | iPhone 16 | Current-generation mainstream reference |
| P0 | UK | iPhone SE (3rd generation) | Small-screen and home-button form factor |
| P0 | UK and Nigeria | Samsung Galaxy A16 5G, NFC regional variant | Popular lower-cost Samsung class |
| P0 | UK and Nigeria | Samsung Galaxy A25 5G | Mainstream Samsung A-series |
| P0 | UK and Nigeria | Samsung Galaxy S24 | Premium Android reference |
| P0 | Nigeria | Tecno Camon 40, NFC regional variant | Tecno mid-range coverage |
| P0 | Nigeria | Infinix Note 50 Pro, NFC regional variant | Infinix performance/value coverage |
| P0 | Nigeria | Xiaomi Redmi Note 14 Pro 5G, NFC regional variant | Xiaomi/Redmi coverage |
| P1 | UK | Google Pixel 8a | Google Android reference |
| P1 | Nigeria | Tecno Spark 20 Pro+, NFC regional variant | Affordable curved-body Tecno coverage |
| P1 | Nigeria | Infinix Hot 50 Pro+, NFC regional variant | Affordable Infinix coverage |

Market selection should be reviewed quarterly. The initial mix reflects strong Apple and Samsung usage in the UK and Apple, Samsung, Tecno, Infinix and Xiaomi/Redmi usage in Nigeria. Device popularity does not prove NFC support, hence the exact-variant purchase check.

## NTAG 424 DNA sample order

Buy through NXP or an authorised distributor and retain invoices and lot codes. Do not place a production tag order until sample testing passes.

| Quantity | Sample | Purpose |
|---:|---|---|
| 25 | Genuine NTAG 424 DNA dry inlays, 38–45 millimetre class | Antenna/range baseline and enclosure prototypes |
| 25 | Genuine NTAG 424 DNA wet inlays, same antenna class | Adhesive door placement and environmental testing |
| 10 | NTAG 424 DNA PVC cards | Stable control samples and repeatability checks |
| 10 | NTAG 424 DNA on-metal labels | Metal door/frame placement |
| 10 | NTAG 424 DNA TagTamper labels | Tamper-state and removed-tag behaviour |
| 5 | Manufacturer evaluation/demo tags with known keys | Reader and Secure Unique NFC (SUN) message integration reference |

For every form factor obtain the converter's antenna drawing, integrated-circuit authenticity statement, encoding specification and environmental rating. Number samples with fake lab identifiers only. Keep five samples of each production candidate unencoded as controls.

## Preconditions

- A dedicated fake tenant, fake event and fake attendee set exists in the persistent test environment.
- Tags use non-production keys and contain no personal data.
- The test build logs tap identifier, validation result, device/browser and server timestamp without logging secret keys.
- Each phone has supported operating-system updates, its default browser and a clean secondary browser installed.
- A network shaper can provide online, slow, intermittent and offline states.

## Test script

Run every P0 device against one dry-inlay control and the intended production form factor. Repeat failures three times without silently retrying the application action.

1. Record device model, regional model number, operating system, browser/version, case, tag identifier, tag form factor, network state and tester.
2. With the phone locked and screen awake, tap the marked antenna area to the tag. Record whether a system prompt appears, time to prompt and tap position.
3. Open the prompt. Verify the HTTPS host and event shown are correct and no application install, account creation or background-location permission is requested.
4. Complete check-in for the fake attendee. Verify one success record, the correct tenant/event/occurrence and a single welcome-message job.
5. Tap again immediately. Verify the duplicate is blocked or shown as already checked in and no second record or welcome-message job is created.
6. Repeat with the same attendee on the next fake event day. Verify the new day's check-in succeeds and the later day remains pending.
7. Tap a tag assigned to another event and another tenant. Verify both are refused and audited without disclosing guest data.
8. Revoke a tag, then tap it. Verify refusal. Repeat with an expired tag and with a copied or altered dynamic URL; verify refusal and an audit record.
9. Test normal case, thick non-metal case, phone rotated 180 degrees, tag behind glass/wood, and the approved metal-mount sample on a metal frame. Record detection time and failures.
10. Repeat online, slow, connection-lost-after-open and fully offline. Verify the user sees an honest state and reconnection cannot create a duplicate.
11. Enable large text, screen reader and high contrast. Verify the prompt and result remain understandable and actionable.
12. Save sanitized evidence and mark Pass only when expected backend records and audit logs match the user-visible result.

## Pass criteria

- Each P0 phone completes 20 consecutive valid taps with at least 19 detected and opened successfully; every valid opened request produces the correct single check-in.
- No duplicate check-in or second welcome-message job is created under retries or reconnection.
- Every foreign-event, foreign-tenant, expired, revoked, copied or altered request is refused and audited.
- Median tap-to-prompt and prompt-to-result times are recorded; any device-specific regression is filed as a defect rather than hidden by retries.
- No tag URL, log or screenshot contains real personal data or secret key material.

## Evidence and review

Store the completed matrix, sanitized logs, photos of tap positions and failure videos under the test run's artefact identifier. Review the phone matrix quarterly and before a major UK or Nigerian launch. Quarantine a device result only with a linked defect and repeat-run evidence.

## References

- NXP, *NTAG 424 DNA product data sheet*: https://www.nxp.com/docs/en/data-sheet/NT4H2421Gx.pdf
- StatCounter, Nigeria mobile vendor share: https://gs.statcounter.com/vendor-market-share/mobile/nigeria/2025
- Axis Intelligence summary of August 2026 StatCounter in-use share for UK and Nigeria: https://axis-intelligence.com/wp-content/dashboard/smartphone-market-share-by-country-dashboard.html
- GSMA, *Accelerating Smartphone Adoption in Africa* (device and pre-owned-market context): https://www.gsma.com/about-us/regions/africa/wp-content/uploads/2025/11/GSMA-SmartPhone_Adoption_Report_final.pdf
