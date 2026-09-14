"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowRight, Settings2 } from "lucide-react";
import { createRoom, hostStorageKey } from "@/lib/client";
import { Button, ErrorBanner } from "@/components/ui";

export function CreateRoomForm() {
  const router = useRouter();
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function submit(formData: FormData) {
    setPending(true);
    setError(null);
    try {
      const response = await createRoom({
        name: String(formData.get("name") || "Friday CPL Live"),
        maxParticipants: Number(formData.get("maxParticipants") || 24),
        bidIncrement: Number(formData.get("bidIncrement") || 50),
        timerSeconds: Number(formData.get("timerSeconds") || 12),
        quizEnabled: formData.get("quizEnabled") === "on",
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
      <div className="form-grid">
        <label>
          Participants
          <select name="maxParticipants" defaultValue="24">
            <option value="12">Up to 12</option>
            <option value="24">Up to 24</option>
            <option value="40">Up to 40</option>
            <option value="60">Up to 60</option>
          </select>
        </label>
        <label>
          Bid step
          <select name="bidIncrement" defaultValue="50">
            <option value="25">0.25 DevCrore</option>
            <option value="50">0.5 DevCrore</option>
            <option value="100">1 DevCrore</option>
            <option value="200">2 DevCrore</option>
          </select>
        </label>
        <label>
          Countdown
          <select name="timerSeconds" defaultValue="12">
            <option value="8">8 seconds</option>
            <option value="12">12 seconds</option>
            <option value="18">18 seconds</option>
            <option value="25">25 seconds</option>
          </select>
        </label>
        <label className="toggle-label">
          <input name="quizEnabled" type="checkbox" defaultChecked />
          <span>
            <strong>Dev quiz</strong>
            <small>Five bonus questions</small>
          </span>
        </label>
      </div>
      <Button type="submit" disabled={pending}>
        {pending ? "Creating room…" : "Create live room"}
        <ArrowRight size={18} aria-hidden="true" />
      </Button>
    </form>
  );
}
