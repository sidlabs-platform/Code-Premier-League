import { describe, expect, it } from "vitest";
import { crore, devCoins, formatDevCoins, formatDevLakh } from "@/lib/currency";

describe("DevCoin currency", () => {
  it("converts crore values into integer storage units", () => {
    expect(crore(50)).toBe(5000);
    expect(crore(0.25)).toBe(25);
  });

  it("rejects negative and fractional storage values", () => {
    expect(() => devCoins(-1)).toThrow();
    expect(() => devCoins(1.5)).toThrow();
  });

  it("formats crore and lakh displays", () => {
    expect(formatDevCoins(5000)).toBe("50 DevCrore");
    expect(formatDevCoins(850, true)).toBe("8.5 DC");
    expect(formatDevLakh(75)).toBe("75 DevLakh");
  });
});
