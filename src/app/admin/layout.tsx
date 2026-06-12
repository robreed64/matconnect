export const dynamic = "force-dynamic";

import { type ReactNode } from "react";
import { auth } from "@/auth";
import { getGymSettings } from "@/lib/gym-settings";
import { navForRole, can } from "@/lib/permissions";
import AdminSidebar from "./AdminSidebar";
import ConfigWarnings from "@/components/ConfigWarnings";

export default async function AdminLayout({ children }: { children: ReactNode }) {
  const [session, settings] = await Promise.all([auth(), getGymSettings()]);
  const user = session?.user;
  const role = (user as { role?: string } | undefined)?.role;
  const nav = navForRole(role);

  return (
    <div className="flex min-h-screen bg-gray-950 text-white">
      <AdminSidebar
        nav={nav}
        gymName={settings.gymName}
        userName={user?.name}
        role={role}
      />
      <main className="flex-1 overflow-auto pt-14 md:pt-0">
        {can(role, "settings") && settings.setupComplete && <ConfigWarnings settings={settings} />}
        {children}
      </main>
    </div>
  );
}
