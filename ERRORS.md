# Errors & Mistakes Log

A running record of bugs, mistakes, and lessons learned during development.

---

## React

### Stale closure — `useCallback` missing a state dep
**Error:** Password typed at kiosk signup was silently dropped; member always received a temp password instead of the one they chose.
**Cause:** `submitEnroll` in `KioskSignup.tsx` used `password` inside the callback body but the deps array was `[name, email, phone, ageGroup]`. The callback was last memoized before the user typed their password (name/email/phone are filled first), so it captured `password = ""` and never updated.
**Fix:** Added `password` to the `useCallback` deps array.
**Rule:** Every state or prop variable read inside a `useCallback` or `useMemo` must appear in the deps array. ESLint rule `react-hooks/exhaustive-deps` catches this automatically — worth enabling if not already on.

---

## Auth / NextAuth

### Prisma imported in Edge Runtime (middleware)
**Error:** `A Node.js module is loaded ('crypto') which is not supported in the Edge Runtime`
**Cause:** `middleware.ts` imported `auth` from `auth.ts`, which imported `prisma` from `lib/prisma.ts`. Prisma uses Node.js-specific APIs that are not available in Next.js Edge Runtime (where middleware runs).
**Fix:** Split auth config into two files:
- `auth.config.ts` — Edge-safe config (no Prisma, no bcryptjs). Used by middleware.
- `auth.ts` — Full config with Credentials provider + Prisma + bcryptjs. Used by API routes and server components only.
**Middleware** now does `NextAuth(authConfig).auth` from `auth.config.ts`.

### Missing NEXTAUTH_URL
**Error:** Login returned `MissingCSRF` / auth silently failed
**Cause:** `NEXTAUTH_URL` was not set in `.env.local`. NextAuth uses this for CSRF validation and redirect URL verification.
**Fix:** Added `NEXTAUTH_URL="http://localhost:3000"` to `.env.local`.

### Dev server not restarted after env changes
**Error:** "Invalid email or password" even with correct credentials
**Cause:** `AUTH_SECRET` was added to `.env.local` after the dev server was already running. Next.js does not hot-reload env changes — the server had no secret, so JWT signing/verification failed silently.
**Fix:** Always restart `npm run dev` after adding or changing values in `.env.local`.

---

## Portal / Session

### session.user.id not populated in NextAuth v5 JWT sessions
**Error:** Parent portal showed "Your account is not linked to a member profile" even after logging in as Bob.
**Cause:** `session.user.id` is not reliably set in NextAuth v5 when using JWT strategy — the portal page used it to look up the user (`prisma.user.findUnique({ where: { id: userId } })`), which resolved to `id: 0` and returned null.
**Fix:** Look up the user by `session.user.email` instead (`prisma.user.findUnique({ where: { email: session.user.email! } })`). Email is always present in the JWT session.

---

## Build / Webpack

### Stale .next directory after manual deletion
**Error:** `ENOENT: no such file or directory, open '.next/fallback-build-manifest.json'`
**Cause:** The `.next` directory was deleted mid-session (during a `next build` test) while the dev server was running or had been run. Next.js expected build artifacts that no longer existed.
**Fix:** `rm -rf .next` then restart `npm run dev`. The directory is regenerated automatically on startup.

---

## Hydration

### Date object passed as prop to client component
**Error:** `Hydration failed because the server rendered HTML didn't match the client`
**Cause:** `WeekCalendar` received a `Date` object as a prop. The server and client serialize dates differently, causing a mismatch.
**Fix:** Pass `weekStartISO` as an ISO string (`date.toISOString()`). Parse it on the client side only.

### `new Date()` used in render
**Error:** Hydration mismatch on "today" highlight in calendar
**Cause:** `new Date()` called directly in the render function produces different values on server vs client.
**Fix:** Use `useEffect(() => { setToday(toLocalISODate(new Date())); }, [])` so the value is only set client-side.

### `toLocaleTimeString` timezone mismatch
**Error:** Hydration mismatch on timestamp cells in RosterClient
**Cause:** `toLocaleTimeString` formats differently on server (UTC) vs client (local timezone).
**Fix:** Add `suppressHydrationWarning` to the specific cell element.

---

## Prisma / Database

### Prisma CLI can't find DATABASE_URL
**Error:** `Environment variable not found: DATABASE_URL`
**Cause:** Prisma CLI doesn't automatically load `.env.local` (only `.env`).
**Fix:** Install `dotenv-cli` and prefix all db scripts: `dotenv -e .env.local -- npx prisma ...`

### PostgreSQL password auth failed
**Error:** `password authentication failed for user "rob"`
**Cause:** Trying to connect via TCP with a password when the local PostgreSQL user has no password set.
**Fix:** Use Unix socket URL: `postgresql://rob@localhost/bjj_checkin?host=/var/run/postgresql`. Run `sudo -u postgres createuser -s rob` to create a superuser matching the OS username (peer auth).

### Prisma `programId` union type error
**Error:** TypeScript error when passing `programId` in class creation
**Cause:** Prisma generated a union type that didn't accept the value directly.
**Fix:** Used `as any` cast at the specific call site.

---

## Stripe

### Hardcoded Stripe API version type error
**Error:** TypeScript error on `apiVersion: "2025-05-28.basil"`
**Cause:** The Stripe SDK type definitions didn't include that API version string.
**Fix:** Removed the hardcoded `apiVersion` from the Stripe constructor and let the SDK use its default.

---

## Routing / Pages

### "Add Member" button 404
**Error:** Clicking "Add Member" showed a blank 404 page
**Cause:** `/admin/members/new` page file had not been created yet.
**Fix:** Created `src/app/admin/members/new/page.tsx` and `src/app/api/admin/members/route.ts`.

---

## Setup / Scaffolding

### `create-next-app` failed — directory not empty
**Error:** `create-next-app` refused to run because the target directory already had files
**Fix:** Manually scaffolded all project files (package.json, tsconfig, tailwind config, etc.) instead of using the CLI.

### `autoprefixer` missing
**Error:** PostCSS error on dev server start
**Fix:** `npm install --save-dev autoprefixer` and restart the dev server from the correct directory.

---

## Seeding

### Seed code inserted outside `main()` function
**Error:** `TS1128: Declaration or statement expected` at the closing `}` of `main()`.
**Cause:** The Edit tool's `old_string` matched `}\n\nmain()` (the end of `main()` + the call), so the replacement reopened a new block outside the function body. The new workflow seed code ended up in module scope.
**Fix:** Match only the tail of the function body (the last `console.log` line + closing brace), not the `main()` call itself, so the replacement appends before the close brace rather than after it.

### Plans edit page was a 404
**Error:** `/admin/plans/{id}/edit` returned a 404 — the route directory was never created.
**Cause:** The plans list page had an Edit link pointing to `/admin/plans/${plan.id}/edit` but no corresponding `page.tsx` existed there, and the `plans/[id]/route.ts` had no `GET` handler for the edit page to load plan data.
**Fix:** Created `src/app/admin/plans/[id]/edit/page.tsx` (client component, fetches plan on mount) and added a `GET` handler to `src/app/api/admin/plans/[id]/route.ts`.

### Hydration mismatch — `new Date()` in `useState` initializer
**Error:** `Hydration failed because the server rendered HTML didn't match the client`
**Cause:** `ClassForm.tsx` used `new Date().toLocaleDateString("en-CA")` as the default value for the `date` field inside `useState(...)`. This runs during SSR (server, UTC timezone) AND again during client hydration (browser local timezone). In US timezones behind UTC the two calls can return different calendar dates, so the rendered `<input value>` mismatches.
**Fix:** Initialize `date` to `""` in state. Use `useEffect(() => { setForm(f => ({...f, date: new Date().toLocaleDateString("en-CA")})); }, [])` to set it client-side only, after hydration.
**Rule:** Never call `new Date()` / `Date.now()` directly inside `useState(initialValue)` for values that appear in rendered output. Set them in `useEffect` instead.

### Stale Prisma singleton after `db push` — `findMany` undefined
**Error:** `TypeError: Cannot read properties of undefined (reading 'findMany')`
**Cause:** `lib/prisma.ts` caches the `PrismaClient` instance on `globalThis` to survive Next.js hot reloads. When `prisma db push` regenerates the Prisma client (adding new models like `curriculum`), the running dev server keeps the old cached instance that pre-dates the schema change. Calls to `prisma.curriculum.findMany()` fail because `prisma.curriculum` is `undefined` on the stale client.
**Fix:** Restart the dev server (`npm run dev`) after any `prisma db push` or `prisma generate` that adds new models. The restart clears `globalThis`, forcing a fresh `PrismaClient` with the updated schema.

### Hydration mismatch — `toLocaleDateString`/`toLocaleTimeString` in WeekCalendar
**Error:** `Hydration failed because the server rendered HTML didn't match the client`
**Cause:** `WeekCalendar.tsx` (a client component) calls `toLocaleDateString` and `toLocaleTimeString` to render month headers, day numbers, and class times. During SSR the server runs in UTC; the browser runs in the user's local timezone. These calls produce different strings (e.g., "June 2026" vs "May 2026" or "6:00 PM" vs "2:00 PM"), causing the HTML to mismatch on hydration.
**Fix:** Added `suppressHydrationWarning` to every element whose text is produced by locale-aware date formatting. The browser silently accepts the mismatch and re-renders with the correct local time after hydration.
