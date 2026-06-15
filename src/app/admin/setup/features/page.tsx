import { auth } from "@/auth";
import { redirect } from "next/navigation";
import { getGymSettings } from "@/lib/gym-settings";
import FeatureVisibilityClient from "./FeatureVisibilityClient";

export default async function FeaturesSetupPage() {
  const session = await auth();
  const role = (session?.user as { role?: string })?.role;
  if (role !== "admin") redirect("/admin");

  const settings = await getGymSettings();
  const hiddenFeatures = ((settings as Record<string, unknown>).hiddenFeatures as string[] | null) ?? [];

  return <FeatureVisibilityClient initialHidden={hiddenFeatures} />;
}
