import { auth } from "@/auth";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";

const BELT_STYLES: Record<string, { bg: string; text: string }> = {
  white:  { bg: "bg-white",      text: "text-gray-900" },
  blue:   { bg: "bg-blue-600",   text: "text-white" },
  purple: { bg: "bg-purple-700", text: "text-white" },
  brown:  { bg: "bg-amber-800",  text: "text-white" },
  black:  { bg: "bg-gray-900 border border-gray-600", text: "text-white" },
};

const STATUS_PILL: Record<string, string> = {
  active:   "bg-green-500/15 text-green-400",
  trial:    "bg-yellow-500/15 text-yellow-300",
  past_due: "bg-red-500/15 text-red-400",
  inactive: "bg-gray-500/15 text-gray-400",
};

const CLASS_COLORS: Record<string, string> = {
  gi:      "bg-blue-900/40 border-blue-800 text-blue-300",
  "no-gi": "bg-orange-900/40 border-orange-800 text-orange-300",
  youth:   "bg-green-900/40 border-green-800 text-green-300",
  seminar: "bg-purple-900/40 border-purple-800 text-purple-300",
  private: "bg-gray-800 border-gray-700 text-gray-300",
};

function formatTime(d: Date) {
  return d.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" });
}
function formatDay(d: Date) {
  return d.toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric" });
}

export default async function PortalPage() {
  const session = await auth();
  if (!session?.user) redirect("/login");


  const userRow  = await prisma.user.findUnique({
    where: { email: session.user.email! },
    include: {
      member: {
        include: {
          _count:   { select: { attendance: true } },
          children: {
            include: { _count: { select: { attendance: true } } },
            orderBy: { name: "asc" },
          },
        },
      },
    },
  });

  if (!userRow?.member) {
    return (
      <div className="text-center py-20">
        <p className="text-gray-400">Your account is not linked to a member profile.</p>
        <p className="text-gray-600 text-sm mt-2">Please contact your gym administrator.</p>
      </div>
    );
  }

  const parent   = userRow.member;
  const children = parent.children;
  const allIds   = [parent.id, ...children.map((c) => c.id)];

  // Upcoming classes — next 7 days
  const now     = new Date();
  const weekEnd = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);
  const classes = await prisma.class.findMany({
    where:   { startTime: { gte: now, lte: weekEnd } },
    orderBy: { startTime: "asc" },
    take:    15,
    include: { program: { select: { type: true } } },
  });

  // Recent attendance across all family members
  const recentAttendance = await prisma.attendance.findMany({
    where:   { memberId: { in: allIds } },
    orderBy: { timestamp: "desc" },
    take:    20,
    include: {
      member: { select: { name: true } },
      class:  { select: { name: true } },
    },
  });

  return (
    <div className="space-y-8">
      {/* Children overview */}
      <section>
        <h2 className="text-xs font-semibold tracking-wide text-gray-400 mb-4">
          {children.length === 0 ? "Your Account" : "Your Family"}
        </h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {/* Parent card */}
          <MemberCard member={parent} label="Parent" />
          {/* Children cards */}
          {children.map((child) => (
            <MemberCard key={child.id} member={child} label="Child" />
          ))}
        </div>
        {children.length === 0 && (
          <p className="mt-3 text-sm text-gray-600">No children linked to your account. Contact your gym admin to link family members.</p>
        )}
      </section>

      {/* Upcoming schedule */}
      <section>
        <h2 className="text-xs font-semibold tracking-wide text-gray-400 mb-4">Upcoming Classes (Next 7 Days)</h2>
        {classes.length === 0 ? (
          <p className="text-gray-600 text-sm">No classes scheduled this week.</p>
        ) : (
          <div className="space-y-2">
            {classes.map((cls) => {
              const color = CLASS_COLORS[cls.program?.type ?? ""] ?? CLASS_COLORS.private;
              return (
                <div key={cls.id} className={`flex items-center justify-between px-4 py-3 rounded-xl border ${color}`}>
                  <div>
                    <p className="font-medium text-white text-sm">{cls.name}</p>
                    {cls.instructorName && <p className="text-xs opacity-70 mt-0.5">{cls.instructorName}</p>}
                  </div>
                  <div className="text-right text-xs opacity-80">
                    <p className="font-medium">{formatDay(cls.startTime)}</p>
                    <p>{formatTime(cls.startTime)} – {formatTime(cls.endTime)}</p>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </section>

      {/* Recent activity */}
      <section>
        <h2 className="text-xs font-semibold tracking-wide text-gray-400 mb-4">Recent Activity</h2>
        {recentAttendance.length === 0 ? (
          <p className="text-gray-600 text-sm">No check-ins yet.</p>
        ) : (
          <div className="bg-gray-900 border border-gray-800 rounded-xl divide-y divide-gray-800">
            {recentAttendance.map((a) => (
              <div key={a.id} className="flex items-center justify-between px-4 py-3 text-sm">
                <div>
                  <span className="text-white font-medium">{a.member.name}</span>
                  <span className="text-gray-500 mx-2">·</span>
                  <span className="text-gray-400">{a.class?.name ?? "Open mat"}</span>
                </div>
                <span className="text-gray-600 text-xs">
                  {a.timestamp.toLocaleDateString("en-US", { month: "short", day: "numeric" })}
                </span>
              </div>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}

function MemberCard({
  member,
  label,
}: {
  member: { id: number; name: string; beltRank: string | null; status: string; ageGroup: string | null; _count: { attendance: number } };
  label: string;
}) {
  const belt = member.beltRank ? BELT_STYLES[member.beltRank.toLowerCase()] : null;
  const pill = STATUS_PILL[member.status] ?? STATUS_PILL.inactive;
  const initials = (() => {
    const p = member.name.trim().split(" ");
    return p.length >= 2 ? p[0][0] + p[p.length - 1][0] : p[0].slice(0, 2);
  })();

  return (
    <div className="bg-gray-900 border border-gray-800 rounded-xl p-5">
      <div className="flex items-start gap-4">
        <div className="w-12 h-12 rounded-xl bg-gray-700 border border-gray-600 flex items-center justify-center text-sm font-bold text-gray-300 flex-shrink-0">
          {initials.toUpperCase()}
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <p className="font-bold text-white">{member.name}</p>
            <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${pill}`}>
              {member.status.replace("_", " ")}
            </span>
          </div>
          <p className="text-xs text-gray-500 mt-0.5">{label}{member.ageGroup ? ` · ${member.ageGroup}` : ""}</p>
          <div className="flex items-center gap-3 mt-2">
            {belt && (
              <span className={`px-2.5 py-0.5 rounded-full text-xs font-semibold capitalize ${belt.bg} ${belt.text}`}>
                {member.beltRank} Belt
              </span>
            )}
            <span className="text-xs text-gray-500">{member._count.attendance} classes</span>
          </div>
        </div>
      </div>
    </div>
  );
}
