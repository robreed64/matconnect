# MatConnect — Research Record
_Generated: 2026-06-28 | Phase: INIT → REVIEW_

## Intake answers

| # | Question | Answer |
|---|----------|--------|
| 1 | Funding state | Bootstrapped. No external funding. |
| 2 | Revenue | Pre-revenue. 0 paying customers. 1 prospect in pipeline (warm). |
| 3 | Team | Solo founder (Rob). 1 person joining soon. |
| 4 | Current marketing | Founder's own BJJ gym. Personal network only. |
| 5 | First customers | People founder knows personally. |
| 6 | ICP | Not formally defined yet. |
| 7 | Sales motion | Hybrid — walk-through or self-serve. Still being figured out. |
| 8 | Biggest constraint | Awareness. |
| 9 | Marketing tools | Email provider. |
| 10 | 90-day goal | 3 gyms signed up. |

## Derived from codebase

**Product:** Single-tenant B2B SaaS. Each deployment serves one gym. No multi-tenancy (GymSettings is a single row, id=1). Owner installs/deploys per gym or founder manages hosting per customer — important for onboarding complexity.

**Feature set:**
- Kiosk check-in (tablet self-service, new member signup + waiver on the spot)
- Member management (profiles, photos, family accounts, belt ranks, attendance)
- Belt progression tracking (class/technique requirements per rank, member-facing progress)
- Class scheduling (recurring classes, rosters, instructor assignment)
- Billing: Stripe + Square (subscriptions, POS for gear/day passes)
- Email + SMS marketing campaigns
- Waiver management (digital capture at kiosk)
- Curriculum builder
- At-risk member alerts
- Member portal (self-service dashboard for members)
- Enrollment flow (public-facing signup + payment)

**Payment providers:** Both Stripe and Square supported. Square also handles POS terminal checkout.

**Tech stack:** Next.js 15, Tailwind CSS, Prisma + PostgreSQL, NextAuth.

**Landing page:** Just built at root `/` — hero, stats, 6 feature cards, how-it-works, 3-tier pricing (Free / $49 Pro / $99 Academy), testimonials, CTA.

## Strategic observations

**The founder IS the ICP.** Owns a BJJ gym. Built this tool for their own gym. This is the strongest possible product-market-fit signal and the most credible sales asset. Every pitch starts with "I run a gym and built this because nothing else worked for us."

**Growth phase:** Sub-$10K ARR — the "grueling" phase. The job right now is not marketing at scale. It's manually finding and closing the first 5–10 customers. Every recommendation must reflect that reality.

**Real constraint:** The stated constraint is "not enough awareness" but the binding constraint at this stage is actually converting the 1 warm prospect + finding 2 more from the founder's network. Awareness is a week-2 problem; closing the first 3 paying gyms is a week-1 problem.

**Competitive frame:**
- vs. Mindbody: Too expensive ($160–$500+/mo), too complex, built for yoga/fitness — doesn't understand BJJ belt culture
- vs. spreadsheets + GroupMe: No structure, no automation, doesn't scale past 40 members
- vs. Zen Planner / Wodify: Fitness-generic, no belt progression, no BJJ-specific kiosk UX
- Positioning lever: Built BY a BJJ practitioner, FOR BJJ schools. The belt progression + kiosk combo is a genuine differentiator no generic gym software has.

**Budget reality:** ~$0 paid marketing budget. The plan is entirely founder-time-funded for at least Q1. Email provider is the only active tool.

**ICP hypothesis (to validate with first 3 customers):**
- BJJ school owner/head instructor
- 20–150 active members
- Currently on spreadsheets, Mindbody, or nothing
- Running their own gym (not a franchise employee)
- US-based initially (Square/Stripe coverage)
- Pain: front-desk overhead, no belt tracking, waiver chaos, billing manual

## Open decisions going into the plan

1. **Pricing confirmed?** Landing page shows Free/$49/$99 but no actual Stripe/Square products set. Is this the real pricing?
2. **Deployment model:** Is each gym self-hosted, or does founder manage SaaS hosting? This affects activation complexity significantly.
3. **CAC unknown** — no paid channel data yet. All acquisition is founder-time.
4. **ICP to be validated** — first 3 customers will sharpen this considerably.
5. **Email provider** — which one? (Resend is in the codebase lib/email. Confirming.)
