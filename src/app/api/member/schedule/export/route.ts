import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireMember } from "@/lib/require-member";

function toICSDate(d: Date): string {
  return d.toISOString().replace(/[-:]/g, "").replace(/\.\d{3}/, "");
}

function escapeICS(s: string): string {
  return s.replace(/\\/g, "\\\\").replace(/;/g, "\\;").replace(/,/g, "\\,").replace(/\n/g, "\\n");
}

export async function GET(req: NextRequest) {
  const auth = await requireMember();
  if (auth.error) return auth.error;
  const { memberId } = auth;

  const sp     = req.nextUrl.searchParams;
  const filter = sp.get("filter") === "booked" ? "booked" : "all";

  const now      = new Date();
  const sixMonths = new Date(now.getTime() + 6 * 30 * 24 * 60 * 60 * 1000);

  const classes = await prisma.class.findMany({
    where: {
      startTime: { gte: now, lte: sixMonths },
      ...(filter === "booked"
        ? { bookings: { some: { memberId, status: { in: ["booked", "attended", "waitlisted"] } } } }
        : {}),
    },
    include: {
      program: { select: { name: true, type: true } },
      bookings: filter === "booked"
        ? { where: { memberId, status: { in: ["booked", "attended", "waitlisted"] } }, select: { status: true } }
        : false,
    },
    orderBy: { startTime: "asc" },
  });

  const events = classes.map((cls) => {
    const description: string[] = [];
    if (cls.program?.type) description.push(cls.program.type.toUpperCase());
    if (cls.program?.name) description.push(cls.program.name);
    if (cls.instructorName) description.push(`Instructor: ${cls.instructorName}`);

    return [
      "BEGIN:VEVENT",
      `UID:${cls.id}@matconnect`,
      `DTSTART:${toICSDate(cls.startTime)}`,
      `DTEND:${toICSDate(cls.endTime)}`,
      `SUMMARY:${escapeICS(cls.name)}`,
      description.length ? `DESCRIPTION:${escapeICS(description.join(" · "))}` : null,
      "STATUS:CONFIRMED",
      "END:VEVENT",
    ].filter(Boolean).join("\r\n");
  });

  const ics = [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//MatConnect//Schedule//EN",
    "CALSCALE:GREGORIAN",
    "METHOD:PUBLISH",
    ...events,
    "END:VCALENDAR",
  ].join("\r\n");

  const filename = filter === "booked" ? "my-bookings.ics" : "my-schedule.ics";

  return new NextResponse(ics, {
    headers: {
      "Content-Type": "text/calendar; charset=utf-8",
      "Content-Disposition": `attachment; filename="${filename}"`,
    },
  });
}
