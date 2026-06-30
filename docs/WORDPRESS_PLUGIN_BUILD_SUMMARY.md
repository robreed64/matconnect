# WordPress Plugin — Build Summary

## What Was Built

### MatConnect Backend

**New database model:** `ApiKey` table (name, hashed key, prefix for display, enabled toggle, lastUsedAt).

**New library files:**
- `src/lib/api-keys.ts` — key generation (`mc_live_...` format), bcrypt hashing, verification
- `src/lib/require-api-key.ts` — middleware that reads `Authorization: Bearer` header, verifies key, returns 401 on failure

**New admin API routes:**
- `GET/POST /api/admin/api-keys` — list and create keys
- `PATCH/DELETE /api/admin/api-keys/[id]` — enable/disable or revoke

**New v1 public API (all require Bearer key except leads):**
- `GET /api/v1/gym` — gym name, logo, contact, programs, instructors
- `GET /api/v1/schedule?days=7` — next N days of classes with times, instructor, spots available
- `GET /api/v1/plans` — active membership plans with pricing
- `GET /api/v1/testimonials` — from siteConfig
- `GET /api/v1/faq` — from siteConfig
- `POST /api/v1/leads` — public (no key needed), creates lead + notifies owner

**Admin UI:** New "Integrations — API Keys" section added to the Settings page — generate keys, copy on creation (shown once), enable/disable toggle, revoke button.

---

### WordPress Plugin (`wordpress-plugin/matconnect-for-wordpress/`)

**Settings page** (Settings → MatConnect):
- MatConnect URL
- API Key (stored server-side only, never sent to browser)
- Accent Color
- Cache TTLs (schedule: 5 min, data: 1 hr)
- Test Connection button
- Clear Cache button

**API client** (`includes/class-api-client.php`):
- `wp_remote_get()` wrapper with WordPress transient caching
- API key used only in PHP — never exposed to the browser

**5 Gutenberg blocks** with server-side PHP render + React editor placeholders:

| Block | Sidebar options |
|---|---|
| Schedule | Days ahead (1–14) |
| Pricing | Show CTA toggle, button label |
| Lead Form | Success message text |
| Testimonials | Max items |
| FAQ | None |

**5 Shortcodes:**
```
[matconnect_schedule days_ahead="7"]
[matconnect_pricing show_cta="true" cta_label="Get started"]
[matconnect_lead_form success_message="We'll be in touch!"]
[matconnect_testimonials max="6"]
[matconnect_faq]
```

**Shared CSS** (`assets/css/matconnect.css`) — styles for all blocks, responsive grid for pricing and testimonials, accordion for FAQ.

**Vanilla JS** (no jQuery):
- `assets/js/lead-form.js` — form submission via `fetch()` to `/api/v1/leads`
- `assets/js/faq.js` — accordion open/close with `aria-expanded`

---

## File Map

### MatConnect (Next.js)

```
src/lib/api-keys.ts                          # Key generation + bcrypt verify
src/lib/require-api-key.ts                   # Bearer token middleware
src/app/api/admin/api-keys/route.ts          # GET list / POST create
src/app/api/admin/api-keys/[id]/route.ts     # PATCH toggle/rename, DELETE revoke
src/app/api/v1/gym/route.ts
src/app/api/v1/schedule/route.ts
src/app/api/v1/plans/route.ts
src/app/api/v1/testimonials/route.ts
src/app/api/v1/faq/route.ts
src/app/api/v1/leads/route.ts
prisma/schema.prisma                         # ApiKey model added
```

### WordPress Plugin

```
wordpress-plugin/matconnect-for-wordpress/
├── matconnect-for-wordpress.php             # Plugin entry point
├── package.json                             # @wordpress/scripts build
├── includes/
│   ├── class-settings.php                  # Options API wrapper
│   ├── class-api-client.php                # HTTP client + transient cache
│   ├── class-blocks.php                    # Block registration + render callbacks
│   └── shortcodes.php                      # [matconnect_*] shortcodes
├── blocks/
│   ├── schedule/   (block.json, edit.js, render.php)
│   ├── pricing/    (block.json, edit.js, render.php)
│   ├── lead-form/  (block.json, edit.js, render.php)
│   ├── testimonials/ (block.json, edit.js, render.php)
│   └── faq/        (block.json, edit.js, render.php)
├── admin/
│   └── settings-page.php
└── assets/
    ├── css/matconnect.css
    └── js/
        ├── lead-form.js
        └── faq.js
```

---

## How to Test

1. In MatConnect admin → Settings → Integrations, generate an API key.
2. `curl -H "Authorization: Bearer mc_live_..." https://your-matconnect-url/api/v1/schedule` — should return JSON.
3. Invalid key → 401. Disabled key → 401.
4. Install the plugin on a local WordPress (LocalWP recommended).
5. Go to Settings → MatConnect, enter URL + key, click Test Connection — should show gym name.
6. Add a Schedule block to a page, publish, visit page — should show live class schedule.
7. Submit the Lead Form — lead should appear in MatConnect admin → Leads.
8. Click Clear Cache — next page load fetches fresh data.

## See Also

- `docs/WORDPRESS_PLUGIN.md` — full user-facing installation and usage guide
- `docs/ROADMAP.md` — broader product roadmap context
