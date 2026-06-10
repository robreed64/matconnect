import { type ReactNode } from "react";
import { auth } from "@/auth";
import { redirect } from "next/navigation";
import { getGymSettings } from "@/lib/gym-settings";
import InstallPrompt from "@/components/InstallPrompt";
import MemberNav from "./MemberNav";

export default async function MemberLayout({ children }: { children: ReactNode }) {
  const [session, settings] = await Promise.all([auth(), getGymSettings()]);
  if (!session?.user) redirect("/login");

  const user = session.user;

  return (
    <div className="min-h-screen bg-gray-950 text-white flex flex-col">
      <MemberNav gymName={settings.gymName} userName={user.name} />
      <main className="flex-1 p-6 max-w-4xl mx-auto w-full">
        {children}
      </main>
      <InstallPrompt />
    </div>
  );
}
