import { DEFAULT_ROOM_CONFIG } from "@/lib/constants";
import type { RoomConfig } from "@/lib/types";

export type HostPresetSettings = RoomConfig;

export type HostPreset = {
  name: string;
  settings: HostPresetSettings;
};

export const PRESET_STORAGE_KEY = "cpl:host-presets";
export const PRESET_LIMIT = 12;

function isSettings(value: unknown): value is HostPresetSettings {
  if (!value || typeof value !== "object") return false;
  const candidate = value as Record<string, unknown>;
  return (
    typeof candidate.maxParticipants === "number" &&
    typeof candidate.bidIncrement === "number" &&
    typeof candidate.timerSeconds === "number" &&
    typeof candidate.quizEnabled === "boolean" &&
    typeof candidate.squadSize === "number" &&
    typeof candidate.maxOverseas === "number" &&
    typeof candidate.startingBudget === "number"
  );
}

export function parsePresets(raw: string | null): HostPreset[] {
  if (!raw) return [];
  try {
    const parsed: unknown = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed
      .filter(
        (entry): entry is HostPreset =>
          Boolean(entry) &&
          typeof (entry as HostPreset).name === "string" &&
          (entry as HostPreset).name.trim().length > 0 &&
          isSettings((entry as HostPreset).settings),
      )
      .map((entry) => ({
        name: entry.name.trim(),
        settings: { ...DEFAULT_ROOM_CONFIG, ...entry.settings },
      }))
      .slice(0, PRESET_LIMIT);
  } catch {
    return [];
  }
}

export function upsertPreset(
  presets: HostPreset[],
  preset: HostPreset,
): HostPreset[] {
  const name = preset.name.trim();
  const next = presets.filter(
    (entry) => entry.name.toLocaleLowerCase() !== name.toLocaleLowerCase(),
  );
  return [{ name, settings: preset.settings }, ...next].slice(0, PRESET_LIMIT);
}

export function removePreset(presets: HostPreset[], name: string): HostPreset[] {
  return presets.filter(
    (entry) => entry.name.toLocaleLowerCase() !== name.toLocaleLowerCase(),
  );
}

export function loadPresets(): HostPreset[] {
  if (typeof window === "undefined") return [];
  return parsePresets(window.localStorage.getItem(PRESET_STORAGE_KEY));
}

export function persistPresets(presets: HostPreset[]): void {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(PRESET_STORAGE_KEY, JSON.stringify(presets));
}
