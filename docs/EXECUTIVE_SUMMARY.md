# MatConnect: Competitive Position & Strategic Plan

**Date**: 2026-06-29 (code-verified)
**Audience**: Leadership / Board
**Time to Read**: 5 minutes

> Corrected 2026-06-29 after auditing the codebase. An earlier draft understated
> MatConnect's maturity — it recommended building a member app, analytics, and
> marketing automation that **already exist**. This version reflects what's
> actually shipped. Sources: `docs/FEATURES.md`, `docs/ROADMAP.md`.

---

## 🎯 The Opportunity

The gym-management market is fragmenting:
- **Mindbody** (market leader, 25 years, 50K customers) is losing customers to hidden fees ($250–$500+/month real cost) and complexity
- **Specialists** (DojoChamp $99/mo, Gymdesk $75–200, PushPress freemium) are winning by being simple, affordable, and vertical-focused
- **No competitor owns "multi-vertical + simple + affordable"** — MatConnect's white space

---

## 💪 MatConnect's Real Position (Stronger Than Previously Documented)

MatConnect is **not** an early MVP. Verified in code, it already ships:
- Self-service kiosk + QR/token check-in
- Member management, family accounts + automatic discounts
- Belt progression, per-rank requirements, technique tracking, curriculum builder
- Class scheduling **with waitlist + auto-promotion**
- Billing on **both Stripe and Square** + in-person Square Terminal, POS with inventory
- Trials + trial automation
- **Marketing automation** (6 triggers, email + SMS, daily cron)
- Lead capture widget + leads pipeline
- **Web member portal** (profile, schedule, attendance, curriculum, progress)
- **Web push notifications**
- **Reports** (MRR, status, attendance, belts, trends, CSV export)
- Rule-based at-risk members view

**Implication**: On core features, MatConnect is at or near parity with DojoChamp
and Gymdesk **today**. The strategic question is not "how do we catch up" — it's
"how do we close the few real gaps and win the positioning battle."

---

## 🚨 The Threat

**DojoChamp** (launched Dec 2025) is the sharpest near-term competitor:
- Identical TAM (martial arts schools)
- **$99/month unlimited students**
- **AI churn prevention** — their headline differentiator (claims 30% retention lift)
- Fast-moving, well-positioned (martial-arts-native founders)

MatConnect matches DojoChamp on most features. The meaningful difference is
**predictive churn scoring** — DojoChamp markets "AI"; MatConnect has a
*rule-based* at-risk view. That's the gap to close, and it's mostly scoring + UX
on data MatConnect already collects.

---

## ❌ The Actual Gaps (Verified)

| Gap | Who has it | Priority |
|-----|-----------|----------|
| **Predictive/ML churn scoring** | DojoChamp, PushPress | 🔴 P0 — close with explainable risk scoring |
| **Multi-location** | Gymdesk | 🟡 P1 — single-tenant today; blocks chains |
| **Native mobile app** | DojoChamp, Gymdesk, PushPress | 🟡 P1 — portal is web-only |
| **Website builder** | DojoChamp, Gymdesk | 🟡 P2 — table-stakes bundling |

Member app, analytics, automation, waitlists, in-person payments — **already shipped.**

---

## 🎯 Recommended Strategy

### Position
**"The modern gym software for martial arts schools — simple, transparent, and
already complete. Everything you need to run and grow your school, without
Mindbody's price or complexity."**

- Target: martial arts schools (largest quality-adjusted TAM)
- Pricing: $99–150/month flat (match DojoChamp, undercut Mindbody)
- Lead differentiators: **transparent retention insights**, all-in-one breadth, both Stripe+Square, responsive support

### Phase 1 (Months 1–2): Win the Retention Narrative
- **Churn risk scoring** — composite 0–100 score on existing data (attendance trend, payments, stalled progression, trial status) with "why + suggested action," wired to existing workflows
- **Win-back workflow templates** on the existing automation engine
- *This closes DojoChamp's main marketing advantage using infrastructure that already exists.*

### Phase 2 (Months 3–5): Open New Markets
- **Multi-location** (real re-architecture; unlocks chains/franchises stuck on Mindbody)
- **Website builder** (table-stakes bundling, wired to existing leads pipeline)

### Phase 3 (Months 5–6+): Native Mobile
- Native iOS/Android app wrapping the existing portal (consider React Native to reuse the stack)

---

## 📈 Success Metrics (6 Months)

| Metric | Target |
|--------|--------|
| Customer accounts | 100+ |
| NRR | >90% |
| Monthly account churn | <5% |
| G2/Capterra rating | 4.5+ |
| Customers from DojoChamp | 50+ |
| Customers from Mindbody | 100+ |
| Risk-score adoption | 80%+ |
| Multi-location accounts | 20%+ by Q4 |

---

## 💰 Investment Required (Revised Down)

Because the member app, analytics, and automation already exist, the build cost
is materially lower than the prior estimate.

| Category | Cost | Timeline |
|----------|------|----------|
| Phase 1 (churn scoring + templates) | $20–35K | ~3 weeks |
| Phase 2 (multi-location + website builder) | $50–80K | ~6 weeks |
| Phase 3 (native mobile) | $50–80K | ~6–8 weeks (parallel track) |
| Marketing / GTM (SEO, content, positioning) | $30–50K | ongoing |
| Sales + support (growth hires) | $200K+/yr | ongoing |
| **6-month build subtotal** | **$120–195K** | through Q4 2026 |

---

## 🎲 Key Decisions

1. **Target market** — martial arts only, or multi-vertical later?
2. **Churn scoring** — heuristic-first (recommended) or hold for ML?
3. **Pricing** — $99 flat or $99–150 tiers (and per-location pricing for multi-location)?
4. **Native app** — React Native to reuse the stack, or defer?
5. **GTM spend** — how aggressively to fund "Mindbody alternative" SEO?

---

## ✅ Recommendation

Lead with **Phase 1 (churn scoring)** — it's cheap, fast (~3 weeks), and neutralizes
DojoChamp's only real feature advantage by building on data and plumbing that
already exist. Run **multi-location** as the parallel revenue-expansion track.
Defer native mobile until the retention and multi-location wins are banked.

**The headline**: MatConnect is further along than the earlier docs implied.
The win condition is positioning + closing 1–2 real gaps, not a feature catch-up sprint.

---

*Detailed competitor analysis: `/competitor-profiles/`. Verified feature list: `docs/FEATURES.md`. Roadmap: `docs/ROADMAP.md`.*

**Document Version**: 2.0 (code-verified)
