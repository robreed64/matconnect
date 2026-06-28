import Link from "next/link";
import { prisma } from "@/lib/prisma";
import ComposeMessage from "./ComposeMessage";

const CHANNEL_PILL: Record<string, string> = {
  email:  "bg-violet-900/40 text-violet-300",
  sms:    "bg-cyan-900/40 text-cyan-300",
  in_app: "bg-gray-700 text-gray-300",
};

export default async function MessagesPage() {
  const [messages, members] = await Promise.all([
    prisma.message.findMany({
      orderBy: { sentAt: "desc" },
      take: 200,
      include: {
        member:   { select: { id: true, name: true } },
        workflow: { select: { id: true, name: true } },
      },
    }),
    prisma.member.findMany({ select: { id: true, name: true }, orderBy: { name: "asc" } }),
  ]);

  return (
    <div className="p-8 max-w-5xl mx-auto">
      <div className="flex items-center justify-between mb-8">
        <div>
          <div className="flex items-center gap-3 mb-1">
            <Link href="/admin/marketing" className="text-sm text-gray-500 hover:text-gray-300 transition">Marketing</Link>
            <span className="text-gray-700">/</span>
            <h1 className="text-2xl font-bold text-white">Message History</h1>
          </div>
          <p className="text-sm text-gray-500">{messages.length} messages (last 200)</p>
        </div>
        <ComposeMessage members={members} />
      </div>

      {messages.length === 0 ? (
        <div className="bg-[#0f1117] border border-gray-700/50 rounded-xl p-10 text-center text-gray-600 text-sm">
          No messages sent yet. Run a workflow or compose a manual message.
        </div>
      ) : (
        <div className="bg-[#0f1117] border border-gray-700/50 rounded-xl overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-800 text-xs text-gray-500 uppercase tracking-wide">
                <th className="text-left px-5 py-3">Member</th>
                <th className="text-left px-5 py-3">Channel</th>
                <th className="text-left px-5 py-3">Subject / Body</th>
                <th className="text-left px-5 py-3">Workflow</th>
                <th className="text-left px-5 py-3">Sent</th>
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
                      {m.channel}
                    </span>
                  </td>
                  <td className="px-5 py-3 max-w-xs">
                    {m.subject && <p className="font-medium text-gray-200 truncate">{m.subject}</p>}
                    <p className="text-gray-500 truncate">{m.body}</p>
                  </td>
                  <td className="px-5 py-3 text-gray-500 text-xs whitespace-nowrap">
                    {m.workflow?.name ?? <span className="text-gray-700">Manual</span>}
                  </td>
                  <td className="px-5 py-3 text-gray-500 text-xs whitespace-nowrap">
                    {m.sentAt ? (
                      <>
                        {new Date(m.sentAt).toLocaleDateString()}{" "}
                        {new Date(m.sentAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                      </>
                    ) : "—"}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
