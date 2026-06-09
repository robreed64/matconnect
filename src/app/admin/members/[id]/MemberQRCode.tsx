"use client";

import { useEffect, useRef, useState } from "react";
import QRCode from "react-qr-code";

const BELT_COLORS: Record<string, { bg: string; text: string; border?: string }> = {
  white:  { bg: "#ffffff", text: "#111827", border: "#9ca3af" },
  blue:   { bg: "#2563eb", text: "#ffffff" },
  purple: { bg: "#7e22ce", text: "#ffffff" },
  brown:  { bg: "#92400e", text: "#ffffff" },
  black:  { bg: "#111827", text: "#ffffff" },
};

export default function MemberQRCode({
  memberId,
  memberName,
  gymName,
  beltRank,
}: {
  memberId: number;
  memberName: string;
  gymName: string;
  beltRank?: string | null;
}) {
  const [token, setToken] = useState<string | null>(null);
  const qrRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    fetch(`/api/admin/members/${memberId}/qr-token`)
      .then(r => r.json())
      .then(d => setToken(d.token))
      .catch(() => {});
  }, [memberId]);

  function handlePrint() {
    const svgEl = qrRef.current?.querySelector("svg");
    if (!svgEl) return;
    const svgStr = new XMLSerializer().serializeToString(svgEl);

    const belt = beltRank ? BELT_COLORS[beltRank.toLowerCase()] : null;
    const beltLabel = beltRank
      ? beltRank.charAt(0).toUpperCase() + beltRank.slice(1) + " Belt"
      : null;

    const html = `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <title>Check-In Card — ${memberName}</title>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body {
      background: #f9fafb;
      display: flex;
      justify-content: center;
      align-items: center;
      min-height: 100vh;
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
    }
    .card {
      width: 3.5in;
      background: #fff;
      border: 1px solid #e5e7eb;
      border-radius: 14px;
      overflow: hidden;
      box-shadow: 0 4px 16px rgba(0,0,0,0.10);
    }
    .belt-bar {
      background: ${belt ? belt.bg : "#f3f4f6"};
      color: ${belt ? belt.text : "#374151"};
      ${belt?.border ? `border-bottom: 2px solid ${belt.border};` : ""}
      padding: 10px 16px;
      font-size: 12px;
      font-weight: 700;
      letter-spacing: 0.08em;
      text-transform: uppercase;
      text-align: center;
    }
    .body {
      padding: 22px 16px 18px;
      display: flex;
      flex-direction: column;
      align-items: center;
      gap: 16px;
    }
    .gym-name {
      font-size: 10px;
      font-weight: 700;
      letter-spacing: 0.12em;
      text-transform: uppercase;
      color: #6b7280;
    }
    .qr svg { width: 190px; height: 190px; display: block; }
    .member-name {
      font-size: 22px;
      font-weight: 800;
      color: #111827;
      text-align: center;
      line-height: 1.2;
    }
    .hint {
      font-size: 11px;
      color: #9ca3af;
      text-align: center;
    }
    @media print {
      body { background: #fff; min-height: unset; }
      .card { box-shadow: none; border-color: #d1d5db; }
    }
  </style>
</head>
<body>
  <div class="card">
    <div class="belt-bar">${beltLabel ?? "Member"}</div>
    <div class="body">
      <div class="gym-name">${gymName}</div>
      <div class="qr">${svgStr}</div>
      <div class="member-name">${memberName}</div>
      <div class="hint">Scan at the check-in kiosk</div>
    </div>
  </div>
  <script>window.onload = function () { window.print(); };<\/script>
</body>
</html>`;

    const win = window.open("", "_blank", "width=520,height=620");
    if (!win) {
      alert("Allow pop-ups for this site to print the card.");
      return;
    }
    win.document.write(html);
    win.document.close();
  }

  if (!token) return <div className="text-xs text-gray-500">Generating…</div>;

  return (
    <div className="flex flex-col items-center gap-3">
      <div ref={qrRef} className="bg-white p-3 rounded-xl">
        <QRCode value={token} size={140} />
      </div>
      <p className="text-xs text-gray-500 text-center">
        Member scans this at the kiosk to check in instantly.
      </p>
      <button
        onClick={handlePrint}
        className="text-xs text-gray-400 hover:text-white border border-gray-700 hover:border-gray-500 px-3 py-1.5 rounded-lg transition"
      >
        Print card
      </button>
    </div>
  );
}
