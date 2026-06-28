import Link from "next/link";
import { prisma } from "@/lib/prisma";

const DAY_RANGES = [14, 21, 30, 60];

type SearchParams = Promise<{ days?: string }>;

export default async function AtRiskPage({ searchParams }: { searchParams: SearchParams }) {
  const sp = await searchParams;
  const days = DAY_RANGES.includes(parseInt(sp.days ?? "", 10)) ? parseInt(sp.days!, 10) : 21;
  const now = new Date();
  const cutoff = new Date(now.getTime() - days * 24 * 60 * 60 * 1000);

  const members = await prisma.member.findMany({
    where: {
      status: "active",
      attendance: { none: { timestamp: { gte: cutoff } } },
    },
    select: {
      id: true,
      name: true,
      photoUrl: true,
      beltRank: true,
      attendance: { orderBy: { timestamp: "desc" }, take: 1, select: { timestamp: true } },
      messages: {
        where: { workflowId: { not: null } },
        orderBy: { sentAt: "desc" },
        take: 1,
        select: { sentAt: true, workflow: { select: { name: true } } },
      },
    },
    orderBy: { name: "asc" },
  });

  // Longest-absent first
  const rows = members
    .map((m) => {
      const last = m.attendance[0]?.timestamp ?? null;
      const daysSince = last ? Math.floor((now.getTime() - last.getTime()) / (24 * 60 * 60 * 1000)) : null;
      return { ...m, last, daysSince };
    })
    .sort((a, b) => (b.daysSince ?? Infinity) - (a.daysSince ?? Infinity));

  return (
    <div className="p-8 max-w-5xl">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-white">At-Risk Members</h1>
          <p className="text-sm text-gray-500 mt-1">
            Active members with no check-in for {days}+ days — {rows.length} member{rows.length === 1 ? "" : "s"}
          </p>
        </div>
        <Link href="/admin/members" className="text-sm text-blue-400 hover:text-blue-300 transition">
          ← All members
        </Link>
      </div>

      <div className="flex gap-2 mb-5">
        {DAY_RANGES.map((d) => (
          <Link
            key={d}
            href={`/admin/members/at-risk?days=${d}`}
            className={`px-3 py-1.5 rounded-lg text-sm font-medium transition ${
              d === days ? "bg-blue-600 text-white" : "bg-gray-800 text-gray-400 hover:text-white"
            }`}
          >
            {d}+ days
          </Link>
        ))}
      </div>

      {rows.length === 0 ? (
        <div className="bg-[#0f1117] border border-gray-700/50 rounded-2xl p-12 text-center">
          <p className="text-gray-500 text-sm">No at-risk members — everyone has trained in the last {days} days. 🎉</p>
        </div>
      ) : (
        <div className="rounded-xl border border-gray-800 overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-800 bg-gray-900/60 text-gray-400 text-left">
                <th className="px-4 py-3 font-medium">Member</th>
                <th className="px-4 py-3 font-medium">Last check-in</th>
                <th className="px-4 py-3 font-medium text-right">Days absent</th>
                <th className="px-4 py-3 font-medium">Last automated outreach</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-800">
              {rows.map((m) => (
                <tr key={m.id} className="hover:bg-gray-900/40 transition">
                  <td className="px-4 py-3">
                    <Link href={`/admin/members/${m.id}`} className="hover:text-blue-400 transition flex items-center gap-3">
                      <div className="w-8 h-8 rounded-full bg-gray-700 border border-gray-600 flex-shrink-0 overflow-hidden flex items-center justify-center text-xs font-bold text-gray-400">
                        {m.photoUrl
                          ? // eslint-disable-next-line @next/next/no-img-element
                            <img src={m.photoUrl} alt={m.name} className="w-full h-full object-cover" />
                          : m.name.trim().split(/\s+/).map((p) => p[0]).slice(0, 2).join("").toUpperCase()}
                      </div>
                      <span className="font-medium text-white">{m.name}</span>
                    </Link>
                  </td>
                  <td className="px-4 py-3 text-gray-400">
                    {m.last
                      ? m.last.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })
                      : "Never"}
                  </td>
                  <td className="px-4 py-3 text-right">
                    <span className={`font-semibold ${(m.daysSince ?? 999) >= 45 ? "text-red-400" : "text-amber-300"}`}>
                      {m.daysSince ?? "—"}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-gray-400">
                    {m.messages[0]
                      ? `${m.messages[0].workflow?.name ?? "Workflow"}${m.messages[0].sentAt ? ` · ${m.messages[0].sentAt.toLocaleDateString("en-US", { month: "short", day: "numeric" })}` : ""}`
                      : <span className="text-gray-600">Never</span>}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <p className="text-xs text-gray-600 mt-4">
        Tip: an active <Link href="/admin/marketing" className="underline hover:text-gray-400">Inactivity workflow</Link> reaches
        out to these members automatically.
      </p>
    </div>
  );
}
