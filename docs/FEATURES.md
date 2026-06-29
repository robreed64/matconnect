# MatConnect Features

**Last Updated**: 2026-06-29
**Source**: Verified against codebase (`prisma/schema.prisma`, `src/app/**`, `src/lib/**`)

> This document is verified against the actual code, not marketing copy. Where an
> earlier draft of this file made claims based on marketing copy, those are
> corrected here (see "Corrections to Prior Draft" at the bottom).

---

## ✅ Live Features

### Check-in & Front Desk
- **Self-service kiosk** — tablet check-in with no staff required; new students can sign up and sign waivers on the spot (`src/app/kiosk`, `src/app/kiosk/new`)
- **QR / token check-in** — every member has a personal check-in token / QR code (`src/app/api/member/qr-token`, `src/app/api/checkin`)
- **Walk-in support** — sell to or process non-members at the POS / terminal
- Check-in source tracked per record: `kiosk`, `staff`, `app`

### Member Management
- Full profiles — photo, email, phone, address, date of birth, age group (kids/adult)
- **Family accounts** — parent/child linking (`parentId` self-relation) with **automatic family discount** (configurable %)
- **Belt rank + belt stripes** tracking
- Training type (Gi / No-Gi / Both)
- Status lifecycle: `lead` → `trial` → `active` → `past_due` → `canceled` → `inactive`
- Staff notes, waiver history, attendance history per member
- **At-risk members view** — active members with no check-in for 14/21/30/60 days, sorted by longest absence, showing last automated outreach (`src/app/admin/members/at-risk`). **Rule-based, not ML.**

### Belt Progression & Curriculum
- **Per-rank requirements** — minimum classes, months, and techniques to promote (`BeltRequirement`)
- **Technique progress tracking** per member (`TechniqueProgress`)
- **Curriculum builder** — multi-week lesson plans with warmups, techniques (name/description/video URL), day-of-week, and ordering (`Curriculum`, `CurriculumLesson`)
- Members track their own progress toward the next belt in the portal

### Class Scheduling
- Recurring and one-off classes with instructor assignment and capacity (`Class`, `Program`)
- Program/class types: Gi, No-Gi, Youth, Seminar, Intro, Private (configurable)
- Live rosters
- **Bookings with waitlist** — statuses `booked`, `attended`, `no_show`, `canceled`, `waitlisted`; **automatic waitlist promotion with push notification** (`src/lib/waitlist.ts`)
- Automated class reminders (cron-driven, `src/lib/reminders.ts`)

### Billing & Payments
- **Both Stripe and Square** supported, switchable via `paymentProvider` setting
- Recurring membership subscriptions (`Subscription`, `MembershipPlan`)
- Payment methods: **card on file, new card, cash, and Square Terminal** (in-person card reader, `TerminalCheckout`)
- Failed-payment handling (`past_due` status + `failed_payment` automation trigger)
- **Trials** with configurable trial length and trial-expiry automation
- **Point of Sale** — retail / gear / day passes, barcode scanning, inventory/stock, per-item tax rate, configurable categories, optional cash-drawer sound (`Item`, `Sale`, `SaleLineItem`)
- **Square data import** — migrate customers, subscriptions, and payments from an existing Square account (`src/app/admin/setup/square-import`)

### Marketing & Automation
- **Automation workflows** (`Workflow`, engine in `src/lib/marketing-triggers.ts`) with triggers:
  - `inactivity` (no attendance in N days)
  - `trial_attendance`
  - `trial_expiring`
  - `birthday`
  - `failed_payment`
  - `promotion` (event-driven on belt promotion)
- **Email + SMS delivery** with template variables (e.g. `{name}`, `{days}`) and a cooldown/"recently messaged" guard; runs daily via Vercel cron (`src/app/api/cron/marketing`)
- **Message history** logged per member across channels (`email`, `sms`, `push`, `in_app`)
- **Lead capture widget** — embeddable lead form (`src/app/widget/lead`) feeding a leads pipeline (`src/app/admin/leads`)
- **Self-serve enrollment flow** (`src/app/enroll`)
- Email/SMS powered by Brevo (configurable API key, sender, SMS-from)

### Member Portal (web)
- Profile management with photo upload (`src/app/member/profile`)
- Class schedule + self-booking (`src/app/member/schedule`)
- Attendance history (`src/app/member/attendance`)
- Curriculum view (`src/app/member/curriculum`)
- **Progress page** — current belt, next belt, months training, requirement tracking (classes/months/techniques), technique progress (`src/app/member/progress`)
- Payment-method management (`src/app/api/member/payment-method`, `setup-intent`)
- **Web push notifications** (VAPID / `web-push`) for reminders and waitlist promotions

### Reports & Analytics
- Member counts by status
- **MRR** from active subscriptions × plan price
- POS revenue this month and by category
- Attendance (this month / last 30 days), top attendees
- Belt distribution
- New members by month (6-month trend)
- Recent sales
- **CSV export** (`ExportBar`)

### Admin & Operations
- Staff user accounts (`User`) with roles
- **Feature visibility toggles** — hide modules you don't use (`hiddenFeatures`, `src/app/admin/setup/features`)
- Guided setup wizard (`src/app/admin/setup`, `setupComplete` flag)
- Gym settings: name, logo, contact, waiver text, currency/symbol, locale, timezone, default tax rate
- Configurable belt config, instructor names, program types, POS categories

---

## ❌ Genuine Gaps (verified by absence in code)

| Gap | Notes |
|-----|-------|
| **Multi-location** | Single `GymSettings` row (`id @default(1)`) — single-tenant / single-location |
| **Predictive/ML churn scoring** | Only the rule-based at-risk view exists (attendance gap) |
| **Native mobile app** | Member portal is web; notifications are web-push |
| **Website builder** | No gym-website builder (Gymdesk bundles one) |
| **WOD tracking / leaderboards** | Not built (CrossFit-specific; not relevant unless targeting that vertical) |
| **Event/tournament management** | Not a dedicated module |
| **Payment processors beyond Stripe/Square** | No PayPal, Authorize.net, GoCardless, etc. |

---

## 📊 Corrected Gap Analysis vs. Competitors

| Feature | MatConnect | DojoChamp | Gymdesk | PushPress |
|---------|-----------|-----------|---------|-----------|
| Kiosk check-in | ✅ | ✅ | ✅ | ❌ |
| QR/token check-in | ✅ | ✅ | ✅ | ✅ |
| Member management | ✅ | ✅ | ✅ | ✅ |
| Family accounts + discounts | ✅ | ✅ | ✅ | ➖ |
| Belt progression + requirements | ✅ | ✅ | ✅ | ❌ |
| Curriculum/lesson builder | ✅ | ➖ | ➖ | ➖ |
| Class scheduling + waitlist | ✅ | ✅ | ✅ | ✅ |
| Billing (Stripe **and** Square) | ✅ | ➖ (Stripe/Tilled) | ✅ (multi) | ➖ (Stripe) |
| In-person terminal | ✅ (Square) | ➖ | ✅ | ➖ |
| POS + inventory | ✅ | ✅ | ✅ | ✅ |
| Trials | ✅ | ✅ | ✅ | ✅ |
| Automation workflows (email+SMS) | ✅ | ✅ | ✅ | ✅ (Grow add-on) |
| Lead capture widget + pipeline | ✅ | ✅ | ✅ | ✅ (Grow) |
| Member portal (web) | ✅ | ✅ | ✅ | ✅ |
| Web push notifications | ✅ | ➖ | ➖ | ✅ |
| Reports + CSV export | ✅ | ✅ | ✅ | ✅ |
| At-risk members (rule-based) | ✅ | ✅ (AI) | ❌ | ✅ (AI 2026) |
| **Predictive/ML churn scoring** | ❌ | ✅ | ❌ | ✅ |
| **Multi-location** | ❌ | ❌ | ✅ | ❌ |
| **Website builder** | ❌ | ✅ | ✅ | ➖ |
| **Native mobile app** | ❌ | ✅ | ✅ | ✅ |

Legend: ✅ has it · ➖ partial/limited/unclear · ❌ not present

---

## 🔧 Corrections to Prior Draft

The earlier version of this file was written from marketing copy and contained
factual errors. Corrected against code:

1. **"No member app"** → **WRONG.** A full web member portal exists (profile, schedule, attendance, curriculum, progress, payment methods) plus web push.
2. **"Square only"** → **WRONG.** Both Stripe and Square are supported, plus Square Terminal for in-person payments.
3. **"No waitlist/enrollment controls"** → **WRONG.** Bookings support a `waitlisted` status with automatic promotion + push notification.
4. **"No advanced reporting"** → **WRONG.** Reports include MRR, status breakdown, attendance, belt distribution, new-members-by-month, top attendees, POS by category, and CSV export.
5. **"AI churn prevention" framed as a clean competitor win** → **PARTIALLY WRONG.** MatConnect has a *rule-based* at-risk view today. The real gap is *predictive/ML* scoring, not at-risk visibility entirely.
6. Curriculum builder, lead-capture widget, web push, and trials were omitted entirely — all exist.

---

**Document Version**: 2.0 (code-verified)
