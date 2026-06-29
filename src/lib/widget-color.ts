const HEX_RE = /^#[0-9a-fA-F]{3,8}$/;

export function safeColor(raw: string | null | undefined, fallback = "#2563eb"): string {
  return raw && HEX_RE.test(raw) ? raw : fallback;
}
