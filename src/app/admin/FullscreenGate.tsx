"use client";

import { useEffect, useState } from "react";

export default function FullscreenGate() {
  const [show, setShow] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);

  useEffect(() => {
    // Only prompt if not already fullscreen
    if (!document.fullscreenElement) setShow(true);

    const onChange = () => {
      const full = !!document.fullscreenElement;
      setIsFullscreen(full);
      if (full) setShow(false);
    };
    document.addEventListener("fullscreenchange", onChange);
    return () => document.removeEventListener("fullscreenchange", onChange);
  }, []);

  const enter = () => {
    document.documentElement.requestFullscreen().catch(() => {});
    setShow(false);
  };

  const exit = () => {
    if (document.fullscreenElement) document.exitFullscreen().catch(() => {});
  };

  return (
    <>
      {/* Full-screen overlay prompt */}
      {show && (
        <div
          className="fixed inset-0 z-[9999] flex flex-col items-center justify-center bg-gray-950 cursor-pointer select-none"
          onClick={enter}
        >
          <div className="text-center space-y-6 px-8">
            <div className="text-7xl">⛶</div>
            <h1 className="text-3xl font-bold text-white">Tap to enter full screen</h1>
            <p className="text-gray-400 text-lg">Front desk mode</p>
          </div>
        </div>
      )}

      {/* Small exit button visible when fullscreen */}
      {isFullscreen && (
        <button
          onClick={exit}
          title="Exit full screen"
          className="fixed bottom-3 right-3 z-50 p-2 rounded-lg bg-gray-800/60 hover:bg-gray-700 text-gray-500 hover:text-white transition text-xs"
        >
          ⛶ Exit
        </button>
      )}
    </>
  );
}
