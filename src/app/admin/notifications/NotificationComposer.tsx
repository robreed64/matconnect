"use client";

import { useState } from "react";

type Member = { memberId: number; name: string; userId: number };

export default function NotificationComposer({ members }: { members: Member[] }) {
  const [title,     setTitle]     = useState("");
  const [body,      setBody]      = useState("");
  const [url,       setUrl]       = useState("/");
  const [userId,    setUserId]    = useState<number | "all">("all");
  const [search,    setSearch]    = useState("");
  const [sending, setSending] = useState(false);
  const [result,  setResult]  = useState<{ msg: string; ok: boolean } | null>(null);

  const filtered = search.trim()
    ? members.filter(m => m.name.toLowerCase().includes(search.toLowerCase()))
    : members;

  async function send() {
    if (!title.trim() || !body.trim()) return;
    setSending(true);
    setResult(null);

    const res = await fetch("/api/admin/push/send", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        title,
        body,
        url,
        userId: userId === "all" ? undefined : userId,
      }),
    });

    const data = await res.json().catch(() => ({}));
    if (res.ok) {
      setResult({ msg: `Sent to ${data.sent} device${data.sent !== 1 ? "s" : ""}`, ok: true });
      setTitle("");
      setBody("");
    } else {
      setResult({ msg: data.error ?? "Send failed", ok: false });
    }
    setSending(false);
  }

  const inp = "w-full px-4 py-2.5 rounded-lg bg-gray-800 border border-gray-700 text-white placeholder-gray-500 focus:outline-none focus:border-blue-500 text-sm";

  return (
    <div className="space-y-5">
      <h2 className="text-xs font-semibold tracking-wide text-gray-400">Compose</h2>

      {/* Recipient */}
      <div>
        <label className="block text-xs font-medium text-gray-400 mb-1">Recipients</label>
        <div className="flex flex-col gap-2">
          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="radio"
              checked={userId === "all"}
              onChange={() => { setUserId("all"); setSearch(""); }}
              className="accent-blue-500"
            />
            <span className="text-sm text-gray-300">All subscribers ({members.length} with devices)</span>
          </label>
          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="radio"
              checked={userId !== "all"}
              onChange={() => setUserId(members[0]?.userId ?? "all")}
              className="accent-blue-500"
            />
            <span className="text-sm text-gray-300">Specific member</span>
          </label>
        </div>
        {userId !== "all" && (
          <div className="mt-2 space-y-2">
            <input
              type="text"
              placeholder="Search members…"
              value={search}
              onChange={e => setSearch(e.target.value)}
              className={inp}
            />
            {search && (
              <div className="rounded-lg border border-gray-700 overflow-hidden max-h-48 overflow-y-auto">
                {filtered.length === 0 ? (
                  <div className="px-4 py-3 text-sm text-gray-600">No subscribers found</div>
                ) : (
                  filtered.map(m => (
                    <button
                      key={m.userId}
                      onClick={() => { setUserId(m.userId); setSearch(m.name); }}
                      className={`w-full text-left px-4 py-2.5 text-sm transition hover:bg-gray-800 ${userId === m.userId ? "bg-blue-900/30 text-blue-300" : "text-gray-300"}`}
                    >
                      {m.name}
                    </button>
                  ))
                )}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Title */}
      <div>
        <label className="block text-xs font-medium text-gray-400 mb-1">Title</label>
        <input
          type="text"
          value={title}
          onChange={e => setTitle(e.target.value)}
          placeholder="Class canceled tonight"
          className={inp}
          maxLength={100}
        />
      </div>

      {/* Body */}
      <div>
        <label className="block text-xs font-medium text-gray-400 mb-1">Message</label>
        <textarea
          value={body}
          onChange={e => setBody(e.target.value)}
          placeholder="Tonight's 7pm class is canceled due to the tournament. See you Thursday!"
          rows={3}
          className="w-full px-4 py-2.5 rounded-lg bg-gray-800 border border-gray-700 text-white placeholder-gray-500 focus:outline-none focus:border-blue-500 text-sm resize-none"
          maxLength={300}
        />
      </div>

      {/* URL */}
      <div>
        <label className="block text-xs font-medium text-gray-400 mb-1">Link (optional)</label>
        <input
          type="text"
          value={url}
          onChange={e => setUrl(e.target.value)}
          placeholder="/member/schedule"
          className={inp}
        />
        <p className="text-xs text-gray-600 mt-1">Where the notification taps to. Default is /</p>
      </div>

      {result && (
        <div className={`text-sm px-4 py-3 rounded-lg border ${result.ok ? "bg-green-900/30 border-green-800 text-green-300" : "bg-red-900/30 border-red-800 text-red-300"}`}>
          {result.msg}
        </div>
      )}

      <button
        onClick={send}
        disabled={sending || !title.trim() || !body.trim()}
        className="px-6 py-2.5 rounded-lg bg-blue-600 hover:bg-blue-500 disabled:opacity-50 text-white font-semibold text-sm transition"
      >
        {sending ? "Sending…" : "Send Notification"}
      </button>
    </div>
  );
}
