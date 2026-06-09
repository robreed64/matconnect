"use client";

import { useEffect, useRef } from "react";
import { Html5Qrcode } from "html5-qrcode";

const READER_ID = "qr-reader";

export default function QRScannerView({ onScan }: { onScan: (token: string) => void }) {
  const onScanRef = useRef(onScan);
  useEffect(() => { onScanRef.current = onScan; }, [onScan]);

  useEffect(() => {
    const scanner = new Html5Qrcode(READER_ID);

    scanner
      .start(
        { facingMode: "environment" },
        { fps: 10, qrbox: { width: 240, height: 240 } },
        (decoded: string) => {
          scanner.stop().catch(() => {});
          onScanRef.current(decoded);
        },
        () => {},
      )
      .catch(console.error);

    return () => {
      try {
        scanner.stop().then(() => scanner.clear()).catch(() => {});
      } catch {
        try { scanner.clear(); } catch {}
      }
    };
  }, []);

  return (
    <div className="flex flex-col items-center gap-4 w-full max-w-xs">
      <div id={READER_ID} className="w-full rounded-2xl overflow-hidden" />
      <p className="text-gray-400 text-sm">Point the camera at a member&apos;s QR code</p>
    </div>
  );
}
