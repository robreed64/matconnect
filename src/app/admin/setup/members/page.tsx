import Link from "next/link";
import { prisma } from "@/lib/prisma";

export default async function SetupMembersPage() {
  const [total, active, leads, pastDue, byBelt] = await Promise.all([
    prisma.member.count(),
    prisma.member.count({ where: { status: "active" } }),
    prisma.member.count({ where: { status: "lead" } }),
    prisma.member.count({ where: { status: "past_due" } }),
    prisma.member.groupBy({ by: ["beltRank"], _count: true, orderBy: { _count: { beltRank: "desc" } } }),
  ]);

  const thisMonth = await prisma.member.count({
    where: { createdAt: { gte: new Date(new Date().getFullYear(), new Date().getMonth(), 1) } },
  });

  return (
    <div className="p-8 max-w-3xl">
      <div className="mb-6">
        <Link href="/admin/setup" className="text-sm text-amber-500 hover:text-amber-300 transition">← Configure</Link>
        <h1 className="text-2xl font-bold mt-2">Members</h1>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-8">
        {[
          { label: "Total", value: total },
          { label: "Active", value: active },
          { label: "New This Month", value: thisMonth },
          { label: "Past Due", value: pastDue, warn: pastDue > 0 },
        ].map((s) => (
          <div key={s.label} className="bg-[#0f1117] border border-gray-700/50 rounded-xl p-4 text-center">
            <p className={`text-2xl font-bold ${s.warn ? "text-red-400" : "text-white"}`}>{s.value}</p>
            <p className="text-xs text-gray-500 mt-1">{s.label}</p>
          </div>
        ))}
      </div>

      {leads > 0 && (
        <div className="mb-6 bg-yellow-900/20 border border-yellow-800/40 rounded-xl p-4 text-sm text-yellow-300">
          {leads} lead{leads !== 1 ? "s" : ""} pending — <Link href="/admin/members?status=lead" className="underline">view members</Link>
        </div>
      )}

      <div className="bg-[#0f1117] border border-gray-700/50 rounded-2xl p-6 space-y-3 mb-6">
        <h2 className="text-sm font-semibold text-gray-400 uppercase tracking-wide mb-4">Actions</h2>
        <Link href="/admin/members" className="flex items-center justify-between px-4 py-3 rounded-lg bg-gray-800 hover:bg-gray-700 transition text-sm">
          <span>Browse & manage members</span><span className="text-gray-500">→</span>
        </Link>
        <Link href="/admin/members/new" className="flex items-center justify-between px-4 py-3 rounded-lg bg-gray-800 hover:bg-gray-700 transition text-sm">
          <span>Add new member</span><span className="text-gray-500">→</span>
        </Link>
        <p className="text-xs text-gray-600 pt-2">
          To delete a member, reset portal passwords, or manually overwrite a check-in — open the member&apos;s detail page from the list above.
        </p>
      </div>

      {byBelt.length > 0 && (
        <div className="bg-[#0f1117] border border-gray-700/50 rounded-2xl p-6">
          <h2 className="text-sm font-semibold text-gray-400 uppercase tracking-wide mb-4">Members by Belt</h2>
          <div className="space-y-2">
            {byBelt.map((b) => (
              <div key={b.beltRank} className="flex items-center justify-between text-sm">
                <span className="capitalize text-gray-300">{b.beltRank ?? "Unassigned"}</span>
                <span className="text-gray-500">{b._count}</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
