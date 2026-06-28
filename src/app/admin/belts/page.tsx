import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { BELT_ORDER, BELT_STYLES, getNextBelt, BELT_TECHNIQUES } from "@/lib/belt-data";
import BeltRequirementsEditor from "./BeltRequirementsEditor";

const DEFAULT_REQUIREMENTS = [
  { beltRank: "blue",   minClasses: 100, minMonths: 12, minTechniques: 18 },
  { beltRank: "purple", minClasses: 200, minMonths: 24, minTechniques: 15 },
  { beltRank: "brown",  minClasses: 200, minMonths: 36, minTechniques: 12 },
  { beltRank: "black",  minClasses: 200, minMonths: 48, minTechniques: 10 },
];

type Requirement = { id?: number; beltRank: string; minClasses: number; minMonths: number; minTechniques: number };

function pct(value: number, min: number) {
  return min === 0 ? 100 : Math.min(100, Math.round((value / min) * 100));
}

function ProgressBar({ value, min }: { value: number; min: number }) {
  const p = pct(value, min);
  const color = p >= 100 ? "bg-green-500" : p >= 75 ? "bg-yellow-500" : "bg-blue-500";
  return (
    <div className="h-1.5 bg-gray-800 rounded-full overflow-hidden w-24">
      <div className={`h-full rounded-full transition-all ${color}`} style={{ width: `${p}%` }} />
    </div>
  );
}

export default async function BeltsPage() {
  const dbReqs = await prisma.beltRequirement.findMany({ orderBy: { id: "asc" } });
  const requirements: Requirement[] = DEFAULT_REQUIREMENTS.map((def) => {
    const db = dbReqs.find((r) => r.beltRank === def.beltRank);
    return db ? { id: db.id, beltRank: db.beltRank, minClasses: db.minClasses, minMonths: db.minMonths, minTechniques: db.minTechniques } : def;
  });

  const members = await prisma.member.findMany({
    where: { beltRank: { in: ["white", "blue", "purple", "brown"] } },
    include: {
      _count: { select: { attendance: true } },
      techniqueProgress: { where: { mastered: true } },
    },
    orderBy: { name: "asc" },
  });

  type Candidate = {
    id: number; name: string; beltRank: string;
    nextBelt: string; req: Requirement;
    classes: number; months: number; techniques: number;
    classPct: number; monthPct: number; techPct: number; overall: number;
  };

  const candidates: Candidate[] = members.flatMap((m) => {
    const nextBelt = getNextBelt(m.beltRank);
    if (!nextBelt) return [];
    const req = requirements.find((r) => r.beltRank === nextBelt);
    if (!req) return [];

    const months     = Math.floor((Date.now() - m.createdAt.getTime()) / (1000 * 60 * 60 * 24 * 30.44));
    const classes    = m._count.attendance;
    const techniques = m.techniqueProgress.filter((t) => t.beltRank === nextBelt).length;

    const classPct = pct(classes,    req.minClasses);
    const monthPct = pct(months,     req.minMonths);
    const techPct  = pct(techniques, req.minTechniques);
    const overall  = Math.round((classPct + monthPct + techPct) / 3);

    if (overall < 50) return [];
    return [{ id: m.id, name: m.name, beltRank: m.beltRank ?? "white", nextBelt, req, classes, months, techniques, classPct, monthPct, techPct, overall }];
  }).sort((a, b) => b.overall - a.overall);

  return (
    <div className="p-8 max-w-5xl">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-white">Belt Progression</h1>
        <p className="text-gray-500 text-sm mt-1">Manage promotion requirements and track member progress.</p>
      </div>

      <BeltRequirementsEditor initial={requirements} />

      {/* Belt order + technique counts */}
      <div className="mt-6 bg-gray-900 border border-gray-800 rounded-xl p-5">
        <h2 className="text-xs font-semibold tracking-wide text-gray-400 mb-4">Belt Progression Path</h2>
        <div className="flex items-center gap-3 flex-wrap mb-4">
          {BELT_ORDER.map((belt, i) => {
            const s = BELT_STYLES[belt];
            return (
              <div key={belt} className="flex items-center gap-2">
                <span className={`px-3 py-1 rounded-full text-xs font-semibold capitalize ${s.bg} ${s.text}`}>{belt}</span>
                {i < BELT_ORDER.length - 1 && <span className="text-gray-600">→</span>}
              </div>
            );
          })}
        </div>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 border-t border-gray-800 pt-4">
          {(["blue", "purple", "brown", "black"] as const).map((belt) => {
            const techniques = BELT_TECHNIQUES[belt] ?? [];
            const s = BELT_STYLES[belt];
            return (
              <div key={belt} className="text-xs text-gray-500">
                <span className={`inline-block px-2 py-0.5 rounded-full font-semibold text-xs capitalize mb-1 ${s.bg} ${s.text}`}>{belt}</span>
                <p>{techniques.length} techniques defined</p>
              </div>
            );
          })}
        </div>
      </div>

      {/* Promotion candidates */}
      <div className="mt-6">
        <h2 className="text-sm font-semibold text-white mb-3">
          Promotion Candidates
          <span className="ml-2 text-xs text-gray-500 font-normal">(≥ 50% on all criteria)</span>
        </h2>

        {candidates.length === 0 ? (
          <div className="bg-gray-900 border border-gray-800 rounded-xl p-8 text-center text-gray-600 text-sm">
            No members currently at 50%+ on all promotion criteria.
          </div>
        ) : (
          <div className="bg-gray-900 border border-gray-800 rounded-xl overflow-hidden">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-800 text-gray-500 text-xs">
                  <th className="px-5 py-3 text-left font-medium">Member</th>
                  <th className="px-5 py-3 text-left font-medium">Current → Next</th>
                  <th className="px-5 py-3 text-left font-medium">Classes</th>
                  <th className="px-5 py-3 text-left font-medium">Months</th>
                  <th className="px-5 py-3 text-left font-medium">Techniques</th>
                  <th className="px-5 py-3 text-left font-medium">Overall</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-800">
                {candidates.map((c) => {
                  const currStyle = BELT_STYLES[c.beltRank]?.dot ?? "bg-gray-600";
                  const nextStyle = BELT_STYLES[c.nextBelt]?.dot ?? "bg-gray-600";
                  const overallColor = c.overall >= 100 ? "text-green-400" : c.overall >= 75 ? "text-yellow-400" : "text-blue-400";
                  return (
                    <tr key={c.id} className="hover:bg-gray-800/40 transition">
                      <td className="px-5 py-3">
                        <Link href={`/admin/members/${c.id}`} className="font-medium text-white hover:text-blue-400 transition">
                          {c.name}
                        </Link>
                      </td>
                      <td className="px-5 py-3">
                        <div className="flex items-center gap-2 text-xs">
                          <span className={`w-3 h-3 rounded-full flex-shrink-0 ${currStyle}`} />
                          <span className="text-gray-400 capitalize">{c.beltRank}</span>
                          <span className="text-gray-600">→</span>
                          <span className={`w-3 h-3 rounded-full flex-shrink-0 ${nextStyle}`} />
                          <span className="text-white capitalize font-medium">{c.nextBelt}</span>
                        </div>
                      </td>
                      <td className="px-5 py-3">
                        <div className="text-xs text-gray-400 mb-1">{c.classes}/{c.req.minClasses}</div>
                        <ProgressBar value={c.classes} min={c.req.minClasses} />
                      </td>
                      <td className="px-5 py-3">
                        <div className="text-xs text-gray-400 mb-1">{c.months}/{c.req.minMonths} mo</div>
                        <ProgressBar value={c.months} min={c.req.minMonths} />
                      </td>
                      <td className="px-5 py-3">
                        <div className="text-xs text-gray-400 mb-1">{c.techniques}/{c.req.minTechniques}</div>
                        <ProgressBar value={c.techniques} min={c.req.minTechniques} />
                      </td>
                      <td className="px-5 py-3">
                        <span className={`text-sm font-bold ${overallColor}`}>{c.overall}%</span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
