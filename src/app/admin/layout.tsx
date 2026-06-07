import Link from "next/link";
import { type ReactNode } from "react";
import { auth } from "@/auth";
import LogoutButton from "./LogoutButton";

const NAV = [
  { href: "/admin/members",  label: "Members",    icon: "👥" },
  { href: "/admin/plans",    label: "Plans",      icon: "💳" },
  { href: "/admin/schedule", label: "Schedule",   icon: "📅" },
  { href: "/admin/belts",      label: "Belts",      icon: "🥋" },
  { href: "/admin/curriculum", label: "Curriculum", icon: "📖" },
  { href: "/admin/families",   label: "Families",   icon: "👨‍👩‍👧" },
  { href: "/admin/pos",       label: "POS",        icon: "🛒" },
  { href: "/admin/marketing", label: "Marketing",  icon: "📣" },
  { href: "/admin/reports",   label: "Reports",    icon: "📊" },
  { href: "/kiosk",           label: "Kiosk",      icon: "📲" },
];

export default async function AdminLayout({ children }: { children: ReactNode }) {
  const session = await auth();
  const user    = session?.user;

  return (
    <div className="flex min-h-screen bg-gray-950 text-white">
      {/* Sidebar */}
      <aside className="w-56 flex-shrink-0 bg-gray-900 border-r border-gray-800 flex flex-col">
        <div className="px-5 py-6 border-b border-gray-800">
          <span className="text-lg font-black tracking-tight">BJJ Admin</span>
        </div>
        <nav className="flex-1 px-3 py-4 space-y-1">
          {NAV.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium text-gray-300 hover:bg-gray-800 hover:text-white transition"
            >
              <span>{item.icon}</span>
              {item.label}
            </Link>
          ))}
        </nav>
        {user && (
          <div className="px-4 py-4 border-t border-gray-800">
            <p className="text-xs font-medium text-gray-300 truncate">{user.name}</p>
            <p className="text-xs text-gray-600 truncate">{(user as { role?: string }).role ?? "staff"}</p>
            <Link href="/admin/settings" className="block text-xs text-gray-500 hover:text-gray-300 transition mt-1 mb-2">
              Change password
            </Link>
            <LogoutButton />
          </div>
        )}
      </aside>

      {/* Main */}
      <main className="flex-1 overflow-auto">{children}</main>
    </div>
  );
}
