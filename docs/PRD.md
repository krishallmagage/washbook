# WashBook — Product Requirements Document

**Vehicle wash & detailing operations platform for the Sri Lankan market**

---

## 0. Document control

| Field             | Value                                                         |
| ----------------- | ------------------------------------------------------------- |
| Document          | Product Requirements Document (PRD)                           |
| Product           | WashBook (working title)                                      |
| Version           | 1.0 — Draft for pilot validation                              |
| Date              | 22 August 2026                                                |
| Author            | Krishall Magage                                               |
| Status            | Draft — pending pilot-site validation                         |
| Intended readers  | Founder/developer, pilot site owner, first hires              |
| Related documents | `Sri Lanka SaaS Shortlist` (opportunity assessment, idea #09) |

### Revision history

| Ver | Date        | Author    | Change                                            |
| --- | ----------- | --------- | ------------------------------------------------- |
| 0.1 | 22 Aug 2026 | K. Magage | Initial opportunity assessment (garage servicing) |
| 1.0 | 22 Aug 2026 | K. Magage | Re-scoped to vehicle wash & detailing; full PRD   |

### How to use this document when building

This PRD is written to be read by both a human and a coding agent. Section 9 (user stories), Section 11 (data model), Section 12 (state machines) and Section 13 (business rules) are the build contract. Everything else is context that makes the build decisions defensible. When implementing, work epic by epic in the release order given in Section 19, and treat each acceptance criterion as a test case.

---

## 1. Executive summary

> Moved to `docs/private/PRD-COMMERCIAL.md`, which is not tracked by git.
> This repository is public; pricing, market analysis, personas, risks and the
> sales playbook are not things to publish. Nothing in the codebase depends on
> this section — the build contract is §9, §11, §12, §13, §15 and §24.

---

## 2. Market context and evidence

> Moved to `docs/private/PRD-COMMERCIAL.md`, which is not tracked by git.
> This repository is public; pricing, market analysis, personas, risks and the
> sales playbook are not things to publish. Nothing in the codebase depends on
> this section — the build contract is §9, §11, §12, §13, §15 and §24.

---

## 3. Problem statement

> Moved to `docs/private/PRD-COMMERCIAL.md`, which is not tracked by git.
> This repository is public; pricing, market analysis, personas, risks and the
> sales playbook are not things to publish. Nothing in the codebase depends on
> this section — the build contract is §9, §11, §12, §13, §15 and §24.

---

## 4. Goals, non-goals and success metrics

### 4.1 Product goals

| ID   | Goal                                                                                                  |
| ---- | ----------------------------------------------------------------------------------------------------- |
| G-01 | Every vehicle that enters the site is recorded before work starts, in under 20 seconds                |
| G-02 | The owner receives a truthful daily figure — vehicles, revenue, cash expected — without being present |
| G-03 | Cash handed over reconciles to ticketed jobs, and variances are visible and explainable               |
| G-04 | Every serviced vehicle becomes a contactable customer record with service history                     |
| G-05 | The business can sell and redeem prepaid packages and monthly plans without manual tracking           |
| G-06 | Staff pay — daily wage plus per-job commission — is computed from work actually recorded              |
| G-07 | The site holds photographic evidence of vehicle condition at intake                                   |

### 4.2 Business goals (for the vendor)

> Moved to `docs/private/PRD-COMMERCIAL.md`. Vendor revenue targets are not
> something to publish. 4.1, 4.3 and 4.4 stay here — 4.4 in particular defines
> the metrics the code measures (intake capture rate, time to ticket).

### 4.3 Non-goals for v1

Stated explicitly so scope does not drift:

- Not a mechanical workshop system — no parts inventory, no job estimation, no supplier purchase orders
- Not an accounting system — no general ledger, no trial balance, no bank feeds. It exports; it does not replace the accountant
- Not a fuel-station forecourt system — no pump integration, no fuel sales
- Not a consumer-facing marketplace or booking aggregator
- Not a full HR system — attendance and commission only, no leave, no appraisals
- No automated tunnel/machine integration
- No franchise or multi-tenant white-label in v1

### 4.4 Product success metrics

| Metric                  | Definition                                                            | Target at pilot exit (day 30) |
| ----------------------- | --------------------------------------------------------------------- | ----------------------------- |
| Intake capture rate     | Tickets created ÷ vehicles observed on site during spot checks        | ≥ 95%                         |
| Time to create a ticket | Median seconds from open to save on the intake screen                 | ≤ 20s                         |
| Daily close completion  | Days where the cash close was completed ÷ operating days              | ≥ 90%                         |
| Contactable customers   | Vehicles with a valid mobile number ÷ total vehicles served           | ≥ 60%                         |
| Recall conversion       | Vehicles returning within 14 days of a recall message ÷ messages sent | ≥ 8%                          |
| Owner engagement        | Days the owner opened the daily summary ÷ operating days              | ≥ 80%                         |
| Package attach          | Active package/plan customers ÷ repeat customers                      | ≥ 15% by day 60               |

If intake capture rate falls below 80% at the pilot site, **the product has failed regardless of every other number**, because nothing downstream is trustworthy. Treat it as the single gating metric.

---

## 5. Stakeholders and personas

> Moved to `docs/private/PRD-COMMERCIAL.md`, which is not tracked by git.
> This repository is public; pricing, market analysis, personas, risks and the
> sales playbook are not things to publish. Nothing in the codebase depends on
> this section — the build contract is §9, §11, §12, §13, §15 and §24.

---

## 6. Business context — how a Sri Lankan wash actually runs

This section is the model the product is built against. **Every quantitative figure here is an assumption to be confirmed at the pilot site (Section 17).**

### 6.1 The service menu and price structure

Price varies along two axes: **service** and **vehicle class**. A single price list is a grid.

| Service                               | Bike | Three-wheeler | Car | SUV / Cab / Van | Lorry |
| ------------------------------------- | ---- | ------------- | --- | --------------- | ----- |
| Body wash                             | ●    | ●             | ●   | ●               | ●     |
| Wash + vacuum                         | —    | ●             | ●   | ●               | ●     |
| Full wash (body + vacuum + dashboard) | —    | ●             | ●   | ●               | ●     |
| Engine wash                           | ●    | ●             | ●   | ●               | ●     |
| Underbody wash                        | —    | —             | ●   | ●               | ●     |
| Wax / polish                          | —    | —             | ●   | ●               | —     |
| Interior shampoo                      | —    | —             | ●   | ●               | —     |
| Leather treatment                     | —    | —             | ●   | ●               | —     |
| Full detail / ceramic                 | —    | —             | ●   | ●               | —     |

**Assumed ticket sizes (VALIDATE):** bike Rs. 400–700; three-wheeler Rs. 500–900; car body wash Rs. 1,000–1,800; car full wash Rs. 1,800–3,000; wash + wax Rs. 3,000–5,000; full detail Rs. 12,000–35,000.

**Design consequence:** the price list is a two-dimensional matrix that the owner must be able to edit himself, and the intake screen must resolve a price the instant a vehicle class and a service are chosen. Nobody should ever type a price at the gate unless they are overriding it, and an override must be recorded.

### 6.2 The physical flow

```
   Gate                Bay                    Finishing            Counter          Exit
    │                   │                        │                   │               │
 vehicle             wash /                  vacuum /            payment          hand over
 arrives            pressure                 polish /             taken             keys
    │              wash / foam               dashboard              │                │
    ▼                   ▼                        ▼                  ▼                ▼
 [INTAKE]          [IN PROGRESS]            [FINISHING]          [BILLED]        [CLOSED]
 ticket made       staff assigned           quality check        cash / card     receipt sent
 photos taken      bay occupied             owner-notified       package redeem
```

Elapsed time is typically 25–45 minutes for a wash, several hours to a full day for detailing. Two to four vehicles may be in progress at once. **Jobs are concurrent and long-running — this is the single most important structural difference from a retail transaction, and it is why the job ticket, not the receipt, is the core entity.**

### 6.3 The money flow and where it leaks

```
customer pays cash ──► supervisor or cashier ──► cash box ──► owner (daily/weekly)
                              │
                              ├── leak 1: vehicle never ticketed
                              ├── leak 2: discount given, full price told to owner
                              ├── leak 3: package redemption charged as cash
                              └── leak 4: expense paid from the box, no record
```

WashBook attacks leak 1 by ticketing at the gate before work starts, leak 2 by recording every override against a named user, leak 3 by making redemption a ticket state, and leak 4 by requiring petty-cash outflows to be entered with a reason before the day can close.

### 6.4 Labour model

**Assumed (VALIDATE):** a mix of daily wage (Rs. 1,500–2,500/day) and a per-vehicle share, with detailing work commanding a higher share. Staff turnover is high. Some sites use subcontracted teams rather than direct employees.

**Design consequence:** commission must be attributable to a specific person on a specific job, staff must be addable in under a minute by a supervisor, and the wage sheet must be printable weekly. Where the site employs 15 or more people, the statutory EPF/ETF path applies and monthly ETF filing is now electronic — WashBook should export a clean earnings file rather than attempt statutory filing itself in v1.

### 6.5 Consumables

Shampoo, foam, wax, polish, tyre black, glass cleaner, microfibre cloths, water. **Design consequence:** a lightweight consumption model — issue stock to a bay, and compare expected usage (jobs × standard dose) against actual issues. Not a full inventory system; a variance signal.

---

## 7. Jobs to be done

| ID      | Job statement                                                                                                 | Current workaround          | What "done" looks like                                             |
| ------- | ------------------------------------------------------------------------------------------------------------- | --------------------------- | ------------------------------------------------------------------ |
| JTBD-01 | When I am away from my site, I want to know what happened today, so I can trust the cash I receive            | Phone calls, guesswork      | A daily summary that arrives without being asked                   |
| JTBD-02 | When a vehicle arrives, I want to record it and quote the right price in seconds, so the queue does not build | Shouting a remembered price | Two taps: class, service. Price appears                            |
| JTBD-03 | When a customer says "I was here last month", I want to see what was done, so I can upsell correctly          | Memory                      | Vehicle history on the plate                                       |
| JTBD-04 | When the day ends, I want the cash to balance, so nobody is blamed unfairly                                   | Reconstruct from memory     | A close screen with expected vs counted and a forced variance note |
| JTBD-05 | When a customer accuses us of damage, I want proof of the vehicle's condition on arrival                      | Argument                    | Timestamped intake photos                                          |
| JTBD-06 | When I pay my staff, I want their count to be right, so there is no weekly argument                           | Tally marks                 | Per-person job count and commission                                |
| JTBD-07 | When business is slow, I want to bring back customers who have stopped coming                                 | Nothing                     | A list of lapsed vehicles and one-tap WhatsApp                     |
| JTBD-08 | When a customer wants to prepay, I want to sell a package and track the balance reliably                      | Paper card, often lost      | Package balance on the plate, redeemed at intake                   |

---

## 8. Scope

### 8.1 MoSCoW for Release 1

**Must have**

- Vehicle intake with number plate, class, services, price resolution
- Intake photographs
- Job ticket lifecycle with staff assignment
- Billing, payment capture (cash/card/package), receipt
- Daily cash close with variance
- Owner daily summary delivered to phone
- Customer and vehicle records with service history
- Price list management by service × vehicle class
- Staff register, job attribution, commission calculation, weekly wage sheet
- Role-based access and an immutable audit log
- Offline operation at the intake and job screens
- Sinhala and English interface

**Should have**

- Prepaid packages and monthly plans with balance tracking
- Recall / lapsed-customer list with one-tap WhatsApp
- Bay and queue board
- Consumables issue and variance
- Corporate account with monthly statement

**Could have**

- Gazette-format VAT invoicing for VAT-registered sites
- Multi-site consolidated view
- Tamil interface
- Licence and renewal reminders
- Customer-facing "your vehicle is ready" message
- Simple online booking page for detailing slots

**Won't have (this release)**

- Parts inventory, mechanical job estimation
- Payroll statutory filing
- Native mobile apps in app stores (PWA only)
- Loyalty points, referral engines, gamification
- Automatic number-plate recognition from photographs

### 8.2 In scope / out of scope boundary

| In                                              | Out                                      |
| ----------------------------------------------- | ---------------------------------------- |
| Wash, detailing and add-on services             | Mechanical repair, spare parts           |
| Cash, card-terminal capture, package redemption | Payment processing itself (no acquiring) |
| Staff attendance and commission                 | Statutory EPF/ETF submission             |
| Consumable issue tracking                       | Purchase orders and supplier ledgers     |
| Data export for the accountant                  | Bookkeeping and financial statements     |

---

## 9. Epics and user stories

Story format: **As a `<role>`, I want `<capability>`, so that `<benefit>`.**
Acceptance criteria are written Given / When / Then and are intended to be used directly as test cases.

Priority: **M** = Must, **S** = Should, **C** = Could. Release: **M1** = pilot, **M2** = launch, **M3** = post-launch.

---

### EPIC 1 — Vehicle intake

_Goal: no vehicle is worked on before it exists in the system. This epic is the product. Everything else is downstream._

#### US-1.1 — Fast intake `M` `M1`

As a supervisor, I want to record an arriving vehicle in under 20 seconds, so that recording never slows the gate down.

- **AC1** Given the intake screen is open, when I enter a plate number and select a vehicle class and one service, then a Save control is enabled and no other field is mandatory.
- **AC2** Given I save, when the ticket is created, then the screen resets to a blank intake within 1 second, ready for the next vehicle.
- **AC3** Given I am mid-entry, when I leave the screen and return within 10 minutes, then my partial entry is restored.
- **AC4** The median time from screen open to save, measured over the pilot, is 20 seconds or less.

#### US-1.2 — Plate recognition of returning vehicles `M` `M1`

As a supervisor, I want a returning vehicle to be recognised from its plate, so that I do not re-enter the customer.

- **AC1** Given a plate that exists, when I finish typing it, then the customer name, vehicle class, last visit date and last services are shown.
- **AC2** Given a recognised vehicle, when I create the ticket, then the vehicle class is pre-filled and the last service set is offered as a one-tap repeat.
- **AC3** Given a recognised vehicle with an active package, then the package and its remaining balance are shown prominently at intake.
- **AC4** Plate matching is case-insensitive and ignores spaces and hyphens, so `CAB 1234`, `cab-1234` and `CAB1234` match the same vehicle.

#### US-1.3 — Vehicle class drives price `M` `M1`

As a supervisor, I want the price to appear automatically once class and service are chosen, so that prices do not vary by who is on the gate.

- **AC1** Given a class and a service, when both are selected, then the price from the active price list is displayed without being typed.
- **AC2** Given a service is not offered for a class, then that service is not selectable for that class.
- **AC3** Given several services, then a running total is displayed and updates on every change.

#### US-1.4 — Price override with accountability `M` `M1`

As an owner, I want every price change to be recorded against a named person and a reason, so that discounting is visible.

- **AC1** Given a resolved price, when a user changes it, then a reason must be selected from a configured list or typed, before the ticket can be saved.
- **AC2** Given an override is saved, then the ticket stores list price, final price, variance, the user, the reason and the timestamp.
- **AC3** Given a user whose role does not permit overrides, then the price field is read-only.
- **AC4** Given an override beyond a configured percentage, then an alert is included in the owner's daily summary.

#### US-1.5 — Intake photographs `M` `M1`

As an owner, I want photographs of the vehicle taken at intake, so that damage claims can be settled with evidence.

- **AC1** Given the intake screen, when I tap the camera control, then I can capture up to 6 photographs, held against the ticket.
- **AC2** Photographs are stamped with date, time, ticket number and plate.
- **AC3** Given no network, then photographs are stored locally and uploaded when connectivity returns, and the ticket is still saveable.
- **AC4** Photographs are compressed to a maximum of 1600px on the long edge before upload.
- **AC5** Given the site has configured photographs as mandatory, then the ticket cannot be saved without at least one.

#### US-1.6 — Capture the customer's mobile number `M` `M1`

As an owner, I want a mobile number captured for as many vehicles as possible, so that I can contact customers later.

- **AC1** The number field is optional but focused by default for a new vehicle.
- **AC2** Given a Sri Lankan mobile number is entered, then it is validated and normalised to `+947XXXXXXXX`.
- **AC3** The daily summary reports the percentage of the day's tickets that carry a mobile number.

#### US-1.7 — Walk-in without a plate `S` `M2`

As a supervisor, I want to record a job for a vehicle with an unreadable or absent plate, so that intake is never blocked.

- **AC1** Given no plate, when I mark the ticket as "no plate", then a temporary reference is generated and the ticket proceeds.
- **AC2** Such tickets are flagged in the daily summary count.

---

### EPIC 2 — Service catalogue and pricing

#### US-2.1 — Owner maintains the price grid `M` `M1`

As an owner, I want to set prices for each service and vehicle class myself, so that I never depend on the vendor to change a price.

- **AC1** The price list is presented as an editable grid of services × vehicle classes.
- **AC2** A cell may be left empty to mean "not offered for this class".
- **AC3** Saving creates a new price list version with an effective date; existing tickets keep the price that applied when they were created.
- **AC4** Price list changes are written to the audit log with the user and timestamp.

#### US-2.2 — Vehicle classes are configurable `M` `M1`

As an owner, I want to define my own vehicle classes, so that the system matches how I actually price.

- **AC1** Default classes are provided: Motorcycle, Three-wheeler, Car (small), Car (large), SUV/Cab, Van, Lorry.
- **AC2** Classes can be renamed, reordered, added and deactivated. Deactivating never deletes history.

#### US-2.3 — Service duration and bay requirement `S` `M2`

As a supervisor, I want each service to carry an expected duration, so that I can tell a customer how long it will take.

- **AC1** Each service holds an expected minutes value per vehicle class.
- **AC2** At intake, the sum of expected durations plus current queue depth produces an estimated ready time, displayed and printable on the intake slip.

#### US-2.4 — Add-ons at any point `S` `M2`

As a supervisor, I want to add a service to an open ticket, so that upsells during the wash are captured.

- **AC1** Given a ticket in progress, when a service is added, then the total recalculates and the change is logged with user and time.
- **AC2** Given a ticket already billed, then services cannot be added; a new ticket is required.

---

### EPIC 3 — Job ticket lifecycle, bays and queue

#### US-3.1 — Ticket states `M` `M1`

As a supervisor, I want each ticket to move through clear states, so that everyone knows what is happening to which vehicle.

- **AC1** A ticket is always in exactly one of: `DRAFT`, `QUEUED`, `IN_PROGRESS`, `FINISHING`, `READY`, `BILLED`, `CLOSED`, `VOID`.
- **AC2** Only the transitions in the state machine in Section 12 are permitted; an invalid transition is rejected with a message naming the current state.
- **AC3** Every transition records who made it and when.
- **AC4** A ticket may only be voided by a manager or owner, requires a reason, and remains visible in all reports as voided.

#### US-3.2 — Assign staff to a job `M` `M1`

As a supervisor, I want to assign one or more staff to a ticket, so that commission and accountability are attributable.

- **AC1** One or more active staff may be assigned; assignment may change while the ticket is open, and history is retained.
- **AC2** Given multiple staff on one ticket, then commission is split according to the configured rule (equal by default; per-service weighting configurable).
- **AC3** A ticket cannot reach `READY` with no staff assigned.

#### US-3.3 — Bay occupancy `S` `M2`

As a supervisor, I want to see which bay each vehicle is in, so that I can allocate the next arrival.

- **AC1** Bays are configurable per site with a name and a type.
- **AC2** A ticket in `IN_PROGRESS` may occupy exactly one bay; a bay may hold one ticket.
- **AC3** The queue board shows bays, occupants, elapsed time, and the waiting queue in arrival order.

#### US-3.4 — Queue board on a screen `S` `M2`

As a customer, I want to see where my vehicle is in the queue, so that I stop asking staff.

- **AC1** A read-only board view shows plate (partially masked), status and estimated ready time.
- **AC2** The board refreshes at least every 30 seconds and is legible from three metres.

#### US-3.5 — Elapsed-time alerting `C` `M3`

As an owner, I want to be alerted when a job takes far longer than expected, so that I can see bottlenecks.

- **AC1** Given a ticket exceeds its expected duration by a configurable percentage, then it is highlighted on the board and counted in the daily summary.

---

### EPIC 4 — Billing, payment and receipts

#### US-4.1 — Bill an open ticket `M` `M1`

As a cashier, I want to bill a completed ticket, so that payment is recorded against the work.

- **AC1** Given a ticket in `READY`, when I bill it, then the total is computed from the services on the ticket at the prices recorded on the ticket.
- **AC2** Payment method must be selected: Cash, Card, Bank transfer, Package redemption, Corporate account, or Split.
- **AC3** Given Split, then multiple methods and amounts are captured and must sum exactly to the total.
- **AC4** On successful billing the ticket moves to `BILLED` and cannot be edited.

#### US-4.2 — Receipt to the customer `M` `M1`

As a customer, I want a receipt, so that I have a record of what I paid.

- **AC1** A receipt can be printed to a 58mm or 80mm thermal printer.
- **AC2** A receipt can be sent as a WhatsApp message or SMS where a mobile number exists.
- **AC3** The receipt shows site name, ticket number, date/time, plate, services, unit prices, discount if any, total, payment method and staff.

#### US-4.3 — Gazette-format tax invoice `C` `M3`

As a VAT-registered owner, I want to issue an invoice in the prescribed format, so that my corporate customers can claim input tax.

- **AC1** Given the site is configured as VAT-registered with a TIN, then a tax invoice can be issued for a ticket.
- **AC2** The invoice carries the title TAX INVOICE, supplier and purchaser TIN, name and address, a serial number in the form `YYMMM_QQQQ_XXXXX` with no spaces and at most 40 characters, invoice date, supply date, and net / VAT / gross shown separately in LKR to two decimals.
- **AC3** Serial numbers are strictly sequential per branch identifier and per month, and gaps are detected and reported.
- **AC4** A credit note references the original invoice number and follows the same format rules.

#### US-4.4 — Corporate account billing `S` `M2`

As an owner, I want to serve fleet customers on account, so that I can win corporate business.

- **AC1** A customer may be flagged as a corporate account with a credit limit.
- **AC2** Tickets for that customer may be billed to account without cash.
- **AC3** A monthly statement per corporate account lists every ticket with plate, date, services and amount, and can be exported to PDF or XLSX.
- **AC4** Given the outstanding balance exceeds the credit limit, then a warning is shown at intake.

---

### EPIC 5 — Cash control and daily close

_This epic is the commercial heart of the product._

#### US-5.1 — Day close `M` `M1`

As a cashier, I want to close the day, so that cash is reconciled against work done.

- **AC1** The close screen shows: vehicles served, gross billed, breakdown by payment method, package redemptions at zero cash, petty-cash outflows, and **expected cash in hand**.
- **AC2** The user enters counted cash. The system computes and displays the variance.
- **AC3** Given a non-zero variance, then a note is mandatory before the close can be submitted.
- **AC4** A closed day cannot be edited. A correction is a new adjustment entry referencing the closed day, visible in reports.
- **AC5** Any ticket still open at close is listed and must be resolved — completed, voided, or explicitly carried to the next day.

#### US-5.2 — Petty cash out `M` `M1`

As a cashier, I want to record money taken from the box for expenses, so that the day still balances.

- **AC1** An outflow requires an amount, a category and a note; a photograph of the bill is optional.
- **AC2** Outflows appear in the close computation and in the owner summary.

#### US-5.3 — Owner daily summary `M` `M1`

As an owner, I want the day's figures pushed to me, so that I do not have to ask anyone.

- **AC1** At a configurable time, a summary is delivered by WhatsApp (or SMS fallback) and is available in the app.
- **AC2** The summary contains: vehicle count, gross revenue, cash expected, cash counted, variance, top three services, discount total, void count, tickets without a mobile number, and any exception flags.
- **AC3** Delivery failures are retried and surfaced in-app.

#### US-5.4 — Exception flags `M` `M1`

As an owner, I want unusual events highlighted rather than buried, so that I look at the right things.

- **AC1** Flags are raised for: cash variance over a threshold, discount over a threshold, voided tickets, tickets edited after completion, days closed late, and a vehicle count materially below the trailing average.
- **AC2** Thresholds are configurable per site.

#### US-5.5 — Period reporting `S` `M2`

As an owner, I want weekly and monthly figures, so that I can see trends and give my accountant clean numbers.

- **AC1** Revenue by day, by service, by vehicle class, by staff member, and by payment method, over a selectable date range.
- **AC2** Export to XLSX and PDF.

---

### EPIC 6 — Customers, vehicles and recall

#### US-6.1 — Vehicle-centred customer record `M` `M1`

As an owner, I want a record per vehicle with its full history, so that I know my customers.

- **AC1** A vehicle record holds plate, class, make/model (optional), colour (optional), owner name, mobile, and every ticket in date order.
- **AC2** One customer may hold several vehicles; one vehicle may change owner, and history is preserved with the change recorded.

#### US-6.2 — Lapsed-customer list `S` `M2`

As an owner, I want to see customers who have stopped coming, so that I can bring them back.

- **AC1** A list of vehicles whose last visit exceeds a configurable interval (default: 1.5 × that vehicle's own average interval, minimum 30 days).
- **AC2** The list is sortable by lifetime value and by days since last visit.
- **AC3** Each row offers a one-tap WhatsApp message using a configurable template with merge fields for name, plate and last service.

#### US-6.3 — Message templates and consent `S` `M2`

As an owner, I want to send messages that look professional and lawful, so that customers are not annoyed.

- **AC1** Templates are editable per site, in Sinhala, Tamil and English.
- **AC2** A customer can be marked as opted out; opted-out customers are excluded from all outbound marketing and this cannot be overridden in the UI.
- **AC3** The system records when each message was sent to whom, and prevents the same template being sent to the same customer within a configurable cooling period (default 14 days).

#### US-6.4 — Vehicle-ready notification `C` `M3`

As a customer, I want to be told when my vehicle is ready, so that I do not wait on site.

- **AC1** Given a ticket moves to `READY` and a mobile number exists, then a message is sent automatically if the site has enabled it.

---

### EPIC 7 — Packages, plans and prepayment

#### US-7.1 — Sell a wash package `S` `M2`

As an owner, I want to sell prepaid packages, so that I take cash up front and lock in repeat visits.

- **AC1** A package is defined as: name, price, entitlement (a count of a specific service, or a rupee value), validity period, and applicable vehicle classes.
- **AC2** Selling a package creates a customer balance and takes payment immediately; the sale appears in the day's cash but is recognised separately from service revenue.
- **AC3** Package sale and every redemption are recorded against the vehicle.

#### US-7.2 — Redeem at intake `S` `M2`

As a supervisor, I want the package to be applied automatically, so that redemption is not a manual decision.

- **AC1** Given a vehicle with an active package covering the selected service, then redemption is offered by default at intake and the ticket total reduces accordingly.
- **AC2** The remaining balance after redemption is shown to the customer on the receipt.
- **AC3** Redemption cannot take a balance below zero; the excess is charged as normal.

#### US-7.3 — Monthly plan `C` `M3`

As an owner, I want to sell an unlimited or capped monthly wash plan, so that I have recurring revenue.

- **AC1** A plan defines a monthly price, an included service, and a maximum number of visits per month.
- **AC2** Plans renew manually in v1 — a renewal-due list is produced; no automatic card charging.

#### US-7.4 — Liability visibility `S` `M2`

As an owner, I want to see what I owe in unredeemed packages, so that prepayment does not hide a problem.

- **AC1** A report shows total unredeemed package value and count, ageing by month sold, and value expiring in the next 30 days.

---

### EPIC 8 — Staff, attendance and commission

#### US-8.1 — Staff register `M` `M1`

As a supervisor, I want to add and deactivate staff quickly, so that high turnover does not break the system.

- **AC1** A staff record requires name and role; mobile, NIC and daily rate are optional.
- **AC2** Deactivation preserves all history and removes the person from assignment lists.

#### US-8.2 — Attendance marking `M` `M1`

As a supervisor, I want to mark who is present each day, so that wages are computed on real attendance.

- **AC1** A day view lists active staff with Present / Half day / Absent, markable in one tap each.
- **AC2** Attendance is markable offline and syncs later.
- **AC3** Attendance for a past day may be corrected by a manager, and the correction is logged.

#### US-8.3 — Commission calculation `M` `M1`

As a washer, I want to see my job count and earnings, so that I do not have to argue at the end of the week.

- **AC1** Commission is configurable as a percentage of ticket value, or a fixed amount per service, per vehicle class.
- **AC2** A staff member can view his own completed jobs and accrued commission for the current period.
- **AC3** Where several staff worked one ticket, the split rule applies and each share is visible.

#### US-8.4 — Weekly wage sheet `M` `M1`

As an owner, I want a wage sheet, so that paying staff takes minutes and is defensible.

- **AC1** For a selected period: per person, days present, daily wage due, jobs completed, commission due, advances taken, net payable.
- **AC2** Printable and exportable.

#### US-8.5 — Advances `S` `M2`

As an owner, I want advances recorded and recovered automatically, so that I stop losing money to forgotten advances.

- **AC1** An advance is recorded against a staff member with amount, date and note.
- **AC2** Outstanding advances are deducted on the wage sheet according to a configurable recovery rule, and the remaining balance carries forward.

---

### EPIC 9 — Consumables

#### US-9.1 — Issue stock to a bay `S` `M2`

As a supervisor, I want to record chemicals issued, so that usage can be checked against work done.

- **AC1** Consumable items are defined with a unit and a standard dose per service per vehicle class.
- **AC2** Issues are recorded with item, quantity, bay and date.

#### US-9.2 — Usage variance `S` `M2`

As an owner, I want to see expected versus actual consumption, so that shrinkage is visible.

- **AC1** For a period, expected usage is computed from completed tickets × standard dose, and compared with recorded issues.
- **AC2** Variance beyond a configurable percentage raises an exception flag in the summary.

---

### EPIC 10 — Access, audit and administration

#### US-10.1 — Roles `M` `M1`

As an owner, I want each person to see only what their job needs, so that data is safe and the app stays simple.

- **AC1** Roles: Owner, Manager, Cashier, Supervisor, Staff, Read-only.
- **AC2** The permission matrix in Section 13 is enforced server-side, not only in the UI.
- **AC3** Only Owner may change the price list, commission rules, thresholds and user roles.

#### US-10.2 — Audit log `M` `M1`

As an owner, I want an unchangeable record of sensitive actions, so that disputes can be settled with facts.

- **AC1** Logged actions: ticket create/edit/void, price override, payment edit, day close, price list change, package adjustment, user/role change, staff deactivation, attendance correction.
- **AC2** Each entry holds actor, action, entity, before/after values, timestamp and device.
- **AC3** The log is append-only and cannot be edited or deleted from any interface, including by the Owner role.

#### US-10.3 — PIN sign-in on shared devices `M` `M1`

As a supervisor, I want to sign in quickly on a shared phone or tablet, so that the counter is not slowed down.

- **AC1** A user signs in with a 4–6 digit PIN on a device already enrolled to the site.
- **AC2** Sessions expire after a configurable idle period, default 30 minutes.
- **AC3** Device enrolment requires an Owner or Manager credential.

#### US-10.4 — Site setup wizard `M` `M1`

As an owner, I want to set the system up myself in under 30 minutes, so that I am not dependent on the vendor.

- **AC1** The wizard collects site details, vehicle classes, services, the price grid, bays, staff and roles.
- **AC2** A starter price grid is pre-filled with common Sri Lankan services and can be edited or discarded.
- **AC3** Setup progress is saved and resumable.

---

### EPIC 11 — Platform behaviour

#### US-11.1 — Offline intake `M` `M1`

As a supervisor, I want to keep taking vehicles in when the internet is down, so that the business never stops.

- **AC1** Intake, ticket state changes, staff assignment, attendance and photo capture all work with no connectivity.
- **AC2** Queued actions sync automatically when connectivity returns, in the order performed.
- **AC3** The UI always shows a clear online/offline indicator and a count of unsynced items.
- **AC4** Ticket numbers issued offline never collide across devices.
- **AC5** Billing and day close **require** connectivity in v1, and this is stated in the UI. (Rationale: cash reconciliation must not be reconstructed from conflicting offline states.)

#### US-11.2 — Conflict handling `M` `M1`

As a user, I want the system to resolve conflicting edits predictably, so that data is not silently lost.

- **AC1** Ticket state transitions apply last-write-wins on the server with the full transition history retained.
- **AC2** Given a conflicting transition, then the losing action is recorded in the audit log and surfaced to a Manager for review.

#### US-11.3 — Language `M` `M1`

As a washer, I want the app in Sinhala, so that I can use it without help.

- **AC1** Sinhala and English are selectable per user, not per site.
- **AC2** All operational screens (intake, job, attendance) are fully translated. Reports may remain English in M1.
- **AC3** Tamil is added in M2.

#### US-11.4 — Low-end device performance `M` `M1`

As a supervisor, I want the app to work on the phone I already have, so that no hardware purchase is required.

- **AC1** The app is usable on a 3GB-RAM Android device on Chrome, and on a 3G connection.
- **AC2** First contentful paint on a repeat visit is under 2 seconds on that device class.
- **AC3** Installable as a PWA with a home-screen icon.

---

## 10. Key user journeys

### 10.1 Busy Saturday intake — the critical path

1. Vehicle stops at the gate. Supervisor opens the app already on the intake screen.
2. Types `CAB1234`. System recognises the vehicle: _Rasika Perera · Car (large) · last visit 9 Aug · Full wash · **Package: 4 washes remaining**_.
3. Taps **Repeat last**. Services and price populate. Package redemption is pre-selected.
4. Taps camera, takes two photos of the vehicle. (Or skips, if photos are optional for this site.)
5. Taps **Save**. Ticket `#0412` created in `QUEUED`. Slip prints with the estimated ready time.
6. Screen resets. Next vehicle. **Elapsed: 14 seconds.**

### 10.2 Job execution

1. Supervisor opens the queue board, drags `#0412` to Bay 2, assigns Kasun and Ravi. Ticket → `IN_PROGRESS`.
2. Kasun opens his own view, sees `#0412` assigned to him.
3. Customer asks for tyre polish. Supervisor adds the service; total updates; change is logged.
4. Work finishes. Supervisor marks `FINISHING`, then after a quality check, `READY`. Customer receives a WhatsApp: _your vehicle is ready_.

### 10.3 Payment

1. Customer comes to the counter. Cashier opens `#0412`.
2. Package covers the full wash; the tyre polish is chargeable. Balance due Rs. 600.
3. Cashier takes cash, records it, ticket → `BILLED`. Receipt printed and sent on WhatsApp; the package balance is now 3.

### 10.4 Day close

1. 7:00pm. Cashier opens Close. Screen: **62 vehicles · Rs. 138,400 gross · Rs. 96,200 cash expected** · Rs. 32,000 card · Rs. 10,200 redeemed from packages · Rs. 3,500 petty cash out.
2. She counts Rs. 95,700 and enters it. Variance: **-Rs. 500**. A note is mandatory: _"Rs.500 change shortfall, Bay 1 customer, will confirm tomorrow."_
3. Submits. The day locks.
4. 7:05pm. Nuwan's phone: the day's summary, plus one flag — _discount of 22% on ticket #0389 by Sanjeewa, reason: regular customer._

### 10.5 Weekly pay run

1. Monday. Owner opens the wage sheet for the past week.
2. Per person: days present, jobs completed, commission, advances outstanding, net payable.
3. Prints it, pays, marks it paid. Advance balances update.

---

## 11. Domain model

### 11.1 Entity relationships

```
Site ─┬─< Bay
      ├─< User ──< AuditEntry
      ├─< Staff ─┬─< Attendance
      │          ├─< Advance
      │          └─< TicketStaff
      ├─< VehicleClass ─┬─< PriceListItem
      ├─< Service ──────┘
      ├─< PriceList ────< PriceListItem
      ├─< Consumable ──< ConsumableIssue
      ├─< Package ─────< CustomerPackage ──< PackageRedemption
      ├─< Customer ────< Vehicle ──< Ticket
      └─< BusinessDay ─< Ticket
                         ├─< TicketService
                         ├─< TicketStaff
                         ├─< TicketPhoto
                         ├─< TicketStateChange
                         └─< Payment
```

### 11.2 Core entities

**Site** — `id, name, address, phone, timezone, currency, vat_registered, tin, branch_code, summary_time, photo_required, thresholds{cash_variance, discount_pct, consumable_variance}, created_at`

**Vehicle** — `id, site_id, plate_normalised (unique per site), plate_display, vehicle_class_id, make, model, colour, customer_id, first_seen_at, last_seen_at, visit_count, lifetime_value, avg_interval_days`
_`plate_normalised` is uppercase with all non-alphanumerics removed. All lookup uses this field._

**Customer** — `id, site_id, name, mobile_e164, is_corporate, credit_limit, marketing_opt_out, notes, created_at`

**Ticket** — `id, site_id, business_day_id, ticket_no, vehicle_id, customer_id, vehicle_class_id, state, list_total, discount_total, final_total, tax_total, bay_id, queued_at, started_at, ready_at, billed_at, closed_at, created_by, notes`

**TicketService** — `id, ticket_id, service_id, list_price, final_price, override_reason, overridden_by, expected_minutes, added_at`

**TicketStaff** — `id, ticket_id, staff_id, assigned_at, unassigned_at, commission_share, commission_amount`

**TicketPhoto** — `id, ticket_id, phase (INTAKE|COMPLETION), storage_key, captured_at, uploaded_at, device_id`

**TicketStateChange** — `id, ticket_id, from_state, to_state, changed_by, changed_at, device_id, reason`

**Payment** — `id, ticket_id, method, amount, reference, taken_by, taken_at`

**BusinessDay** — `id, site_id, date, opened_at, closed_at, closed_by, expected_cash, counted_cash, variance, variance_note, is_locked`

**CashMovement** — `id, business_day_id, direction (IN|OUT), amount, category, note, photo_key, recorded_by, recorded_at`

**PriceList / PriceListItem** — `price_list: id, site_id, version, effective_from, created_by` · `item: id, price_list_id, service_id, vehicle_class_id, price, is_offered`

**Package / CustomerPackage / PackageRedemption** —
`package: id, site_id, name, price, entitlement_type (COUNT|VALUE), entitlement_qty, service_id, validity_days, applicable_classes[]`
`customer_package: id, customer_id, vehicle_id, package_id, purchased_at, expires_at, balance_qty, balance_value, status`
`redemption: id, customer_package_id, ticket_id, qty_used, value_used, redeemed_at`

**Staff / Attendance / Advance** —
`staff: id, site_id, name, mobile, nic, role, daily_rate, commission_rule_id, is_active`
`attendance: id, staff_id, date, status (PRESENT|HALF|ABSENT), marked_by, marked_at, corrected_by, corrected_at`
`advance: id, staff_id, amount, date, note, outstanding_balance`

**AuditEntry** — `id, site_id, actor_user_id, action, entity_type, entity_id, before_json, after_json, device_id, created_at`
_Append-only. No update or delete path may exist in the application or the API._

### 11.3 Derived values

| Value                       | Derivation                                                                      |
| --------------------------- | ------------------------------------------------------------------------------- |
| `Vehicle.avg_interval_days` | Mean days between consecutive tickets for that vehicle, over the last 6 visits  |
| Lapsed                      | `now - last_seen_at > max(30, 1.5 × avg_interval_days)`                         |
| Expected cash               | `Σ cash payments + Σ CashMovement IN − Σ CashMovement OUT` for the business day |
| Commission per ticket       | Per commission rule, split across `TicketStaff` by `commission_share`           |
| Expected consumable usage   | `Σ over completed tickets (standard_dose[service][class])`                      |

---

## 12. State machine — Ticket

```
                    ┌──────────────────────────────────────────┐
                    │                                          │
   [create]         ▼                                          │
  ──────────► DRAFT ──save──► QUEUED ──assign──► IN_PROGRESS ──►│
                 │              │                    │          │
                 │              │                    ▼          │
                 │              │                FINISHING      │
                 │              │                    │          │
                 │              │                    ▼          │
                 │              └────────────────► READY        │
                 │                                   │          │
                 │                                   ▼          │
                 │                                BILLED ───► CLOSED
                 │                                   │
                 └──────────────► VOID ◄─────────────┘
                                (Manager/Owner only, reason required)
```

| From                        | To            | Guard                                                              |
| --------------------------- | ------------- | ------------------------------------------------------------------ |
| `DRAFT`                     | `QUEUED`      | Plate or no-plate flag, class, ≥1 service, photo if site requires  |
| `QUEUED`                    | `IN_PROGRESS` | ≥1 staff assigned; bay free if bays are enabled                    |
| `IN_PROGRESS`               | `FINISHING`   | —                                                                  |
| `IN_PROGRESS` / `FINISHING` | `READY`       | ≥1 staff assigned throughout                                       |
| `READY`                     | `BILLED`      | Payment(s) sum exactly to `final_total`; connectivity present      |
| `BILLED`                    | `CLOSED`      | Business day close                                                 |
| Any except `CLOSED`         | `VOID`        | Manager or Owner role, reason required                             |
| `BILLED`                    | _(edit)_      | **Not permitted.** Correction is an adjustment on the business day |

---

## 13. Business rules

| ID    | Rule                                                                                                                                 |
| ----- | ------------------------------------------------------------------------------------------------------------------------------------ |
| BR-01 | A ticket must exist before work begins. Enforced procedurally, reinforced by the queue board showing only ticketed vehicles.         |
| BR-02 | Prices are always resolved from the active price list. Manual entry of a price is an override and is always logged.                  |
| BR-03 | A ticket records both list price and final price. The difference is discount, and it is reported.                                    |
| BR-04 | A billed ticket is immutable. Corrections are adjustments, never edits.                                                              |
| BR-05 | A business day cannot close with tickets in a pre-`BILLED` state unless each is explicitly voided or carried forward.                |
| BR-06 | A non-zero cash variance requires a note. No exceptions, no role bypass.                                                             |
| BR-07 | The audit log is append-only for every role including Owner.                                                                         |
| BR-08 | Package redemption may not reduce a balance below zero.                                                                              |
| BR-09 | Customers marked opted-out receive no marketing message, and the UI provides no override.                                            |
| BR-10 | Price list changes are versioned. A ticket keeps the prices in force when it was created.                                            |
| BR-11 | Plate matching is on the normalised plate — uppercase, alphanumeric only.                                                            |
| BR-12 | Commission accrues only on tickets that reach `BILLED`. Voided tickets earn nothing.                                                 |
| BR-13 | Ticket numbers are unique per site per business day and never reused, including after a void.                                        |
| BR-14 | Where VAT invoicing is enabled, invoice serial numbers are sequential per branch code per month, and gaps are detected and reported. |
| BR-15 | Deactivating a staff member, service, class or customer never deletes historical records.                                            |
| BR-16 | Photographs are retained for a configurable period, default 90 days, then purged unless the ticket is flagged as disputed.           |

### 13.1 Permission matrix

| Action                 | Owner | Manager | Cashier | Supervisor | Staff | Read-only |
| ---------------------- | :---: | :-----: | :-----: | :--------: | :---: | :-------: |
| Create ticket          |   ✔   |    ✔    |    ✔    |     ✔      |   —   |     —     |
| Override price         |   ✔   |    ✔    |    —    |     ✔*     |   —   |     —     |
| Assign staff           |   ✔   |    ✔    |    —    |     ✔      |   —   |     —     |
| Change own job state   |   ✔   |    ✔    |    —    |     ✔      |   ✔   |     —     |
| Bill ticket            |   ✔   |    ✔    |    ✔    |     ✔      |   —   |     —     |
| Void ticket            |   ✔   |    ✔    |    —    |     —      |   —   |     —     |
| Record petty cash      |   ✔   |    ✔    |    ✔    |     —      |   —   |     —     |
| Close day              |   ✔   |    ✔    |    ✔    |     —      |   —   |     —     |
| Edit price list        |   ✔   |    —    |    —    |     —      |   —   |     —     |
| Manage users & roles   |   ✔   |    —    |    —    |     —      |   —   |     —     |
| Set thresholds & rules |   ✔   |    —    |    —    |     —      |   —   |     —     |
| View reports           |   ✔   |    ✔    |    —    |     —      |   —   |     ✔     |
| View own commission    |   ✔   |    ✔    |    ✔    |     ✔      |   ✔   |     —     |
| View audit log         |   ✔   |    ✔    |    —    |     —      |   —   |     —     |

\* Supervisor override permission is a per-site setting, default off, and is subject to the configured discount ceiling.

---

## 14. Reporting specification

| Report              | Audience       | Contents                                                                                             | Delivery               |
| ------------------- | -------------- | ---------------------------------------------------------------------------------------------------- | ---------------------- |
| Daily summary       | Owner          | Vehicles, gross, by payment method, expected vs counted cash, variance, discounts, voids, exceptions | WhatsApp push + in-app |
| Day book            | Manager        | Every ticket for a day: number, time, plate, class, services, staff, total, method                   | In-app, PDF, XLSX      |
| Revenue analysis    | Owner          | By day / service / class / staff / method over a range, with period-on-period change                 | In-app, XLSX           |
| Staff performance   | Owner          | Jobs completed, revenue generated, average ticket, commission earned, per person                     | In-app, PDF            |
| Wage sheet          | Owner          | Days present, wage, jobs, commission, advances, net payable                                          | PDF print              |
| Customer value      | Owner          | Top customers by lifetime value; visit frequency distribution                                        | In-app, XLSX           |
| Lapsed customers    | Owner          | Vehicles past their expected return interval, with contact actions                                   | In-app, actionable     |
| Package liability   | Owner          | Unredeemed value, ageing, expiring soon                                                              | In-app, XLSX           |
| Consumable variance | Owner          | Expected vs issued, per item, per period                                                             | In-app                 |
| Audit trail         | Owner, Manager | Filterable by actor, action, entity, date                                                            | In-app, CSV            |
| Corporate statement | Owner          | Per account, monthly, itemised by ticket                                                             | PDF, XLSX              |

---

## 15. Non-functional requirements

| ID     | Category       | Requirement                                                                                                                                                                                                                                                                                                 |
| ------ | -------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| NFR-01 | Performance    | Intake screen interactive within 2s on a 3GB-RAM Android over 3G; ticket save acknowledged locally within 300ms                                                                                                                                                                                             |
| NFR-02 | Offline        | Intake, job state, staff assignment, attendance and photo capture fully functional offline for at least 24 hours of typical volume                                                                                                                                                                          |
| NFR-03 | Sync           | Queued offline actions sync within 60s of connectivity returning; ordering preserved                                                                                                                                                                                                                        |
| NFR-04 | Availability   | 99.5% monthly for the hosted service; offline mode covers short outages at the site                                                                                                                                                                                                                         |
| NFR-05 | Device         | Android Chrome 100+ and iOS Safari 15+; installable PWA; usable one-handed on a 5.5" screen                                                                                                                                                                                                                 |
| NFR-06 | Localisation   | Sinhala and English at launch, Tamil in M2. Sinhala rendering verified on low-end Android. LKR formatting with thousands separators throughout                                                                                                                                                              |
| NFR-07 | Security       | Transport encryption; PIN sign-in with server-side role enforcement; per-site data isolation; secrets never in client code                                                                                                                                                                                  |
| NFR-08 | Data retention | Photographs default 90 days; transactional records retained indefinitely; owner-initiated full export at any time in XLSX and CSV                                                                                                                                                                           |
| NFR-09 | Backup         | Daily automated backup, 30-day retention, restore tested before the first paying customer                                                                                                                                                                                                                   |
| NFR-10 | Privacy        | Customer mobile numbers used only for that site's own service and marketing messages; opt-out honoured permanently; no cross-site data sharing. Sri Lanka's Personal Data Protection Act is only partially in force, but build to its shape now — consent, access, erasure — rather than retrofitting later |
| NFR-11 | Auditability   | Every state and money mutation attributable to a user, device and timestamp                                                                                                                                                                                                                                 |
| NFR-12 | Accessibility  | Minimum 16px body text, 44px touch targets, contrast sufficient for outdoor daylight reading                                                                                                                                                                                                                |
| NFR-13 | Print          | Support 58mm and 80mm thermal printers over Bluetooth and USB; graceful fallback to a shareable PDF                                                                                                                                                                                                         |
| NFR-14 | Support        | In-app WhatsApp support link; every screen identifiable by a short code for support conversations                                                                                                                                                                                                           |

---

## 16. Integrations

| Integration        | Purpose                                                      | Approach                                                                                                                                                                     | Release |
| ------------------ | ------------------------------------------------------------ | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------- |
| WhatsApp           | Daily summary, receipts, recall messages, ready notification | Start with `wa.me` deep links (zero cost, manual send) in M1; move to WhatsApp Cloud API with approved templates in M2 once volume justifies it                              | M1 / M2 |
| SMS                | Fallback when WhatsApp is unavailable                        | Local SMS gateway aggregator                                                                                                                                                 | M2      |
| Thermal printer    | Receipts, intake slips, wage sheets                          | Web Bluetooth / ESC-POS, with PDF fallback                                                                                                                                   | M1      |
| Payment gateway    | Package and subscription sales online                        | Local PSP (e.g. PayHere) — **for selling WashBook subscriptions and, optionally, customer package purchases. Not for in-lane payment, which stays cash/card-terminal in v1** | M2      |
| Spreadsheet export | Accountant handoff                                           | XLSX and CSV, no integration required                                                                                                                                        | M1      |
| Camera             | Intake photographs                                           | Device camera via the browser file/capture API                                                                                                                               | M1      |

**Deliberately excluded from v1:** fuel forecourt systems, automatic number-plate recognition, accounting package sync, card acquiring.

---

## 17. Assumptions, open questions and dependencies

> Moved to `docs/private/PRD-COMMERCIAL.md`, which is not tracked by git.
> This repository is public; pricing, market analysis, personas, risks and the
> sales playbook are not things to publish. Nothing in the codebase depends on
> this section — the build contract is §9, §11, §12, §13, §15 and §24.

---

## 18. Risks

> Moved to `docs/private/PRD-COMMERCIAL.md`, which is not tracked by git.
> This repository is public; pricing, market analysis, personas, risks and the
> sales playbook are not things to publish. Nothing in the codebase depends on
> this section — the build contract is §9, §11, §12, §13, §15 and §24.

---

## 19. Release plan

### M1 — Pilot (target: 4 weeks) — _prove the core loop_

Epics 1, 2, 4 (except 4.3, 4.4), 5, 8, 10, 11.
The deliverable is: **a vehicle can be ticketed at the gate, worked on, billed, and the day closed and reported to the owner's phone — offline-tolerant, in Sinhala, on a cheap Android phone.**

Explicitly excluded from M1: packages, recall messaging, bays and queue board, consumables, corporate accounts, VAT invoicing.

**Exit criteria**

- 30 consecutive operating days at the pilot site
- Intake capture rate ≥ 95% verified by three unannounced spot checks
- Median intake time ≤ 20 seconds measured from real usage data
- Day close completed on ≥ 90% of operating days
- The owner states in writing that he would pay for it

### M2 — Launch (target: +4 weeks) — _make it sellable and sticky_

Epics 3 (bays and queue board), 6 (customers and recall), 7 (packages), 9 (consumables), 4.4 (corporate accounts), Tamil language, WhatsApp Cloud API.
Plus: self-serve setup wizard hardening, onboarding videos, pricing page, subscription billing.

**Exit criteria:** 5 paying sites, none of them the pilot; support load under 1 hour per site per month.

### M3 — Expansion (target: +8 weeks) — _widen the market_

4.3 (gazette-format VAT invoicing), multi-site consolidated view, monthly plans, ready-notification automation, elapsed-time alerting, licence renewal reminders, simple online booking for detailing.

### Build sequence within M1

1. Data model, auth, roles, site setup — _nothing works without this_
2. Price list grid and vehicle classes — _intake depends on it_
3. Intake screen, offline-first, with photos — **the make-or-break screen; build it early, test it on a real Saturday, iterate before continuing**
4. Ticket lifecycle, staff assignment, job view
5. Billing, payment capture, receipt, printing
6. Business day, petty cash, day close, variance
7. Owner daily summary via WhatsApp deep link
8. Attendance, commission, wage sheet
9. Audit log and reporting
10. Sinhala translation pass and low-end device testing

---

## 20. Technical recommendation

Framed for solo, AI-assisted development. Optimise for one person's ability to change everything quickly, not for scale that does not exist yet.

| Layer         | Recommendation                                                          | Reasoning                                                                                                                                                        |
| ------------- | ----------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Client        | Next.js (App Router) as a PWA                                           | One codebase, installable, no app-store friction, offline-capable                                                                                                |
| Offline store | IndexedDB via Dexie, with an outbox queue for mutations                 | Explicit, debuggable sync — avoid a sync framework whose failure modes you cannot reason about                                                                   |
| Backend & DB  | Supabase (Postgres, Auth, Storage, RLS)                                 | Row-level security enforces per-site isolation at the database, which is the correct place for it. Storage handles photographs. Least infrastructure per feature |
| Auth          | Supabase Auth for Owner/Manager; PIN-to-session for shared-device roles | Matches how the site actually works                                                                                                                              |
| Photos        | Client-side compression, direct-to-Storage upload with signed URLs      | Keeps the server out of the media path                                                                                                                           |
| Messaging     | `wa.me` deep links first; WhatsApp Cloud API in M2                      | Zero cost and zero approval to validate the loop                                                                                                                 |
| Printing      | ESC-POS over Web Bluetooth; PDF fallback                                | Works with printers sites already own                                                                                                                            |
| Hosting       | Vercel + Supabase managed                                               | Near-zero ops for one person                                                                                                                                     |
| Reporting     | Postgres views and materialised views; XLSX via SheetJS                 | Avoid a BI dependency for eleven reports                                                                                                                         |
| Monitoring    | Sentry, plus a per-site health ping                                     | You must know a site is failing before the owner calls                                                                                                           |

**Two decisions worth defending explicitly:**

1. **PWA, not native.** Sri Lankan staff phones are storage-constrained and app installs are friction. A PWA also lets you ship a fix in minutes during a pilot, which matters enormously in week one.
2. **Postgres row-level security rather than application-layer tenancy.** With one developer and an AI assistant generating a lot of code quickly, the database is the only place a tenancy mistake cannot slip through.

---

## 21. Commercials

> Moved to `docs/private/PRD-COMMERCIAL.md`, which is not tracked by git.
> This repository is public; pricing, market analysis, personas, risks and the
> sales playbook are not things to publish. Nothing in the codebase depends on
> this section — the build contract is §9, §11, §12, §13, §15 and §24.

---

## 22. Pilot discovery script

> Moved to `docs/private/PRD-COMMERCIAL.md`, which is not tracked by git.
> This repository is public; pricing, market analysis, personas, risks and the
> sales playbook are not things to publish. Nothing in the codebase depends on
> this section — the build contract is §9, §11, §12, §13, §15 and §24.

---

## 23. Glossary

| Term               | Meaning                                                                       |
| ------------------ | ----------------------------------------------------------------------------- |
| Bay                | A physical washing position                                                   |
| Business day       | An operating day, opened and closed, against which cash is reconciled         |
| Detailing          | Deep cleaning and paint correction, high value, long duration                 |
| Job ticket         | The record of one visit by one vehicle                                        |
| Leakage            | Revenue that reaches the site but not the owner                               |
| Package            | Prepaid entitlement to a number or value of future services                   |
| Plate (normalised) | Uppercase, alphanumeric-only form of a registration number, used for matching |
| PWA                | Progressive web app — a website installable like an app                       |
| Recall             | Contacting a past customer to bring them back                                 |
| Site               | One physical wash location                                                    |
| TIN                | Taxpayer Identification Number, 9 digits                                      |

---

## 24. Appendix A — M1 acceptance checklist

Run this before declaring the pilot live.

- [ ] A vehicle can be ticketed in under 20 seconds, timed, ten times consecutively
- [ ] A returning plate recalls the customer, class and last service
- [ ] A price appears without typing for every service × class combination in the grid
- [ ] An override cannot be saved without a reason, and appears in the daily summary
- [ ] Six photographs attach to a ticket and survive an app restart with no network
- [ ] Airplane mode: ten tickets created, app restarted, all ten sync on reconnection in order
- [ ] Two devices creating tickets offline produce no duplicate ticket numbers
- [ ] A ticket cannot reach READY with no staff assigned
- [ ] Split payment must sum exactly to the total, and is rejected if it does not
- [ ] A billed ticket cannot be edited by any role
- [ ] Day close blocks on an open ticket until it is resolved
- [ ] A non-zero cash variance blocks submission until a note is entered
- [ ] Daily summary reaches the owner's phone at the configured time, and a delivery failure is visible in-app
- [ ] Wage sheet totals reconcile against attendance and billed tickets for the same week
- [ ] Every sensitive action appears in the audit log with before and after values
- [ ] The audit log has no edit or delete path, verified by attempting one as Owner
- [ ] Sinhala renders correctly on the actual device the site will use
- [ ] Receipt prints on the site's own printer
- [ ] A full data export downloads and opens correctly in Excel
- [ ] A backup restore has been performed successfully in a test environment

---

_Prepared 22 August 2026. Figures on vehicle population and registrations are from the Department of Motor Traffic. Operational and pricing figures marked as assumptions must be confirmed at the pilot site before they are used in any sales material._
