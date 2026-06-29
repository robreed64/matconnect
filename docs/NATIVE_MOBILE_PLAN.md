# Native Mobile App — Implementation Plan

**Status**: Plan (no code yet)
**Date**: 2026-06-29
**Related**: `docs/ROADMAP.md` (Phase 3), `docs/EXECUTIVE_SUMMARY.md`

> Goal: a native iOS/Android member app. The web member portal already delivers
> the core experience; native adds engagement (real push, biometric login,
> home-screen presence) and matches competitors who all ship apps. This is the
> largest of the remaining gaps and the least urgent — sequence it after
> multi-location.

---

## 1. What already exists (reuse, don't rebuild)

- **Web member portal**: profile, schedule (+ booking), attendance, curriculum, progress (`src/app/member/*`).
- **Member API**: `/api/member/{profile,schedule,bookings,payment-method,photo,qr-token,change-password,setup-intent}`.
- **Member auth**: `requireMember()` (role `member`/`parent` + `memberId`), NextAuth **JWT** sessions.
- **Web push**: VAPID via `web-push` (`src/lib/web-push.ts`) — used for reminders + waitlist. Native needs APNs/FCM instead.

The app is a **new client over the existing API**, not a new backend.

---

## 2. Approach

**React Native via Expo.** Reuses TypeScript + the team's React knowledge, gives
one codebase for iOS/Android, and EAS handles builds/submission. (A WebView/PWA
wrapper is cheaper but loses native push quality and store credibility — not
recommended for the engagement goal.)

---

## 3. Auth (the one real backend change)

NextAuth sessions are **cookie-based**, which doesn't fit a native app cleanly.
Add a small token layer:

- **`POST /api/mobile/auth/login`** — validates email/password (bcrypt, same as `src/auth.ts`), returns a signed JWT (reuse `AUTH_SECRET`) + minimal profile. App stores it in secure storage (Expo SecureStore / Keychain / Keystore).
- **`requireMobileMember(req)`** — verifies a `Bearer` token, returns `memberId`. Make the existing `/api/member/*` handlers accept **either** a cookie session **or** a Bearer token (small shared helper wrapping `requireMember` + token path), so the app reuses them unchanged.
- Token refresh: long-lived token + re-login on 401 for v1; rotate later.

> Prohibited-action note: account creation / password entry stays in the app's
> own secure fields against our API — never have the agent enter credentials.

---

## 4. Feature scope (parity with portal)

| Screen | Source API |
|--------|------------|
| Login | new `/api/mobile/auth/login` |
| Schedule + book/cancel | `/api/member/schedule`, `/api/member/bookings` |
| Attendance history | member attendance data |
| Belt progress | progress data (reuse `getMemberRisk`-style reads) |
| Profile + photo | `/api/member/profile`, `/api/member/photo` |
| Check-in QR | `/api/member/qr-token` (show QR for kiosk scan) |
| Payments (view; update later) | `/api/member/payment-method` |

---

## 5. Push notifications (native)

- Register device push tokens (Expo Push tokens or raw FCM/APNs) in a new
  `MobilePushToken` table (or extend `PushSubscription` with a `platform`).
- Add a **native sender** alongside `web-push` and call it from the existing
  reminder/waitlist paths (`src/lib/reminders.ts`, `src/lib/waitlist.ts`) so
  both web and native members get notified.
- Requires APNs key (Apple) + FCM config (Google), wired via Expo.

---

## 6. Phases & effort (directional)

| Phase | Work | Est. |
|------|------|------|
| 1 | Expo scaffold, `/api/mobile/auth/login`, dual-auth helper, login + schedule | ~1.5 wk |
| 2 | Booking, attendance, progress, profile, QR check-in | ~1.5 wk |
| 3 | Native push (token table + sender + wire into reminders/waitlist) | ~1 wk |
| 4 | Payments view, polish, offline schedule cache | ~1 wk |
| 5 | EAS build + App Store / Play Store submission | ~1 wk + review time |
| | **Total** | **~6 weeks** (separate track; can run parallel to web work) |

---

## 7. Risks & dependencies

1. **Store accounts & review** — Apple Developer ($99/yr) + Google Play ($25 one-time); App Store review adds days–weeks of lead time. **You must create these accounts** (credentialed signups are out of scope for the agent).
2. **Push infrastructure** — APNs cert/key + FCM setup is fiddly; budget time.
3. **Two clients to maintain** — RN reuses the language, not the components; ongoing cost.
4. **Secure token storage** — use platform secure storage; never persist tokens in plain async storage.
5. **Multi-gym?** — if the app must serve members of *different* gyms (multi-tenant), it needs a gym/tenant selector and ties to the multi-tenant work (see `MULTI_LOCATION_PLAN.md` §9). For a single-org deployment this isn't needed.

---

**Document Version**: 1.0
