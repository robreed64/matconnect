"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import LogoutButton from "@/components/LogoutButton";

const ALL_NAV = [
  { href: "/member",            label: "Home",       feature: null },
  { href: "/member/schedule",   label: "Schedule",   feature: null },
  { href: "/member/attendance", label: "Attendance", feature: null },
  { href: "/member/progress",   label: "Progress",   feature: "progress" },
  { href: "/member/curriculum", label: "Curriculum", feature: "curriculum" },
  { href: "/member/profile",    label: "Profile",    feature: null },
];

export default function MemberNav({
  gymName,
  userName,
  showProgress  = true,
  showCurriculum = true,
}: {
  gymName: string;
  userName?: string | null;
  showProgress?: boolean;
  showCurriculum?: boolean;
}) {
  const NAV = ALL_NAV.filter(item => {
    if (item.feature === "progress"   && !showProgress)   return false;
    if (item.feature === "curriculum" && !showCurriculum) return false;
    return true;
  });
  const pathname = usePathname();
  const [open, setOpen] = useState(false);

  function active(href: string) {
    return href === "/member" ? pathname === "/member" : pathname.startsWith(href);
  }

  return (
    <>
      <header className="bg-gray-900 border-b border-gray-800 px-4 py-3 flex items-center justify-between">
        {/* Mobile: hamburger + gym name */}
        <div className="flex items-center gap-3">
          <button
            onClick={() => setOpen(true)}
            className="md:hidden p-2 rounded-lg text-gray-400 hover:text-white hover:bg-gray-800 transition"
            aria-label="Open menu"
          >
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M4 6h16M4 12h16M4 18h16" />
            </svg>
          </button>
          <span className="text-sm font-black tracking-tight">{gymName} Portal</span>

          {/* Desktop: inline nav */}
          <nav className="hidden md:flex items-center gap-1 ml-4">
            {NAV.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                className={`flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm font-medium transition ${
                  active(item.href) ? "bg-blue-500/10 text-blue-300" : "text-gray-400 hover:bg-gray-800 hover:text-white"
                }`}
              >
                {item.label}
              </Link>
            ))}
          </nav>
        </div>

        <div className="flex items-center gap-3">
          <span className="hidden sm:block text-sm text-gray-400">{userName}</span>
          <LogoutButton />
        </div>
      </header>

      {/* Mobile backdrop + drawer */}
      {open && (
        <>
          <div
            className="md:hidden fixed inset-0 z-40 bg-black/60"
            onClick={() => setOpen(false)}
          />
          <div className="md:hidden fixed inset-y-0 left-0 z-50 w-72 flex flex-col bg-gray-900 border-r border-gray-800">
            <div className="flex items-center justify-between px-5 py-4 border-b border-gray-800">
              <span className="font-black tracking-tight text-white">{gymName}</span>
              <button
                onClick={() => setOpen(false)}
                className="p-1.5 rounded-lg text-gray-500 hover:text-white hover:bg-gray-800 transition"
              >
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            <nav className="flex-1 px-3 py-4 space-y-1 overflow-y-auto">
              {NAV.map((item) => (
                <Link
                  key={item.href}
                  href={item.href}
                  onClick={() => setOpen(false)}
                  className={`flex items-center gap-3 px-3 py-3 rounded-lg text-sm font-medium transition ${
                    active(item.href) ? "bg-blue-500/10 text-blue-300" : "text-gray-300 hover:bg-gray-800 hover:text-white"
                  }`}
                >
                  {item.label}
                </Link>
              ))}
            </nav>

            <div className="px-4 py-4 border-t border-gray-800">
              {userName && <p className="text-xs text-gray-400 mb-3 truncate">{userName}</p>}
              <LogoutButton />
            </div>
          </div>
        </>
      )}
    </>
  );
}
