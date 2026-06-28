import { auth } from "@/auth";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";

export default async function MemberAttendancePage() {
  const session = await auth();
  if (!session?.user) redirect("/login");

  const userRow = await prisma.user.findUnique({
    where:  { email: session.user.email! },
    select: { memberId: true },
  });

  if (!userRow?.memberId) {
    return (
      <div className="text-center py-20">
        <p className="text-gray-400">Account not linked to a member profile.</p>
      </div>
    );
  }

  const [attendance, totalCount] = await Promise.all([
    prisma.attendance.findMany({
      where:   { memberId: userRow.memberId },
      orderBy: { timestamp: "desc" },
      take:    200,
      include: { class: { select: { name: true, program: { select: { type: true } } } } },
    }),
    prisma.attendance.count({ where: { memberId: userRow.memberId } }),
  ]);

  // Streak — consecutive days with at least one check-in (counting back from today)
  const daySet = new Set(attendance.map((a) => a.timestamp.toDateString()));
  let streak = 0;
  const today = new Date();
  for (let i = 0; i < 365; i++) {
    const d = new Date(today);
    d.setDate(d.getDate() - i);
    if (daySet.has(d.toDateString())) {
      streak++;
    } else if (i > 0) {
      break;
    }
  }

  // Classes this month
  const monthStart = new Date();
  monthStart.setDate(1);
  monthStart.setHours(0, 0, 0, 0);
  const thisMonth = attendance.filter((a) => a.timestamp >= monthStart).length;

  // Group by month for display
  type Group = { label: string; items: typeof attendance };
  const groups: Group[] = [];
  for (const a of attendance) {
    const label = a.timestamp.toLocaleDateString("en-US", { month: "long", year: "numeric" });
    const last  = groups[groups.length - 1];
    if (last && last.label === label) {
      last.items.push(a);
    } else {
      groups.push({ label, items: [a] });
    }
  }

  const CLASS_COLOR: Record<string, string> = {
    gi:      "text-blue-400",
    "no-gi": "text-orange-400",
    youth:   "text-green-400",
    seminar: "text-purple-400",
    private: "text-gray-400",
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-white">Attendance History</h1>
        <p className="text-sm text-gray-500 mt-1">Showing last {attendance.length} of {totalCount} check-ins</p>
      </div>

      {/* Stats row */}
      <div className="grid grid-cols-3 gap-4">
        <StatCard label="Total Classes"  value={totalCount} />
        <StatCard label="This Month"     value={thisMonth} accent="blue" />
        <StatCard label="Current Streak" value={streak} sub={streak === 1 ? "day" : "days"} accent="green" />
      </div>

      {/* Grouped list */}
      {groups.length === 0 ? (
        <div className="bg-[#0f1117] border border-gray-700/50 rounded-xl p-10 text-center text-gray-600 text-sm">
          No check-ins recorded yet.
        </div>
      ) : (
        <div className="space-y-6">
          {groups.map((g) => (
            <div key={g.label}>
              <div className="flex items-center gap-3 mb-2">
                <h2 className="text-xs font-semibold uppercase tracking-wider text-gray-500">{g.label}</h2>
                <span className="text-xs text-gray-700">{g.items.length} classes</span>
              </div>
              <div className="bg-[#0f1117] border border-gray-700/50 rounded-xl divide-y divide-gray-800">
                {g.items.map((a) => {
                  const type  = a.class?.program?.type;
                  const color = type ? (CLASS_COLOR[type] ?? CLASS_COLOR.private) : "text-gray-400";
                  return (
                    <div key={a.id} className="flex items-center justify-between px-4 py-3 text-sm">
                      <div className="flex items-center gap-3">
                        <div className={`w-2 h-2 rounded-full ${type === "gi" ? "bg-blue-500" : type === "no-gi" ? "bg-orange-500" : type === "youth" ? "bg-green-500" : "bg-gray-500"}`} />
                        <span className="text-gray-200">{a.class?.name ?? "Open mat"}</span>
                        {type && <span className={`text-xs ${color} capitalize`}>{type.replace("-", " ")}</span>}
                      </div>
                      <div className="text-right">
                        <p className="text-gray-400">
                          {a.timestamp.toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric" })}
                        </p>
                        <p className="text-gray-600 text-xs">
                          {a.timestamp.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" })}
                        </p>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function StatCard({ label, value, sub, accent }: { label: string; value: number; sub?: string; accent?: "blue" | "green" }) {
  const color = accent === "blue" ? "text-blue-400" : accent === "green" ? "text-green-400" : "text-white";
  return (
    <div className="bg-[#0f1117] border border-gray-700/50 rounded-xl p-5 text-center">
      <p className="text-xs text-gray-500 mb-1">{label}</p>
      <p className={`text-3xl font-bold ${color}`}>{value}</p>
      {sub && <p className="text-xs text-gray-600 mt-1">{sub}</p>}
    </div>
  );
}
