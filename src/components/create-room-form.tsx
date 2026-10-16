"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowRight, BookmarkPlus, Settings2, Trash2 } from "lucide-react";
import { createRoom, hostStorageKey } from "@/lib/client";
import { DEFAULT_ROOM_CONFIG } from "@/lib/constants";
import {
  loadPresets,
  persistPresets,
  removePreset,
  upsertPreset,
  type HostPreset,
  type HostPresetSettings,
} from "@/lib/host-presets";
import { Button, ErrorBanner } from "@/components/ui";

export function CreateRoomForm() {
  const router = useRouter();
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [settings, setSettings] = useState<HostPresetSettings>(DEFAULT_ROOM_CONFIG);
  const [presets, setPresets] = useState<HostPreset[]>([]);
  const [selectedPreset, setSelectedPreset] = useState("");
  const [presetName, setPresetName] = useState("");
  const [presetNotice, setPresetNotice] = useState<string | null>(null);

  useEffect(() => {
    setPresets(loadPresets());
  }, []);

  function update<Key extends keyof HostPresetSettings>(
    key: Key,
    value: HostPresetSettings[Key],
  ) {
    setSettings((current) => ({ ...current, [key]: value }));
    setPresetNotice(null);
  }

  function applyPreset(name: string) {
    setSelectedPreset(name);
    const preset = presets.find((entry) => entry.name === name);
    if (!preset) {
      setPresetNotice(null);
      return;
    }
    setSettings(preset.settings);
    setPresetName(preset.name);
    setPresetNotice(`Loaded "${preset.name}".`);
  }

  function saveCurrentAsPreset() {
    const name = presetName.trim();
    if (name.length < 2) {
      setPresetNotice("Give the format a name with at least 2 characters.");
      return;
    }
    const next = upsertPreset(presets, { name, settings });
    setPresets(next);
    persistPresets(next);
    setSelectedPreset(name);
    setPresetNotice(`Saved "${name}" for your next event.`);
  }

  function deleteSelectedPreset() {
    if (!selectedPreset) return;
    const next = removePreset(presets, selectedPreset);
    setPresets(next);
    persistPresets(next);
    setPresetNotice(`Removed "${selectedPreset}".`);
    setSelectedPreset("");
  }

  async function submit(formData: FormData) {
    setPending(true);
    setError(null);
    try {
      const response = await createRoom({
        name: String(formData.get("name") || "Friday CPL Live"),
        ...settings,
      });
      if (!response.snapshot || !response.hostToken) {
        throw new Error("The room was created without host credentials.");
      }
      localStorage.setItem(
        hostStorageKey(response.snapshot.code),
        response.hostToken,
      );
      router.push(`/host/${response.snapshot.code}`);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Could not create the room.");
      setPending(false);
    }
  }

  return (
    <form action={submit} className="create-room-form">
      <div className="form-title">
        <Settings2 size={20} aria-hidden="true" />
        <div>
          <h2>Open the control room</h2>
          <p>Defaults are tuned for a fast 15-minute auction round.</p>
        </div>
      </div>
      {error && <ErrorBanner message={error} />}
      <label>
        Room name
        <input
          name="name"
          defaultValue="Friday CPL Live"
          minLength={3}
          maxLength={48}
          required
        />
      </label>
      {presets.length > 0 && (
        <label>
          Saved format
          <select
            name="preset"
            value={selectedPreset}
            onChange={(event) => applyPreset(event.target.value)}
          >
            <option value="">Custom settings</option>
            {presets.map((preset) => (
              <option key={preset.name} value={preset.name}>
                {preset.name}
              </option>
            ))}
          </select>
        </label>
      )}
      <div className="form-grid">
        <label>
          Participants
          <select
            name="maxParticipants"
            value={settings.maxParticipants}
            onChange={(event) =>
              update("maxParticipants", Number(event.target.value))
            }
          >
            <option value="12">Up to 12</option>
            <option value="24">Up to 24</option>
            <option value="40">Up to 40</option>
            <option value="60">Up to 60</option>
          </select>
        </label>
        <label>
          Bid step
          <select
            name="bidIncrement"
            value={settings.bidIncrement}
            onChange={(event) => update("bidIncrement", Number(event.target.value))}
          >
            <option value="25">0.25 DevCrore</option>
            <option value="50">0.5 DevCrore</option>
            <option value="100">1 DevCrore</option>
            <option value="200">2 DevCrore</option>
          </select>
        </label>
        <label>
          Countdown
          <select
            name="timerSeconds"
            value={settings.timerSeconds}
            onChange={(event) => update("timerSeconds", Number(event.target.value))}
          >
            <option value="8">8 seconds</option>
            <option value="12">12 seconds</option>
            <option value="18">18 seconds</option>
            <option value="25">25 seconds</option>
          </select>
        </label>
        <label>
          Squad size
          <select
            name="squadSize"
            value={settings.squadSize}
            onChange={(event) => update("squadSize", Number(event.target.value))}
          >
            <option value="7">7 players</option>
            <option value="9">9 players</option>
            <option value="11">11 players</option>
            <option value="13">13 players</option>
          </select>
        </label>
        <label>
          Team budget
          <select
            name="startingBudget"
            value={settings.startingBudget}
            onChange={(event) => update("startingBudget", Number(event.target.value))}
          >
            <option value="3000">30 DevCrore</option>
            <option value="5000">50 DevCrore</option>
            <option value="7500">75 DevCrore</option>
            <option value="10000">100 DevCrore</option>
          </select>
        </label>
        <label>
          Overseas limit
          <select
            name="maxOverseas"
            value={settings.maxOverseas}
            onChange={(event) => update("maxOverseas", Number(event.target.value))}
          >
            <option value="0">No overseas</option>
            <option value="2">Up to 2</option>
            <option value="4">Up to 4</option>
            <option value="6">Up to 6</option>
          </select>
        </label>
        <label className="toggle-label">
          <input
            name="quizEnabled"
            type="checkbox"
            checked={settings.quizEnabled}
            onChange={(event) => update("quizEnabled", event.target.checked)}
          />
          <span>
            <strong>Dev quiz</strong>
            <small>Five bonus questions</small>
          </span>
        </label>
      </div>
      <div className="preset-row">
        <label>
          Save these settings as
          <input
            name="presetName"
            value={presetName}
            onChange={(event) => setPresetName(event.target.value)}
            placeholder="Friday night format"
            maxLength={32}
          />
        </label>
        <div className="preset-actions">
          <Button type="button" variant="secondary" onClick={saveCurrentAsPreset}>
            <BookmarkPlus size={17} aria-hidden="true" />
            Save format
          </Button>
          {selectedPreset && (
            <Button type="button" variant="quiet" onClick={deleteSelectedPreset}>
              <Trash2 size={17} aria-hidden="true" />
              Delete
            </Button>
          )}
        </div>
        {presetNotice && (
          <p className="preset-notice" role="status">
            {presetNotice}
          </p>
        )}
      </div>
      <Button type="submit" disabled={pending}>
        {pending ? "Creating room…" : "Create live room"}
        <ArrowRight size={18} aria-hidden="true" />
      </Button>
    </form>
  );
}
