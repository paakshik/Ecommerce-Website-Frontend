import { describe, it, expect } from "vitest";
import { formatPrice, formatDate, formatDateTime } from "../utils/format";

describe("formatPrice", () => {
  it("formats USD cents as dollars", () => {
    expect(formatPrice(1299, "USD")).toBe("$12.99");
  });

  it("formats INR with the rupee symbol", () => {
    expect(formatPrice(129900, "INR")).toContain("₹");
  });

  it("defaults to USD when currency is missing", () => {
    expect(formatPrice(500, undefined)).toBe("$5.00");
    expect(formatPrice(500, null)).toBe("$5.00");
  });

  it("treats missing minor amount as zero", () => {
    expect(formatPrice(undefined, "USD")).toBe("$0.00");
    expect(formatPrice(null, "USD")).toBe("$0.00");
  });
});

describe("formatDate", () => {
  it("formats a valid ISO date", () => {
    const out = formatDate("2026-01-15T09:30:00Z");
    expect(out).toContain("2026");
  });

  it("returns honest fallback for missing date", () => {
    expect(formatDate(undefined)).toBe("Date unavailable");
    expect(formatDate(null)).toBe("Date unavailable");
    expect(formatDate("")).toBe("Date unavailable");
  });

  it("returns honest fallback for invalid date", () => {
    expect(formatDate("not-a-date")).toBe("Date unavailable");
  });
});

describe("formatDateTime", () => {
  it("formats a valid ISO timestamp", () => {
    const out = formatDateTime("2026-01-15T09:30:00Z");
    expect(out).toContain("2026");
    expect(out).toMatch(/\d/); // includes time portion
  });

  it("returns honest fallback for missing date", () => {
    expect(formatDateTime(undefined)).toBe("Date unavailable");
    expect(formatDateTime(null)).toBe("Date unavailable");
    expect(formatDateTime("")).toBe("Date unavailable");
  });

  it("returns honest fallback for invalid date", () => {
    expect(formatDateTime("not-a-date")).toBe("Date unavailable");
  });
});
