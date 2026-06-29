import { prisma } from "@/lib/prisma";
import { sendEmail } from "@/lib/email";
import { getGymSettings } from "@/lib/gym-settings";
import { getScoredMembers, type ScoredMember } from "@/lib/scored-members";

// Staff roles that receive the weekly at-risk digest.
const DIGEST_ROLES = ["admin", "manager"];

export type DigestResult = {
  recipients: number;
  high: number;
  medium: number;
  sent: number;
  note?: string;
};

function escapeHtml(s: string) {
  return s.replace(/[&<>"']/g, (c) =>
    ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]!
  );
}

function buildDigestHtml(members: ScoredMember[], high: number, medium: number, gymName: string) {
  const base = process.env.NEXTAUTH_URL ?? process.env.NEXT_PUBLIC_APP_URL ?? "";
  const rows = members
    .map((m) => {
      const reasons = m.reasons.slice(0, 3).map((r) => escapeHtml(r.label)).join(", ");
      const band = m.band.charAt(0).toUpperCase() + m.band.slice(1);
      const name = escapeHtml(m.name);
      const cell = base
        ? `<a href="${base}/admin/members/${m.id}" style="color:#2563eb;text-decoration:none;">${name}</a>`
        : name;
      return `<tr>
        <td style="padding:6px 12px;border-bottom:1px solid #eee;">${cell}</td>
        <td style="padding:6px 12px;border-bottom:1px solid #eee;font-weight:600;white-space:nowrap;">${band} · ${m.score}</td>
        <td style="padding:6px 12px;border-bottom:1px solid #eee;color:#555;">${reasons || "—"}</td>
      </tr>`;
    })
    .join("");

  const link = base ? `<p><a href="${base}/admin/members/at-risk">View all at-risk members →</a></p>` : "";

  return `<div style="font-family:system-ui,sans-serif;max-width:640px;">
    <h2 style="margin:0 0 4px;">At-risk members at ${escapeHtml(gymName)}</h2>
    <p style="color:#555;margin:0 0 16px;">${high} high-risk, ${medium} medium-risk this week. Top ${members.length} below.</p>
    <table style="border-collapse:collapse;width:100%;font-size:14px;">
      <thead>
        <tr style="text-align:left;color:#888;">
          <th style="padding:6px 12px;">Member</th>
          <th style="padding:6px 12px;">Risk</th>
          <th style="padding:6px 12px;">Why</th>
        </tr>
      </thead>
      <tbody>${rows}</tbody>
    </table>
    ${link}
  </div>`;
}

/**
 * Weekly at-risk digest to admins/managers. Emails the top at-risk members
 * (high + medium band) with their scores and reasons. `now` is injectable.
 */
export async function sendRetentionDigest(now = new Date()): Promise<DigestResult> {
  const scored = await getScoredMembers(now);
  const atRisk = scored.filter((m) => m.band !== "low");
  const high = atRisk.filter((m) => m.band === "high").length;
  const medium = atRisk.filter((m) => m.band === "medium").length;

  if (atRisk.length === 0) {
    return { recipients: 0, high: 0, medium: 0, sent: 0, note: "no at-risk members" };
  }

  const settings = await getGymSettings();
  const staff = await prisma.user.findMany({
    where: { role: { in: DIGEST_ROLES } },
    select: { email: true },
  });
  const recipients = [
    ...new Set(
      [...staff.map((u) => u.email), ...(settings.gymEmail ? [settings.gymEmail] : [])].filter(Boolean)
    ),
  ];

  if (recipients.length === 0) {
    return { recipients: 0, high, medium, sent: 0, note: "no admin/manager recipients" };
  }

  const subject = `At-risk members this week: ${high} high, ${medium} medium`;
  const html = buildDigestHtml(atRisk.slice(0, 10), high, medium, settings.gymName);

  let sent = 0;
  for (const to of recipients) {
    try {
      await sendEmail(to, subject, html);
      sent++;
    } catch (err) {
      console.error(`[retention-digest] failed for ${to}:`, err);
    }
  }

  return { recipients: recipients.length, high, medium, sent };
}
