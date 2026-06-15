import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { getGymSettings } from "@/lib/gym-settings";
import { auth } from "@/auth";
import { redirect } from "next/navigation";

export default async function SetupHubPage() {
  const session = await auth();
  const role = (session?.user as { role?: string })?.role;
  if (role !== "admin") redirect("/admin");

  const [memberCount, planCount, programCount, curriculumCount, settings] = await Promise.all([
    prisma.member.count(),
    prisma.membershipPlan.count(),
    prisma.program.count(),
    prisma.curriculum.count(),
    getGymSettings(),
  ]);

  const familyCount = await prisma.member.count({ where: { children: { some: {} } } });
  const itemCount   = await prisma.item.count();
  const cats = (settings.posCategories as string[]) ?? ["drinks", "gear", "events"];

  const cards = [
    { href: "/admin/setup/members",    icon: "👥", label: "Members",    desc: `${memberCount} member${memberCount !== 1 ? "s" : ""}` },
    { href: "/admin/setup/plans",      icon: "💳", label: "Plans",      desc: `${planCount} plan${planCount !== 1 ? "s" : ""}` },
    { href: "/admin/setup/schedule",   icon: "📅", label: "Schedule",   desc: `${programCount} program${programCount !== 1 ? "s" : ""}` },
    { href: "/admin/setup/belts",      icon: "🥋", label: "Belts",      desc: "Belt ranks & stripes" },
    { href: "/admin/setup/curriculum", icon: "📖", label: "Curriculum", desc: `${curriculumCount} curriculum${curriculumCount !== 1 ? "a" : ""}` },
    { href: "/admin/setup/families",   icon: "👨‍👩‍👧", label: "Families",   desc: `${familyCount} family group${familyCount !== 1 ? "s" : ""}` },
    { href: "/admin/setup/pos",        icon: "🛒", label: "POS",        desc: `${cats.length} categories · ${itemCount} items` },
    { href: "/admin/setup/kiosk",      icon: "📲", label: "Kiosk",      desc: "Lock mode & exit PIN" },
    { href: "/admin/setup/features",   icon: "🔲", label: "Features",   desc: `${(((settings as Record<string, unknown>).hiddenFeatures as string[] | null) ?? []).length} hidden` },
  ];

  return (
    <div className="p-8 max-w-4xl">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-white">Configure</h1>
        <p className="text-gray-400 text-sm mt-1">Set up and manage each section of the app.</p>
      </div>

      <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
        {cards.map((c) => (
          <Link
            key={c.href}
            href={c.href}
            className="flex flex-col gap-2 p-5 rounded-2xl bg-gray-900 border border-gray-800 hover:border-amber-700/60 hover:bg-amber-950/20 transition group"
          >
            <span className="text-3xl">{c.icon}</span>
            <div>
              <p className="font-semibold text-white group-hover:text-amber-300 transition text-sm">{c.label}</p>
              <p className="text-xs text-gray-500 mt-0.5">{c.desc}</p>
            </div>
            <span className="text-xs text-amber-600 font-medium mt-auto">Configure →</span>
          </Link>
        ))}
      </div>

      <div className="mt-8 pt-6 border-t border-gray-800">
        <Link href="/admin/settings" className="text-sm text-gray-400 hover:text-white transition">
          Gym Info, Waiver & Payment Settings →
        </Link>
      </div>
    </div>
  );
}
