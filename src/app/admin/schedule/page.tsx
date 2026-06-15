import { prisma } from "@/lib/prisma";
import { auth } from "@/auth";
import { can } from "@/lib/permissions";
import { getGymSettings } from "@/lib/gym-settings";
import WeekCalendar from "./WeekCalendar";

type SearchParams = Promise<{ week?: string }>;

function getMondayOf(date: Date) {
  const d   = new Date(date);
  const day = d.getDay(); // 0=Sun
  const diff = day === 0 ? -6 : 1 - day;
  d.setDate(d.getDate() + diff);
  d.setHours(0, 0, 0, 0);
  return d;
}

export default async function SchedulePage({ searchParams }: { searchParams: SearchParams }) {
  const [sp, session, settings] = await Promise.all([searchParams, auth(), getGymSettings()]);
  const role         = (session?.user as { role?: string } | undefined)?.role;
  const canManage    = can(role, "manage_schedule");
  const programTypes = (settings.programTypes as string[]) ?? [];
  const weekStart = sp.week ? getMondayOf(new Date(sp.week + "T12:00:00")) : getMondayOf(new Date());
  const weekEnd   = new Date(weekStart);
  weekEnd.setDate(weekEnd.getDate() + 7);

  const classes = await prisma.class.findMany({
    where: { startTime: { gte: weekStart, lt: weekEnd } },
    include: {
      program: true,
      _count: { select: { bookings: true, attendance: true } },
    },
    orderBy: { startTime: "asc" },
  });

  // Serialize dates to strings for the client component
  const serialized = classes.map((c) => ({
    ...c,
    startTime:  c.startTime.toISOString(),
    endTime:    c.endTime.toISOString(),
    createdAt:  c.createdAt.toISOString(),
    updatedAt:  c.updatedAt.toISOString(),
  }));

  return (
    <div className="h-screen flex flex-col">
      <div className="px-6 pt-6 pb-2 flex-shrink-0">
        <h1 className="text-2xl font-bold">Schedule</h1>
      </div>
      <WeekCalendar classes={serialized} weekStartISO={weekStart.toISOString().slice(0, 10) + "T00:00:00"} canManage={canManage} programTypes={programTypes} />
    </div>
  );
}
