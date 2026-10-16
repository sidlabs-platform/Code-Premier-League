import { describe, expect, it } from "vitest";
import { DEFAULT_ROOM_CONFIG } from "@/lib/constants";
import {
  parsePresets,
  removePreset,
  upsertPreset,
  type HostPreset,
} from "@/lib/host-presets";

const preset: HostPreset = {
  name: "Friday format",
  settings: { ...DEFAULT_ROOM_CONFIG, squadSize: 9, maxOverseas: 2, startingBudget: 7500 },
};

describe("host presets", () => {
  it("ignores malformed or incomplete stored presets", () => {
    expect(parsePresets(null)).toEqual([]);
    expect(parsePresets("not json")).toEqual([]);
    expect(parsePresets(JSON.stringify([{ name: "", settings: {} }]))).toEqual([]);
    expect(parsePresets(JSON.stringify([preset]))).toEqual([preset]);
  });

  it("backfills missing settings with the default room config", () => {
    const stored = JSON.stringify([
      { name: "Legacy", settings: { ...preset.settings, startingBudget: 3000 } },
    ]);
    expect(parsePresets(stored)[0]?.settings.startingBudget).toBe(3000);
  });

  it("replaces a preset with the same name instead of duplicating it", () => {
    const updated: HostPreset = {
      name: "friday format",
      settings: { ...preset.settings, squadSize: 13 },
    };
    const next = upsertPreset(upsertPreset([], preset), updated);
    expect(next).toHaveLength(1);
    expect(next[0].settings.squadSize).toBe(13);
  });

  it("removes presets by name regardless of case", () => {
    expect(removePreset([preset], "FRIDAY FORMAT")).toEqual([]);
  });
});
