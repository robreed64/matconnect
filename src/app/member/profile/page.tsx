import { getGymSettings } from "@/lib/gym-settings";
import ProfileSections from "./ProfileClient";

export default async function ProfilePage() {
  const settings     = await getGymSettings();
  const hidden       = ((settings as Record<string, unknown>).hiddenFeatures as string[] | null) ?? [];
  const showCheckins = !hidden.includes("checkins");
  return <ProfileSections showCheckins={showCheckins} />;
}
