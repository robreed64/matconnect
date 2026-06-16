"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";

type Props = {
  memberId: number;
  waiverSignedAt: string | null;
  waiverDocumentUrl: string | null;
  readOnly?: boolean;
};

export default function WaiverToggle({ memberId, waiverSignedAt, waiverDocumentUrl, readOnly = false }: Props) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [showUpload, setShowUpload] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const clearWaiver = async () => {
    if (!confirm("Clear the waiver record? The member will be asked to sign at the kiosk on their next check-in.")) return;
    setBusy(true);
    await fetch(`/api/admin/members/${memberId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ waiverSigned: false }),
    });
    setBusy(false);
    router.refresh();
  };

  const markSigned = async () => {
    setBusy(true);
    setUploadError(null);

    if (selectedFile) {
      const fd = new FormData();
      fd.append("file", selectedFile);
      const res = await fetch(`/api/admin/members/${memberId}/waiver`, { method: "POST", body: fd });
      const data = await res.json().catch(() => null);
      if (!res.ok) {
        setUploadError(data?.error ?? "Upload failed — please try again");
        setBusy(false);
        return;
      }
    } else {
      await fetch(`/api/admin/members/${memberId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ waiverSigned: true }),
      });
    }

    setBusy(false);
    setShowUpload(false);
    setSelectedFile(null);
    router.refresh();
  };

  const cancelUpload = () => {
    setShowUpload(false);
    setSelectedFile(null);
    setUploadError(null);
  };

  const UploadPanel = () => (
    <span className="inline-flex items-center gap-2">
      <input ref={inputRef} type="file" accept=".pdf,image/*" className="hidden"
        onChange={e => { setSelectedFile(e.target.files?.[0] ?? null); e.target.value = ""; }} />
      <button type="button" onClick={() => inputRef.current?.click()} disabled={busy}
        className="px-2 py-0.5 rounded bg-gray-800 hover:bg-gray-700 text-gray-300 transition disabled:opacity-50 max-w-[160px] truncate">
        {selectedFile ? selectedFile.name : "Choose file (optional)"}
      </button>
      <button onClick={markSigned} disabled={busy}
        className="px-2 py-0.5 rounded bg-green-800 hover:bg-green-700 text-white transition disabled:opacity-50">
        {busy ? "Saving…" : "Mark Signed"}
      </button>
      <button onClick={cancelUpload} disabled={busy}
        className="text-gray-600 hover:text-gray-400 transition disabled:opacity-50">
        cancel
      </button>
      {uploadError && <span className="text-red-400">{uploadError}</span>}
    </span>
  );

  if (waiverSignedAt) {
    const signedDate = new Date(waiverSignedAt).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
    return (
      <span className="inline-flex flex-wrap items-center gap-2 text-xs text-gray-400">
        <span className="text-green-400">✓ Waiver signed</span>
        {signedDate}
        {waiverDocumentUrl && (
          <a href={waiverDocumentUrl} target="_blank" rel="noopener noreferrer"
            className="text-blue-400 hover:text-blue-300 transition">
            View document
          </a>
        )}
        {!readOnly && !waiverDocumentUrl && !showUpload && (
          <button onClick={() => setShowUpload(true)} disabled={busy}
            className="text-gray-500 hover:text-gray-300 transition disabled:opacity-50">
            upload document
          </button>
        )}
        {!readOnly && showUpload && <UploadPanel />}
        {!readOnly && !showUpload && (
          <button onClick={clearWaiver} disabled={busy}
            className="text-gray-600 hover:text-red-400 transition disabled:opacity-50">
            clear
          </button>
        )}
      </span>
    );
  }

  return (
    <span className="inline-flex flex-wrap items-center gap-2 text-xs">
      <span className="text-amber-400">⚠ No waiver on file — kiosk will require signing</span>
      {!readOnly && !showUpload && (
        <button onClick={() => setShowUpload(true)} disabled={busy}
          className="px-2 py-0.5 rounded bg-gray-800 hover:bg-gray-700 text-gray-300 transition disabled:opacity-50">
          Mark signed (paper)
        </button>
      )}
      {!readOnly && showUpload && <UploadPanel />}
    </span>
  );
}
