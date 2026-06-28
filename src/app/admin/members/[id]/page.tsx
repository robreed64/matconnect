import Link from "next/link";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { auth } from "@/auth";
import { can } from "@/lib/permissions";
import DeleteMemberButton from "./DeleteMemberButton";
import ProgressionSection from "./ProgressionSection";
import FamilyManager from "./FamilyManager";
import CreateMemberAccount from "./CreateMemberAccount";
import AttendanceManager from "./AttendanceManager";
import BeltStripesEditor from "./BeltStripesEditor";
import { getNextBelt } from "@/lib/belt-data";
import { getGymSettings } from "@/lib/gym-settings";
import { trialDaysLeft, trialBadge } from "@/lib/trial";
import MemberQRCode from "./MemberQRCode";
import WaiverToggle from "./WaiverToggle";

const BELT_STYLES: Record<string, { bg: string; text: string }> = {
  white:  { bg: "bg-white",      text: "text-gray-900" },
  blue:   { bg: "bg-blue-600",   text: "text-white" },
  purple: { bg: "bg-purple-700", text: "text-white" },
  brown:  { bg: "bg-amber-800",  text: "text-white" },
  black:  { bg: "bg-gray-900 border border-gray-600", text: "text-white" },
};

const STATUS_PILL: Record<string, string> = {
  active:   "bg-green-500/15 text-green-400 border-green-500/30",
  trial:    "bg-yellow-500/15 text-yellow-300 border-yellow-500/30",
  past_due: "bg-red-500/15 text-red-400 border-red-500/30",
  inactive: "bg-gray-500/15 text-gray-400 border-gray-500/30",
  lead:     "bg-blue-500/15 text-blue-400 border-blue-500/30",
  canceled: "bg-gray-700/50 text-gray-500 border-gray-700",
};

type Params = Promise<{ id: string }>;

export default async function MemberDetailPage({ params }: { params: Params }) {
  const { id } = await params;
  const memberId = parseInt(id, 10);
  if (isNaN(memberId)) notFound();

  const session   = await auth();
  const role      = (session?.user as { role?: string } | undefined)?.role;
  const canManage = can(role, "manage_members");

  const [member, gymSettings] = await Promise.all([
    prisma.member.findUnique({
      where: { id: memberId },
      include: {
        subscriptions: { include: { plan: true }, orderBy: { createdAt: "desc" }, take: 1 },
        attendance: { orderBy: { timestamp: "desc" }, take: 20, include: { class: true } },
        children: { select: { id: true, name: true, beltRank: true, status: true } },
        parent: { select: { id: true, name: true } },
        user:   { select: { email: true, role: true } },
        _count: { select: { attendance: true } },
      },
    }),
    getGymSettings(),
  ]);

  if (!member) notFound();

  const hiddenFeatures = ((gymSettings as Record<string, unknown>).hiddenFeatures as string[] | null) ?? [];
  const showBeltProgression = !hiddenFeatures.includes("belt_progression") && !hiddenFeatures.includes("belts");
  const showCheckins        = !hiddenFeatures.includes("checkins");
  const showProgression     = showBeltProgression && !hiddenFeatures.includes("curriculum");

  // Belt progression data
  const nextBelt      = getNextBelt(member.beltRank);
  const requirement   = nextBelt
    ? await prisma.beltRequirement.findFirst({ where: { beltRank: nextBelt } })
    : null;
  const techProgress  = nextBelt
    ? await prisma.techniqueProgress.findMany({ where: { memberId, beltRank: nextBelt } })
    : [];
  const monthsTraining = Math.floor((Date.now() - member.createdAt.getTime()) / (1000 * 60 * 60 * 24 * 30.44));

  const belt = member.beltRank ? BELT_STYLES[member.beltRank.toLowerCase()] : null;
  const pill = STATUS_PILL[member.status] ?? STATUS_PILL.inactive;
  const sub  = member.subscriptions[0];

  // Belt stripes config
  const beltConfig = (gymSettings.beltConfig as Array<{ key: string; maxStripes: number }> | null) ?? [];
  const beltEntry = beltConfig.find(b => b.key === member.beltRank?.toLowerCase());
  const maxStripes = beltEntry ? beltEntry.maxStripes : (member.beltRank ? 4 : 0);

  function initials(name: string) {
    const p = name.trim().split(" ");
    return p.length >= 2 ? p[0][0] + p[p.length - 1][0] : p[0].slice(0, 2);
  }

  return (
    <div className="p-8 max-w-4xl">
      {/* Back */}
      <Link href="/admin/members" className="text-sm text-gray-400 hover:text-white transition mb-6 inline-flex items-center gap-1">
        ← Members
      </Link>

      {/* Profile header */}
      <div className="mt-4 flex items-start gap-6">
        <div className="w-20 h-20 rounded-full bg-gray-700 flex items-center justify-center text-2xl font-bold text-gray-300 flex-shrink-0 overflow-hidden border-2 border-gray-600">
          {member.photoUrl
            ? <img src={member.photoUrl} alt={member.name} className="w-full h-full object-cover" />
            : initials(member.name).toUpperCase()
          }
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-3 flex-wrap">
            <h1 className="text-2xl font-bold text-white">{member.name}</h1>
            <span className={`px-2.5 py-0.5 rounded-full border text-xs font-medium ${
              member.status === "trial" && (trialDaysLeft(member.trialStartedAt, gymSettings.trialLengthDays) ?? 1) <= 0
                ? "bg-red-500/15 text-red-400 border-red-500/40"
                : pill
            }`}>
              {member.status === "trial"
                ? trialBadge(member.trialStartedAt, gymSettings.trialLengthDays)
                : member.status.replace("_", " ")}
            </span>
          </div>
          <div className="mt-2 flex items-center gap-3 flex-wrap">
            {belt && (
              <span className={`px-3 py-1 rounded-full text-sm font-semibold ${belt.bg} ${belt.text}`}>
                {member.beltRank ? member.beltRank.charAt(0).toUpperCase() + member.beltRank.slice(1) : ""} Belt
              </span>
            )}
            {showBeltProgression && maxStripes > 0 && (
              <BeltStripesEditor
                memberId={member.id}
                currentStripes={member.beltStripes}
                maxStripes={maxStripes}
                readOnly={!canManage}
              />
            )}
            {member.ageGroup && (
              <span className="text-sm text-gray-400 capitalize">{member.ageGroup}</span>
            )}
            {member.trainingType && (
              <span className="text-sm text-gray-400">{member.trainingType}</span>
            )}
          </div>
          <div className="mt-2">
            <WaiverToggle memberId={member.id} waiverSignedAt={member.waiverSignedAt?.toISOString() ?? null} waiverDocumentUrl={member.waiverDocumentUrl ?? null} readOnly={!canManage} />
          </div>
        </div>
        {canManage && (
          <div className="flex items-center gap-2 flex-shrink-0 flex-wrap">
            <CreateMemberAccount
              memberId={member.id}
              memberName={member.name}
              existingEmail={["member", "parent"].includes(member.user?.role ?? "") ? member.user!.email : null}
            />
            <Link
              href={`/admin/members/${member.id}/edit`}
              className="px-4 py-2 rounded-lg bg-gray-800 hover:bg-gray-700 text-sm font-medium transition"
            >
              Edit
            </Link>
            <DeleteMemberButton memberId={member.id} memberName={member.name} />
          </div>
        )}
      </div>

      <div className="mt-8 grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Contact info */}
        <Section title="Contact">
          <InfoRow label="Email"  value={member.email} />
          <InfoRow label="Phone"  value={member.phone} />
          <InfoRow label="Address" value={member.address} />
          <InfoRow label="Date of birth" value={member.dateOfBirth?.toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" })} />
          <InfoRow label="Waiver" value={member.waiverSignedAt ? `Signed ${member.waiverSignedAt.toLocaleDateString()}` : "Not signed"} valueClass={member.waiverSignedAt ? "text-green-400" : "text-red-400"} />
          <InfoRow label="Member since" value={member.createdAt.toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" })} />
        </Section>

        {/* Membership */}
        <Section title="Membership">
          {sub ? (
            <>
              <InfoRow label="Plan"    value={sub.plan.name} />
              <InfoRow label="Price"   value={`$${(sub.plan.priceCents / 100).toFixed(2)} / ${sub.plan.billingInterval}`} />
              <InfoRow label="Status"  value={sub.status.replace("_", " ")} valueClass={sub.status === "active" ? "text-green-400" : "text-red-400"} />
              <InfoRow label="Started" value={sub.startDate.toLocaleDateString()} />
              {sub.endDate && <InfoRow label="Ends" value={sub.endDate.toLocaleDateString()} />}
            </>
          ) : (
            <p className="text-gray-500 text-sm">No active subscription</p>
          )}
        </Section>

        {/* Stats */}
        {showCheckins && (
          <Section title="Attendance">
            <div className="grid grid-cols-2 gap-4">
              <Stat label="Total check-ins" value={member._count.attendance} />
            </div>
          </Section>
        )}

        {/* QR check-in */}
        {showCheckins && (
          <Section title="Check-In QR Code">
            <MemberQRCode
              memberId={member.id}
              memberName={member.name}
              gymName={gymSettings.gymName}
              beltRank={member.beltRank}
            />
          </Section>
        )}

        {/* Family */}
        <FamilyManager
          memberId={member.id}
          currentParent={member.parent ? { id: member.parent.id, name: member.parent.name, beltRank: null } : null}
          childMembers={member.children.map((c) => ({ id: c.id, name: c.name, beltRank: c.beltRank }))}
          readOnly={!canManage}
        />
      </div>

      {/* Belt progression */}
      {showProgression && (
        <ProgressionSection
          memberId={member.id}
          currentBelt={member.beltRank}
          nextBelt={nextBelt}
          totalClasses={member._count.attendance}
          monthsTraining={monthsTraining}
          requirement={requirement ? { minClasses: requirement.minClasses, minMonths: requirement.minMonths, minTechniques: requirement.minTechniques } : null}
          initialTechniques={techProgress.map((t) => ({ techniqueName: t.techniqueName, mastered: t.mastered }))}
          readOnly={!canManage}
        />
      )}

      {/* Recent attendance */}
      {showCheckins && (
        <div className="bg-gray-900 border border-gray-800 rounded-xl p-5 mt-6">
          <AttendanceManager
            memberId={member.id}
            initialAttendance={member.attendance.map(a => ({
              id: a.id,
              timestamp: a.timestamp.toISOString(),
              source: a.source,
              className: a.class?.name ?? null,
            }))}
            readOnly={!canManage}
          />
        </div>
      )}
    </div>
  );
}

function Section({ title, children, className = "" }: { title: string; children: React.ReactNode; className?: string }) {
  return (
    <div className={`bg-gray-900 border border-gray-800 rounded-xl p-5 ${className}`}>
      <h2 className="text-xs font-semibold tracking-wide text-gray-400 mb-4">{title}</h2>
      {children}
    </div>
  );
}

function InfoRow({ label, value, valueClass = "text-gray-200" }: { label: string; value?: React.ReactNode; valueClass?: string }) {
  if (!value) return null;
  return (
    <div className="flex justify-between items-start gap-4 py-1.5 text-sm">
      <span className="text-gray-500 flex-shrink-0">{label}</span>
      <span className={`text-right ${valueClass}`}>{value}</span>
    </div>
  );
}

function Stat({ label, value }: { label: string; value: number }) {
  return (
    <div className="bg-gray-800 rounded-lg p-3 text-center">
      <div className="text-2xl font-bold text-white">{value}</div>
      <div className="text-xs text-gray-400 mt-0.5">{label}</div>
    </div>
  );
}
