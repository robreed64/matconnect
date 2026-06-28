import { type ReactNode } from "react";
import { auth } from "@/auth";
import { getGymSettings } from "@/lib/gym-settings";
import LogoutButton from "@/components/LogoutButton";

export default async function PortalLayout({ children }: { children: ReactNode }) {
  const [session, settings] = await Promise.all([auth(), getGymSettings()]);
  const user = session?.user;

  return (
    <div className="min-h-dvh bg-gray-950 text-white">
      <header className="bg-gray-900 border-b border-gray-800 px-6 py-4 flex items-center justify-between">
        <span className="text-lg font-black tracking-tight">{settings.gymName} Family Portal</span>
        {user && (
          <div className="flex items-center gap-4">
            <span className="text-sm text-gray-400">Welcome, <span className="text-white font-medium">{user.name}</span></span>
            <LogoutButton />
          </div>
        )}
      </header>
      <main className="max-w-4xl mx-auto px-6 py-8">{children}</main>
    </div>
  );
}
