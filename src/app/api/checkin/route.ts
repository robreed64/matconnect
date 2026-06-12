import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { milestoneFor } from "@/lib/milestones";
import { countActiveBookings } from "@/lib/waitlist";

// Re-checking in within this window returns the existing record instead of
// creating a duplicate (kiosk retries, POS day-pass + waiver-sign flow)
const DUPLICATE_WINDOW_MS = 4 * 60 * 60 * 1000;

export async function POST(req: NextRequest) {
  const { memberId, classId, token } = await req.json();

  // Resolve member by QR token or raw id
  const member = token
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

  // Idempotent: a recent identical check-in (retry after a flaky response, or a
  // day-pass walk-in already checked in at the POS) is returned, not duplicated
  const recentDuplicate = await prisma.attendance.findFirst({
    where: {
      memberId: member.id,
      classId: classId ?? null,
      timestamp: { gte: new Date(Date.now() - DUPLICATE_WINDOW_MS) },
    },
  });

  const record = recentDuplicate ?? await prisma.attendance.create({
    data: { memberId: member.id, classId: classId ?? null, source: "kiosk" },
  });

  if (classId) {
    const existing = await prisma.booking.findFirst({
      where: { memberId: member.id, classId, status: { in: ["booked", "attended", "waitlisted"] } },
    });
    if (existing?.status === "booked") {
      await prisma.booking.update({ where: { id: existing.id }, data: { status: "attended" } });
    } else if (existing?.status === "waitlisted") {
      // Walk-in from the waitlist: claim a seat only if one is free; otherwise
      // they train (door policy) but stay waitlisted so promotion math holds
      const cls = await prisma.class.findUnique({ where: { id: classId }, select: { capacity: true } });
      const hasSpace = cls?.capacity == null || (await countActiveBookings(classId)) < cls.capacity;
      if (hasSpace) {
        await prisma.booking.update({ where: { id: existing.id }, data: { status: "attended" } });
      }
    } else if (!existing) {
      await prisma.booking.create({ data: { memberId: member.id, classId, status: "attended" } });
    }
    // existing "attended" → nothing to do
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
