"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type { ActionResponse, RoomSnapshot } from "@/lib/types";

type ApiResponse = ActionResponse & {
  snapshot?: RoomSnapshot;
};

function idempotencyKey(prefix: string): string {
  const id =
    typeof crypto !== "undefined" && "randomUUID" in crypto
      ? crypto.randomUUID()
      : `${Date.now()}-${Math.random().toString(36).slice(2)}`;
  return `${prefix}-${id}`;
}

async function parseResponse(response: Response): Promise<ApiResponse> {
  const body = (await response.json()) as ApiResponse;
  if (!response.ok || !body.ok) {
    throw new Error(body.error ?? "The request could not be completed.");
  }
  return body;
}

export async function createRoom(input: {
  name: string;
  maxParticipants: number;
  bidIncrement: number;
  timerSeconds: number;
  quizEnabled: boolean;
}): Promise<ApiResponse> {
  const response = await fetch("/api/rooms", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(input),
    cache: "no-store",
  });
  return parseResponse(response);
}

export async function createDemo(): Promise<ApiResponse> {
  const response = await fetch("/api/demo", {
    method: "POST",
    cache: "no-store",
  });
  return parseResponse(response);
}

export async function sendRoomAction(
  roomCode: string,
  action: Record<string, unknown>,
  prefix = "action",
): Promise<ApiResponse> {
  const response = await fetch(`/api/rooms/${roomCode}/actions`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      ...action,
      idempotencyKey: action.idempotencyKey ?? idempotencyKey(prefix),
    }),
    cache: "no-store",
  });
  return parseResponse(response);
}

export function hostStorageKey(roomCode: string): string {
  return `cpl:host:${roomCode.toUpperCase()}`;
}

export function participantStorageKey(roomCode: string): string {
  return `cpl:participant:${roomCode.toUpperCase()}`;
}

export type ParticipantSession = {
  participantId: string;
  participantToken: string;
};

export function useRoomSnapshot(roomCode: string) {
  const [snapshot, setSnapshot] = useState<RoomSnapshot | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [serverOffset, setServerOffset] = useState(0);
  const versionRef = useRef(0);

  const acceptSnapshot = useCallback((next: RoomSnapshot | undefined) => {
    if (!next || next.version < versionRef.current) return;
    versionRef.current = next.version;
    setSnapshot(next);
    setServerOffset(next.serverTime - Date.now());
    setError(null);
  }, []);

  const refresh = useCallback(async () => {
    try {
      const response = await fetch(`/api/rooms/${roomCode}`, {
        cache: "no-store",
      });
      const body = await parseResponse(response);
      acceptSnapshot(body.snapshot);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Could not refresh the room.");
    } finally {
      setLoading(false);
    }
  }, [acceptSnapshot, roomCode]);

  const act = useCallback(
    async (action: Record<string, unknown>, prefix?: string) => {
      try {
        const body = await sendRoomAction(roomCode, action, prefix);
        acceptSnapshot(body.snapshot);
        return body;
      } catch (error) {
        await refresh();
        throw error;
      }
    },
    [acceptSnapshot, refresh, roomCode],
  );

  useEffect(() => {
    const timeout = window.setTimeout(() => void refresh(), 0);
    return () => window.clearTimeout(timeout);
  }, [refresh]);

  useEffect(() => {
    const active = snapshot?.auction?.state === "active";
    const interval = window.setInterval(
      () => void refresh(),
      active ? 400 : 1200,
    );
    return () => window.clearInterval(interval);
  }, [refresh, snapshot?.auction?.state]);

  return {
    snapshot,
    error,
    loading,
    serverOffset,
    refresh,
    act,
    acceptSnapshot,
  };
}
