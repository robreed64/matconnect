import Link from "next/link";
import { prisma } from "@/lib/prisma";
import WorkflowManager from "./WorkflowManager";

export default async function MarketingPage() {
  const [workflows, totalMessages, channels] = await Promise.all([
    prisma.workflow.findMany({
      orderBy: { createdAt: "desc" },
      include: { _count: { select: { messages: true } } },
    }),
    prisma.message.count(),
    prisma.message.groupBy({ by: ["channel"], _count: { id: true } }),
  ]);

  const activeCount = workflows.filter((w) => w.active).length;

  return (
    <div className="p-8 max-w-5xl mx-auto">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold text-white">Marketing</h1>
          <p className="text-sm text-gray-500 mt-1">Automated outreach and messaging</p>
        </div>
        <Link href="/admin/marketing/messages"
          className="px-4 py-2 rounded-lg bg-gray-800 hover:bg-gray-700 text-sm text-gray-300 transition">
          Message History →
        </Link>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-4 mb-8">
        <StatCard label="Total Workflows" value={workflows.length} />
        <StatCard label="Active Workflows" value={activeCount} accent />
        <StatCard label="Messages Sent" value={totalMessages} />
      </div>

      {channels.length > 0 && (
        <div className="bg-[#0f1117] border border-gray-700/50 rounded-xl p-4 mb-8 flex gap-6">
          {channels.map((c) => (
            <div key={c.channel} className="text-sm">
              <span className="text-gray-400 capitalize">{c.channel}:</span>{" "}
              <span className="text-white font-medium">{c._count.id}</span>
            </div>
          ))}
        </div>
      )}

      <h2 className="text-base font-semibold text-white mb-4">Automation Workflows</h2>
      {/* eslint-disable-next-line @typescript-eslint/no-explicit-any */}
      <WorkflowManager initialWorkflows={workflows as any} />
    </div>
  );
}

function StatCard({ label, value, accent }: { label: string; value: number; accent?: boolean }) {
  return (
    <div className="bg-[#0f1117] border border-gray-700/50 rounded-xl p-5">
      <p className="text-xs text-gray-500 mb-1">{label}</p>
      <p className={`text-3xl font-bold ${accent ? "text-blue-400" : "text-white"}`}>{value}</p>
    </div>
  );
}
