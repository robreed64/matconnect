import { auth } from "@/auth";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { BELT_STYLES } from "@/lib/belt-data";
import VideoPlayer from "@/components/VideoPlayer";

type Technique = { name: string; description?: string; videoUrl?: string };

export default async function MemberCurriculumPage() {
  const session = await auth();
  if (!session?.user) redirect("/login");

  const curricula = await prisma.curriculum.findMany({
    where:   { active: true },
    orderBy: { createdAt: "desc" },
    include: {
      lessons: { orderBy: [{ weekNumber: "asc" }, { position: "asc" }] },
      _count:  { select: { lessons: true } },
    },
  });

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-white">Training Curriculum</h1>
        <p className="text-sm text-gray-500 mt-1">Structured lesson plans from your gym</p>
      </div>

      {curricula.length === 0 ? (
        <div className="bg-[#0f1117] border border-gray-700/50 rounded-xl p-10 text-center text-gray-600 text-sm">
          No curriculum published yet. Check back soon.
        </div>
      ) : (
        <div className="space-y-8">
          {curricula.map((c) => {
            const belt  = c.beltLevel ? BELT_STYLES[c.beltLevel] : null;
            const weeks = Array.from(new Set(c.lessons.map((l) => l.weekNumber))).sort((a, b) => a - b);

            return (
              <div key={c.id} className="bg-[#0f1117] border border-gray-700/50 rounded-2xl overflow-hidden">
                {/* Header */}
                <div className="px-6 py-5 border-b border-gray-800 flex items-start justify-between gap-4">
                  <div>
                    <div className="flex items-center gap-2 flex-wrap">
                      <h2 className="text-lg font-bold text-white">{c.name}</h2>
                      {belt ? (
                        <span className={`px-2.5 py-0.5 rounded-full text-xs font-semibold capitalize ${belt.bg} ${belt.text}`}>
                          {c.beltLevel} belt
                        </span>
                      ) : (
                        <span className="px-2.5 py-0.5 rounded-full text-xs bg-gray-800 text-gray-400">All levels</span>
                      )}
                    </div>
                    {c.description && <p className="text-sm text-gray-500 mt-1">{c.description}</p>}
                    <p className="text-xs text-gray-600 mt-1">{c.weeks} weeks · {c._count.lessons} lessons</p>
                  </div>
                </div>

                {/* Week tabs + lessons */}
                {c.lessons.length === 0 ? (
                  <div className="px-6 py-8 text-center text-gray-600 text-sm">No lessons added yet.</div>
                ) : (
                  <WeekView weeks={weeks} lessons={c.lessons.map((l) => ({
                    id:         l.id,
                    title:      l.title,
                    weekNumber: l.weekNumber,
                    dayOfWeek:  l.dayOfWeek,
                    warmup:     l.warmup,
                    techniques: l.techniques as Technique[],
                    notes:      l.notes,
                    position:   l.position,
                  }))} />
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

// Server-rendered accordion per week
function WeekView({
  weeks,
  lessons,
}: {
  weeks:   number[];
  lessons: { id: number; title: string; weekNumber: number; dayOfWeek: string | null; warmup: string | null; techniques: Technique[]; notes: string | null; position: number }[];
}) {
  return (
    <div className="divide-y divide-gray-800">
      {weeks.map((wk) => {
        const wkLessons = lessons.filter((l) => l.weekNumber === wk);
        return (
          <div key={wk} className="px-6 py-4">
            <p className="text-xs font-semibold uppercase tracking-wider text-gray-500 mb-3">Week {wk}</p>
            <div className="space-y-3">
              {wkLessons.map((lesson) => {
                const techs = lesson.techniques ?? [];
                return (
                  <div key={lesson.id} className="bg-gray-800/60 border border-gray-700/50 rounded-xl p-4">
                    <div className="flex items-start justify-between gap-2 mb-3">
                      <div>
                        <p className="font-medium text-white">{lesson.title}</p>
                        {lesson.dayOfWeek && (
                          <p className="text-xs text-gray-500 mt-0.5">{lesson.dayOfWeek}</p>
                        )}
                      </div>
                      {techs.length > 0 && (
                        <span className="text-xs text-gray-600 flex-shrink-0">{techs.length} technique{techs.length !== 1 ? "s" : ""}</span>
                      )}
                    </div>

                    {lesson.warmup && (
                      <div className="mb-3">
                        <p className="text-xs text-gray-500 uppercase tracking-wider mb-1">Warm-up</p>
                        <p className="text-sm text-gray-300">{lesson.warmup}</p>
                      </div>
                    )}

                    {techs.length > 0 && (
                      <div className="space-y-2">
                        <p className="text-xs text-gray-500 uppercase tracking-wider">Techniques</p>
                        {techs.map((t, i) => (
                          <div key={i} className="bg-gray-900/60 rounded-lg px-3 py-2 space-y-2">
                            <p className="text-sm font-medium text-gray-100">{t.name}</p>
                            {t.description && <p className="text-xs text-gray-400">{t.description}</p>}
                            {t.videoUrl && <VideoPlayer url={t.videoUrl} />}
                          </div>
                        ))}
                      </div>
                    )}

                    {lesson.notes && (
                      <div className="mt-3 pt-3 border-t border-gray-700/50">
                        <p className="text-xs text-gray-500 uppercase tracking-wider mb-1">Notes</p>
                        <p className="text-sm text-gray-400">{lesson.notes}</p>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        );
      })}
    </div>
  );
}
