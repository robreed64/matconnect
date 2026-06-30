# RFID Wristband Check-In System

## Context

MatConnect already has a full check-in system (QR codes, name search, kiosk UI). This feature adds NFC wristbands (13.56 MHz) as a third check-in method, targeted at kids in martial arts classes. A Raspberry Pi with an RC522 reader sits at the gym entrance — kids tap their wristband and get immediate LED + buzzer feedback. This coexists with existing QR and name-search check-in flows.

---

## Architecture

```
[Kid taps NFC wristband]
         ↓
[RC522 reader on Raspberry Pi]
         ↓
[Python script reads UID → hex string]
         ↓
POST /api/checkin { rfidToken: "A3F2C1D4" }
  + X-RFID-Key: <shared secret>
         ↓
[MatConnect API]
  → Finds member by rfidToken
  → Detects active class (startTime ≤ now ≤ endTime)
  → Validates membership status + waiver
  → Records attendance (with or without classId)
  → Returns { success, memberName, milestone? }
         ↓
[Pi controls LED + buzzer]
  → Green LED + 1 beep   = success
  → Red LED + 2 beeps    = failure
  → Red LED + 3 long     = no internet
```

Wristband assignment: a separate cheap USB NFC reader (~$20) at the admin desk uses HID keyboard emulation to fill in the UID on the member profile page. Staff can also type the UID manually.

---

## Database Changes

**File:** `prisma/schema.prisma`

Add one field to the `Member` model:

```prisma
rfidToken String? @unique
```

Nullable (most members won't have a wristband), unique (prevents two members sharing a tag). Mirrors the existing `checkinToken` field pattern.

Run `prisma migrate dev --name add-rfid-token`.

---

## API Changes

### 1. Check-in endpoint (`src/app/api/checkin/route.ts`)

**RFID lookup:** Accept `rfidToken` in the request body alongside the existing `token` (QR) and `memberId`. If `rfidToken` is present, look up `prisma.member.findUnique({ where: { rfidToken } })`. Rest of the validation flow (membership status, waiver, 4-hour duplicate window) is unchanged.

**Active class detection:** When no `classId` is provided (Pi never sends one), query:
```ts
prisma.class.findFirst({
  where: {
    startTime: { lte: now },
    endTime: { gte: now },
  },
  orderBy: { startTime: 'desc' },
})
```
If found, attach `classId` to the attendance record. If not, record as a general arrival (classId null).

**Authentication for RFID requests:** Add a simple shared-secret check when `rfidToken` is present — validate `request.headers.get('X-RFID-Key') === process.env.RFID_API_KEY`. Return 401 if missing or wrong. This prevents unauthenticated RFID check-ins from the internet.

### 2. Member update endpoint (`src/app/api/admin/members/[id]/route.ts`)

Accept `rfidToken` in the PATCH body and save it to the member record. Already handles general member updates — just pass the new field through Prisma.

---

## Admin UI Changes

**File:** `src/app/admin/members/[id]/` (member profile page)

Add a "Wristband" card section showing one of two states:

**No wristband assigned:**
- "Assign Wristband" button opens a modal
- Modal has two options:
  - **Tap to assign:** focuses a hidden input, USB reader at desk types UID via HID emulation → auto-fills
  - **Manual entry:** text input for UID typed by staff
- On confirm: PATCH `/api/admin/members/[id]` with `{ rfidToken }`

**Wristband assigned:**
- Shows last 4 chars of UID (e.g., `···· A3F2`) 
- "Remove" button unlinks the wristband (sets rfidToken to null)

---

## Error States

| Scenario | LED | Buzzer |
|----------|-----|--------|
| Unknown wristband | Red | 2 short beeps |
| Membership lapsed/canceled | Red | 2 short beeps |
| Waiver not signed | Red | 2 short beeps |
| Already checked in (4hr window) | Green | 1 beep (idempotent) |
| API unreachable | Red | 3 long beeps |

Pi retries once after 3 seconds on network failure before giving the error signal.

---

## Pi Hardware

| Part | Approx. Cost |
|------|-------------|
| Raspberry Pi Zero 2 W | ~$15 |
| RC522 NFC module | ~$5 |
| Green + red LEDs | ~$2 |
| Active buzzer | ~$2 |
| USB power supply | ~$8 |
| Project enclosure | ~$10 |
| **Total** | **~$42** |

Plus ~$20 USB NFC reader at the admin desk for wristband assignment.

Wristbands: NTAG213 or MIFARE Classic silicone NFC wristbands, ~$0.60–1.00 each in bulk (search "silicone NFC wristband NTAG213").

---

## Pi Software

A single Python script (`checkin.py`) runs on boot via systemd:

```python
# Dependencies: mfrc522, RPi.GPIO, requests
# Config: MATCONNECT_URL, RFID_API_KEY in /etc/checkin.env

while True:
    uid = wait_for_nfc_tag()           # blocks until tap
    hex_uid = uid_to_hex(uid)
    response = post_checkin(hex_uid)   # POST /api/checkin
    if response.success:
        green_led_on(); single_beep()
    else:
        red_led_on(); double_beep()
    sleep(2)                           # cooldown
```

Config file `/etc/checkin.env`:
```
MATCONNECT_URL=https://your-gym.matconnect.com
RFID_API_KEY=<shared secret>
```

Setup: Raspberry Pi OS Lite, Python 3, two pip packages, one systemd unit file. Can be documented in a `pi-setup.md` file in the repo.

---

## Environment Variables

Add to MatConnect (Vercel):
- `RFID_API_KEY` — shared secret between Pi and MatConnect API

Add to Pi `/etc/checkin.env`:
- `MATCONNECT_URL`
- `RFID_API_KEY`

---

## Verification

1. **Unit test:** POST `/api/checkin` with `rfidToken` of a member with an active class → attendance record created with correct classId
2. **Unit test:** POST with unknown rfidToken → 404
3. **Unit test:** POST without `X-RFID-Key` header → 401
4. **Manual:** Assign a wristband UID to a test member via admin UI (both tap-to-assign and manual)
5. **Manual:** On a Pi or simulated with curl, POST check-in with that UID → verify green response
6. **Manual:** POST with no class running → attendance record has null classId
7. **Manual:** POST while a class is active → attendance record links to correct class

---

## Files to Create or Modify

| File | Change |
|------|--------|
| `prisma/schema.prisma` | Add `rfidToken String? @unique` to Member |
| `prisma/migrations/` | New migration file |
| `src/app/api/checkin/route.ts` | RFID lookup + active class detection + API key check |
| `src/app/api/admin/members/[id]/route.ts` | Accept rfidToken in PATCH |
| `src/app/admin/members/[id]/` | Wristband assignment card + modal |
| `pi/checkin.py` | New Pi Python script |
| `pi/checkin.env.example` | Example env file for Pi setup |
| `pi/setup.md` | Pi hardware wiring + software setup guide |
| `docs/superpowers/specs/2026-06-30-rfid-wristband-checkin-design.md` | This spec |
