import { getGymSettings } from "@/lib/gym-settings";
import KioskSignup from "./KioskSignup";

export const dynamic = "force-dynamic";

export default async function KioskNewPage() {
  const settings = await getGymSettings();
  return <KioskSignup gymName={settings.gymName} waiverText={settings.waiverText} />;
}
