import { prisma } from "@/lib/prisma";
import { getGymSettings } from "@/lib/gym-settings";
import { safeColor } from "@/lib/widget-color";

export const dynamic = "force-dynamic";

const WEEKDAYS = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];

type SearchParams = Promise<{ color?: string }>;

export default async function ScheduleWidgetPage({ searchParams }: { searchParams: SearchParams }) {
  const { color: rawColor } = await searchParams;
  const color = safeColor(rawColor);

  const settings = await getGymSettings();
  const tz = settings.timezone;

  const now = new Date();
  const weekAhead = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);
  const classes = await prisma.class.findMany({
    where: { startTime: { gte: now, lt: weekAhead } },
    orderBy: { startTime: "asc" },
    select: { id: true, name: true, startTime: true, instructorName: true },
  });

  const byDay = new Map<string, Array<{ id: number; name: string; time: string; instructor: string | null }>>();
  for (const c of classes) {
    const day = c.startTime.toLocaleDateString("en-US", { weekday: "long", timeZone: tz });
    const time = c.startTime.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit", timeZone: tz });
    if (!byDay.has(day)) byDay.set(day, []);
    const item: { id: number; name: string; time: string; instructor: string | null } = {
      id: c.id,
      name: c.name,
      time,
      instructor: c.instructorName,
    };
    byDay.get(day)!.push(item);
  }
  const scheduleDays = WEEKDAYS.filter((d) => byDay.has(d));

  return (
    <div className="p-4 font-sans text-sm bg-white min-h-screen">
      {scheduleDays.length === 0 ? (
        <p className="text-gray-500 text-center py-8">No classes scheduled for the next 7 days.</p>
      ) : (
        <div className="space-y-5">
          {scheduleDays.map((day) => (
            <div key={day}>
              <h2 className="font-bold text-base mb-2" style={{ color }}>{day}</h2>
              <ul className="space-y-2">
                {byDay.get(day)!.map((c) => (
                  <li
                    key={c.id}
                    className="border-l-4 pl-3 py-1"
                    style={{ borderColor: color }}
                  >
                    <span className="font-semibold text-gray-900">{c.name}</span>
                    <span className="ml-2 text-gray-500">{c.time}</span>
                    {c.instructor && (
                      <span className="ml-2 text-gray-400">· {c.instructor}</span>
                    )}
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
