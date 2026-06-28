import Link from "next/link";
import { prisma } from "@/lib/prisma";
import NotificationComposer from "./NotificationComposer";

type SearchParams = Promise<{ month?: string; year?: string }>;

const CHANNEL_LABEL: Record<string, string> = {
  email:  "Email",
  sms:    "SMS",
  push:   "Push",
  in_app: "In-App",
};

const CHANNEL_PILL: Record<string, string> = {
  email:  "bg-violet-900/40 text-violet-300",
  sms:    "bg-cyan-900/40 text-cyan-300",
  push:   "bg-blue-900/40 text-blue-300",
  in_app: "bg-gray-700 text-gray-300",
};

export default async function NotificationsPage({ searchParams }: { searchParams: SearchParams }) {
  const sp  = await searchParams;
  const now = new Date();

  const year  = parseInt(sp.year  ?? now.getFullYear().toString(),        10);
  const month = parseInt(sp.month ?? (now.getMonth() + 1).toString(), 10);

  const monthStart = new Date(year, month - 1, 1);
  const monthEnd   = new Date(year, month, 1);

  const prevYear  = month === 1 ? year - 1 : year;
  const prevMonth = month === 1 ? 12        : month - 1;
  const nextYear  = month === 12 ? year + 1 : year;
  const nextMonth = month === 12 ? 1         : month + 1;
  const isCurrent = year === now.getFullYear() && month === now.getMonth() + 1;

  const monthLabel = monthStart.toLocaleDateString("en-US", { month: "long", year: "numeric" });

  const [messages, subscriberCount, pushMembers] = await Promise.all([
    prisma.message.findMany({
      where:   { sentAt: { gte: monthStart, lt: monthEnd } },
      orderBy: { sentAt: "desc" },
      include: {
        member:   { select: { id: true, name: true } },
        workflow: { select: { name: true } },
      },
    }),
    prisma.pushSubscription.count(),
    prisma.member.findMany({
      where:   { user: { pushSubscriptions: { some: {} } } },
      select:  { id: true, name: true, user: { select: { id: true } } },
      orderBy: { name: "asc" },
    }),
  ]);

  const byChannel: Record<string, number> = {};
  for (const m of messages) {
    byChannel[m.channel] = (byChannel[m.channel] ?? 0) + 1;
  }

  const navCls = "px-3 py-1.5 rounded-lg bg-gray-800 hover:bg-gray-700 text-gray-300 hover:text-white text-sm transition";

  return (
    <div className="p-8 max-w-5xl space-y-10">
      {/* ── Sent History ─────────────────────────────────────────── */}
      <section className="space-y-5">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-white">Notifications</h1>
            <p className="text-sm text-gray-500 mt-1">Messages sent to members</p>
          </div>
          {/* Month nav */}
          <div className="flex items-center gap-2">
            <Link href={`/admin/notifications?month=${prevMonth}&year=${prevYear}`} className={navCls}>
              ← Prev
            </Link>
            <span className="px-3 py-1.5 text-sm font-medium text-white min-w-36 text-center">
              {monthLabel}
            </span>
            {!isCurrent ? (
              <Link href={`/admin/notifications?month=${nextMonth}&year=${nextYear}`} className={navCls}>
                Next →
              </Link>
            ) : (
              <span className="px-3 py-1.5 text-sm text-gray-700 min-w-20 text-center">Next →</span>
            )}
          </div>
        </div>

        {/* Summary stats */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {[
            { label: "Total Sent",  value: messages.length,        color: "text-white" },
            { label: "Email",       value: byChannel.email  ?? 0,  color: "text-violet-300" },
            { label: "SMS",         value: byChannel.sms    ?? 0,  color: "text-cyan-300" },
            { label: "Push",        value: byChannel.push   ?? 0,  color: "text-blue-300" },
          ].map(({ label, value, color }) => (
            <div key={label} className="bg-[#0f1117] border border-gray-700/50 rounded-xl px-5 py-4">
              <p className="text-xs text-gray-500 uppercase tracking-wide">{label}</p>
              <p className={`text-3xl font-black mt-1 ${color}`}>{value}</p>
            </div>
          ))}
        </div>

        {/* Messages table */}
        {messages.length === 0 ? (
          <div className="bg-[#0f1117] border border-gray-700/50 rounded-xl p-10 text-center text-sm text-gray-600">
            No notifications sent in {monthLabel}.
          </div>
        ) : (
          <div className="bg-[#0f1117] border border-gray-700/50 rounded-xl overflow-hidden">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-800 text-xs text-gray-500 uppercase tracking-wide">
                  <th className="text-left px-5 py-3">Member</th>
                  <th className="text-left px-5 py-3">Channel</th>
                  <th className="text-left px-5 py-3">Subject / Message</th>
                  <th className="text-left px-5 py-3 hidden md:table-cell">Source</th>
                  <th className="text-left px-5 py-3 hidden md:table-cell">Sent</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-800">
                {messages.map((m) => (
                  <tr key={m.id} className="hover:bg-gray-800/50 transition">
                    <td className="px-5 py-3 font-medium text-white whitespace-nowrap">
                      <Link href={`/admin/members/${m.member.id}`} className="hover:text-blue-400 transition">
                        {m.member.name}
                      </Link>
                    </td>
                    <td className="px-5 py-3">
                      <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${CHANNEL_PILL[m.channel] ?? "bg-gray-700 text-gray-300"}`}>
                        {CHANNEL_LABEL[m.channel] ?? m.channel}
                      </span>
                    </td>
                    <td className="px-5 py-3 max-w-xs">
                      {m.subject && <p className="font-medium text-gray-200 truncate">{m.subject}</p>}
                      <p className="text-gray-500 truncate text-xs">{m.body}</p>
                    </td>
                    <td className="px-5 py-3 text-gray-500 text-xs whitespace-nowrap hidden md:table-cell">
                      {m.workflow?.name ?? <span className="text-gray-700">Manual</span>}
                    </td>
                    <td className="px-5 py-3 text-gray-500 text-xs whitespace-nowrap hidden md:table-cell">
                      {m.sentAt
                        ? m.sentAt.toLocaleDateString("en-US", { month: "short", day: "numeric" }) + " " +
                          m.sentAt.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" })
                        : "—"}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      {/* ── Push Notification Composer ────────────────────────────── */}
      <section className="space-y-4">
        <div>
          <h2 className="text-lg font-semibold text-white">Send Push Notification</h2>
          <p className="text-sm text-gray-500 mt-1">
            {subscriberCount} active subscriber{subscriberCount !== 1 ? "s" : ""}
          </p>
        </div>
        <div className="bg-[#0f1117] border border-gray-700/50 rounded-xl p-6">
          <NotificationComposer
            members={pushMembers.map(m => ({ memberId: m.id, name: m.name, userId: m.user!.id }))}
          />
        </div>
        {subscriberCount === 0 && (
          <p className="text-sm text-gray-600 text-center">
            No push subscribers yet. Members can enable notifications from their profile.
          </p>
        )}
      </section>
    </div>
  );
}
