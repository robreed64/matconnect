import { auth } from "@/auth";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import Link from "next/link";
import { BELT_STYLES, getNextBelt } from "@/lib/belt-data";

const STATUS_PILL: Record<string, string> = {
  active:   "bg-green-500/15 text-green-400",
  trial:    "bg-yellow-500/15 text-yellow-300",
  past_due: "bg-red-500/15 text-red-400",
  inactive: "bg-gray-500/15 text-gray-400",
};

const CHANNEL_ICON: Record<string, string> = {
  email:  "✉️",
  sms:    "💬",
  push:   "🔔",
  in_app: "📱",
};

const CLASS_COLORS: Record<string, string> = {
  gi:      "bg-blue-900/40 border-blue-800 text-blue-300",
  "no-gi": "bg-orange-900/40 border-orange-800 text-orange-300",
  youth:   "bg-green-900/40 border-green-800 text-green-300",
  seminar: "bg-purple-900/40 border-purple-800 text-purple-300",
  private: "bg-gray-800 border-gray-700 text-gray-300",
};

export default async function MemberHomePage() {
  const session = await auth();
  if (!session?.user) redirect("/login");

  const userRow = await prisma.user.findUnique({
    where:   { email: session.user.email! },
    include: {
      member: {
        include: {
          subscriptions: { include: { plan: true }, orderBy: { createdAt: "desc" }, take: 1 },
          attendance:    { orderBy: { timestamp: "desc" }, take: 5, include: { class: { select: { name: true } } } },
          _count:        { select: { attendance: true } },
          messages:      { orderBy: { sentAt: "desc" }, take: 5 },
        },
      },
    },
  });

  if (!userRow?.member) {
    return (
      <div className="text-center py-20">
        <p className="text-gray-400">Your account is not linked to a member profile.</p>
        <p className="text-gray-600 text-sm mt-2">Contact your gym administrator.</p>
      </div>
    );
  }

  const member = userRow.member;
  const belt   = member.beltRank ? BELT_STYLES[member.beltRank] : null;
  const pill   = STATUS_PILL[member.status] ?? STATUS_PILL.inactive;
  const sub    = member.subscriptions[0];
  const nextBelt = getNextBelt(member.beltRank);

  const monthsTraining = Math.floor(
    (Date.now() - member.createdAt.getTime()) / (1000 * 60 * 60 * 24 * 30.44)
  );

  // Belt progress
  const [requirement, techProgress] = nextBelt
    ? await Promise.all([
        prisma.beltRequirement.findFirst({ where: { beltRank: nextBelt } }),
        prisma.techniqueProgress.findMany({ where: { memberId: member.id, beltRank: nextBelt, mastered: true } }),
      ])
    : [null, []];

  // Upcoming classes — next 7 days
  const now     = new Date();
  const weekEnd = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);
  const classes = await prisma.class.findMany({
    where:   { startTime: { gte: now, lte: weekEnd } },
    orderBy: { startTime: "asc" },
    take:    8,
    include: { program: { select: { type: true } } },
  });

  const initials = (() => {
    const p = member.name.trim().split(" ");
    return (p.length >= 2 ? p[0][0] + p[p.length - 1][0] : p[0].slice(0, 2)).toUpperCase();
  })();

  return (
    <div className="space-y-6">
      {/* Profile card */}
      <div className="bg-gray-900 border border-gray-800 rounded-2xl p-6 flex items-start gap-5">
        <div className="w-16 h-16 rounded-full bg-gray-700 border-2 border-gray-600 flex items-center justify-center text-xl font-bold text-gray-300 flex-shrink-0">
          {initials}
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-3 flex-wrap">
            <h1 className="text-xl font-bold text-white">{member.name}</h1>
            <span className={`px-2 py-0.5 rounded-full text-xs font-medium capitalize ${pill}`}>
              {member.status.replace("_", " ")}
            </span>
          </div>
          <div className="flex items-center gap-3 mt-2 flex-wrap">
            {belt && (
              <span className={`px-3 py-1 rounded-full text-sm font-semibold capitalize ${belt.bg} ${belt.text}`}>
                {member.beltRank} Belt
              </span>
            )}
            {!member.beltRank && (
              <span className="px-3 py-1 rounded-full text-sm font-semibold bg-white text-gray-900">White Belt</span>
            )}
            {member.trainingType && <span className="text-sm text-gray-400">{member.trainingType}</span>}
          </div>
          <div className="flex gap-6 mt-3">
            <Stat label="Total Classes"   value={member._count.attendance} />
            <Stat label="Months Training" value={monthsTraining} />
            {sub && <Stat label="Plan" value={sub.plan.name} text />}
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Belt progress snapshot */}
        <div className="bg-gray-900 border border-gray-800 rounded-xl p-5">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xs font-semibold uppercase tracking-wider text-gray-500">Belt Progress</h2>
            <Link href="/member/progress" className="text-xs text-blue-400 hover:text-blue-300 transition">View all →</Link>
          </div>
          {nextBelt ? (
            <div className="space-y-3">
              <p className="text-sm text-gray-400">Working toward <span className="font-semibold text-white capitalize">{nextBelt} belt</span></p>
              {requirement && (
                <ProgressBar
                  label="Classes"
                  current={member._count.attendance}
                  required={requirement.minClasses}
                />
              )}
              {requirement && (
                <ProgressBar
                  label="Months"
                  current={monthsTraining}
                  required={requirement.minMonths}
                />
              )}
              {requirement && requirement.minTechniques > 0 && (
                <ProgressBar
                  label="Techniques"
                  current={techProgress.length}
                  required={requirement.minTechniques}
                />
              )}
            </div>
          ) : (
            <p className="text-sm text-gray-600">
              {member.beltRank === "black" ? "Black belt — peak of the mountain!" : "No belt progression data yet."}
            </p>
          )}
        </div>

        {/* Subscription */}
        <div className="bg-gray-900 border border-gray-800 rounded-xl p-5">
          <h2 className="text-xs font-semibold uppercase tracking-wider text-gray-500 mb-4">Membership</h2>
          {sub ? (
            <div className="space-y-2 text-sm">
              <Row label="Plan"    value={sub.plan.name} />
              <Row label="Price"   value={`$${(sub.plan.priceCents / 100).toFixed(2)} / ${sub.plan.billingInterval}`} />
              <Row label="Status"  value={sub.status.replace("_", " ")}
                valueClass={sub.status === "active" ? "text-green-400" : "text-red-400"} />
              <Row label="Started" value={sub.startDate.toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" })} />
              {sub.endDate && <Row label="Renews" value={sub.endDate.toLocaleDateString()} />}
            </div>
          ) : (
            <p className="text-sm text-gray-600">No active subscription. Contact your gym admin.</p>
          )}
        </div>
      </div>

      {/* Upcoming classes */}
      <div className="bg-gray-900 border border-gray-800 rounded-xl p-5">
        <h2 className="text-xs font-semibold uppercase tracking-wider text-gray-500 mb-4">Upcoming Classes</h2>
        {classes.length === 0 ? (
          <p className="text-sm text-gray-600">No classes scheduled this week.</p>
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
                    <p className="font-medium">
                      {cls.startTime.toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric" })}
                    </p>
                    <p>
                      {cls.startTime.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" })} –{" "}
                      {cls.endTime.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" })}
                    </p>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Recent check-ins */}
      <div className="bg-gray-900 border border-gray-800 rounded-xl p-5">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xs font-semibold uppercase tracking-wider text-gray-500">Recent Check-ins</h2>
          <Link href="/member/attendance" className="text-xs text-blue-400 hover:text-blue-300 transition">View all →</Link>
        </div>
        {member.attendance.length === 0 ? (
          <p className="text-sm text-gray-600">No check-ins yet.</p>
        ) : (
          <div className="divide-y divide-gray-800">
            {member.attendance.map((a) => (
              <div key={a.id} className="flex items-center justify-between py-2.5 text-sm">
                <span className="text-gray-200">{a.class?.name ?? "Open mat"}</span>
                <span className="text-gray-600 text-xs">
                  {a.timestamp.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}
                </span>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Notifications */}
      {member.messages.length > 0 && (
        <div className="bg-gray-900 border border-gray-800 rounded-xl p-5">
          <h2 className="text-xs font-semibold uppercase tracking-wider text-gray-500 mb-4">Notifications</h2>
          <div className="divide-y divide-gray-800">
            {member.messages.map((n) => (
              <div key={n.id} className="flex items-start gap-3 py-3">
                <span className="text-base flex-shrink-0 mt-0.5">
                  {CHANNEL_ICON[n.channel] ?? "📬"}
                </span>
                <div className="flex-1 min-w-0">
                  {n.subject && <p className="text-sm font-medium text-gray-200 truncate">{n.subject}</p>}
                  <p className="text-sm text-gray-500 truncate">{n.body}</p>
                </div>
                <span className="text-xs text-gray-600 flex-shrink-0 mt-0.5">
                  {n.sentAt
                    ? n.sentAt.toLocaleDateString("en-US", { month: "short", day: "numeric" })
                    : ""}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

function Stat({ label, value, text }: { label: string; value: number | string; text?: boolean }) {
  return (
    <div>
      <p className="text-xs text-gray-500">{label}</p>
      <p className={`font-bold mt-0.5 ${text ? "text-sm text-gray-200" : "text-lg text-white"}`}>{value}</p>
    </div>
  );
}

function Row({ label, value, valueClass = "text-gray-200" }: { label: string; value: string; valueClass?: string }) {
  return (
    <div className="flex justify-between items-start gap-4">
      <span className="text-gray-500 flex-shrink-0">{label}</span>
      <span className={`text-right ${valueClass}`}>{value}</span>
    </div>
  );
}

function ProgressBar({ label, current, required }: { label: string; current: number; required: number }) {
  const pct = Math.min(100, required > 0 ? Math.round((current / required) * 100) : 0);
  const met = current >= required;
  return (
    <div>
      <div className="flex justify-between text-xs text-gray-400 mb-1">
        <span>{label}</span>
        <span className={met ? "text-green-400 font-semibold" : ""}>{current} / {required}{met ? " ✓" : ""}</span>
      </div>
      <div className="h-1.5 bg-gray-800 rounded-full overflow-hidden">
        <div className={`h-full rounded-full transition-all ${met ? "bg-green-500" : "bg-blue-500"}`} style={{ width: `${pct}%` }} />
      </div>
    </div>
  );
}
