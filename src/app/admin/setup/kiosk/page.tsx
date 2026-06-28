import Link from "next/link";

export default function SetupKioskPage() {
  return (
    <div className="p-8 max-w-2xl">
      <div className="mb-6">
        <Link href="/admin/setup" className="text-sm text-amber-500 hover:text-amber-300 transition">← Configure</Link>
        <h1 className="text-2xl font-bold mt-2">Kiosk</h1>
      </div>

      <div className="bg-[#0f1117] border border-gray-700/50 rounded-2xl p-6 space-y-4">
        <h2 className="text-sm font-semibold text-gray-400 uppercase tracking-wide">Lock Mode</h2>
        <p className="text-sm text-gray-400">
          When you enter kiosk mode, the screen goes fullscreen and the browser navigation is locked.
          Only an admin can exit using their email and password via the hidden exit button.
        </p>
        <ul className="text-sm text-gray-500 space-y-1 list-disc list-inside">
          <li>Navigate to <code className="bg-gray-800 px-1.5 py-0.5 rounded text-xs">/kiosk</code> to enter kiosk mode</li>
          <li>Hover the top-right corner to reveal the admin exit button</li>
          <li>Enter admin credentials to exit back to the dashboard</li>
        </ul>
        <Link
          href="/kiosk"
          className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-semibold text-sm transition"
        >
          📲 Launch Kiosk Mode
        </Link>
      </div>
    </div>
  );
}
