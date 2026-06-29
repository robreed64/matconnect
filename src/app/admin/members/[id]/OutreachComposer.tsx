"use client";

import { useState } from "react";

const DEFAULT_BODY =
  "Hi {{name}}, we noticed you haven't been in for a bit — we'd love to see you back on the mats. Anything we can help with?";

export default function OutreachComposer({
  memberId,
  hasEmail,
  hasPhone,
}: {
  memberId: number;
  hasEmail: boolean;
  hasPhone: boolean;
}) {
  const [open, setOpen] = useState(false);
  const [channel, setChannel] = useState<"email" | "sms">(hasEmail ? "email" : "sms");
  const [subject, setSubject] = useState("Checking in");
  const [body, setBody] = useState(DEFAULT_BODY);
  const [status, setStatus] = useState<"idle" | "sending" | "sent">("idle");
  const [error, setError] = useState<string | null>(null);

  if (!hasEmail && !hasPhone) return null; // no way to reach this member

  async function send() {
    setStatus("sending");
    setError(null);
    try {
      const res = await fetch(`/api/admin/members/${memberId}/outreach`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ channel, subject, body }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(data.error ?? "Failed to send");
        setStatus("idle");
        return;
      }
      setStatus("sent");
      setTimeout(() => {
        setOpen(false);
        setStatus("idle");
      }, 1200);
    } catch {
      setError("Network error — please try again");
      setStatus("idle");
    }
  }

  const tab = (active: boolean, disabled: boolean) =>
    `px-3 py-1.5 rounded-lg text-sm font-medium transition ${
      disabled
        ? "bg-gray-900 text-gray-600 cursor-not-allowed"
        : active
        ? "bg-blue-600 text-white"
        : "bg-gray-800 text-gray-400 hover:text-white"
    }`;

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className="px-4 py-2 rounded-lg bg-gray-800 hover:bg-gray-700 text-sm font-medium transition"
      >
        Reach out
      </button>

      {open && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4"
          onClick={() => status !== "sending" && setOpen(false)}
        >
          <div
            className="bg-[#0f1117] border border-gray-700/60 rounded-2xl p-6 w-full max-w-md"
            onClick={(e) => e.stopPropagation()}
          >
            <h2 className="text-lg font-bold text-white mb-4">Reach out</h2>

            <div className="flex gap-2 mb-4">
              <button
                type="button"
                disabled={!hasEmail}
                onClick={() => setChannel("email")}
                className={tab(channel === "email", !hasEmail)}
              >
                Email
              </button>
              <button
                type="button"
                disabled={!hasPhone}
                onClick={() => setChannel("sms")}
                className={tab(channel === "sms", !hasPhone)}
              >
                SMS
              </button>
            </div>

            {channel === "email" && (
              <input
                value={subject}
                onChange={(e) => setSubject(e.target.value)}
                placeholder="Subject"
                className="w-full mb-3 px-3 py-2 rounded-lg bg-gray-900 border border-gray-700 text-sm text-white placeholder-gray-500 focus:outline-none focus:border-blue-500"
              />
            )}

            <textarea
              value={body}
              onChange={(e) => setBody(e.target.value)}
              rows={5}
              className="w-full px-3 py-2 rounded-lg bg-gray-900 border border-gray-700 text-sm text-white placeholder-gray-500 focus:outline-none focus:border-blue-500 resize-none"
            />
            <p className="text-xs text-gray-500 mt-1">
              Use <code className="text-gray-400">{"{{name}}"}</code> for the member&apos;s first name.
            </p>

            {error && <p className="text-sm text-red-400 mt-2">{error}</p>}

            <div className="flex justify-end gap-2 mt-5">
              <button
                onClick={() => setOpen(false)}
                disabled={status === "sending"}
                className="px-4 py-2 rounded-lg bg-gray-800 hover:bg-gray-700 text-sm font-medium transition disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                onClick={send}
                disabled={status !== "idle" || !body.trim()}
                className="px-4 py-2 rounded-lg bg-blue-600 hover:bg-blue-500 text-sm font-semibold text-white transition disabled:opacity-50"
              >
                {status === "sending" ? "Sending…" : status === "sent" ? "Sent ✓" : "Send"}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
