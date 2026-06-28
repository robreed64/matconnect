import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { getGymSettings } from "@/lib/gym-settings";
import CreatePortalAccount from "./CreatePortalAccount";
import FamilyDiscountActions from "./FamilyDiscountActions";

const BELT_DOT: Record<string, string> = {
  white:  "bg-white border border-gray-400",
  blue:   "bg-blue-500",
  purple: "bg-purple-600",
  brown:  "bg-amber-700",
  black:  "bg-gray-900 border border-gray-500",
};

export default async function FamiliesPage() {
  const [families, potentialParents, settings] = await Promise.all([
    prisma.member.findMany({
      where:   { parentId: null, children: { some: {} } },
      include: {
        children: {
          include: {
            _count: { select: { attendance: true } },
            subscriptions: {
              where:   { status: { in: ["active", "trial"] } },
              orderBy: { createdAt: "desc" },
              take: 1,
              select: { id: true, familyDiscountApplied: true, status: true },
            },
          },
          orderBy: { name: "asc" },
        },
        _count: { select: { attendance: true } },
        user:   { select: { id: true, email: true, role: true } },
      },
      orderBy: { name: "asc" },
    }),
    prisma.member.findMany({
      where:   { parentId: null, ageGroup: { not: "kids" } },
      select:  { id: true, name: true, email: true },
      orderBy: { name: "asc" },
    }),
    getGymSettings(),
  ]);

  const totalFamilyMembers = families.reduce((s, f) => s + f.children.length + 1, 0);

  return (
    <div className="p-8 max-w-4xl">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-white">Family Accounts</h1>
        <p className="text-gray-500 text-sm mt-1">{families.length} families · {totalFamilyMembers} members</p>
      </div>

      {/* Create portal account */}
      <div className="mb-8 bg-gray-900 border border-gray-800 rounded-xl p-5">
        <h2 className="text-xs font-semibold tracking-wide text-gray-400 mb-4">
          Create Parent Portal Account
        </h2>
        <p className="text-sm text-gray-400 mb-4">
          Give a parent member login access to the family portal at <span className="text-white font-mono">/portal</span>.
        </p>
        <CreatePortalAccount members={potentialParents} />
      </div>

      {/* Families list */}
      {families.length === 0 ? (
        <div className="bg-gray-900 border border-gray-800 rounded-xl p-10 text-center text-gray-600 text-sm">
          No family groups yet. Link children to parents from the member detail page.
        </div>
      ) : (
        <div className="space-y-4">
          {families.map((family) => (
            <div key={family.id} className="bg-gray-900 border border-gray-800 rounded-xl p-5">
              {/* Parent row */}
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-3">
                  <div className={`w-3 h-3 rounded-full flex-shrink-0 ${BELT_DOT[family.beltRank?.toLowerCase() ?? "white"] ?? "bg-gray-600"}`} />
                  <Link href={`/admin/members/${family.id}`} className="font-semibold text-white hover:text-blue-400 transition">
                    {family.name}
                  </Link>
                  <span className="text-xs text-gray-500">Parent · {family._count.attendance} classes</span>
                </div>
                {family.user ? (
                  <span className="text-xs text-green-400 bg-green-900/30 px-2 py-0.5 rounded-full">
                    Portal access · {family.user.email}
                  </span>
                ) : (
                  <span className="text-xs text-gray-600">No portal account</span>
                )}
              </div>

              {/* Children */}
              <div className="pl-6 space-y-2 border-l border-gray-800">
                {family.children.map((child) => {
                  const activeSub = child.subscriptions[0] ?? null;
                  return (
                    <div key={child.id} className="flex items-center gap-3 flex-wrap">
                      <div className={`w-2.5 h-2.5 rounded-full flex-shrink-0 ${BELT_DOT[child.beltRank?.toLowerCase() ?? "white"] ?? "bg-gray-600"}`} />
                      <Link href={`/admin/members/${child.id}`} className="text-sm text-gray-300 hover:text-white transition">
                        {child.name}
                      </Link>
                      <span className="text-xs text-gray-600 capitalize">{child.ageGroup ?? ""}</span>
                      <span className="text-xs text-gray-600">{child._count.attendance} classes</span>
                      {settings.familyDiscountEnabled && (
                        <FamilyDiscountActions
                          memberId={child.id}
                          discountApplied={activeSub?.familyDiscountApplied ?? false}
                          discountPercent={settings.familyDiscountPercent}
                          hasActiveSubscription={!!activeSub}
                        />
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
