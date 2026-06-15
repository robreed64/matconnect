import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireMember } from "@/lib/require-member";
import { countActiveBookings } from "@/lib/waitlist";

export async function POST(req: NextRequest) {
  const auth = await requireMember();
  if (auth.error) return auth.error;
  const { memberId } = auth;

  const { classId } = await req.json();
  if (!classId) return NextResponse.json({ error: "classId required" }, { status: 400 });

  const existing = await prisma.booking.findFirst({
    where: { memberId, classId, status: { in: ["booked", "attended", "waitlisted"] } },
  });
  if (existing) return NextResponse.json({ error: "Already booked" }, { status: 409 });

  const cls = await prisma.class.findUnique({ where: { id: classId }, select: { capacity: true, seriesId: true, startTime: true } });
  if (!cls) return NextResponse.json({ error: "Class not found" }, { status: 404 });

  // Book the requested class (with waitlist check)
  async function bookSingleClass(cid: number, cap: number | null) {
    if (cap != null) {
      const active = await countActiveBookings(cid);
      if (active >= cap) {
        const b = await prisma.booking.create({ data: { memberId, classId: cid, status: "waitlisted" } });
        const position = await prisma.booking.count({ where: { classId: cid, status: "waitlisted", createdAt: { lte: b.createdAt } } });
        return { ...b, waitlisted: true, position };
      }
    }
    return prisma.booking.create({ data: { memberId, classId: cid, status: "booked" } });
  }

  const booking = await bookSingleClass(classId, cls.capacity);

  // Auto-book all remaining occurrences in the same series (from today, not just after the clicked class)
  if (cls.seriesId) {
    const siblings = await prisma.class.findMany({
      where: { seriesId: cls.seriesId, startTime: { gte: new Date() }, id: { not: classId } },
      select: { id: true, capacity: true },
      orderBy: { startTime: "asc" },
    });
    for (const sibling of siblings) {
      const alreadyBooked = await prisma.booking.findFirst({
        where: { memberId, classId: sibling.id, status: { in: ["booked", "attended", "waitlisted"] } },
      });
      if (!alreadyBooked) {
        await bookSingleClass(sibling.id, sibling.capacity);
      }
    }
  }

  return NextResponse.json(booking, { status: 201 });
}
