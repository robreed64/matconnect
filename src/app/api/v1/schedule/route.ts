import { NextRequest, NextResponse } from "next/server";
import { requireApiKey, API_V1_CORS } from "@/lib/require-api-key";
import { getGymSettings } from "@/lib/gym-settings";
import { prisma } from "@/lib/prisma";

const WEEKDAYS = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];

export async function GET(req: NextRequest) {
  const auth = await requireApiKey(req);
  if ("error" in auth) return auth.error;

  const url = new URL(req.url);
  const daysAhead = Math.min(Math.max(parseInt(url.searchParams.get("days") ?? "7", 10), 1), 14);

  const settings = await getGymSettings();
  const tz = settings.timezone;

  const now = new Date();
  const end = new Date(now.getTime() + daysAhead * 24 * 60 * 60 * 1000);

  const classes = await prisma.class.findMany({
    where: { startTime: { gte: now, lt: end } },
    orderBy: { startTime: "asc" },
    select: {
      id: true,
      name: true,
      startTime: true,
      endTime: true,
      instructorName: true,
      capacity: true,
      _count: { select: { bookings: { where: { status: { in: ["booked", "attended"] } } } } },
    },
  });

  type ClassEntry = {
    id: number;
    name: string;
    startTime: string;
    endTime: string | null;
    instructor: string | null;
    capacity: number | null;
    spotsAvailable: number | null;
  };

  const byDay = new Map<string, ClassEntry[]>();

  for (const c of classes) {
    const day = c.startTime.toLocaleDateString("en-US", { weekday: "long", timeZone: tz });
    const startTime = c.startTime.toLocaleTimeString("en-US", {
      hour: "numeric", minute: "2-digit", timeZone: tz,
    });
    const endTime = c.endTime
      ? c.endTime.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit", timeZone: tz })
      : null;

    const booked = c._count.bookings;
    const spotsAvailable = c.capacity != null ? Math.max(0, c.capacity - booked) : null;

    if (!byDay.has(day)) byDay.set(day, []);
    byDay.get(day)!.push({
      id: c.id,
      name: c.name,
      startTime,
      endTime,
      instructor: c.instructorName,
      capacity: c.capacity,
      spotsAvailable,
    });
  }

  const days = WEEKDAYS.filter((d) => byDay.has(d)).map((label) => ({
    label,
    classes: byDay.get(label)!,
  }));

  return NextResponse.json({ days }, { headers: API_V1_CORS });
}

export async function OPTIONS() {
  return new Response(null, { status: 204, headers: API_V1_CORS });
}
