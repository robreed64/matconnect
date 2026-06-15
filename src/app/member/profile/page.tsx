import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { getGymSettings } from "@/lib/gym-settings";
import ProfileSections from "./ProfileClient";

export default async function ProfilePage() {
  const [session, settings] = await Promise.all([auth(), getGymSettings()]);
  const hidden       = ((settings as Record<string, unknown>).hiddenFeatures as string[] | null) ?? [];
  const showCheckins = !hidden.includes("checkins");

  const memberId = (session?.user as { memberId?: number } | undefined)?.memberId;
  const member   = memberId
    ? await prisma.member.findUnique({ where: { id: memberId }, select: { beltRank: true, beltStripes: true } })
    : null;

  return (
    <ProfileSections
      showCheckins={showCheckins}
      beltRank={member?.beltRank ?? null}
      beltStripes={member?.beltStripes ?? 0}
    />
  );
}
