import { prisma } from "@/lib/prisma";
import { BELT_ORDER } from "@/lib/belt-data";
import { ExportBar } from "./ExportBar";

// ── helpers ─────────────────────────────────────────────────────────────────

function startOfMonth() {
  const d = new Date();
  d.setDate(1);
  d.setHours(0, 0, 0, 0);
  return d;
}

function monthsAgo(n: number) {
  const d = new Date();
  d.setDate(1);
  d.setHours(0, 0, 0, 0);
  d.setMonth(d.getMonth() - n);
  return d;
}

function daysAgo(n: number) {
  return new Date(Date.now() - n * 24 * 60 * 60 * 1000);
}

const DOW = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
const MONTH_NAMES = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

function fmt$(cents: number) {
  return `$${(cents / 100).toLocaleString("en-US", { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`;
}

// ── data fetching ────────────────────────────────────────────────────────────

async function getData() {
  const now      = new Date();
  const monthStart = startOfMonth();
  const last30   = daysAgo(30);
  const last6mo  = monthsAgo(6);

  const [
    membersByStatus,
    activeSubs,
    posThisMonth,
    attendanceThisMonth,
    attendanceLast30,
    beltCounts,
    newMembersByMonth,
    topAttendees,
    posByCategory,
    recentSales,
  ] = await Promise.all([

    // Member counts by status
    prisma.member.groupBy({ by: ["status"], _count: { id: true } }),

    // MRR: active subscriptions × plan price
    prisma.subscription.findMany({
      where:   { status: "active" },
      include: { plan: { select: { priceCents: true, billingInterval: true } } },
    }),

    // POS revenue this month
    prisma.sale.aggregate({
      where:  { createdAt: { gte: monthStart } },
      _sum:   { totalCents: true },
    }),

    // Attendance this month
    prisma.attendance.count({ where: { timestamp: { gte: monthStart } } }),

    // Attendance by day-of-week, last 30 days
    prisma.$queryRaw<{ dow: number; count: bigint }[]>`
      SELECT EXTRACT(DOW FROM timestamp)::int AS dow, COUNT(*)::bigint AS count
      FROM attendance
      WHERE timestamp >= ${last30}
      GROUP BY dow
      ORDER BY dow
    `,

    // Belt distribution
    prisma.member.groupBy({
      by:     ["beltRank"],
      where:  { beltRank: { not: null }, status: { not: "canceled" } },
      _count: { id: true },
    }),

    // New members per month, last 6 months
    prisma.$queryRaw<{ month: Date; count: bigint }[]>`
      SELECT DATE_TRUNC('month', created_at) AS month, COUNT(*)::bigint AS count
      FROM members
      WHERE created_at >= ${last6mo}
      GROUP BY month
      ORDER BY month
    `,

    // Top 10 attendees last 30 days
    prisma.$queryRaw<{ name: string; count: bigint }[]>`
      SELECT m.name, COUNT(a.id)::bigint AS count
      FROM attendance a
      JOIN members m ON a.member_id = m.id
      WHERE a.timestamp >= ${last30}
      GROUP BY m.id, m.name
      ORDER BY count DESC
      LIMIT 10
    `,

    // POS by category this month
    prisma.$queryRaw<{ category: string; total: bigint }[]>`
      SELECT i.category, SUM(sli.quantity * sli.unit_price_cents)::bigint AS total
      FROM sale_line_items sli
      JOIN items i        ON sli.item_id  = i.id
      JOIN sales s        ON sli.sale_id  = s.id
      WHERE s.created_at >= ${monthStart}
      GROUP BY i.category
      ORDER BY total DESC
    `,

    // Recent 8 POS sales
    prisma.sale.findMany({
      orderBy: { createdAt: "desc" },
      take:    8,
      include: {
        member:    { select: { name: true } },
        lineItems: { include: { item: { select: { name: true } } }, take: 1 },
      },
    }),
  ]);

  // Trial funnel: members whose trial started in the last 90 days, by current status.
  // Only counts trials started after trialStartedAt tracking shipped.
  const trialFunnel = await prisma.member.groupBy({
    by: ["status"],
    where: { trialStartedAt: { gte: daysAgo(90) } },
    _count: { id: true },
  });
  const funnelMap: Record<string, number> = {};
  for (const r of trialFunnel) funnelMap[r.status] = r._count.id;
  const trialsConverted = (funnelMap.active ?? 0) + (funnelMap.past_due ?? 0);
  const trialsLost      = (funnelMap.inactive ?? 0) + (funnelMap.canceled ?? 0);
  const trialsPending   = funnelMap.trial ?? 0;

  // Churn: subscriptions canceled in the last 30 days (canceledAt accrues from
  // when this metric shipped — historical cancellations aren't recorded)
  const canceledLast30 = await prisma.subscription.count({
    where: { canceledAt: { gte: last30 } },
  });

  // MRR calculation (normalize annual → monthly)
  const mrr = activeSubs.reduce((sum, s) => {
    const cents = s.plan.billingInterval === "yearly"
      ? Math.round(s.plan.priceCents / 12)
      : s.plan.priceCents;
    return sum + cents;
  }, 0);

  // Attendance by DOW map
  const attendanceByDow: Record<number, number> = {};
  for (const row of attendanceLast30) attendanceByDow[row.dow] = Number(row.count);

  // Belt map
  const beltMap: Record<string, number> = {};
  for (const row of beltCounts) if (row.beltRank) beltMap[row.beltRank] = row._count.id;

  // New members map (month label → count)
  const memberMonths: { label: string; count: number }[] = [];
  for (const row of newMembersByMonth) {
    const d = new Date(row.month);
    memberMonths.push({ label: MONTH_NAMES[d.getMonth()], count: Number(row.count) });
  }
  // Ensure 6 months present (fill gaps with 0)
  if (memberMonths.length < 6) {
    for (let i = 5; i >= 0; i--) {
      const d = monthsAgo(i);
      const label = MONTH_NAMES[d.getMonth()];
      if (!memberMonths.find((m) => m.label === label)) {
        memberMonths.splice(5 - i, 0, { label, count: 0 });
      }
    }
  }

  const posTotal = Number(posThisMonth._sum.totalCents ?? 0);
  const totalMembers = membersByStatus.reduce((s, r) => s + r._count.id, 0);

  const statusMap: Record<string, number> = {};
  for (const r of membersByStatus) statusMap[r.status] = r._count.id;

  const posCategoryTotals = posByCategory.map((r) => ({ category: r.category, total: Number(r.total) }));

  return {
    now,
    totalMembers,
    statusMap,
    mrr,
    posTotal,
    attendanceThisMonth,
    attendanceByDow,
    beltMap,
    memberMonths,
    topAttendees: topAttendees.map((r) => ({ name: r.name, count: Number(r.count) })),
    posCategoryTotals,
    recentSales,
    trialsConverted,
    trialsLost,
    trialsPending,
    canceledLast30,
    activeSubCount: activeSubs.length,
  };
}

// ── page ─────────────────────────────────────────────────────────────────────

export default async function ReportsPage() {
  const d = await getData();

  const pastDuePct = d.totalMembers ? Math.round(((d.statusMap.past_due ?? 0) / d.totalMembers) * 100) : 0;

  const maxDow    = Math.max(1, ...Object.values(d.attendanceByDow));
  const maxMonth  = Math.max(1, ...d.memberMonths.map((m) => m.count));
  const maxBelt   = Math.max(1, ...Object.values(d.beltMap));
  const maxTop    = d.topAttendees.length > 0 ? d.topAttendees[0].count : 1;

  return (
    <div className="p-8 max-w-6xl mx-auto">
      <div className="mb-8 flex items-start justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-2xl font-bold text-white">Owner Dashboard</h1>
          <p className="text-sm text-gray-500 mt-1">
            {d.now.toLocaleDateString("en-US", { weekday: "long", year: "numeric", month: "long", day: "numeric" })}
          </p>
        </div>
        <ExportBar />
      </div>

      {/* ── KPI strip ── */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        <KPI label="Total Members"          value={String(d.totalMembers)}    sub={`${d.statusMap.active ?? 0} active`} />
        <KPI label="MRR"                    value={fmt$(d.mrr)}               sub={`${d.statusMap.active ?? 0} active subs`} accent="green" />
        <KPI label="POS Revenue (this mo.)" value={fmt$(d.posTotal)}          sub="Point of sale" />
        <KPI label="Check-ins (this mo.)"   value={String(d.attendanceThisMonth)} sub="Attendance" accent="blue" />
      </div>

      {/* ── Member status breakdown ── */}
      <Section title="Member Status">
        <div className="space-y-2.5">
          {[
            { label: "Active",   key: "active",    color: "bg-green-500" },
            { label: "Trial",    key: "trial",      color: "bg-blue-500"  },
            { label: "Past Due", key: "past_due",   color: "bg-yellow-500" },
            { label: "Lead",     key: "lead",       color: "bg-violet-500" },
            { label: "Inactive", key: "inactive",   color: "bg-gray-600"  },
            { label: "Canceled", key: "canceled",   color: "bg-red-700"   },
          ].map(({ label, key, color }) => {
            const count = d.statusMap[key] ?? 0;
            const pct   = d.totalMembers ? Math.round((count / d.totalMembers) * 100) : 0;
            return (
              <div key={key} className="flex items-center gap-3">
                <span className="w-20 text-xs text-gray-400 text-right">{label}</span>
                <div className="flex-1 bg-gray-800 rounded-full h-2.5 overflow-hidden">
                  <div className={`h-full rounded-full ${color}`} style={{ width: `${pct}%` }} />
                </div>
                <span className="text-xs text-gray-400 w-16">{count} ({pct}%)</span>
              </div>
            );
          })}
        </div>
      </Section>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mt-6">
        {/* ── New members (6 mo.) ── */}
        <Section title="New Members (last 6 months)">
          <BarChart
            bars={d.memberMonths.map((m) => ({ label: m.label, value: m.count, max: maxMonth }))}
            color="bg-blue-500"
            valueLabel={(v) => String(v)}
          />
        </Section>

        {/* ── Belt distribution ── */}
        <Section title="Belt Distribution">
          <BarChart
            bars={BELT_ORDER.map((belt) => ({
              label: belt,
              value: d.beltMap[belt] ?? 0,
              max:   maxBelt,
              color: belt === "white" ? "bg-gray-200" : belt === "blue" ? "bg-blue-500" : belt === "purple" ? "bg-purple-500" : belt === "brown" ? "bg-amber-700" : "bg-gray-900 border border-gray-600",
            }))}
            color="bg-blue-500"
            valueLabel={(v) => String(v)}
          />
        </Section>

        {/* ── Attendance by day ── */}
        <Section title="Attendance by Day of Week (last 30 days)">
          <BarChart
            bars={DOW.map((label, i) => ({ label, value: d.attendanceByDow[i] ?? 0, max: maxDow }))}
            color="bg-indigo-500"
            valueLabel={(v) => String(v)}
          />
        </Section>

        {/* ── POS by category ── */}
        <Section title="POS Revenue by Category (this month)">
          {d.posCategoryTotals.length === 0 ? (
            <p className="text-sm text-gray-600">No sales this month.</p>
          ) : (
            <BarChart
              bars={d.posCategoryTotals.map((r) => ({
                label: r.category,
                value: r.total,
                max:   Math.max(1, ...d.posCategoryTotals.map((x) => x.total)),
              }))}
              color="bg-emerald-500"
              valueLabel={(v) => fmt$(v)}
            />
          )}
        </Section>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mt-6">
        {/* ── Top attendees ── */}
        <Section title="Top Attendees (last 30 days)">
          {d.topAttendees.length === 0 ? (
            <p className="text-sm text-gray-600">No attendance recorded.</p>
          ) : (
            <div className="space-y-2">
              {d.topAttendees.map((a, i) => (
                <div key={a.name} className="flex items-center gap-3">
                  <span className="text-xs text-gray-600 w-5 text-right">{i + 1}</span>
                  <span className="text-sm text-gray-200 w-36 truncate">{a.name}</span>
                  <div className="flex-1 bg-gray-800 rounded-full h-2 overflow-hidden">
                    <div className="h-full rounded-full bg-indigo-500" style={{ width: `${Math.round((a.count / maxTop) * 100)}%` }} />
                  </div>
                  <span className="text-xs text-gray-400 w-8 text-right">{a.count}</span>
                </div>
              ))}
            </div>
          )}
        </Section>

        {/* ── Recent POS sales ── */}
        <Section title="Recent Sales">
          {d.recentSales.length === 0 ? (
            <p className="text-sm text-gray-600">No sales yet.</p>
          ) : (
            <div className="space-y-2">
              {d.recentSales.map((s) => (
                <div key={s.id} className="flex items-center justify-between text-sm">
                  <div>
                    <span className="text-gray-200">{s.member?.name ?? "Walk-in"}</span>
                    {s.lineItems[0] && (
                      <span className="text-gray-600 text-xs ml-2">
                        {s.lineItems[0].item.name}{s.lineItems.length > 1 ? ` +${s.lineItems.length - 1}` : ""}
                      </span>
                    )}
                  </div>
                  <div className="text-right">
                    <span className="text-green-400 font-medium">{fmt$(s.totalCents)}</span>
                    <p className="text-gray-600 text-xs">{new Date(s.createdAt).toLocaleDateString()}</p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </Section>
      </div>

      {/* ── Highlights ── */}
      <div className="mt-6 grid grid-cols-2 lg:grid-cols-4 gap-4">
        <Highlight
          label="Trial Conversion (90d)"
          value={
            d.trialsConverted + d.trialsLost > 0
              ? `${Math.round((d.trialsConverted / (d.trialsConverted + d.trialsLost)) * 100)}%`
              : "—"
          }
          sub={
            d.trialsConverted + d.trialsLost > 0
              ? `${d.trialsConverted} of ${d.trialsConverted + d.trialsLost} resolved · ${d.trialsPending} pending`
              : `${d.trialsPending} trials in progress`
          }
        />
        <Highlight
          label="Churn (30d)"
          value={
            d.canceledLast30 + d.activeSubCount > 0
              ? `${Math.round((d.canceledLast30 / (d.canceledLast30 + d.activeSubCount)) * 100)}%`
              : "—"
          }
          sub={`${d.canceledLast30} canceled subscription${d.canceledLast30 === 1 ? "" : "s"}`}
          warn={d.canceledLast30 > 0}
        />
        <Highlight
          label="Past Due Members"
          value={String(d.statusMap.past_due ?? 0)}
          sub={`${pastDuePct}% of total`}
          warn={!!d.statusMap.past_due}
        />
        <Highlight
          label="Leads in Pipeline"
          value={String(d.statusMap.lead ?? 0)}
          sub="Not yet enrolled"
        />
      </div>
      <p className="mt-3 text-xs text-gray-600">
        Conversion and churn track data recorded from June 2026 onward (trial start dates and
        cancellation timestamps weren&apos;t captured before then).
      </p>
    </div>
  );
}

// ── sub-components ────────────────────────────────────────────────────────────

function KPI({ label, value, sub, accent }: { label: string; value: string; sub: string; accent?: "green" | "blue" }) {
  const color = accent === "green" ? "text-green-400" : accent === "blue" ? "text-blue-400" : "text-white";
  return (
    <div className="bg-[#0f1117] border border-gray-700/50 rounded-xl p-5">
      <p className="text-xs text-gray-500 mb-1">{label}</p>
      <p className={`text-3xl font-bold ${color}`}>{value}</p>
      <p className="text-xs text-gray-600 mt-1">{sub}</p>
    </div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="bg-[#0f1117] border border-gray-700/50 rounded-xl p-5">
      <h2 className="text-sm font-semibold text-gray-400 mb-4 uppercase tracking-wider">{title}</h2>
      {children}
    </div>
  );
}

function Highlight({ label, value, sub, warn }: { label: string; value: string; sub: string; warn?: boolean }) {
  return (
    <div className={`rounded-xl border p-5 ${warn ? "bg-red-950/30 border-red-900/50" : "bg-gray-900 border-gray-800"}`}>
      <p className="text-xs text-gray-500 mb-1">{label}</p>
      <p className={`text-2xl font-bold ${warn ? "text-red-400" : "text-white"}`}>{value}</p>
      <p className="text-xs text-gray-600 mt-1">{sub}</p>
    </div>
  );
}

type Bar = {
  label:  string;
  value:  number;
  max:    number;
  color?: string;
};

function BarChart({ bars, color, valueLabel }: { bars: Bar[]; color: string; valueLabel: (v: number) => string }) {
  return (
    <div className="space-y-2.5">
      {bars.map((b) => (
        <div key={b.label} className="flex items-center gap-3">
          <span className="w-16 text-xs text-gray-400 text-right capitalize truncate">{b.label}</span>
          <div className="flex-1 bg-gray-800 rounded-full h-2.5 overflow-hidden">
            <div
              className={`h-full rounded-full ${b.color ?? color} transition-all`}
              style={{ width: `${b.max > 0 ? Math.round((b.value / b.max) * 100) : 0}%` }}
            />
          </div>
          <span className="text-xs text-gray-400 w-12 text-right">{valueLabel(b.value)}</span>
        </div>
      ))}
    </div>
  );
}
