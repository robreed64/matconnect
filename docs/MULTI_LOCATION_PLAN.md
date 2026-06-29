# Multi-Location — Implementation Plan

**Status**: Plan (no code yet)
**Date**: 2026-06-29
**Related**: `docs/ROADMAP.md` (Phase 2), `docs/EXECUTIVE_SUMMARY.md`

> Goal: let one account run multiple locations (academies / affiliates), so the
> app stops being single-location. This is the biggest revenue-expansion unlock
> — chains stuck on Mindbody ($250–500+/**location**) are the wedge — and it is a
> genuine re-architecture, not an additive feature.

---

## 1. Scope decision

Two interpretations exist:

- **(A) Locations under one account** — one owner/org, many sites; shared member
  base, plans, belts, branding; per-site schedule, attendance, POS, staff.
- **(B) Full multi-tenant SaaS** — many independent gyms, each with their own
  data, billing, and (eventually) custom domains.

**This plan covers (A).** It serves academies and most affiliate setups and is
achievable without rebuilding auth/billing. (B) is a larger, separate effort
(see §9) that website-builder custom domains and a multi-gym mobile app would
also need — call it out, don't build it yet.

---

## 2. Current state (single-tenant)

- **`GymSettings` is a singleton** (`id @default(1)`, `getGymSettings()` used in **49 files**). It mixes *org-level* config (brand, payment keys, belt config, trial length) with *location-level* facts (address, phone, timezone).
- **No model has a `locationId`.** Every operational query (schedule, attendance, POS, reports, kiosk) implicitly targets "the one gym."
- **Auth** (`src/auth.ts`, JWT) carries `role` + `memberId`, no location.

---

## 3. Data model changes

### New `Location` model
```
model Location {
  id        Int     @id @default(autoincrement())
  name      String
  address   String?
  phone     String?
  timezone  String  @default("America/New_York")
  active    Boolean @default(true)
  // location-scoped device/payment overrides as needed
  squareTerminalDeviceId String?
  createdAt DateTime @default(now())
}
```

### What is location-scoped vs org-shared

| Scoped to a location (add `locationId`) | Shared across the org (unchanged) |
|---|---|
| `Class` (where/when classes run) | `MembershipPlan` |
| `Attendance` (where checked in) | `Program` |
| `Sale`, `SaleLineItem` (POS) | `BeltRequirement`, `Curriculum`, `CurriculumLesson` |
| `Item` (inventory per site) | `Workflow`, `Message` |
| `TerminalCheckout` (device per site) | `GymSettings` brand/payment/belt config |
| `Booking` (inherits from `Class`) | `Subscription` (membership is org-level) |

- **`Member.homeLocationId Int?`** — a member's primary site (they may still train anywhere; attendance records the actual location).
- **Staff scoping**: `User.locationId Int?` (null = all-locations, e.g. owner/admin) **or** a `UserLocation` join for staff working multiple sites. Recommend the join table for flexibility.
- **Settings split**: keep `GymSettings` as org config; move `address`/`phone`/`timezone` reads to the active `Location` (leave the columns for backward-compat during migration, then deprecate).

---

## 4. Access control & "current location"

- Add a **selected location** to the session/UI for multi-location staff. Store it in a cookie (e.g. `activeLocationId`) read by server components; default to the user's only/home location.
- Admin/owner (`User.locationId = null`) can **switch** locations and see a **rolled-up "All locations"** view in reports.
- Most admin queries gain `where: { locationId: activeLocationId }`. Reports add an "All locations" aggregate path.
- `requireAuth` gains an optional location check; a location-scoped manager can't act on another site.

---

## 5. Migration (the careful part)

1. `prisma migrate` adds `Location`, the `locationId` columns (nullable first), and the staff scoping.
2. **Backfill script** (idempotent): create one `Location` from current `GymSettings` (name/address/phone/timezone); set `locationId` on all existing `Class`, `Attendance`, `Sale`, `Item`, `TerminalCheckout` and `Member.homeLocationId` to that location.
3. Once backfilled, make `locationId` **required** on the scoped operational tables (second migration).
4. Verify counts pre/post; keep the script re-runnable.

---

## 6. UI

- **Location switcher** in `AdminSidebar` header (dropdown; "All locations" for admins in reports).
- **Locations CRUD** under `/admin/setup/locations` (name, address, phone, timezone, terminal device, active).
- **Scope existing screens** to the active location: Schedule, Attendance/at-risk, POS, Members list filter (home location), Kiosk.
- **Kiosk binds to a location** — the kiosk device/URL carries its `locationId` so check-ins record the right site.
- **Reports**: per-location + rolled-up (MRR by location, attendance by location).

---

## 7. Pricing / packaging

Aligns with the Academy tier: **per-location pricing** (e.g. base × active locations), which is the honest "coming soon" item already on the landing page. Update the pricing copy once shipped.

---

## 8. Phases & effort (directional)

| Phase | Work | Est. |
|------|------|------|
| 1 | `Location` model + migration + backfill + settings split | ~1 wk |
| 2 | Active-location selector (cookie + switcher) + scope Schedule/Attendance/Kiosk | ~1 wk |
| 3 | Scope POS / Items / Terminal | ~3 days |
| 4 | Location-scoped staff (join table) + access control | ~3 days |
| 5 | Rolled-up reporting (per-location + all) | ~3 days |
| — | Audit the 49 `getGymSettings` call sites + QA | ~3 days |
| | **Total** | **~4 weeks** |

Ship Phase 1–2 first (locations exist, schedule/attendance/kiosk scoped) — that's the demoable milestone.

---

## 9. Risks & open decisions

1. **Every list query needs scoping** — the main risk is *missing* a query and leaking another site's data. Mitigate with a shared `whereLocation(activeLocationId)` helper and a grep audit.
2. **Payments per location?** Most run one processor org-wide (current model), but terminals are per-site. Confirm whether any account needs separate Stripe/Square accounts per location (pushes toward (B)).
3. **Members across locations** — is membership org-wide (recommended) or per-location? Plan assumes org-wide with a home location.
4. **Staff model** — single `locationId` vs `UserLocation` join. Recommend join.
5. **True multi-tenant (B)** — separate orgs/billing/custom domains is a much larger effort; only pursue if selling to franchises as independent tenants.

---

**Document Version**: 1.0
