import Link from "next/link";
import { Suspense } from "react";
import { prisma } from "@/lib/prisma";
import { auth } from "@/auth";
import { can } from "@/lib/permissions";
import { getGymSettings } from "@/lib/gym-settings";
import { trialDaysLeft, trialBadge } from "@/lib/trial";
import MemberFilters from "./MemberFilters";

const PAGE_SIZE = 20;

const BELT_DOT: Record<string, string> = {
  white:  "bg-white",
  blue:   "bg-blue-500",
  purple: "bg-purple-600",
  brown:  "bg-amber-700",
  black:  "bg-gray-900 border border-gray-600",
};

const STATUS_PILL: Record<string, string> = {
  active:   "bg-green-500/15 text-green-400",
  trial:    "bg-yellow-500/15 text-yellow-300",
  past_due: "bg-red-500/15 text-red-400",
  inactive: "bg-gray-500/15 text-gray-400",
  lead:     "bg-blue-500/15 text-blue-400",
  canceled: "bg-gray-700/50 text-gray-500",
};

type SearchParams = Promise<{ q?: string; belt?: string; status?: string; type?: string; group?: string; page?: string }>;

export default async function MembersPage({ searchParams }: { searchParams: SearchParams }) {
  const [sp, session] = await Promise.all([searchParams, auth()]);
  const role      = (session?.user as { role?: string } | undefined)?.role;
  const canManage = can(role, "manage_members");
  const q      = sp.q?.trim() ?? "";
  const belt   = sp.belt ?? "";
  const status = sp.status ?? "";
  const type   = sp.type ?? "";
  const group  = sp.group ?? "";
  const page   = Math.max(1, parseInt(sp.page ?? "1", 10));

  const where = {
    ...(q      && { OR: [{ name: { contains: q, mode: "insensitive" as const } }, { email: { contains: q, mode: "insensitive" as const } }] }),
    ...(belt   && { beltRank: belt }),
    ...(status && { status }),
    ...(type   && { trainingType: type }),
    ...(group  && { ageGroup: group }),
  };

  const [members, total, settings] = await Promise.all([
    prisma.member.findMany({
      where,
      orderBy: { name: "asc" },
      skip: (page - 1) * PAGE_SIZE,
      take: PAGE_SIZE,
      select: {
        id: true, name: true, email: true, beltRank: true,
        status: true, trainingType: true, ageGroup: true,
        photoUrl: true, createdAt: true, trialStartedAt: true,
        _count: { select: { attendance: true } },
      },
    }),
    prisma.member.count({ where }),
    getGymSettings(),
  ]);

  const totalPages = Math.ceil(total / PAGE_SIZE);

  return (
    <div className="p-8">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold">Members</h1>
          <p className="text-gray-400 text-sm mt-0.5">{total} total</p>
        </div>
        <div className="flex items-center gap-2">
          <Link
            href="/admin/members/at-risk"
            className="px-4 py-2 rounded-lg bg-gray-800 hover:bg-gray-700 text-sm font-semibold text-gray-300 hover:text-white transition"
          >
            At-risk
          </Link>
          {canManage && (
            <Link
              href="/admin/members/new"
              className="px-4 py-2 rounded-lg bg-blue-600 hover:bg-blue-500 text-sm font-semibold transition"
            >
              + Add Member
            </Link>
          )}
        </div>
      </div>

      {/* Filters */}
      <div className="mb-5">
        <Suspense>
          <MemberFilters />
        </Suspense>
      </div>

      {/* Table */}
      <div className="rounded-xl border border-gray-800 overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-gray-800 bg-gray-900/60 text-gray-400 text-left">
              <th className="px-4 py-3 font-medium">Name</th>
              <th className="px-4 py-3 font-medium">Belt</th>
              <th className="px-4 py-3 font-medium">Status</th>
              <th className="px-4 py-3 font-medium">Type</th>
              <th className="px-4 py-3 font-medium">Group</th>
              <th className="px-4 py-3 font-medium text-right">Check-ins</th>
              <th className="px-4 py-3 font-medium">Joined</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-800">
            {members.length === 0 && (
              <tr>
                <td colSpan={7} className="px-4 py-12 text-center text-gray-500">
                  No members found
                </td>
              </tr>
            )}
            {members.map((m) => {
              const dot  = m.beltRank ? BELT_DOT[m.beltRank.toLowerCase()] : null;
              const pill = STATUS_PILL[m.status] ?? STATUS_PILL.inactive;
              return (
                <tr key={m.id} className="hover:bg-gray-900/40 transition">
                  <td className="px-4 py-3">
                    <Link href={`/admin/members/${m.id}`} className="hover:text-blue-400 transition flex items-center gap-3">
                      <div className="w-8 h-8 rounded-full bg-gray-700 border border-gray-600 flex-shrink-0 overflow-hidden flex items-center justify-center text-xs font-bold text-gray-400">
                        {m.photoUrl
                          ? <img src={m.photoUrl} alt={m.name} className="w-full h-full object-cover" />
                          : m.name.trim().split(/\s+/).map(p => p[0]).slice(0, 2).join("").toUpperCase()
                        }
                      </div>
                      <div>
                        <div className="font-medium text-white">{m.name}</div>
                        {m.email && <div className="text-gray-500 text-xs">{m.email}</div>}
                      </div>
                    </Link>
                  </td>
                  <td className="px-4 py-3">
                    {dot ? (
                      <span className="flex items-center gap-2">
                        <span className={`w-3 h-3 rounded-full flex-shrink-0 ${dot}`} />
                        <span className="capitalize text-gray-300">{m.beltRank}</span>
                      </span>
                    ) : (
                      <span className="text-gray-600">—</span>
                    )}
                  </td>
                  <td className="px-4 py-3">
                    {m.status === "trial" ? (
                      <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${
                        (trialDaysLeft(m.trialStartedAt, settings.trialLengthDays) ?? 1) <= 0
                          ? "bg-red-500/15 text-red-400"
                          : pill
                      }`}>
                        {trialBadge(m.trialStartedAt, settings.trialLengthDays)}
                      </span>
                    ) : (
                      <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${pill}`}>
                        {m.status.replace("_", " ")}
                      </span>
                    )}
                  </td>
                  <td className="px-4 py-3 text-gray-300">{m.trainingType ?? "—"}</td>
                  <td className="px-4 py-3 text-gray-300 capitalize">{m.ageGroup ?? "—"}</td>
                  <td className="px-4 py-3 text-right text-gray-300">{m._count.attendance}</td>
                  <td className="px-4 py-3 text-gray-500">
                    {m.createdAt.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between mt-4 text-sm text-gray-400">
          <span>Page {page} of {totalPages}</span>
          <div className="flex gap-2">
            {page > 1 && (
              <PaginationLink page={page - 1} params={sp}>← Prev</PaginationLink>
            )}
            {page < totalPages && (
              <PaginationLink page={page + 1} params={sp}>Next →</PaginationLink>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

function PaginationLink({ page, params, children }: { page: number; params: Record<string, string | undefined>; children: React.ReactNode }) {
  const p = new URLSearchParams();
  Object.entries(params).forEach(([k, v]) => { if (v && k !== "page") p.set(k, v); });
  p.set("page", String(page));
  return (
    <Link href={`/admin/members?${p.toString()}`} className="px-3 py-1.5 rounded-lg bg-gray-800 hover:bg-gray-700 transition text-white">
      {children}
    </Link>
  );
}
