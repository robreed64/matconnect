# RFID Wristband Check-In Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add NFC wristband tap-to-check-in for kids at the gym entrance via a Raspberry Pi + RC522 reader, coexisting with existing QR and name-search flows.

**Architecture:** A Raspberry Pi with an RC522 reader calls `POST /api/checkin` with the wristband's UID as `rfidToken`. The API looks up the member, auto-detects any currently active class, validates the member, and records attendance. An admin UI card on the member profile lets staff assign/unassign wristbands.

**Tech Stack:** Next.js 15 App Router, Prisma (PostgreSQL), Vitest, Tailwind CSS, React 19; Python 3 + mfrc522 + RPi.GPIO on the Pi.

## Global Constraints

- TypeScript strict mode throughout
- Tailwind only for styles — no inline CSS or new CSS files
- Follow existing dark theme: `bg-[#0f1117]`, `border-gray-700/50`, `text-gray-400`
- `useRouter().refresh()` to revalidate server data after client mutations
- Prisma field names use snake_case in `@map()`, camelCase in TS
- Vitest for tests — files named `*.test.ts`, placed next to the module they test
- Pi files live in `pi/` directory at the repo root

---

### Task 1: Add rfidToken to Prisma schema + migrate

**Files:**
- Modify: `prisma/schema.prisma` (Member model, line ~29)

**Interfaces:**
- Produces: `Member.rfidToken: String | null` — available to all subsequent tasks

- [ ] **Step 1: Add the field to the Member model**

In `prisma/schema.prisma`, after the `checkinToken` line (line 29), add:

```prisma
  rfidToken        String?   @unique @map("rfid_token")
```

The full block around it should look like:

```prisma
  checkinToken     String?   @unique @map("checkin_token")
  rfidToken        String?   @unique @map("rfid_token")
  beltStripes      Int       @default(0) @map("belt_stripes")
```

- [ ] **Step 2: Run the migration**

```bash
npx prisma migrate dev --name add-rfid-token
```

Expected output includes:
```
✔ Generated Prisma Client
The following migration(s) have been applied: ..._add_rfid_token
```

- [ ] **Step 3: Confirm the field exists in generated types**

```bash
grep -n "rfidToken" node_modules/.prisma/client/index.d.ts | head -5
```

Expected: lines showing `rfidToken?: string | null`

- [ ] **Step 4: Commit**

```bash
git add prisma/schema.prisma prisma/migrations/
git commit -m "feat: add rfidToken field to Member for NFC wristband check-in"
```

---

### Task 2: Active-class detection helper + tests

**Files:**
- Create: `src/lib/active-class.ts`
- Create: `src/lib/active-class.test.ts`

**Interfaces:**
- Produces: `selectActiveClass<T extends { id: number; startTime: Date; endTime: Date }>(classes: T[], now: Date): T | null`

- [ ] **Step 1: Write the failing test**

Create `src/lib/active-class.test.ts`:

```ts
import { describe, it, expect } from "vitest";
import { selectActiveClass } from "./active-class";

const make = (id: number, startMinsAgo: number, endMinsFromNow: number, now: Date) => ({
  id,
  startTime: new Date(now.getTime() - startMinsAgo * 60_000),
  endTime:   new Date(now.getTime() + endMinsFromNow * 60_000),
});

describe("selectActiveClass", () => {
  const now = new Date("2026-06-30T10:00:00Z");

  it("returns null when no classes", () => {
    expect(selectActiveClass([], now)).toBeNull();
  });

  it("returns null when class hasn't started yet", () => {
    const cls = make(1, -5, 60, now); // starts 5 min in the future
    expect(selectActiveClass([cls], now)).toBeNull();
  });

  it("returns null when class already ended", () => {
    const cls = make(1, 90, -5, now); // ended 5 min ago
    expect(selectActiveClass([cls], now)).toBeNull();
  });

  it("returns active class", () => {
    const cls = make(1, 30, 30, now); // started 30 min ago, ends in 30
    expect(selectActiveClass([cls], now)).toEqual(cls);
  });

  it("returns most recently started when multiple active", () => {
    const earlier = make(1, 60, 30, now);
    const later   = make(2, 20, 30, now);
    expect(selectActiveClass([earlier, later], now)?.id).toBe(2);
  });
});
```

- [ ] **Step 2: Run test to confirm it fails**

```bash
npm test -- active-class
```

Expected: FAIL with "Cannot find module './active-class'"

- [ ] **Step 3: Implement the helper**

Create `src/lib/active-class.ts`:

```ts
export function selectActiveClass<T extends { id: number; startTime: Date; endTime: Date }>(
  classes: T[],
  now: Date,
): T | null {
  const active = classes.filter(
    (c) => c.startTime <= now && c.endTime >= now,
  );
  if (active.length === 0) return null;
  return active.sort((a, b) => b.startTime.getTime() - a.startTime.getTime())[0];
}
```

- [ ] **Step 4: Run test to confirm it passes**

```bash
npm test -- active-class
```

Expected: PASS (5 tests)

- [ ] **Step 5: Commit**

```bash
git add src/lib/active-class.ts src/lib/active-class.test.ts
git commit -m "feat: add selectActiveClass helper for RFID auto class detection"
```

---

### Task 3: Update check-in API for RFID

**Files:**
- Modify: `src/app/api/checkin/route.ts`

**Interfaces:**
- Consumes: `selectActiveClass` from `@/lib/active-class`
- Consumes: `Member.rfidToken` (Task 1)
- Request body adds: `rfidToken?: string`
- Request header adds: `X-RFID-Key` (required when rfidToken present)
- Attendance `source` adds new value: `"rfid"`

- [ ] **Step 1: Replace the route with the updated version**

Replace the entire contents of `src/app/api/checkin/route.ts`:

```ts
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { milestoneFor } from "@/lib/milestones";
import { countActiveBookings } from "@/lib/waitlist";
import { selectActiveClass } from "@/lib/active-class";

// Re-checking in within this window returns the existing record instead of
// creating a duplicate (kiosk retries, POS day-pass + waiver-sign flow)
const DUPLICATE_WINDOW_MS = 4 * 60 * 60 * 1000;

export async function POST(req: NextRequest) {
  const { memberId, classId, token, rfidToken } = await req.json();

  // RFID requests from the Pi must include the shared secret
  if (rfidToken) {
    const apiKey = req.headers.get("X-RFID-Key");
    if (!apiKey || apiKey !== process.env.RFID_API_KEY) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
  }

  // Resolve member by RFID UID, QR token, or raw id
  const member = rfidToken
    ? await prisma.member.findUnique({ where: { rfidToken } })
    : token
    ? await prisma.member.findUnique({ where: { checkinToken: token } })
    : memberId
    ? await prisma.member.findUnique({ where: { id: Number(memberId) } })
    : null;

  if (!member) return NextResponse.json({ error: "Member not found" }, { status: 404 });
  if (member.status === "canceled") return NextResponse.json({ error: "Membership canceled" }, { status: 403 });

  // Everyone needs a waiver on file before training (enroll stamps it; trials,
  // imports, and day-pass walk-ins sign at the kiosk)
  if (!member.waiverSignedAt) {
    return NextResponse.json({
      waiverRequired: true,
      member: { id: member.id, name: member.name, beltRank: member.beltRank },
    });
  }

  // RFID taps auto-detect the currently running class; explicit classId wins
  let resolvedClassId: number | null = classId ?? null;
  if (rfidToken && !classId) {
    const now = new Date();
    const classes = await prisma.class.findMany({
      where: { startTime: { lte: now }, endTime: { gte: now } },
      select: { id: true, startTime: true, endTime: true },
    });
    resolvedClassId = selectActiveClass(classes, now)?.id ?? null;
  }

  // Idempotent: a recent identical check-in (retry after a flaky response, or a
  // day-pass walk-in already checked in at the POS) is returned, not duplicated
  const recentDuplicate = await prisma.attendance.findFirst({
    where: {
      memberId: member.id,
      classId: resolvedClassId,
      timestamp: { gte: new Date(Date.now() - DUPLICATE_WINDOW_MS) },
    },
  });

  const source = rfidToken ? "rfid" : "kiosk";
  const record = recentDuplicate ?? await prisma.attendance.create({
    data: { memberId: member.id, classId: resolvedClassId, source },
  });

  if (resolvedClassId) {
    const existing = await prisma.booking.findFirst({
      where: { memberId: member.id, classId: resolvedClassId, status: { in: ["booked", "attended", "waitlisted"] } },
    });
    if (existing?.status === "booked") {
      await prisma.booking.update({ where: { id: existing.id }, data: { status: "attended" } });
    } else if (existing?.status === "waitlisted") {
      // Walk-in from the waitlist: claim a seat only if one is free; otherwise
      // they train (door policy) but stay waitlisted so promotion math holds
      const cls = await prisma.class.findUnique({ where: { id: resolvedClassId }, select: { capacity: true } });
      const hasSpace = cls?.capacity == null || (await countActiveBookings(resolvedClassId)) < cls.capacity;
      if (hasSpace) {
        await prisma.booking.update({ where: { id: existing.id }, data: { status: "attended" } });
      }
    } else if (!existing) {
      await prisma.booking.create({ data: { memberId: member.id, classId: resolvedClassId, status: "attended" } });
    }
    // existing "attended" → nothing to do
  } else {
    // Day check-in (kiosk default or RFID with no active class): one sign-in
    // covers every class they came for — mark all booked classes attended
    await prisma.booking.updateMany({
      where: {
        memberId: member.id,
        status: "booked",
        class: {
          startTime: {
            gte: new Date(Date.now() - 2 * 60 * 60 * 1000),  // started recently (running late)
            lte: new Date(Date.now() + 12 * 60 * 60 * 1000), // or later today
          },
        },
      },
      data: { status: "attended" },
    });
  }

  const totalClasses = await prisma.attendance.count({ where: { memberId: member.id } });

  return NextResponse.json({
    success: true,
    attendanceId: record.id,
    totalClasses,
    milestone: milestoneFor(totalClasses),
    member: { name: member.name, beltRank: member.beltRank },
  });
}
```

- [ ] **Step 2: Verify TypeScript compiles**

```bash
npx tsc --noEmit
```

Expected: no errors

- [ ] **Step 3: Smoke-test with curl (with RFID_API_KEY set locally)**

Set a temporary env var and test the 401 path:
```bash
curl -s -X POST http://localhost:3000/api/checkin \
  -H "Content-Type: application/json" \
  -d '{"rfidToken":"AABBCCDD"}' | jq .
```

Expected: `{"error":"Unauthorized"}`

- [ ] **Step 4: Commit**

```bash
git add src/app/api/checkin/route.ts
git commit -m "feat: support rfidToken check-in with API key auth and auto active-class detection"
```

---

### Task 4: Member PATCH API — accept rfidToken

**Files:**
- Modify: `src/app/api/admin/members/[id]/route.ts`

**Interfaces:**
- Consumes: `Member.rfidToken` (Task 1)
- PATCH body adds: `rfidToken?: string | null`

- [ ] **Step 1: Add rfidToken to the PATCH data block**

In `src/app/api/admin/members/[id]/route.ts`, inside the `prisma.member.update` data block (after the `waiverSigned` block, around line 59), add:

```ts
      ...(body.rfidToken !== undefined && { rfidToken: body.rfidToken || null }),
```

The full data block should end like:

```ts
      ...(body.waiverSigned !== undefined && {
        waiverSignedAt: body.waiverSigned ? new Date() : null,
        ...(body.waiverSigned === false && { waiverDocumentUrl: null }),
      }),
      ...(body.rfidToken !== undefined && { rfidToken: body.rfidToken || null }),
```

- [ ] **Step 2: Verify TypeScript compiles**

```bash
npx tsc --noEmit
```

Expected: no errors

- [ ] **Step 3: Smoke-test**

With the dev server running, assign a fake UID to member id 1:
```bash
curl -s -X PATCH http://localhost:3000/api/admin/members/1 \
  -H "Content-Type: application/json" \
  -H "Cookie: <your-session-cookie>" \
  -d '{"rfidToken":"TEST1234"}' | jq .rfidToken
```

Expected: `"TEST1234"`

Clear it:
```bash
curl -s -X PATCH http://localhost:3000/api/admin/members/1 \
  -H "Content-Type: application/json" \
  -H "Cookie: <your-session-cookie>" \
  -d '{"rfidToken":null}' | jq .rfidToken
```

Expected: `null`

- [ ] **Step 4: Commit**

```bash
git add src/app/api/admin/members/\[id\]/route.ts
git commit -m "feat: accept rfidToken in member PATCH for wristband assignment"
```

---

### Task 5: WristbandManager client component

**Files:**
- Create: `src/app/admin/members/[id]/WristbandManager.tsx`

**Interfaces:**
- Props: `{ memberId: number; initialRfidToken: string | null; readOnly: boolean }`
- Consumes: `PATCH /api/admin/members/[id]` with `{ rfidToken: string | null }`

- [ ] **Step 1: Create the component**

Create `src/app/admin/members/[id]/WristbandManager.tsx`:

```tsx
"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";

export default function WristbandManager({
  memberId,
  initialRfidToken,
  readOnly = false,
}: {
  memberId: number;
  initialRfidToken: string | null;
  readOnly?: boolean;
}) {
  const router = useRouter();
  const [rfidToken, setRfidToken] = useState(initialRfidToken);
  const [showModal, setShowModal] = useState(false);
  const [inputValue, setInputValue] = useState("");
  const [tapMode, setTapMode] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const save = async (token: string | null) => {
    setBusy(true);
    setError(null);
    const res = await fetch(`/api/admin/members/${memberId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ rfidToken: token }),
    });
    setBusy(false);
    if (!res.ok) {
      const data = await res.json().catch(() => null);
      setError(data?.error ?? "Failed to save — try again");
      return;
    }
    setRfidToken(token);
    setShowModal(false);
    setInputValue("");
    setTapMode(false);
    router.refresh();
  };

  const handleRemove = () => save(null);

  const handleAssign = () => {
    const uid = inputValue.trim().toUpperCase().replace(/\s/g, "");
    if (!uid) { setError("Enter or tap a wristband UID"); return; }
    save(uid);
  };

  const enableTapMode = () => {
    setTapMode(true);
    setInputValue("");
    setTimeout(() => inputRef.current?.focus(), 50);
  };

  const maskedUid = rfidToken
    ? `···· ${rfidToken.slice(-4)}`
    : null;

  return (
    <div className="space-y-3">
      {rfidToken ? (
        <div className="flex items-center justify-between gap-3">
          <div>
            <span className="text-sm text-green-400 font-medium">Wristband assigned</span>
            <span className="ml-2 text-xs text-gray-500 font-mono">{maskedUid}</span>
          </div>
          {!readOnly && (
            <button
              onClick={handleRemove}
              disabled={busy}
              className="text-xs text-gray-500 hover:text-red-400 transition disabled:opacity-50"
            >
              Remove
            </button>
          )}
        </div>
      ) : (
        <div className="flex items-center justify-between gap-3">
          <span className="text-sm text-gray-500">No wristband assigned</span>
          {!readOnly && (
            <button
              onClick={() => { setShowModal(true); setError(null); }}
              className="text-xs px-3 py-1.5 rounded-lg bg-gray-800 hover:bg-gray-700 text-gray-300 transition"
            >
              Assign Wristband
            </button>
          )}
        </div>
      )}

      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60">
          <div className="bg-[#0f1117] border border-gray-700 rounded-xl p-6 w-full max-w-sm mx-4 shadow-xl">
            <h3 className="text-sm font-semibold text-white mb-4">Assign Wristband</h3>

            <div className="space-y-3">
              {tapMode ? (
                <p className="text-xs text-gray-400">
                  Tap the wristband on the USB reader at the desk…
                </p>
              ) : (
                <p className="text-xs text-gray-400">
                  Tap the wristband on the desk USB reader, or type the UID printed on it.
                </p>
              )}

              <input
                ref={inputRef}
                type="text"
                value={inputValue}
                onChange={(e) => setInputValue(e.target.value.toUpperCase())}
                onKeyDown={(e) => { if (e.key === "Enter") handleAssign(); }}
                placeholder="e.g. A3F2C1D4"
                className="w-full bg-gray-800 border border-gray-600 rounded-lg px-3 py-2 text-sm text-white placeholder-gray-600 font-mono focus:outline-none focus:border-gray-400"
              />

              {error && <p className="text-xs text-red-400">{error}</p>}

              <div className="flex gap-2 pt-1">
                {!tapMode && (
                  <button
                    onClick={enableTapMode}
                    className="flex-1 py-2 rounded-lg bg-gray-800 hover:bg-gray-700 text-sm text-gray-300 transition"
                  >
                    Tap to assign
                  </button>
                )}
                <button
                  onClick={handleAssign}
                  disabled={busy || !inputValue.trim()}
                  className="flex-1 py-2 rounded-lg bg-white text-gray-900 text-sm font-medium hover:bg-gray-100 transition disabled:opacity-40"
                >
                  {busy ? "Saving…" : "Confirm"}
                </button>
                <button
                  onClick={() => { setShowModal(false); setTapMode(false); setInputValue(""); setError(null); }}
                  disabled={busy}
                  className="px-3 py-2 rounded-lg text-sm text-gray-500 hover:text-gray-300 transition"
                >
                  Cancel
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
```

- [ ] **Step 2: Verify TypeScript compiles**

```bash
npx tsc --noEmit
```

Expected: no errors

- [ ] **Step 3: Commit**

```bash
git add src/app/admin/members/\[id\]/WristbandManager.tsx
git commit -m "feat: add WristbandManager component for NFC wristband assignment"
```

---

### Task 6: Wire WristbandManager into member profile page

**Files:**
- Modify: `src/app/admin/members/[id]/page.tsx`

**Interfaces:**
- Consumes: `WristbandManager` (Task 5)
- Consumes: `member.rfidToken` from Prisma query
- Placed next to the "Check-In QR Code" section (line ~221 in page.tsx)

- [ ] **Step 1: Add the import**

At the top of `src/app/admin/members/[id]/page.tsx`, add after the `MemberQRCode` import:

```ts
import WristbandManager from "./WristbandManager";
```

- [ ] **Step 2: Add the Wristband section after the QR Code section**

Find the closing of the `"Check-In QR Code"` Section block (around line 231):

```tsx
        {/* QR check-in */}
        {showCheckins && (
          <Section title="Check-In QR Code">
            <MemberQRCode
              memberId={member.id}
              memberName={member.name}
              gymName={gymSettings.gymName}
              beltRank={member.beltRank}
            />
          </Section>
        )}
```

Add the Wristband section immediately after it:

```tsx
        {/* NFC wristband */}
        {showCheckins && (
          <Section title="NFC Wristband">
            <WristbandManager
              memberId={member.id}
              initialRfidToken={member.rfidToken ?? null}
              readOnly={!canManage}
            />
          </Section>
        )}
```

- [ ] **Step 3: Verify TypeScript compiles**

```bash
npx tsc --noEmit
```

Expected: no errors

- [ ] **Step 4: Start dev server and verify the section appears**

```bash
npm run dev
```

Navigate to any member profile at `http://localhost:3000/admin/members/<id>`. Confirm:
- "NFC Wristband" section appears below "Check-In QR Code"
- Members without a wristband show "No wristband assigned" + "Assign Wristband" button
- Clicking "Assign Wristband" opens the modal
- Typing a UID and clicking "Confirm" saves it and shows the masked UID
- "Remove" button clears it

- [ ] **Step 5: Commit**

```bash
git add src/app/admin/members/\[id\]/page.tsx
git commit -m "feat: add NFC Wristband section to member profile page"
```

---

### Task 7: Pi files

**Files:**
- Create: `pi/checkin.py`
- Create: `pi/checkin.env.example`
- Create: `pi/setup.md`

**Interfaces:**
- Consumes: `POST /api/checkin` with `{ rfidToken }` + `X-RFID-Key` header (Task 3)
- Pi GPIO pins: GREEN=17, RED=27, BUZZ=22 (BCM numbering)
- RC522 uses SPI: MOSI=10, MISO=9, SCK=11, SDA/CS=8, RST=25

- [ ] **Step 1: Create the Python check-in script**

Create `pi/checkin.py`:

```python
#!/usr/bin/env python3
"""MatConnect NFC check-in reader — Raspberry Pi + RC522."""

import os
import time
import signal
import sys

from dotenv import load_dotenv
import RPi.GPIO as GPIO
import mfrc522
import requests

load_dotenv("/etc/checkin.env")

URL = os.environ["MATCONNECT_URL"].rstrip("/") + "/api/checkin"
API_KEY = os.environ["RFID_API_KEY"]

GREEN_PIN = 17
RED_PIN   = 27
BUZZ_PIN  = 22
COOLDOWN  = 2  # seconds between reads

GPIO.setmode(GPIO.BCM)
GPIO.setup(GREEN_PIN, GPIO.OUT, initial=GPIO.LOW)
GPIO.setup(RED_PIN,   GPIO.OUT, initial=GPIO.LOW)
GPIO.setup(BUZZ_PIN,  GPIO.OUT, initial=GPIO.LOW)


def _led(pin: int, duration: float) -> None:
    GPIO.output(pin, GPIO.HIGH)
    time.sleep(duration)
    GPIO.output(pin, GPIO.LOW)


def _beep(count: int, on: float = 0.12, gap: float = 0.10) -> None:
    for i in range(count):
        GPIO.output(BUZZ_PIN, GPIO.HIGH)
        time.sleep(on)
        GPIO.output(BUZZ_PIN, GPIO.LOW)
        if i < count - 1:
            time.sleep(gap)


def signal_success() -> None:
    _led(GREEN_PIN, 1.5)
    _beep(1)


def signal_failure() -> None:
    _led(RED_PIN, 1.5)
    _beep(2)


def signal_no_network() -> None:
    for _ in range(3):
        GPIO.output(RED_PIN,  GPIO.HIGH)
        GPIO.output(BUZZ_PIN, GPIO.HIGH)
        time.sleep(0.4)
        GPIO.output(RED_PIN,  GPIO.LOW)
        GPIO.output(BUZZ_PIN, GPIO.LOW)
        time.sleep(0.15)


def checkin(hex_uid: str) -> bool | None:
    """POST to MatConnect. Returns True=success, False=known failure, None=network error."""
    try:
        r = requests.post(
            URL,
            json={"rfidToken": hex_uid},
            headers={"X-RFID-Key": API_KEY, "Content-Type": "application/json"},
            timeout=5,
        )
        return r.status_code == 200 and r.json().get("success") is True
    except requests.exceptions.RequestException:
        return None


def cleanup(sig=None, _frame=None) -> None:
    GPIO.cleanup()
    sys.exit(0)


signal.signal(signal.SIGTERM, cleanup)
signal.signal(signal.SIGINT, cleanup)

reader = mfrc522.MFRC522()
print("MatConnect NFC reader running. Ctrl+C to stop.")

while True:
    status, _tag_type = reader.MFRC522_Request(reader.PICC_REQIDL)
    if status != reader.MI_OK:
        continue

    status, uid = reader.MFRC522_Anticoll()
    if status != reader.MI_OK:
        continue

    hex_uid = "".join(f"{b:02X}" for b in uid)
    print(f"Tag: {hex_uid}")

    result = checkin(hex_uid)
    if result is None:
        time.sleep(3)
        result = checkin(hex_uid)  # one retry

    if result is None:
        signal_no_network()
    elif result:
        signal_success()
    else:
        signal_failure()

    time.sleep(COOLDOWN)
```

- [ ] **Step 2: Create the env example file**

Create `pi/checkin.env.example`:

```
MATCONNECT_URL=https://your-gym.matconnect.com
RFID_API_KEY=replace-with-your-secret-key
```

- [ ] **Step 3: Create the setup guide**

Create `pi/setup.md`:

````markdown
# Raspberry Pi NFC Check-In Setup

## Hardware

| Part | Notes |
|------|-------|
| Raspberry Pi Zero 2 W | Any Pi works; Zero 2 W is cheapest |
| RC522 RFID/NFC module | ~$5, widely available |
| Green LED + 220Ω resistor | GPIO 17 |
| Red LED + 220Ω resistor | GPIO 27 |
| Active buzzer | GPIO 22 — must be **active** (not passive) |
| Micro USB power supply | 5V 1A minimum |
| Project enclosure | Optional but recommended |

### RC522 wiring (SPI)

| RC522 pin | Pi pin (BCM) | Pi physical pin |
|-----------|-------------|-----------------|
| SDA (CS)  | GPIO 8      | Pin 24          |
| SCK       | GPIO 11     | Pin 23          |
| MOSI      | GPIO 10     | Pin 19          |
| MISO      | GPIO 9      | Pin 21          |
| GND       | GND         | Pin 6           |
| RST       | GPIO 25     | Pin 22          |
| 3.3V      | 3.3V        | Pin 1           |

### LED + buzzer wiring

- Green LED anode → 220Ω resistor → GPIO 17 (Pin 11); cathode → GND
- Red LED anode → 220Ω resistor → GPIO 27 (Pin 13); cathode → GND
- Active buzzer + → GPIO 22 (Pin 15); buzzer − → GND

## Software Setup

### 1. Flash Raspberry Pi OS Lite (64-bit)

Use [Raspberry Pi Imager](https://www.raspberrypi.com/software/). In advanced options:
- Enable SSH
- Set hostname (e.g. `matconnect-reader`)
- Set WiFi credentials

### 2. Enable SPI

```bash
sudo raspi-config
# Interface Options → SPI → Enable
sudo reboot
```

### 3. Install dependencies

```bash
sudo apt update && sudo apt install -y python3-pip python3-dev
pip3 install mfrc522 RPi.GPIO requests python-dotenv
```

### 4. Deploy the script

```bash
sudo mkdir -p /opt/matconnect
sudo cp checkin.py /opt/matconnect/
sudo chmod +x /opt/matconnect/checkin.py
```

### 5. Configure environment

```bash
sudo cp checkin.env.example /etc/checkin.env
sudo nano /etc/checkin.env
# Fill in MATCONNECT_URL and RFID_API_KEY
sudo chmod 600 /etc/checkin.env
```

The `RFID_API_KEY` must match the `RFID_API_KEY` environment variable set in your
Vercel project settings.

### 6. Install the systemd service

```bash
sudo tee /etc/systemd/system/matconnect-checkin.service > /dev/null << 'EOF'
[Unit]
Description=MatConnect NFC Check-In Reader
After=network-online.target
Wants=network-online.target

[Service]
Type=simple
ExecStart=/usr/bin/python3 /opt/matconnect/checkin.py
Restart=always
RestartSec=5
User=root
EnvironmentFile=/etc/checkin.env
StandardOutput=journal
StandardError=journal

[Install]
WantedBy=multi-user.target
EOF

sudo systemctl daemon-reload
sudo systemctl enable matconnect-checkin
sudo systemctl start matconnect-checkin
```

### 7. Verify it's running

```bash
sudo systemctl status matconnect-checkin
sudo journalctl -u matconnect-checkin -f
```

Tap a wristband. You should see `Tag: AABBCCDD` in the logs and get LED/buzzer feedback.

## Wristband Assignment

You need a **second** USB NFC reader at the admin desk to assign wristbands.
Any USB reader with HID keyboard emulation works (search "USB NFC reader HID").

When the reader is plugged in:
1. Open the member profile in MatConnect
2. Click **Assign Wristband** → **Tap to assign**
3. Tap the wristband on the USB reader — the UID auto-fills
4. Click **Confirm**

## Troubleshooting

**Green LED never fires / always red:**
- Check `RFID_API_KEY` matches in Vercel env and `/etc/checkin.env`
- Check `MATCONNECT_URL` points to the live site (not localhost)

**Script crashes on import:**
- Run `sudo raspi-config` and confirm SPI is enabled

**No response at all:**
- Check wiring — RC522 must be on the correct SPI pins
- Test: `sudo python3 -c "import mfrc522; print('OK')"`
````

- [ ] **Step 4: Commit**

```bash
git add pi/
git commit -m "feat: add Raspberry Pi NFC reader script and setup guide"
```

---

### Task 8: Set RFID_API_KEY in Vercel environment

**Files:** None (environment variable, not code)

**Interfaces:**
- `process.env.RFID_API_KEY` must be set in production for the auth check to work

- [ ] **Step 1: Generate a secret**

```bash
openssl rand -hex 32
```

Copy the output.

- [ ] **Step 2: Add to Vercel**

```bash
vercel env add RFID_API_KEY production
# Paste the secret when prompted
```

Or via the Vercel dashboard: Project → Settings → Environment Variables → Add → `RFID_API_KEY`, Production only.

- [ ] **Step 3: Set same value on the Pi**

```bash
sudo nano /etc/checkin.env
# Set RFID_API_KEY=<the same secret>
sudo systemctl restart matconnect-checkin
```

- [ ] **Step 4: Write the spec document**

```bash
mkdir -p docs/superpowers/specs
```

Copy the approved design from the plan file to `docs/superpowers/specs/2026-06-30-rfid-wristband-checkin-design.md`.

- [ ] **Step 5: Commit and push**

```bash
git add docs/
git commit -m "docs: add RFID wristband check-in design spec"
git push
```

---

## Verification Checklist

1. **401 on missing key:** `curl -X POST /api/checkin -d '{"rfidToken":"AA"}'` → `{"error":"Unauthorized"}`
2. **404 on unknown UID:** curl with valid key but unassigned UID → `{"error":"Member not found"}`
3. **200 on valid UID with active class:** set rfidToken on a member, start a class in the DB, curl → `{"success":true}`, attendance record has `classId` set
4. **200 on valid UID with no active class:** same member, no current class → `{"success":true}`, attendance record has `classId: null`
5. **Admin UI assign:** navigate to member profile, click Assign Wristband, type a UID, confirm → masked UID appears
6. **Admin UI tap-to-assign:** click "Tap to assign", tap USB reader on desk → input fills automatically
7. **Admin UI remove:** click Remove → "No wristband assigned" state returns
8. **Pi integration:** with Pi connected, tap assigned wristband → green LED + single beep in ≤1s
