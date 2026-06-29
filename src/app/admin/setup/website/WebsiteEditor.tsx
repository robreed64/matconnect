"use client";

import { useState, type ReactNode } from "react";
import Link from "next/link";
import type { SiteConfig } from "@/lib/site-config";

function SnippetBlock({
  label,
  snippet,
  copied,
  onCopy,
}: {
  label: string;
  snippet: string;
  copied: boolean;
  onCopy: () => void;
}) {
  return (
    <div className="space-y-2">
      <p className="text-xs font-medium text-gray-400">{label}</p>
      <pre className="w-full overflow-x-auto rounded-lg border border-gray-700 bg-gray-900 px-4 py-3 font-mono text-xs text-gray-300">
        <code>{snippet}</code>
      </pre>
      <button
        type="button"
        onClick={onCopy}
        className="rounded-lg bg-gray-700 px-4 py-2 text-sm font-medium text-white transition hover:bg-gray-600"
      >
        {copied ? "Copied ✓" : "Copy code"}
      </button>
    </div>
  );
}

// Defined at module scope (not inside the component) so their identity is stable
// across renders — otherwise inputs inside them remount and lose focus on each
// keystroke.
function Toggle({ checked, onChange, label, hint }: { checked: boolean; onChange: (v: boolean) => void; label: string; hint?: string }) {
  return (
    <button
      type="button"
      onClick={() => onChange(!checked)}
      className="flex w-full items-center justify-between rounded-lg border border-gray-700/60 bg-[#0f1117] px-4 py-3 text-left transition hover:border-gray-600"
    >
      <span>
        <span className="block text-sm font-medium text-white">{label}</span>
        {hint && <span className="block text-xs text-gray-500">{hint}</span>}
      </span>
      <span className={`relative h-6 w-11 flex-shrink-0 rounded-full transition ${checked ? "bg-blue-600" : "bg-gray-700"}`}>
        <span className={`absolute top-0.5 h-5 w-5 rounded-full bg-white transition-all ${checked ? "left-[22px]" : "left-0.5"}`} />
      </span>
    </button>
  );
}

function Section({ title, children }: { title: string; children: ReactNode }) {
  return (
    <div className="rounded-2xl border border-gray-700/50 bg-[#0f1117] p-6">
      <h2 className="mb-4 text-sm font-semibold text-white">{title}</h2>
      <div className="space-y-4">{children}</div>
    </div>
  );
}

export default function WebsiteEditor({
  initial,
  siteDomain,
  appUrl,
}: {
  initial: SiteConfig;
  siteDomain: string;
  appUrl: string;
}) {
  const [cfg, setCfg] = useState<SiteConfig>(initial);
  const [status, setStatus] = useState<"idle" | "saving" | "saved">("idle");
  const [error, setError] = useState<string | null>(null);
  const [copiedId, setCopiedId] = useState<string | null>(null);

  function set<K extends keyof SiteConfig>(key: K, value: SiteConfig[K]) {
    setCfg((p) => ({ ...p, [key]: value }));
    setStatus("idle");
  }
  function setHero<K extends keyof SiteConfig["hero"]>(key: K, value: string) {
    setCfg((p) => ({ ...p, hero: { ...p.hero, [key]: value } }));
    setStatus("idle");
  }
  function setSocial(key: keyof SiteConfig["socials"], value: string) {
    setCfg((p) => ({ ...p, socials: { ...p.socials, [key]: value } }));
    setStatus("idle");
  }
  function setSeo(key: keyof SiteConfig["seo"], value: string) {
    setCfg((p) => ({ ...p, seo: { ...p.seo, [key]: value } }));
    setStatus("idle");
  }

  function handleCopy(id: string, text: string) {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  }

  const baseUrl = siteDomain
    ? `https://${siteDomain}`
    : appUrl || "https://your-app-domain.com";

  const encodedColor = cfg.themeColor.replace("#", "%23");

  const scheduleSnippet =
    `<iframe\n  src="${baseUrl}/widget/schedule?color=${encodedColor}"\n  width="100%"\n  height="400"\n  frameborder="0"\n  style="border-radius:12px;border:none"\n></iframe>`;

  const pricingSnippet =
    `<iframe\n  src="${baseUrl}/widget/pricing?color=${encodedColor}"\n  width="100%"\n  height="400"\n  frameborder="0"\n  style="border-radius:12px;border:none"\n></iframe>`;

  const leadSnippet =
    `<iframe\n  src="${baseUrl}/widget/lead?color=${encodedColor}"\n  width="100%"\n  height="520"\n  frameborder="0"\n  style="border-radius:12px;border:none"\n></iframe>`;

  const autoResizeSnippet =
    `<!-- Add an id to your iframe, e.g. id="mc-schedule" -->\n<script>\nwindow.addEventListener("message", function(e) {\n  if (e.data && e.data.mcHeight && e.data.mcId) {\n    var el = document.getElementById(e.data.mcId);\n    if (el) el.style.height = e.data.mcHeight + "px";\n  }\n});\n</script>`;

  async function save() {
    setStatus("saving");
    setError(null);
    try {
      const res = await fetch("/api/admin/settings", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ siteConfig: cfg }),
      });
      if (!res.ok) {
        const d = await res.json().catch(() => ({}));
        setError(d.error ?? "Failed to save");
        setStatus("idle");
        return;
      }
      setStatus("saved");
    } catch {
      setError("Network error");
      setStatus("idle");
    }
  }

  const input =
    "w-full rounded-lg bg-gray-900 border border-gray-700 px-3 py-2 text-sm text-white placeholder-gray-500 focus:outline-none focus:border-blue-500";
  const labelCls = "block text-xs font-medium text-gray-400 mb-1";

  return (
    <div className="max-w-3xl p-8">
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white">Website</h1>
          <p className="mt-1 text-sm text-gray-500">Publish a public site for your gym from your existing data.</p>
        </div>
        <Link href="/admin/setup" className="text-sm text-gray-400 transition hover:text-white">← Configure</Link>
      </div>

      <div className="space-y-5">
        <Toggle
          checked={cfg.enabled}
          onChange={(v) => set("enabled", v)}
          label={cfg.enabled ? "Published" : "Draft"}
          hint={cfg.enabled ? "Your site is live at /site" : "Only visible to you via Preview until published"}
        />

        <Section title="Custom Domain">
          {siteDomain ? (
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <span className="inline-flex items-center rounded-full bg-green-900/40 px-3 py-1 text-xs font-semibold text-green-400 ring-1 ring-inset ring-green-700/50">
                  Configured
                </span>
                <span className="text-sm text-gray-300">{siteDomain}</span>
              </div>
              <a
                href={`https://${siteDomain}`}
                target="_blank"
                rel="noopener noreferrer"
                className="text-sm text-blue-400 transition hover:text-blue-300"
              >
                View live site →
              </a>
            </div>
          ) : (
            <div className="space-y-4">
              <div className="rounded-lg border border-gray-700/60 bg-gray-900/50 px-4 py-3">
                <p className="mb-3 text-sm font-medium text-white">Set up a custom domain</p>
                <ol className="space-y-2 text-sm text-gray-400">
                  <li>
                    <span className="font-medium text-gray-300">1.</span> Add your domain in the{" "}
                    <span className="text-gray-300">Vercel dashboard → Project → Settings → Domains</span>
                  </li>
                  <li>
                    <span className="font-medium text-gray-300">2.</span> Set the{" "}
                    <code className="rounded bg-gray-800 px-1.5 py-0.5 text-xs text-blue-300">NEXT_PUBLIC_SITE_DOMAIN</code>{" "}
                    environment variable to your domain (e.g.{" "}
                    <code className="rounded bg-gray-800 px-1.5 py-0.5 text-xs text-blue-300">mygym.com</code>
                    ) in Vercel env vars, then redeploy
                  </li>
                </ol>
              </div>
              <div>
                <p className="mb-2 text-xs font-medium text-gray-400">DNS records</p>
                <div className="rounded-lg border border-gray-700/60 bg-gray-900 px-4 py-3 font-mono text-xs text-gray-300 space-y-1.5">
                  <div className="grid grid-cols-[auto_1fr_auto] gap-x-4">
                    <span className="text-gray-500">A</span>
                    <span>mygym.com</span>
                    <span className="text-blue-300">76.76.21.21</span>
                  </div>
                  <div className="grid grid-cols-[auto_1fr_auto] gap-x-4">
                    <span className="text-gray-500">CNAME</span>
                    <span>www.mygym.com</span>
                    <span className="text-blue-300">cname.vercel-dns.com</span>
                  </div>
                </div>
              </div>
            </div>
          )}
        </Section>

        <Section title="Branding">
          <div>
            <label className={labelCls}>Accent color</label>
            <div className="flex items-center gap-3">
              <input type="color" value={cfg.themeColor} onChange={(e) => set("themeColor", e.target.value)} className="h-9 w-14 cursor-pointer rounded border border-gray-700 bg-gray-900" />
              <input value={cfg.themeColor} onChange={(e) => set("themeColor", e.target.value)} className={`${input} max-w-[140px]`} />
            </div>
          </div>
        </Section>

        <Section title="Hero">
          <div>
            <label className={labelCls}>Headline</label>
            <input value={cfg.hero.headline} onChange={(e) => setHero("headline", e.target.value)} className={input} placeholder="Your gym name" />
          </div>
          <div>
            <label className={labelCls}>Subheadline</label>
            <textarea value={cfg.hero.subhead} onChange={(e) => setHero("subhead", e.target.value)} rows={2} className={`${input} resize-none`} />
          </div>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div>
              <label className={labelCls}>CTA button label</label>
              <input value={cfg.hero.ctaLabel} onChange={(e) => setHero("ctaLabel", e.target.value)} className={input} />
            </div>
            <div>
              <label className={labelCls}>Background image URL</label>
              <input value={cfg.hero.imageUrl} onChange={(e) => setHero("imageUrl", e.target.value)} className={input} placeholder="https://…" />
            </div>
          </div>
        </Section>

        <Section title="About">
          <textarea value={cfg.about} onChange={(e) => set("about", e.target.value)} rows={4} className={`${input} resize-none`} placeholder="Tell visitors about your gym…" />
        </Section>

        <Section title="Sections">
          <Toggle checked={cfg.showSchedule} onChange={(v) => set("showSchedule", v)} label="Show class schedule" hint="Pulls this week's classes" />
          <Toggle checked={cfg.showPricing} onChange={(v) => set("showPricing", v)} label="Show membership pricing" hint="Pulls your active plans" />
        </Section>

        <Section title="Social links">
          <div>
            <label className={labelCls}>Instagram URL</label>
            <input value={cfg.socials.instagram} onChange={(e) => setSocial("instagram", e.target.value)} className={input} placeholder="https://instagram.com/…" />
          </div>
          <div>
            <label className={labelCls}>Facebook URL</label>
            <input value={cfg.socials.facebook} onChange={(e) => setSocial("facebook", e.target.value)} className={input} placeholder="https://facebook.com/…" />
          </div>
          <div>
            <label className={labelCls}>YouTube URL</label>
            <input value={cfg.socials.youtube} onChange={(e) => setSocial("youtube", e.target.value)} className={input} placeholder="https://youtube.com/…" />
          </div>
        </Section>

        <Section title="SEO">
          <div>
            <label className={labelCls}>Page title</label>
            <input value={cfg.seo.title} onChange={(e) => setSeo("title", e.target.value)} className={input} placeholder="Defaults to your gym name" />
          </div>
          <div>
            <label className={labelCls}>Meta description</label>
            <textarea value={cfg.seo.description} onChange={(e) => setSeo("description", e.target.value)} rows={2} className={`${input} resize-none`} />
          </div>
          <div>
            <label className={labelCls}>Social share image URL</label>
            <input value={cfg.seo.ogImageUrl} onChange={(e) => setSeo("ogImageUrl", e.target.value)} className={input} placeholder="https://…" />
          </div>
        </Section>

        {/* Embed Codes */}
        <div className="rounded-2xl border border-gray-700/50 bg-[#0f1117] p-6">
          <h2 className="mb-2 text-sm font-semibold text-white">WordPress Embed Codes</h2>
          <p className="mb-4 text-xs text-gray-500">
            Paste these iframe snippets into your WordPress pages to embed MatConnect widgets. The accent color above is pre-filled.
          </p>
          <div className="space-y-6">
            <SnippetBlock
              label="Class Schedule"
              snippet={scheduleSnippet}
              copied={copiedId === "schedule"}
              onCopy={() => handleCopy("schedule", scheduleSnippet)}
            />
            <SnippetBlock
              label="Membership Pricing"
              snippet={pricingSnippet}
              copied={copiedId === "pricing"}
              onCopy={() => handleCopy("pricing", pricingSnippet)}
            />
            <SnippetBlock
              label="Trial Signup Form"
              snippet={leadSnippet}
              copied={copiedId === "lead"}
              onCopy={() => handleCopy("lead", leadSnippet)}
            />
            <div className="space-y-2 border-t border-gray-700/50 pt-4">
              <p className="text-xs font-medium text-gray-400">Advanced: Auto-resize</p>
              <p className="text-xs text-gray-500">
                Add an <code className="rounded bg-gray-800 px-1 py-0.5 text-blue-300">id</code> attribute to your iframe (e.g.{" "}
                <code className="rounded bg-gray-800 px-1 py-0.5 text-blue-300">id=&quot;mc-schedule&quot;</code>), then paste this script once per page.
              </p>
              <SnippetBlock
                label=""
                snippet={autoResizeSnippet}
                copied={copiedId === "autoresize"}
                onCopy={() => handleCopy("autoresize", autoResizeSnippet)}
              />
            </div>
          </div>
        </div>
      </div>

      <div className="sticky bottom-0 mt-6 flex items-center gap-3 border-t border-gray-800 bg-gray-950/80 py-4 backdrop-blur">
        <button
          onClick={save}
          disabled={status === "saving"}
          className="rounded-lg bg-blue-600 px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-blue-500 disabled:opacity-50"
        >
          {status === "saving" ? "Saving…" : status === "saved" ? "Saved ✓" : "Save changes"}
        </button>
        <a href="/site?preview=1" target="_blank" rel="noopener noreferrer" className="rounded-lg bg-gray-800 px-5 py-2.5 text-sm font-medium text-gray-200 transition hover:bg-gray-700">
          Preview
        </a>
        {cfg.enabled && !siteDomain && (
          <a href="/site" target="_blank" rel="noopener noreferrer" className="text-sm text-blue-400 transition hover:text-blue-300">
            View live site →
          </a>
        )}
        {error && <span className="text-sm text-red-400">{error}</span>}
      </div>
    </div>
  );
}
