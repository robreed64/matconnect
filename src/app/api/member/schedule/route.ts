import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireMember } from "@/lib/require-member";

export async function GET(req: NextRequest) {
  const auth = await requireMember();
  if (auth.error) return auth.error;
  const { memberId } = auth;

  const sp = req.nextUrl.searchParams;
  const weekStart = sp.get("weekStart");
  const weekEnd   = sp.get("weekEnd");

  let where;
  if (weekStart && weekEnd) {
    where = { startTime: { gte: new Date(weekStart), lt: new Date(weekEnd) } };
  } else {
    const now = new Date();
    const twoWeeksOut = new Date(now.getTime() + 14 * 24 * 60 * 60 * 1000);
    where = { startTime: { gte: now, lte: twoWeeksOut } };
  }

  const classes = await prisma.class.findMany({
    where,
    include: {
      program: { select: { name: true, type: true } },
      bookings: { where: { memberId }, select: { id: true, status: true } },
    },
    orderBy: { startTime: "asc" },
  });

  const result = classes.map((cls) => {
    const active = cls.bookings.find((b) => b.status === "booked" || b.status === "attended" || b.status === "waitlisted");
    return {
      id: cls.id,
      name: cls.name,
      instructorName: cls.instructorName,
      startTime: cls.startTime.toISOString(),
      endTime: cls.endTime.toISOString(),
      capacity: cls.capacity,
      program: cls.program,
      booking: active ?? null,
    };
  });

  return NextResponse.json(result);
}
