yes # Churn Risk Scoring — Implementation Plan

**Status**: Plan (no code yet)
**Date**: 2026-06-29
**Owner**: TBD
**Related**: `docs/ROADMAP.md` (Phase 1), `docs/EXECUTIVE_SUMMARY.md`

> Goal: upgrade the existing binary, attendance-only **at-risk view** into an
> explainable **0–100 churn risk score** per active member, surfaced in the admin
> UI with reasons and a one-click outreach action, plus a weekly admin digest.
> Built entirely on data already in the schema — **no ML, no new infrastructure**.

---

## 1. What exists today

- **`src/app/admin/members/at-risk/page.tsx`** — server component listing `status: "active"` members with no check-in in the last N days (14/21/30/60 toggle), sorted by days absent. Binary in/out, attendance-only.
- **`src/lib/marketing-triggers.ts`** — segment-based workflow engine. Each workflow (`inactivity`, `trial_attendance`, `trial_expiring`, `failed_payment`, `birthday`, `promotion`) queries its own target set, applies a cooldown, logs a `Message`, and delivers via `sendEmail`/`sendSMS`. Templates use `{{var}}`.
- **Data available** (no schema changes needed for v1): `Attendance` (timestamps), `Member.status` (`active`/`trial`/`past_due`/…), `Member.trialStartedAt` + `GymSettings.trialLengthDays`, `Member.beltRank` + `createdAt`, `TechniqueProgress`, `BeltRequirement` (`minClasses`/`minMonths`/`minTechniques`).

### Known data gap
There is **no `promotedAt` / belt-history timestamp** on `Member`. "Progression stalled" must be approximated from tenure (`createdAt`) vs `BeltRequirement.minMonths` and `TechniqueProgress` count. Adding an optional `lastPromotedAt` column later would make this signal precise (see §9).

---

## 2. Scoring model (the core)

A **transparent weighted sum**, clamped to 0–100, with a human-readable reason per contributing signal. Every point is traceable — this is the deliberate alternative to a black-box "AI" score, and it's the selling point ("see exactly *why*").

### Signals & starting weights

| # | Signal | Condition | Points | Reason string |
|---|--------|-----------|--------|---------------|
| 1 | **Inactivity** (primary) | days since last check-in: 8–14 / 15–21 / 22–30 / 31–45 / 46+ | 10 / 20 / 30 / 40 / 50 | "No check-in in {n} days" |
| 1b | Never attended | active &gt;14 days, zero check-ins | 45 | "Never checked in" |
| 2 | **Frequency drop** | check-ins in last 30d &lt; 50% of prior 30d (prior ≥ 4) | 15 | "Training down 50%+ vs last month" |
| 2b | Frequency drop (mild) | last 30d &lt; 75% of prior 30d (prior ≥ 4) | 8 | "Training frequency declining" |
| 3 | **Payment past due** | `status = past_due` | 25 | "Payment past due" |
| 4 | **Trial ending, low engagement** | `status = trial`, within `days_before` of expiry, &lt; 3 check-ins | 20 | "Trial ending, low engagement" |
| 5 | **Progression stalled** (approx) | tenure ≥ `minMonths` for current belt AND `TechniqueProgress` count &lt; `minTechniques` | 10 | "Eligible to progress but stalled" |
| 6 | **New-member risk** | joined &lt; 30 days ago AND &lt; 4 check-ins | 5 | "New member, slow start" |

`score = min(100, sum(points))`. Signals 1 and 1b are mutually exclusive.

### Risk bands
- **0–29 → Low** (green)
- **30–59 → Medium** (amber)
- **60–100 → High** (red)

> These weights are **starting heuristics, not validated against churn data.**
> They live in one config object (`RISK_WEIGHTS`) so they're trivial to tune.
> Once enough cancellations accrue, calibrate weights against who actually churned (§9).

---

## 3. Architecture

### New file: `src/lib/risk-scoring.ts`
Pure, testable core + a data-fetching wrapper:

```ts
export type RiskReason = { code: string; label: string; points: number };
export type MemberRisk = { score: number; band: "low"|"medium"|"high"; reasons: RiskReason[] };

// Pure function — easy to unit test, no DB
export function scoreMember(input: RiskInput, weights = RISK_WEIGHTS): MemberRisk;

// Fetches active members + signals, returns scored list sorted desc
export async function getScoredMembers(): Promise<(MemberSummary & MemberRisk)[]>;
```

- `scoreMember` takes a plain `RiskInput` (last check-in date, 30d/prior-30d counts, status, trial info, tenure, technique count, belt requirement) and returns score + reasons. **No Prisma import** → fully unit-testable.
- `getScoredMembers` does the queries (one `findMany` for active members with attendance windowed to ~90 days, plus `BeltRequirement` lookup map, plus `GymSettings.trialLengthDays`) and maps each through `scoreMember`.

### Compute on-demand (v1) — no schema change
For a single-gym scale (hundreds of active members) on-demand scoring in the server component is fine. **Defer** stored `riskScore` columns + nightly recompute until it's needed (§9).

---

## 4. UI changes

### 4a. Upgrade the at-risk page → "Retention"
Rework `src/app/admin/members/at-risk/page.tsx` to use `getScoredMembers()`:
- **Sort by risk score desc** (highest risk first)
- New column: **Risk** — score + colored band pill
- New column: **Why** — the reason chips (e.g. "No check-in 24 days", "Payment past due")
- Replace the day-range toggle with **band filters** (All / High / Medium), keeping it a server component (filter via `?band=high`)
- Keep "Last automated outreach" column (already there)
- Add the one-click outreach action per row (§5)

### 4b. Member detail badge
On `src/app/admin/members/[id]` add a small **risk pill** (score + band + top reason) near the member header, so risk is visible in context, not just on the list.

---

## 5. Action layer (one-click outreach)

Because the workflow engine is **segment-based** (no per-member enrollment), "act on this member now" maps to a small **manual-send endpoint**, not a fake "enroll":

### New: `POST /api/admin/members/[id]/outreach`
- Body: `{ channel: "email" | "sms", subject?, body }` (or a `templateId` referencing a saved workflow's body)
- Reuses `sendEmail`/`sendSMS` and logs a `Message` row (so it shows up in "Last outreach" and respects history)
- Auth via existing `requireAuth("settings")` (or appropriate role)

UI: a "Reach out" button on each at-risk row + member detail that opens a small composer prefilled with a retention template (`{{name}}` etc.). The **automated** layer remains the existing `inactivity` / `failed_payment` / `trial_expiring` workflows — this just adds a manual, targeted nudge.

> Full per-member workflow *enrollment* (drip sequences targeting individuals) is a
> larger change to the engine and is **out of scope** for this plan.

---

## 6. Weekly admin digest

Add a weekly summary email to the gym's admins (uses `GymSettings.gymEmail` + staff `User` emails):
- **Option A (recommended):** new cron route `src/app/api/cron/retention/route.ts` (mirrors `cron/marketing` + `cron/reminders`, guarded by `CRON_SECRET`), scheduled weekly in `vercel.json`.
- Content: count of High/Medium risk, top ~10 members by score with reasons + links to their profiles.
- Reuses `getScoredMembers()` and `sendEmail`.

`vercel.json` addition:
```json
{ "path": "/api/cron/retention", "schedule": "0 15 * * 1" }   // Mondays 15:00 UTC
```

---

## 7. Testing

The repo uses Vitest (`src/lib/reminders.test.ts`, `waitlist.test.ts` as patterns).

- **`src/lib/risk-scoring.test.ts`** — unit-test `scoreMember` against fixtures: clean member (0), 24-day-absent (30), past-due + absent (stacks), trial-ending, frequency-drop, band boundaries (29/30/59/60), clamp at 100. This is the high-value test surface since the logic is pure.
- Light integration check that `getScoredMembers` maps/sorts correctly (mock Prisma like the existing tests).

---

## 8. Rollout phases & effort

> Estimates are directional — calibrate to your velocity.

| Step | Work | Est. |
|------|------|------|
| 1 | `risk-scoring.ts` (pure `scoreMember` + `RISK_WEIGHTS`) + unit tests | ~2–3 days |
| 2 | `getScoredMembers()` data layer | ~1 day |
| 3 | Upgrade at-risk page (score, reasons, band filter, sort) | ~2 days |
| 4 | Member-detail risk pill | ~0.5 day |
| 5 | `POST /outreach` endpoint + composer UI | ~2 days |
| 6 | Weekly digest cron + `vercel.json` | ~1 day |
| — | Buffer / polish / QA | ~1–2 days |
| | **Total** | **~9–11 working days (~2 weeks)** |

Ship **Steps 1–4 first** (the visible "explainable risk score") as the milestone that closes DojoChamp's "AI churn" gap; Steps 5–6 follow.

---

## 9. Open decisions & future

1. **Add `lastPromotedAt` to `Member`?** Makes "progression stalled" precise instead of approximate. Small migration + set on promote. Recommended once v1 is in.
2. **Store scores (`riskScore`, `riskUpdatedAt`) + nightly recompute?** Only needed at multi-hundred-member scale or for trend-over-time charts. Defer.
3. **Weight calibration:** revisit `RISK_WEIGHTS` after ~1–2 months of real cancellations; compare scores of churned vs retained members. Possible later move to a simple logistic model — still explainable.
4. **Score history / trend:** "risk rising" is a strong signal but needs stored snapshots (ties to #2).
5. **Multi-location (separate track):** scoring is per-member so it's location-agnostic, but the digest and lists will need location scoping once multi-location lands.

---

## 10. Why this is the right first build

- Uses **only existing data** — no new pipelines, no ML, no training set.
- **Explainable** beats black-box for a small-gym owner who wants to *act*, and it's a sharper marketing story than "AI" ("see exactly why, and reach out in one click").
- Upgrades an existing screen rather than adding surface area.
- Mostly **pure, testable logic** — low risk, high confidence.

---

**Document Version**: 1.0
