# MatConnect Product Roadmap

**Strategic Goal**: Build the modern, simple, transparent gym software that martial arts school owners love. Extend an already-broad feature base into the gaps competitors are using to differentiate.

**Timeline**: 6-month roadmap (next 2 quarters)

> **Note**: This roadmap was corrected on 2026-06-29 after verifying the codebase.
> An earlier draft proposed building a member app, growth analytics, and marketing
> automation as "Phase 1" — **all three already exist**. The real gaps are
> different (see below). Source of truth for current features: `docs/FEATURES.md`.

---

## 🎯 The Real Starting Position

MatConnect already ships a deep feature set (verified in code):
- ✅ Self-service kiosk + QR/token check-in
- ✅ Member management, family accounts + discounts
- ✅ Belt progression, per-rank requirements, technique tracking
- ✅ Curriculum/lesson builder
- ✅ Class scheduling **with waitlist + auto-promotion**
- ✅ Billing on **both Stripe and Square** + Square Terminal, POS with inventory
- ✅ Trials + trial-expiry automation
- ✅ **Marketing automation** (6 triggers, email+SMS, daily cron)
- ✅ Lead capture widget + leads pipeline
- ✅ **Web member portal** (profile, schedule, attendance, curriculum, progress)
- ✅ **Web push notifications**
- ✅ **Reports** (MRR, status, attendance, belts, trends, CSV export)
- ✅ At-risk members view (rule-based)

**This is not an MVP scrambling for parity.** On core gym-management features,
MatConnect is at or near parity with DojoChamp and Gymdesk today. The roadmap is
about **closing the few real gaps** and **deepening differentiators**, not
rebuilding things that exist.

---

## ❌ The Actual Gaps (vs. DojoChamp / Gymdesk)

| Gap | Who has it | Impact | Priority |
|-----|-----------|--------|----------|
| **Predictive/ML churn scoring** | DojoChamp (AI), PushPress (2026) | Their headline differentiator; we have rule-based only | 🔴 P0 |
| **Multi-location support** | Gymdesk | Locks us out of chains/franchises (single-tenant today) | 🟡 P1 |
| **Native mobile app** | DojoChamp, Gymdesk, PushPress | Portal is web-only; push is web-push | 🟡 P1 |
| **Website builder** | DojoChamp, Gymdesk | Table-stakes bundling; reduces tool sprawl | 🟡 P2 |

Everything else competitors market (member app, analytics, automation,
waitlists, in-person payments) **MatConnect already has.**

---

## 📅 Phased Roadmap

### Phase 1: Sharpen the Retention Story (Months 1–2)
**Goal**: Turn the existing rule-based at-risk view into a credible "retention engine" that competes with DojoChamp's AI positioning — without overbuilding.

#### 1.1 Churn Risk Scoring (P0)
**Release**: Month 2

**What it adds on top of today's at-risk view**:
- A composite **risk score (0–100)** per active member, not just a binary "no check-in in N days"
- Signals to combine (all already in the data model):
  - Attendance trend (declining frequency, not just absence) — `Attendance`
  - Failed/past-due payments — `status = past_due`, `failed_payment` data
  - Stalled belt progression (no technique progress / no promotion in X months) — `TechniqueProgress`, `beltRank`
  - Trial ending without conversion — `trialStartedAt`, `trialLengthDays`
  - Tenure (newer members churn faster)
- **"Why at risk" + "suggested action"** per member, wired to the existing automation workflows (one click → enroll in a win-back workflow)
- Weekly digest to admins (reuse the cron + Brevo email plumbing already in place)

**Approach**: Start with a transparent weighted-heuristic score (explainable, no
training data needed). Only move to ML once there's enough labeled churn history.
This is achievable because attendance, payments, and progression data already exist.

**Why P0**: DojoChamp's AI churn engine is their single biggest marketing claim.
MatConnect already has the underlying data and a rule-based view — closing this
gap is mostly scoring + UX, not net-new infrastructure.

**Effort**: ~2 weeks (heuristic scoring + UI + workflow hook)

#### 1.2 Retention/Win-back Workflow Templates (P1)
**Release**: Month 2

- Pre-built workflow templates that pair with risk scores: "14-day no-show win-back," "trial-ending nudge," "failed-payment recovery," "promotion congrats"
- These run on the **existing** `marketing-triggers` engine — this is content/config + a few trigger refinements, not a new engine

**Effort**: ~1 week

---

### Phase 2: Open New Markets (Months 3–5)
**Goal**: Remove the structural limits that keep MatConnect out of larger accounts.

#### 2.1 Multi-Location Support (P1)
**Release**: Month 4

**The work** (this is a real architectural change):
- `GymSettings` is currently a single row (`id @default(1)`) — single-tenant. Needs a location/tenant model.
- Scope members, classes, staff, POS, and reports by location
- Unified admin across locations with per-location views
- Per-location or rolled-up reporting

**Why P1**: Chains/franchises are stuck on Mindbody ($250–500+/location). MatConnect at a flat per-location price with better UX is a strong wedge — but only once multi-location exists. This is the biggest revenue-expansion unlock.

**Effort**: ~3–4 weeks (data model + scoping + migration of the single-tenant assumption)

#### 2.2 Website Builder (P2)
**Release**: Month 5

- Branded gym site (logo, colors, contact), class schedule synced from MatConnect, instructor bios, contact/lead form wired to the **existing** leads pipeline + widget
- Use a template approach, not a custom CMS

**Why P2**: Table-stakes bundling (Gymdesk includes it). Lower urgency than churn/multi-location but reduces tool sprawl and strengthens the all-in-one pitch.

**Effort**: ~2–3 weeks

---

### Phase 3: Native Mobile (Months 5–6+)
**Goal**: Move from web portal + web-push to a native app.

#### 3.1 Native Member App (P1, larger effort)
**Release**: Month 6+

- Wrap/extend the existing member portal (profile, schedule, booking, progress, attendance) as a native iOS/Android app
- Native push (replacing/augmenting web-push), biometric login, offline schedule view
- Reuse existing member APIs

**Why later**: The web portal already delivers the core member experience. Native is an engagement and credibility upgrade, but it's the largest effort and least urgent of the gaps. Consider React Native / Expo to reuse the existing stack.

**Effort**: ~6–8 weeks (separate track; can run parallel to Phase 2 if capacity allows)

---

## 🎯 Success Metrics (6 Months)

| Metric | Target |
|--------|--------|
| Customer accounts | 100+ |
| NRR | >90% |
| Monthly account churn | <5% |
| G2/Capterra rating | 4.5+ |
| Customers won from DojoChamp | 50+ |
| Customers won from Mindbody | 100+ |
| Risk-score adoption (admins using it monthly) | 80%+ |
| Accounts on multi-location | 20%+ by end of Q4 |

---

## 🚨 Risk Mitigation

**DojoChamp out-markets us on "AI"** → Ship explainable risk scoring fast (Phase 1); lead with *transparency* ("see exactly why a member is at risk and act in one click") vs. black-box AI.

**Multi-location is a real re-architecture** → Scope it as its own track; don't let it block Phase 1 retention work.

**Mindbody switching costs** → Build on the existing Square import; add a Mindbody import path and offer white-glove migration for larger accounts.

---

## 📊 Sequencing Summary

```
Q3 2026 (M1–2)          Q3–Q4 (M3–5)            Q4+ (M5–6+)
──────────────          ──────────────          ──────────────
Churn risk scoring      Multi-location          Native mobile app
Win-back templates      Website builder         (parallel track)

DEEPEN RETENTION        OPEN NEW MARKETS        ENGAGEMENT UPGRADE
(close the AI gap)      (chains + all-in-one)   (native experience)
```

---

## ✅ Decision Points

1. **Target market** — martial arts only, or multi-vertical later?
2. **Churn scoring** — ship heuristic-first (recommended) or wait for ML?
3. **Multi-location pricing** — flat per-location, or tiered?
4. **Native app** — React Native to reuse the stack, or defer entirely?
5. **Team capacity** — can Phase 1 + Phase 2 run without new hires?

---

**Document Version**: 2.0 (code-verified)
**Last Updated**: 2026-06-29
**Next Review**: 2026-08-29
