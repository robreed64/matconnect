"use client";

import { useState, useCallback } from "react";

type Member = { id: number; name: string };

export default function ComposeMessage({ members }: { members: Member[] }) {
  const [open,      setOpen]      = useState(false);
  const [memberId,  setMemberId]  = useState("");
  const [memberQ,   setMemberQ]   = useState("");
  const [channel,   setChannel]   = useState("email");
  const [subject,   setSubject]   = useState("");
  const [body,      setBody]      = useState("");
  const [sending,   setSending]   = useState(false);
  const [result,    setResult]    = useState<string | null>(null);

  const filtered = memberQ.trim()
    ? members.filter((m) => m.name.toLowerCase().includes(memberQ.toLowerCase())).slice(0, 8)
    : [];

  const send = useCallback(async () => {
    if (!memberId || !body) return;
    setSending(true);
    setResult(null);
    const res = await fetch("/api/admin/marketing/messages", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ memberId: Number(memberId), channel, subject: subject || null, body }),
    });
    setSending(false);
    if (res.ok) {
      setResult("Sent!");
      setBody(""); setSubject(""); setMemberId(""); setMemberQ("");
    } else {
      setResult("Failed to send.");
    }
  }, [memberId, channel, subject, body]);

  return (
    <>
      <button onClick={() => { setOpen(true); setResult(null); }}
        className="px-4 py-2 rounded-lg bg-blue-600 hover:bg-blue-500 text-white text-sm font-semibold transition">
        + Compose Message
      </button>

      {open && (
        <div className="fixed inset-0 bg-black/70 flex items-start justify-center z-50 p-4 overflow-y-auto">
          <div className="bg-[#0f1117] border border-gray-700/50 rounded-2xl w-full max-w-lg p-6 my-8">
            <h2 className="text-lg font-bold text-white mb-5">Send Message</h2>

            <div className="space-y-4">
              {/* Member search */}
              <div>
                <label className="block text-xs font-medium text-gray-400 mb-1.5">Member</label>
                <input
                  value={memberQ}
                  onChange={(e) => { setMemberQ(e.target.value); setMemberId(""); }}
                  className="w-full px-3 py-2 rounded-lg bg-gray-800 border border-gray-700 text-white text-sm focus:outline-none focus:border-blue-500 transition"
                  placeholder="Search member name…"
                />
                {filtered.length > 0 && !memberId && (
                  <div className="mt-1 bg-gray-800 border border-gray-700 rounded-lg overflow-hidden">
                    {filtered.map((m) => (
                      <button key={m.id} onClick={() => { setMemberId(String(m.id)); setMemberQ(m.name); }}
                        className="w-full text-left px-3 py-2 text-sm text-gray-200 hover:bg-gray-700 transition">
                        {m.name}
                      </button>
                    ))}
                  </div>
                )}
              </div>

              <div>
                <label className="block text-xs font-medium text-gray-400 mb-1.5">Channel</label>
                <select value={channel} onChange={(e) => setChannel(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg bg-gray-800 border border-gray-700 text-white text-sm focus:outline-none focus:border-blue-500 transition">
                  <option value="email">Email</option>
                  <option value="sms">SMS</option>
                  <option value="in_app">In-App</option>
                </select>
              </div>

              {channel === "email" && (
                <div>
                  <label className="block text-xs font-medium text-gray-400 mb-1.5">Subject</label>
                  <input value={subject} onChange={(e) => setSubject(e.target.value)}
                    className="w-full px-3 py-2 rounded-lg bg-gray-800 border border-gray-700 text-white text-sm focus:outline-none focus:border-blue-500 transition"
                    placeholder="Subject line" />
                </div>
              )}

              <div>
                <label className="block text-xs font-medium text-gray-400 mb-1.5">Message</label>
                <textarea rows={5} value={body} onChange={(e) => setBody(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg bg-gray-800 border border-gray-700 text-white text-sm focus:outline-none focus:border-blue-500 transition resize-none"
                  placeholder="Write your message…" />
              </div>

              {result && (
                <p className={`text-sm ${result === "Sent!" ? "text-green-400" : "text-red-400"}`}>{result}</p>
              )}
            </div>

            <div className="flex gap-3 mt-6">
              <button onClick={send} disabled={sending || !memberId || !body}
                className="flex-1 py-2.5 rounded-lg bg-blue-600 hover:bg-blue-500 disabled:opacity-50 text-white font-semibold text-sm transition">
                {sending ? "Sending…" : "Send"}
              </button>
              <button onClick={() => setOpen(false)}
                className="px-4 py-2.5 rounded-lg bg-gray-800 hover:bg-gray-700 text-gray-300 text-sm transition">
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
