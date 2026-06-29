import { describe, it, expect } from "vitest";
import { safeColor } from "./widget-color";

describe("safeColor", () => {
  it("returns valid 3-char hex as-is", () => {
    expect(safeColor("#abc")).toBe("#abc");
  });

  it("returns valid 6-char hex as-is", () => {
    expect(safeColor("#2563eb")).toBe("#2563eb");
  });

  it("returns valid 4-char hex as-is", () => {
    expect(safeColor("#abcd")).toBe("#abcd");
  });

  it("returns valid 8-char hex as-is", () => {
    expect(safeColor("#2563ebff")).toBe("#2563ebff");
  });

  it("falls back for 5-char hex", () => {
    expect(safeColor("#abc12")).toBe("#2563eb");
  });

  it("falls back for 7-char hex", () => {
    expect(safeColor("#abc1234")).toBe("#2563eb");
  });

  it("falls back for non-hex string", () => {
    expect(safeColor("red")).toBe("#2563eb");
  });

  it("falls back for URL-encoded string", () => {
    expect(safeColor("%23ff0000")).toBe("#2563eb");
  });

  it("falls back for undefined", () => {
    expect(safeColor(undefined)).toBe("#2563eb");
  });

  it("falls back for empty string", () => {
    expect(safeColor("")).toBe("#2563eb");
  });

  it("uses custom fallback when provided", () => {
    expect(safeColor("bad", "#ff0000")).toBe("#ff0000");
  });
});
