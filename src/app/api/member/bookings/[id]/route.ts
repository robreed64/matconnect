import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireMember } from "@/lib/require-member";
import { promoteWaitlist } from "@/lib/waitlist";

type Params = Promise<{ id: string }>;

export async function DELETE(req: NextRequest, { params }: { params: Params }) {
  const auth = await requireMember();
  if (auth.error) return auth.error;
  const { memberId } = auth;

  const { id } = await params;
  const bookingId = parseInt(id, 10);
  if (isNaN(bookingId)) return NextResponse.json({ error: "Invalid id" }, { status: 400 });

  const booking = await prisma.booking.findUnique({
    where: { id: bookingId },
    include: { class: { select: { seriesId: true, startTime: true } } },
  });
  if (!booking) return NextResponse.json({ error: "Not found" }, { status: 404 });
  if (booking.memberId !== memberId) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const cancelSeries = req.nextUrl.searchParams.get("series") === "true";

  if (cancelSeries && booking.class.seriesId) {
    // Cancel all future bookings in the series for this member
    const futureClasses = await prisma.class.findMany({
      where: { seriesId: booking.class.seriesId, startTime: { gte: booking.class.startTime } },
      select: { id: true },
    });
    const classIds = futureClasses.map(c => c.id);
    const seriesBookings = await prisma.booking.findMany({
      where: { memberId, classId: { in: classIds }, status: { in: ["booked", "attended", "waitlisted"] } },
    });
    await prisma.booking.updateMany({
      where: { id: { in: seriesBookings.map(b => b.id) } },
      data: { status: "canceled" },
    });
    for (const b of seriesBookings) {
      if (b.status === "booked" || b.status === "attended") {
        await promoteWaitlist(b.classId).catch(() => {});
      }
    }
    return new NextResponse(null, { status: 204 });
  }

  await prisma.booking.update({ where: { id: bookingId }, data: { status: "canceled" } });

  if (booking.status === "booked" || booking.status === "attended") {
    await promoteWaitlist(booking.classId).catch(() => {});
  }

  return new NextResponse(null, { status: 204 });
}
