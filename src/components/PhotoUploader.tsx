"use client";

import { useRef, useState } from "react";

type Props = {
  currentUrl: string | null;
  uploadUrl: string;
  name?: string;
  onUpload?: (url: string) => void;
  size?: "sm" | "lg";
};

export default function PhotoUploader({ currentUrl, uploadUrl, name, onUpload, size = "lg" }: Props) {
  const [preview, setPreview]     = useState<string | null>(currentUrl);
  const [uploading, setUploading] = useState(false);
  const [saved, setSaved]         = useState(false);
  const [error, setError]         = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const dim = size === "lg" ? "w-24 h-24 text-xl" : "w-14 h-14 text-sm";

  const initials = name
    ? name.trim().split(/\s+/).map(p => p[0]).slice(0, 2).join("").toUpperCase()
    : "?";

  async function handleFile(file: File) {
    if (file.size > 4 * 1024 * 1024) {
      setError("Photo must be under 4 MB");
      return;
    }
    setPreview(URL.createObjectURL(file));
    setError(null);
    setSaved(false);
    setUploading(true);

    try {
      const fd = new FormData();
      fd.append("file", file);
      const res  = await fetch(uploadUrl, { method: "POST", body: fd });
      const data = await res.json().catch(() => null);

      if (res.ok && data?.photoUrl) {
        setPreview(data.photoUrl);
        onUpload?.(data.photoUrl);
        setSaved(true);
        setTimeout(() => setSaved(false), 3000);
      } else {
        setError(data?.error ?? "Upload failed — please try again");
        setPreview(currentUrl);
      }
    } catch {
      setError("Upload failed — please try again");
      setPreview(currentUrl);
    } finally {
      setUploading(false);
    }
  }

  return (
    <div className="flex flex-col items-center gap-2">
      <button
        type="button"
        onClick={() => inputRef.current?.click()}
        disabled={uploading}
        className={`${dim} rounded-full bg-gray-700 border-2 border-gray-600 flex items-center justify-center overflow-hidden relative hover:border-blue-500 transition group disabled:opacity-60`}
      >
        {preview ? (
          <img src={preview} alt={name ?? "photo"} className="w-full h-full object-cover" />
        ) : (
          <span className="text-gray-300 font-bold">{initials}</span>
        )}
        <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition flex items-center justify-center">
          <span className="text-white text-xs font-semibold">
            {uploading ? "Uploading…" : preview ? "Change" : "Add photo"}
          </span>
        </div>
      </button>

      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={e => {
          const file = e.target.files?.[0];
          if (file) handleFile(file);
          e.target.value = "";
        }}
      />

      {error
        ? <p className="text-xs text-red-400">{error}</p>
        : saved
        ? <p className="text-xs text-green-400">Photo saved!</p>
        : <p className="text-xs text-gray-500">{uploading ? "Uploading…" : "Click to change photo"}</p>
      }
    </div>
  );
}
