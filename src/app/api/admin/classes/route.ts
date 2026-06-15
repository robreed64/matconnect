import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAuth } from "@/lib/require-auth";
import { randomUUID } from "crypto";

export async function GET(req: NextRequest) {
  const sp        = req.nextUrl.searchParams;
  const weekStart = sp.get("weekStart");
  const weekEnd   = sp.get("weekEnd");

  const where = weekStart && weekEnd
    ? { startTime: { gte: new Date(weekStart), lt: new Date(weekEnd) } }
    : {};

  const classes = await prisma.class.findMany({
    where,
    include: { program: true },
    orderBy: { startTime: "asc" },
  });

  return NextResponse.json(classes);
}

// Returns one {startTime, endTime} pair per occurrence within [startDate, seriesEndDate].
function expandRecurrence(
  startDate: string,       // YYYY-MM-DD (the user's local calendar date for the first class)
  startTimeISO: string,    // UTC ISO of the first class start
  endTimeISO: string,      // UTC ISO of the first class end
  recurrenceRule: string,
  seriesEndDate: string,   // YYYY-MM-DD (inclusive)
  excludeDates: string[] = [], // YYYY-MM-DD dates to skip (holidays, closures)
): Array<{ startTime: Date; endTime: Date }> {
  const DAY: Record<string, number> = { SU: 0, MO: 1, TU: 2, WE: 3, TH: 4, FR: 5, SA: 6 };
  const excludeSet = new Set(excludeDates);

  const baseStart  = new Date(startTimeISO);
  const durationMs = new Date(endTimeISO).getTime() - baseStart.getTime();

  // Midnight UTC on the start calendar date
  const [sy, sm, sd] = startDate.split("-").map(Number);
  const dayZeroMs  = Date.UTC(sy, sm - 1, sd);
  const timeOffsetMs = baseStart.getTime() - dayZeroMs; // ms from midnight to class start

  // Target days of week (0=Sun … 6=Sat)
  const isDaily = /FREQ=DAILY/.test(recurrenceRule);
  const byDay   = recurrenceRule.match(/BYDAY=([A-Z,]+)/);
  const targetDays = isDaily
    ? [0, 1, 2, 3, 4, 5, 6]
    : byDay
    ? byDay[1].split(",").map((d) => DAY[d]).filter((n): n is number => n !== undefined)
    : [new Date(dayZeroMs + timeOffsetMs).getUTCDay()]; // FREQ=WEEKLY: same weekday

  const [ey, em, ed] = seriesEndDate.split("-").map(Number);
  const endMs = Date.UTC(ey, em - 1, ed) + 86_400_000; // include the end date itself

  const occurrences: Array<{ startTime: Date; endTime: Date }> = [];
  let cur = dayZeroMs;
  while (cur < endMs && occurrences.length < 500) {
    const dateKey = new Date(cur).toISOString().slice(0, 10);
    if (!excludeSet.has(dateKey) && targetDays.includes(new Date(cur).getUTCDay())) {
      const s = new Date(cur + timeOffsetMs);
      occurrences.push({ startTime: s, endTime: new Date(s.getTime() + durationMs) });
    }
    cur += 86_400_000;
  }
  return occurrences;
}

export async function POST(req: NextRequest) {
  const { error } = await requireAuth("schedule");
  if (error) return error;

  const { programId, name, startTime, endTime, date, instructorName, capacity, recurrenceRule, seriesEndDate, excludeDates } = await req.json();

  if (!name || !startTime || !endTime) {
    return NextResponse.json({ error: "name, startTime, and endTime are required" }, { status: 400 });
  }

  const pidInt = programId ? parseInt(programId, 10) : null;
  const capInt = capacity  ? parseInt(capacity,  10) : null;

  // Recurring — create one record per occurrence
  if (recurrenceRule && seriesEndDate && date) {
    const occurrences = expandRecurrence(date, startTime, endTime, recurrenceRule, seriesEndDate, excludeDates ?? []);
    if (occurrences.length === 0) {
      return NextResponse.json({ error: "No occurrences generated for that date range." }, { status: 400 });
    }

    const seriesId = randomUUID();
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const rows: any[] = occurrences.map((o) => ({
      name,
      startTime:      o.startTime,
      endTime:        o.endTime,
      instructorName: instructorName || null,
      capacity:       capInt,
      recurrenceRule,
      seriesId,
      ...(pidInt ? { programId: pidInt } : {}),
    }));
    await prisma.class.createMany({ data: rows });

    // Return the first occurrence so the client can navigate to its week
    const first = await prisma.class.findFirst({
      where: { startTime: occurrences[0].startTime },
      include: { program: true },
    });
    return NextResponse.json(first, { status: 201 });
  }

  // One-time class
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const data: any = {
    name,
    startTime:      new Date(startTime),
    endTime:        new Date(endTime),
    instructorName: instructorName || null,
    capacity:       capInt,
    recurrenceRule: recurrenceRule || null,
    ...(pidInt ? { programId: pidInt } : {}),
  };

  const cls = await prisma.class.create({ data, include: { program: true } });
  return NextResponse.json(cls, { status: 201 });
}
