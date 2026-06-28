import { auth } from "@/auth";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { BELT_ORDER, BELT_STYLES, BELT_TECHNIQUES, getNextBelt } from "@/lib/belt-data";

export default async function MemberProgressPage() {
  const session = await auth();
  if (!session?.user) redirect("/login");

  const userRow = await prisma.user.findUnique({
    where:   { email: session.user.email! },
    include: {
      member: {
        include: {
          _count: { select: { attendance: true } },
        },
      },
    },
  });

  if (!userRow?.member) {
    return (
      <div className="text-center py-20">
        <p className="text-gray-400">Account not linked to a member profile.</p>
      </div>
    );
  }

  const member       = userRow.member;
  const memberId     = member.id;
  const currentBelt  = member.beltRank ?? "white";
  const nextBelt     = getNextBelt(currentBelt);
  const monthsTraining = Math.floor(
    (Date.now() - member.createdAt.getTime()) / (1000 * 60 * 60 * 24 * 30.44)
  );

  const [requirements, allTechProgress] = await Promise.all([
    prisma.beltRequirement.findMany(),
    prisma.techniqueProgress.findMany({ where: { memberId } }),
  ]);

  const reqMap: Record<string, { minClasses: number; minMonths: number; minTechniques: number }> = {};
  for (const r of requirements) reqMap[r.beltRank] = r;

  const progressMap: Record<string, Set<string>> = {};
  for (const t of allTechProgress) {
    if (t.mastered) {
      if (!progressMap[t.beltRank]) progressMap[t.beltRank] = new Set();
      progressMap[t.beltRank].add(t.techniqueName);
    }
  }

  // Which belts have been passed (current belt index)
  const currentIdx = BELT_ORDER.indexOf(currentBelt as typeof BELT_ORDER[number]);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-white">Belt Progression</h1>
        <p className="text-sm text-gray-500 mt-1">Track your journey toward the next belt</p>
      </div>

      {/* Belt journey visual */}
      <div className="bg-[#0f1117] border border-gray-700/50 rounded-xl p-6">
        <h2 className="text-xs font-semibold uppercase tracking-wider text-gray-500 mb-5">Your Journey</h2>
        <div className="flex items-center gap-2">
          {BELT_ORDER.map((belt, i) => {
            const style    = BELT_STYLES[belt];
            const passed   = i <= currentIdx;
            const isCurrent = i === currentIdx;
            const isNext   = i === currentIdx + 1;
            return (
              <div key={belt} className="flex-1 flex flex-col items-center gap-2">
                <div className={`w-10 h-10 rounded-full flex items-center justify-center text-xs font-bold border-2 transition
                  ${isCurrent ? `${style.bg} ${style.text} border-white scale-110 ring-2 ring-white/20` :
                    passed   ? `${style.bg} ${style.text} border-transparent` :
                               "bg-gray-800 text-gray-600 border-gray-700"}`}>
                  {isCurrent ? "★" : passed ? "✓" : ""}
                </div>
                <span className={`text-xs capitalize font-medium ${passed ? "text-gray-300" : "text-gray-600"}`}>
                  {belt}
                </span>
                {isNext && <span className="text-xs text-blue-400">next</span>}
              </div>
            );
          })}
        </div>
      </div>

      {/* Requirements for next belt */}
      {nextBelt && (
        <div className="bg-[#0f1117] border border-gray-700/50 rounded-xl p-5">
          <h2 className="text-xs font-semibold uppercase tracking-wider text-gray-500 mb-4">
            Requirements for <span className="text-white capitalize">{nextBelt} Belt</span>
          </h2>
          {reqMap[nextBelt] ? (
            <div className="space-y-4">
              <RequirementBar
                label="Classes attended"
                current={member._count.attendance}
                required={reqMap[nextBelt].minClasses}
              />
              <RequirementBar
                label="Months training"
                current={monthsTraining}
                required={reqMap[nextBelt].minMonths}
              />
              {reqMap[nextBelt].minTechniques > 0 && (
                <RequirementBar
                  label="Techniques mastered"
                  current={progressMap[nextBelt]?.size ?? 0}
                  required={reqMap[nextBelt].minTechniques}
                />
              )}
            </div>
          ) : (
            <p className="text-sm text-gray-600">No requirements configured for this belt.</p>
          )}
        </div>
      )}

      {!nextBelt && currentBelt === "black" && (
        <div className="bg-[#0f1117] border border-gray-700/50 rounded-xl p-6 text-center">
          <p className="text-2xl">🥋</p>
          <p className="text-white font-semibold mt-2">Black Belt</p>
          <p className="text-gray-500 text-sm mt-1">Peak of the mountain. Keep rolling.</p>
        </div>
      )}

      {/* Technique checklists (read-only) */}
      {BELT_ORDER.filter((b) => BELT_TECHNIQUES[b]?.length > 0).map((belt) => {
        const beltIdx = BELT_ORDER.indexOf(belt as typeof BELT_ORDER[number]);
        const techniques = BELT_TECHNIQUES[belt] ?? [];
        const mastered   = progressMap[belt] ?? new Set();
        const style      = BELT_STYLES[belt];
        const isForNextBelt = belt === nextBelt;
        const isPast = beltIdx < currentIdx;

        if (beltIdx > currentIdx + 1) return null; // Don't show belts beyond next

        return (
          <div key={belt} className={`bg-gray-900 border rounded-xl p-5 ${isForNextBelt ? "border-blue-800" : "border-gray-800"}`}>
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <span className={`px-2.5 py-0.5 rounded-full text-xs font-semibold capitalize ${style.bg} ${style.text}`}>
                  {belt} Belt
                </span>
                {isForNextBelt && (
                  <span className="text-xs text-blue-400 bg-blue-900/30 px-2 py-0.5 rounded-full">In progress</span>
                )}
                {isPast && (
                  <span className="text-xs text-green-400 bg-green-900/30 px-2 py-0.5 rounded-full">Completed</span>
                )}
              </div>
              <span className="text-xs text-gray-500">{mastered.size} / {techniques.length}</span>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              {techniques.map((tech) => {
                const done = mastered.has(tech);
                return (
                  <div key={tech} className={`flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm
                    ${done ? "bg-green-950/30 text-green-300" : "bg-gray-800/50 text-gray-500"}`}>
                    <span className={`text-xs flex-shrink-0 ${done ? "text-green-400" : "text-gray-700"}`}>
                      {done ? "✓" : "○"}
                    </span>
                    {tech}
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

function RequirementBar({ label, current, required }: { label: string; current: number; required: number }) {
  const pct = Math.min(100, required > 0 ? Math.round((current / required) * 100) : 0);
  const met = current >= required;
  return (
    <div>
      <div className="flex justify-between text-sm mb-1.5">
        <span className="text-gray-400">{label}</span>
        <span className={met ? "text-green-400 font-semibold" : "text-gray-300"}>
          {current} / {required}{met ? " ✓" : ""}
        </span>
      </div>
      <div className="h-2 bg-gray-800 rounded-full overflow-hidden">
        <div
          className={`h-full rounded-full transition-all ${met ? "bg-green-500" : "bg-blue-500"}`}
          style={{ width: `${pct}%` }}
        />
      </div>
    </div>
  );
}
