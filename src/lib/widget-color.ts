const HEX_RE = /^#([0-9a-fA-F]{3}|[0-9a-fA-F]{4}|[0-9a-fA-F]{6}|[0-9a-fA-F]{8})$/;

export function safeColor(raw: string | null | undefined, fallback = "#2563eb"): string {
  return raw && HEX_RE.test(raw) ? raw : fallback;
}
