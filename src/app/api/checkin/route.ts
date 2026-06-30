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
