"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import LogoutButton from "@/components/LogoutButton";

type NavItem = { href: string; label: string; icon: string; hiddenFromStaff?: boolean };

type Props = {
  nav: NavItem[];
  gymName: string;
  userName?: string | null;
  role?: string;
};

export default function AdminSidebar({ nav, gymName, userName, role }: Props) {
  const pathname = usePathname();
  const inSetup = pathname.startsWith("/admin/setup");
  const [mobileOpen, setMobileOpen] = useState(false);

  const sidebarContent = (
    <>
      {/* Header */}
      <div className={`px-5 py-6 border-b ${inSetup ? "border-amber-800/40" : "border-gray-800/60"}`}>
        <span className="text-xl font-black tracking-tight block text-white">{gymName}</span>
        {inSetup && (
          <span className="mt-1 inline-flex items-center gap-1 text-xs font-semibold text-amber-400 bg-amber-900/40 px-2 py-0.5 rounded-full">
            ⚙ CONFIGURE
          </span>
        )}
      </div>

      {/* Nav */}
      <nav className="flex-1 px-3 py-4 space-y-1 overflow-y-auto">
        {nav.map((item) => {
          const segment = item.href.startsWith("/admin/")
            ? item.href.slice("/admin/".length)
            : item.href.slice(1);
          const href = inSetup ? `/admin/setup/${segment}` : item.href;
          const isActive = pathname === href || pathname.startsWith(href + "/");
          const isHidden = item.hiddenFromStaff;
          return (
            <Link
              key={item.href}
              href={href}
              onClick={() => setMobileOpen(false)}
              className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition ${
                isHidden
                  ? "text-gray-600 hover:text-gray-500 hover:bg-gray-900/50"
                  : isActive
                  ? inSetup
                    ? "bg-amber-900/50 text-amber-200"
                    : "bg-blue-500/10 text-blue-100"
                  : inSetup
                  ? "text-amber-200/70 hover:bg-amber-900/30 hover:text-amber-100"
                  : "text-gray-300 hover:bg-gray-800 hover:text-white"
              }`}
            >
              <span className={isHidden ? "opacity-40" : ""}>{item.icon}</span>
              <span className="flex-1">{item.label}</span>
              {isHidden && <span className="text-xs text-gray-700 font-normal">hidden</span>}
              {!isHidden && inSetup && <span className="text-amber-500/60 text-xs">⚙</span>}
            </Link>
          );
        })}
      </nav>

      {/* Footer */}
      <div className={`px-4 py-4 border-t ${inSetup ? "border-amber-800/40" : "border-gray-800/60"}`}>
        {userName && (
          <>
            <p className="text-xs font-medium text-gray-300 truncate">{userName}</p>
            <p className="text-xs text-gray-600 truncate capitalize">{role ?? "staff"}</p>
          </>
        )}

        {inSetup ? (
          <Link
            href="/admin/members"
            onClick={() => setMobileOpen(false)}
            className="block text-xs text-amber-400 hover:text-amber-200 transition mt-2 mb-2 font-medium"
          >
            ← Exit Setup
          </Link>
        ) : (
          role === "admin" && (
            <>
              <Link href="/admin/setup" onClick={() => setMobileOpen(false)} className="block text-xs text-gray-500 hover:text-gray-300 transition mt-1 mb-1">
                Setup
              </Link>
              <Link href="/admin/settings" onClick={() => setMobileOpen(false)} className="block text-xs text-gray-500 hover:text-gray-300 transition mb-2">
                Settings
              </Link>
            </>
          )
        )}
        <LogoutButton className="text-xs text-gray-500 hover:text-red-400 transition px-2 py-1 rounded hover:bg-gray-800" />
      </div>
    </>
  );

  return (
    <>
      {/* Mobile top bar */}
      <div className={`md:hidden fixed top-0 inset-x-0 z-40 h-14 flex items-center gap-3 px-4 border-b ${inSetup ? "bg-amber-950/90 border-amber-800/40" : "bg-[#0c0e14] border-gray-800/60"}`}>
        <button
          onClick={() => setMobileOpen(true)}
          className="p-2 rounded-lg text-gray-400 hover:text-white hover:bg-gray-800 transition"
          aria-label="Open menu"
        >
          <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M4 6h16M4 12h16M4 18h16" />
          </svg>
        </button>
        <span className="font-bold text-white text-sm">{gymName}</span>
      </div>

      {/* Mobile backdrop */}
      {mobileOpen && (
        <div
          className="md:hidden fixed inset-0 z-40 bg-black/60"
          onClick={() => setMobileOpen(false)}
        />
      )}

      {/* Sidebar — drawer on mobile, fixed column on desktop */}
      <aside className={[
        "flex-col flex-shrink-0 transition-colors",
        inSetup ? "bg-amber-950/40 border-r border-amber-800/40" : "bg-[#0c0e14] border-r border-gray-800/60",
        mobileOpen
          ? "flex fixed inset-y-0 left-0 z-50 w-72"
          : "hidden",
        "md:flex md:static md:w-56 md:z-auto",
      ].join(" ")}>
        {sidebarContent}
      </aside>
    </>
  );
}
