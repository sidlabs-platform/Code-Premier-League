"use client";

import { useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { ArrowRight, DoorOpen } from "lucide-react";
import {
  participantStorageKey,
  sendRoomAction,
  type ParticipantSession,
} from "@/lib/client";
import { Button, ErrorBanner } from "@/components/ui";

export function JoinForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const initialCode = searchParams.get("room")?.toUpperCase() ?? "";

  async function submit(formData: FormData) {
    setPending(true);
    setError(null);
    const roomCode = String(formData.get("roomCode") || "")
      .trim()
      .toUpperCase();
    try {
      const response = await sendRoomAction(
        roomCode,
        {
          type: "join",
          displayName: String(formData.get("displayName") || ""),
          teamName: String(formData.get("teamName") || ""),
        },
        "join",
      );
      if (!response.participantId || !response.participantToken) {
        throw new Error("The room did not return a participant session.");
      }
      const session: ParticipantSession = {
        participantId: response.participantId,
        participantToken: response.participantToken,
      };
      localStorage.setItem(participantStorageKey(roomCode), JSON.stringify(session));
      router.push(`/room/${roomCode}`);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Could not join this room.");
      setPending(false);
    }
  }

  return (
    <form action={submit} className="join-form">
      <div className="join-form-heading">
        <DoorOpen size={24} aria-hidden="true" />
        <div>
          <h1>Join the auction floor</h1>
          <p>No account. No download. Just your room code and a team name.</p>
        </div>
      </div>
      {error && <ErrorBanner message={error} />}
      <label>
        Six-character room code
        <input
          name="roomCode"
          defaultValue={initialCode}
          placeholder="BYTE11"
          minLength={6}
          maxLength={6}
          autoCapitalize="characters"
          autoCorrect="off"
          className="room-code-input"
          required
        />
      </label>
      <label>
        Display name
        <input
          name="displayName"
          placeholder="e.g. Priya"
          minLength={2}
          maxLength={24}
          autoComplete="nickname"
          required
        />
      </label>
      <label>
        Team name <span>optional</span>
        <input
          name="teamName"
          placeholder="e.g. Merge Mavericks"
          minLength={2}
          maxLength={32}
        />
      </label>
      <Button type="submit" disabled={pending}>
        {pending ? "Joining…" : "Enter room"}
        <ArrowRight size={18} aria-hidden="true" />
      </Button>
    </form>
  );
}
