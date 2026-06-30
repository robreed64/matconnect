# MatConnect: Competitive Position & Strategic Plan

**Date**: 2026-06-30 v2.3 (code-verified)
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
- **Churn risk scoring** — composite 0–100 score per member with 6 explainable signals (inactivity, frequency drop, payment past due, trial ending, progression stalled, slow start); Low/Medium/High bands; at-risk view ranked by score with reason chips
- **Website builder** — hosted public gym website with hero, schedule, pricing, testimonials, FAQ, map, social links, SEO metadata, preset themes, and a side-by-side in-app editor; enable/disable toggle with admin preview
- **Public API + WordPress plugin** — API key system, `/api/v1/*` JSON endpoints, WordPress plugin with Gutenberg blocks, shortcodes, and Elementor widget support

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
| **Multi-location** | Gymdesk | 🟡 P1 — single-tenant today; blocks chains |
| **Native mobile app** | DojoChamp, Gymdesk, PushPress | 🟡 P1 — portal is web-only |

Member app, analytics, automation, waitlists, in-person payments, churn risk scoring, website builder, public API, WordPress integration — **already shipped.**

---

## 🎯 Recommended Strategy

### Position
**"The modern gym software for martial arts schools — simple, transparent, and
already complete. Everything you need to run and grow your school, without
Mindbody's price or complexity."**

- Target: martial arts schools (largest quality-adjusted TAM)
- Pricing: $99–150/month flat (match DojoChamp, undercut Mindbody)
- Lead differentiators: **transparent retention insights**, all-in-one breadth, both Stripe+Square, responsive support

### ✅ Phase 1 (Complete): Win the Retention Narrative
- **Churn risk scoring** — shipped. Composite 0–100 score with 6 explainable signals, ranked at-risk view, risk badge on member profiles. Closes DojoChamp's headline differentiator.
- **Win-back workflow templates** — next step: add pre-built inactivity/trial-expiry workflow templates to the existing automation engine

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

**Phases 1 and 2 are largely complete** — churn scoring and website builder are shipped.
The next priority is **multi-location** as the primary revenue-expansion track.
Defer native mobile until multi-location wins are banked.

**The headline**: MatConnect is further along than the earlier docs implied.
The win condition is positioning + closing 1–2 real gaps, not a feature catch-up sprint.

---

*Detailed competitor analysis: `/competitor-profiles/`. Verified feature list: `docs/FEATURES.md`. Roadmap: `docs/ROADMAP.md`.*

**Document Version**: 2.3 (code-verified)
