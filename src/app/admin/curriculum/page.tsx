import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { BELT_STYLES } from "@/lib/belt-data";
import NewCurriculumButton from "./NewCurriculumButton";

export default async function CurriculumPage() {
  const curricula = await prisma.curriculum.findMany({
    orderBy: { createdAt: "desc" },
    include: { _count: { select: { lessons: true } } },
  });

  return (
    <div className="p-8 max-w-5xl mx-auto">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold text-white">Curriculum</h1>
          <p className="text-sm text-gray-500 mt-1">Build and manage structured training programs</p>
        </div>
        <NewCurriculumButton />
      </div>

      {curricula.length === 0 ? (
        <div className="bg-[#0f1117] border border-gray-700/50 rounded-xl p-12 text-center">
          <p className="text-gray-500 text-sm">No curricula yet.</p>
          <p className="text-gray-600 text-xs mt-1">Create one to start building structured lesson plans.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {curricula.map((c) => {
            const belt  = c.beltLevel ? BELT_STYLES[c.beltLevel] : null;
            return (
              <Link key={c.id} href={`/admin/curriculum/${c.id}`}
                className="bg-[#0f1117] border border-gray-700/50 rounded-xl p-5 hover:border-gray-700 transition group">
                <div className="flex items-start justify-between gap-3">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <h2 className="font-semibold text-white group-hover:text-blue-400 transition truncate">{c.name}</h2>
                      {!c.active && <span className="text-xs text-gray-600 bg-gray-800 px-2 py-0.5 rounded-full">Inactive</span>}
                    </div>
                    {c.description && <p className="text-sm text-gray-500 mt-1 truncate">{c.description}</p>}
                    <div className="flex items-center gap-3 mt-3">
                      {belt ? (
                        <span className={`px-2.5 py-0.5 rounded-full text-xs font-semibold capitalize ${belt.bg} ${belt.text}`}>
                          {c.beltLevel} belt
                        </span>
                      ) : (
                        <span className="px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-800 text-gray-400">All levels</span>
                      )}
                      <span className="text-xs text-gray-500">{c.weeks} weeks</span>
                      <span className="text-xs text-gray-500">{c._count.lessons} lessons</span>
                    </div>
                  </div>
                  <span className="text-gray-700 group-hover:text-gray-400 transition text-lg flex-shrink-0">→</span>
                </div>
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}
