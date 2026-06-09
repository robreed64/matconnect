"use client";

import { useEffect, useState } from "react";

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
}

export default function InstallPrompt() {
  const [prompt, setPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [dismissed, setDismissed] = useState(false);

  useEffect(() => {
    if (sessionStorage.getItem("pwa-dismissed")) { setDismissed(true); return; }
    const handler = (e: Event) => {
      e.preventDefault();
      setPrompt(e as BeforeInstallPromptEvent);
    };
    window.addEventListener("beforeinstallprompt", handler);
    return () => window.removeEventListener("beforeinstallprompt", handler);
  }, []);

  if (!prompt || dismissed) return null;

  async function install() {
    await prompt!.prompt();
    const { outcome } = await prompt!.userChoice;
    if (outcome === "accepted" || outcome === "dismissed") {
      setPrompt(null);
      setDismissed(true);
      sessionStorage.setItem("pwa-dismissed", "1");
    }
  }

  function dismiss() {
    setDismissed(true);
    setPrompt(null);
    sessionStorage.setItem("pwa-dismissed", "1");
  }

  return (
    <div className="fixed bottom-4 left-4 right-4 z-50 flex items-center gap-3 rounded-xl bg-gray-800 border border-gray-700 px-4 py-3 shadow-2xl sm:left-auto sm:right-4 sm:w-80">
      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-blue-600 text-lg font-bold text-white">
        BJJ
      </div>
      <div className="min-w-0 flex-1">
        <p className="text-sm font-semibold text-white">Add to Home Screen</p>
        <p className="text-xs text-gray-400">Install the app for quick access</p>
      </div>
      <div className="flex shrink-0 gap-2">
        <button
          onClick={dismiss}
          className="text-xs text-gray-500 hover:text-gray-300 transition"
        >
          Not now
        </button>
        <button
          onClick={install}
          className="rounded-lg bg-blue-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-blue-500 transition"
        >
          Install
        </button>
      </div>
    </div>
  );
}
