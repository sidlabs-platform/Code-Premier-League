import { DEVCOIN_UNITS_PER_CRORE } from "@/lib/constants";

export type DevCoins = number & { readonly __brand: "DevCoins" };

export function devCoins(value: number): DevCoins {
  if (!Number.isInteger(value) || value < 0) {
    throw new Error("DevCoins must be a non-negative integer.");
  }

  return value as DevCoins;
}

export function crore(value: number): DevCoins {
  return devCoins(Math.round(value * DEVCOIN_UNITS_PER_CRORE));
}

export function formatDevCoins(value: number, compact = false): string {
  const crores = value / DEVCOIN_UNITS_PER_CRORE;
  const formatted = Number.isInteger(crores)
    ? crores.toFixed(0)
    : crores.toFixed(crores < 10 ? 1 : 2).replace(/0+$/, "").replace(/\.$/, "");

  return compact ? `${formatted} DC` : `${formatted} DevCrore`;
}

export function formatDevLakh(value: number): string {
  return `${value} DevLakh`;
}
