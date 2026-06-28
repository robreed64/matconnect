import Link from "next/link";
import { prisma } from "@/lib/prisma";

export default async function SetupCurriculumPage() {
  const curricula = await prisma.curriculum.findMany({
    orderBy: { createdAt: "desc" },
    include: { _count: { select: { lessons: true } } },
  });

  const active   = curricula.filter(c => c.active).length;
  const inactive = curricula.length - active;

  return (
    <div className="p-8 max-w-3xl">
      <div className="mb-6">
        <Link href="/admin/setup" className="text-sm text-amber-500 hover:text-amber-300 transition">← Configure</Link>
        <h1 className="text-2xl font-bold mt-2">Curriculum</h1>
      </div>

      <div className="flex gap-4 mb-6">
        {[
          { label: "Total", value: curricula.length },
          { label: "Active", value: active },
          { label: "Inactive", value: inactive },
        ].map(s => (
          <div key={s.label} className="bg-[#0f1117] border border-gray-700/50 rounded-xl px-5 py-3 text-center">
            <p className="text-2xl font-bold text-white">{s.value}</p>
            <p className="text-xs text-gray-500 mt-1">{s.label}</p>
          </div>
        ))}
      </div>

      <div className="bg-[#0f1117] border border-gray-700/50 rounded-2xl overflow-hidden mb-4">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-gray-800 bg-gray-900/60 text-gray-400 text-left">
              <th className="px-4 py-3 font-medium">Curriculum</th>
              <th className="px-4 py-3 font-medium">Belt</th>
              <th className="px-4 py-3 font-medium">Lessons</th>
              <th className="px-4 py-3 font-medium">Status</th>
              <th className="px-4 py-3 font-medium"></th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-800">
            {curricula.map(c => (
              <tr key={c.id} className="hover:bg-gray-900/40">
                <td className="px-4 py-3 font-medium text-white">{c.name}</td>
                <td className="px-4 py-3 text-gray-400 capitalize">{c.beltLevel ?? "All"}</td>
                <td className="px-4 py-3 text-gray-400">{c._count.lessons}</td>
                <td className="px-4 py-3">
                  <span className={`px-2 py-0.5 rounded text-xs ${c.active ? "bg-green-900/40 text-green-400" : "bg-gray-800 text-gray-500"}`}>
                    {c.active ? "Active" : "Inactive"}
                  </span>
                </td>
                <td className="px-4 py-3 text-right">
                  <Link href={`/admin/curriculum/${c.id}`} className="text-xs text-blue-400 hover:text-blue-300 transition">Edit →</Link>
                </td>
              </tr>
            ))}
            {curricula.length === 0 && (
              <tr><td colSpan={5} className="px-4 py-8 text-center text-gray-600">No curricula yet.</td></tr>
            )}
          </tbody>
        </table>
      </div>

      <Link href="/admin/curriculum" className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-blue-600 hover:bg-blue-500 text-white text-sm font-medium transition">
        + New Curriculum
      </Link>
    </div>
  );
}
