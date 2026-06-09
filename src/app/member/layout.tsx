import { type ReactNode } from "react";
import Link from "next/link";
import { auth } from "@/auth";
import { redirect } from "next/navigation";
import { getGymSettings } from "@/lib/gym-settings";
import LogoutButton from "../portal/LogoutButton";
import InstallPrompt from "@/components/InstallPrompt";

const NAV = [
  { href: "/member",            label: "Home",       icon: "🏠" },
  { href: "/member/schedule",   label: "Schedule",   icon: "📅" },
  { href: "/member/attendance", label: "Attendance", icon: "📋" },
  { href: "/member/progress",   label: "Progress",   icon: "🥋" },
  { href: "/member/curriculum", label: "Curriculum", icon: "📖" },
  { href: "/member/profile",    label: "Profile",    icon: "👤" },
];

export default async function MemberLayout({ children }: { children: ReactNode }) {
  const [session, settings] = await Promise.all([auth(), getGymSettings()]);
  if (!session?.user) redirect("/login");

  const user = session.user;

  return (
    <div className="min-h-screen bg-gray-950 text-white flex flex-col">
      <header className="bg-gray-900 border-b border-gray-800 px-6 py-4 flex items-center justify-between">
        <div className="flex items-center gap-8">
          <span className="text-base font-black tracking-tight">{settings.gymName} Member Portal</span>
          <nav className="flex items-center gap-1">
            {NAV.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm font-medium text-gray-400 hover:bg-gray-800 hover:text-white transition"
              >
                <span>{item.icon}</span>
                {item.label}
              </Link>
            ))}
          </nav>
        </div>
        <div className="flex items-center gap-4">
          <span className="text-sm text-gray-400">{user.name}</span>
          <LogoutButton />
        </div>
      </header>

      <main className="flex-1 p-6 max-w-4xl mx-auto w-full">
        {children}
      </main>
      <InstallPrompt />
    </div>
  );
}
