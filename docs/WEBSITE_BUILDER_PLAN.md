
we# Website Builder — Implementation Plan

**Status**: Plan (no code yet)
**Date**: 2026-06-29
**Related**: `docs/ROADMAP.md` (Phase 2), `docs/EXECUTIVE_SUMMARY.md`

> Goal: let a gym publish a simple branded public website from their MatConnect
> data — schedule, programs, instructors, and a lead/trial form — so they don't
> need a separate Squarespace. Table-stakes bundling (Gymdesk includes one).
> Keep it a **template with editable content**, not a freeform page builder.

---

## 1. Important distinction

`src/app/page.tsx` ("/") is the **SaaS product** landing page (getmatconnect.com).
The website builder produces the **gym's own** public site — a different thing.
Give it its own route namespace (e.g. **`/site`**, or a custom domain later);
do not overload "/".

---

## 2. What already exists (reuse)

- **`GymSettings`**: `gymName`, `logoUrl`, `gymAddress`, `gymPhone`, `gymEmail`, `instructorNames`, `programTypes`, currency/locale.
- **Live data**: `Class` schedule, `Program` types, `MembershipPlan` pricing.
- **Lead capture**: `src/app/widget/lead` (embeddable) + `/admin/leads` pipeline — reuse as the site's contact/trial form so submissions land in the existing funnel.
- **Self-enroll**: `/enroll` — link the site's primary CTA here.
- Design language + components from the existing landing page can be reused.

---

## 3. Data model

Add a **`site` JSON** to `GymSettings` (or a small `SiteConfig` model) holding
template content — avoids a migration-per-field and keeps it flexible:

```
site: {
  enabled: boolean,
  themeColor: string,        // single accent (per redesign guidance: one accent)
  hero: { headline, subhead, imageUrl, ctaLabel },
  about: string,             // rich text / markdown
  showSchedule: boolean,
  showPricing: boolean,
  socials: { instagram?, facebook?, youtube? },
  seo: { title, description, ogImageUrl },
  customDomain?: string      // display only in v1 (see §6)
}
```

Brand basics (name, logo, address, phone) continue to come from `GymSettings`.

---

## 4. Public site (`/site`)

A server-rendered template that composes:
- **Hero** — headline/subhead/image from config, CTA → `/enroll` (or lead form)
- **About** — config text
- **Schedule** — live from `Class` (toggle via `showSchedule`)
- **Programs / instructors** — from `programTypes` + `instructorNames`
- **Pricing** — from `MembershipPlan` (toggle via `showPricing`)
- **Contact / free-trial form** — reuse the lead widget → leads pipeline
- **Footer** — address, phone, socials, map link

Apply the redesign skill's rules: one accent color, real content (no Lorem),
`min-h-dvh`, max-width container, hover/focus states, alt text, SEO/OG meta.

---

## 5. Editor UI (`/admin/setup/website`)

- Form to edit the `site` config: enable toggle, hero fields, about, theme color,
  section toggles, socials, SEO.
- **Live preview** (iframe to `/site` or a `?preview=1` render).
- "View live site" link. Gate behind `setup`/`settings` permission.

---

## 6. Custom domain (later / note only)

Pointing `gymname.com` at their site needs per-gym domain routing, which is a
**multi-tenant** concern (one deployment serves one gym today). For v1, the site
lives at `/site` on the app domain. Real custom domains tie to the multi-tenant
track in `MULTI_LOCATION_PLAN.md` §9 — flag, don't build.

---

## 7. Phases & effort (directional)

| Phase | Work | Est. |
|------|------|------|
| 1 | `site` config shape + `/site` template pulling settings + schedule/programs | ~1 wk |
| 2 | Editor UI + live preview | ~3 days |
| 3 | Lead form integration + pricing section + SEO/OG meta | ~2 days |
| 4 | (Later) custom domain — depends on multi-tenant | — |
| | **Total (v1)** | **~2 weeks** |

---

## 8. Risks & open decisions

1. **Scope creep into a full CMS** — resist. Ship a strong *template* with
   editable content; not drag-and-drop blocks.
2. **Conflation with the SaaS landing page** — keep `/site` separate from "/".
3. **Custom domains** — needs multi-tenant routing; explicitly out of v1.
4. **Theme** — single accent color keeps it on-brand and simple (per redesign rules); avoid exposing full CSS.
5. **SEO** — set per-gym `<title>`/description/OG; if multi-tenant later, each gym needs its own metadata + sitemap.

---

**Document Version**: 1.0
