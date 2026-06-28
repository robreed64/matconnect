"use client";

import { useState, useEffect, useRef } from "react";

export default function EmbedSnippetCard() {
  const [origin, setOrigin] = useState("");
  const [copied, setCopied] = useState(false);
  const embedRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => { setOrigin(window.location.origin); }, []);

  const snippet = origin
    ? `<iframe\n  src="${origin}/widget/lead"\n  width="100%"\n  height="520"\n  frameborder="0"\n  style="border-radius:12px;border:1px solid #e5e7eb;"\n></iframe>`
    : "Loading…";

  return (
    <div className="bg-[#0f1117] border border-gray-700/50 rounded-2xl p-6 space-y-3">
      <div className="flex items-center justify-between">
        <h2 className="text-sm font-bold text-white">Embed on your website</h2>
        {origin && (
          <a
            href={`${origin}/widget/lead`}
            target="_blank"
            rel="noreferrer"
            className="text-xs text-blue-400 hover:text-blue-300 transition"
          >
            Preview form →
          </a>
        )}
      </div>
      <p className="text-xs text-gray-500">
        Paste this snippet into your gym&apos;s website. Submissions appear here as new leads.
      </p>
      <textarea
        ref={embedRef}
        readOnly
        rows={4}
        value={snippet}
        onClick={() => embedRef.current?.select()}
        className="w-full px-4 py-3 rounded-lg bg-gray-800 border border-gray-700 text-gray-300 text-xs font-mono resize-none focus:outline-none focus:border-blue-500"
      />
      <button
        type="button"
        onClick={async () => {
          await navigator.clipboard.writeText(snippet);
          setCopied(true);
          setTimeout(() => setCopied(false), 2000);
        }}
        className="px-4 py-2 rounded-lg bg-gray-700 hover:bg-gray-600 text-white text-sm font-medium transition"
      >
        {copied ? "Copied ✓" : "Copy code"}
      </button>
    </div>
  );
}
