export const dynamic = "force-dynamic";

import { auth } from "@/auth";
import { redirect } from "next/navigation";

// Role-based post-login redirect hub
export default async function DashboardPage() {
  const session = await auth();
  if (!session?.user) redirect("/login");
  const role = (session.user as { role?: string }).role;
  if (role === "parent") redirect("/portal");
  if (role === "member") redirect("/member");
  redirect("/admin/members");
}
