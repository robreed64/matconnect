import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { getScoredMembers } from "@/lib/scored-members";
import { RiskPill, RiskReasons } from "../RiskBadge";

const FILTERS = [
  { key: "attention", label: "Needs attention" },
  { key: "high", label: "High" },
  { key: "medium", label: "Medium" },
  { key: "all", label: "All" },
] as const;
type FilterKey = (typeof FILTERS)[number]["key"];

type SearchParams = Promise<{ band?: string }>;

export default async function AtRiskPage({ searchParams }: { searchParams: SearchParams }) {
  const sp = await searchParams;
  const filter: FilterKey = FILTERS.find((f) => f.key === sp.band)?.key ?? "attention";

  const now = new Date();
  const all = await getScoredMembers(now);

  const rows = all.filter((m) => {
    if (filter === "all") return true;
    if (filter === "attention") return m.band !== "low";
    return m.band === filter;
  });

  // Most recent automated outreach per shown member.
  const ids = rows.map((r) => r.id);
  const outreach = new Map<number, { name: string; sentAt: Date | null }>();
  if (ids.length > 0) {
    const msgs = await prisma.message.findMany({
      where: { memberId: { in: ids }, workflowId: { not: null } },
      orderBy: { sentAt: "desc" },
      select: { memberId: true, sentAt: true, workflow: { select: { name: true } } },
    });
    for (const msg of msgs) {
      if (!outreach.has(msg.memberId)) {
        outreach.set(msg.memberId, { name: msg.workflow?.name ?? "Workflow", sentAt: msg.sentAt });
      }
    }
  }

  const initials = (name: string) =>
    name.trim().split(/\s+/).map((p) => p[0]).slice(0, 2).join("").toUpperCase();

  return (
    <div className="p-8 max-w-5xl">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-white">At-Risk Members</h1>
          <p className="text-sm text-gray-500 mt-1">
            Ranked by churn risk score — {rows.length} member{rows.length === 1 ? "" : "s"}
          </p>
        </div>
        <Link href="/admin/members" className="text-sm text-blue-400 hover:text-blue-300 transition">
          ← All members
        </Link>
      </div>

      <div className="flex gap-2 mb-5">
        {FILTERS.map((f) => (
          <Link
            key={f.key}
            href={`/admin/members/at-risk?band=${f.key}`}
            className={`px-3 py-1.5 rounded-lg text-sm font-medium transition ${
              f.key === filter ? "bg-blue-600 text-white" : "bg-gray-800 text-gray-400 hover:text-white"
            }`}
          >
            {f.label}
          </Link>
        ))}
      </div>

      {rows.length === 0 ? (
        <div className="bg-[#0f1117] border border-gray-700/50 rounded-2xl p-12 text-center">
          <p className="text-gray-500 text-sm">
            {filter === "attention"
              ? "No members need attention right now — everyone's engaged. 🎉"
              : "No members match this filter."}
          </p>
        </div>
      ) : (
        <div className="rounded-xl border border-gray-800 overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-800 bg-gray-900/60 text-gray-400 text-left">
                <th className="px-4 py-3 font-medium">Member</th>
                <th className="px-4 py-3 font-medium">Risk</th>
                <th className="px-4 py-3 font-medium">Why</th>
                <th className="px-4 py-3 font-medium">Last check-in</th>
                <th className="px-4 py-3 font-medium">Last automated outreach</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-800">
              {rows.map((m) => {
                const reach = outreach.get(m.id);
                return (
                  <tr key={m.id} className="hover:bg-gray-900/40 transition">
                    <td className="px-4 py-3">
                      <Link href={`/admin/members/${m.id}`} className="hover:text-blue-400 transition flex items-center gap-3">
                        <div className="w-8 h-8 rounded-full bg-gray-700 border border-gray-600 flex-shrink-0 overflow-hidden flex items-center justify-center text-xs font-bold text-gray-400">
                          {m.photoUrl
                            ? // eslint-disable-next-line @next/next/no-img-element
                              <img src={m.photoUrl} alt={m.name} className="w-full h-full object-cover" />
                            : initials(m.name)}
                        </div>
                        <span className="font-medium text-white">{m.name}</span>
                      </Link>
                    </td>
                    <td className="px-4 py-3">
                      <RiskPill score={m.score} band={m.band} />
                    </td>
                    <td className="px-4 py-3">
                      <RiskReasons reasons={m.reasons} />
                    </td>
                    <td className="px-4 py-3 text-gray-400">
                      {m.lastCheckInAt
                        ? m.lastCheckInAt.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })
                        : "Never"}
                    </td>
                    <td className="px-4 py-3 text-gray-400">
                      {reach
                        ? `${reach.name}${reach.sentAt ? ` · ${reach.sentAt.toLocaleDateString("en-US", { month: "short", day: "numeric" })}` : ""}`
                        : <span className="text-gray-600">Never</span>}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      <p className="text-xs text-gray-600 mt-4">
        Scores combine inactivity, payment status, training frequency, trials, and progression. An active{" "}
        <Link href="/admin/marketing" className="underline hover:text-gray-400">Inactivity workflow</Link> reaches
        out to lapsing members automatically.
      </p>
    </div>
  );
}
