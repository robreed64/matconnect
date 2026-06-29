import { auth } from "@/auth";
import { redirect } from "next/navigation";
import { getGymSettings } from "@/lib/gym-settings";
import { resolveSiteConfig } from "@/lib/site-config";
import WebsiteEditor from "./WebsiteEditor";

export default async function WebsiteSetupPage() {
  const session = await auth();
  const role = (session?.user as { role?: string })?.role;
  if (role !== "admin") redirect("/admin");

  const settings = await getGymSettings();
  const site = resolveSiteConfig(settings.siteConfig, settings.gymName);

  return <WebsiteEditor initial={site} />;
}
