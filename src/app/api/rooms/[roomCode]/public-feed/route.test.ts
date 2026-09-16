import { afterEach, describe, expect, it, vi } from "vitest";
import {
  GET,
  OPTIONS,
} from "@/app/api/rooms/[roomCode]/public-feed/route";
import { roomStore } from "@/lib/store";

describe("GET /api/rooms/[roomCode]/public-feed", () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("returns a projected no-store feed for an existing room", async () => {
    const created = await roomStore.createRoom({
      name: `Public Feed ${Date.now()}`,
      maxParticipants: 12,
      bidIncrement: 50,
      timerSeconds: 20,
      quizEnabled: false,
    });
    const roomCode = created.snapshot!.code;

    const response = await GET(
      new Request(`http://localhost/api/rooms/${roomCode}/public-feed`),
      { params: Promise.resolve({ roomCode }) },
    );

    expect(response.status).toBe(200);
    expect(response.headers.get("cache-control")).toBe("no-store");
    expect(response.headers.get("access-control-allow-origin")).toBe("*");
    const body = await response.json();
    expect(body).toMatchObject({
      ok: true,
      feed: {
        code: roomCode,
        phase: "waiting",
        version: 1,
        currentAuction: null,
        teams: [],
        results: null,
      },
    });
    expect(Object.keys(body)).toEqual(["ok", "feed"]);
    expect(Object.keys(body.feed).sort()).toEqual([
      "code",
      "currentAuction",
      "latestEvent",
      "name",
      "phase",
      "results",
      "serverTime",
      "teams",
      "version",
    ]);
  });

  it("exposes a browser-safe preflight without exposing room data", () => {
    const response = OPTIONS();

    expect(response.status).toBe(204);
    expect(response.headers.get("access-control-allow-origin")).toBe("*");
    expect(response.headers.get("access-control-allow-methods")).toBe(
      "GET, OPTIONS",
    );
  });

  it("returns an unexpected error without leaking internal details", async () => {
    vi.spyOn(roomStore, "getSnapshot").mockRejectedValueOnce(
      new Error("host-token-secret"),
    );

    const response = await GET(
      new Request("http://localhost/api/rooms/CPL123/public-feed"),
      { params: Promise.resolve({ roomCode: "CPL123" }) },
    );

    expect(response.status).toBe(500);
    await expect(response.json()).resolves.toEqual({
      ok: false,
      error: "Could not load the public room feed.",
    });
  });

  it("returns the standard no-store error response for an unknown room", async () => {
    const response = await GET(
      new Request("http://localhost/api/rooms/UNKNOWN/public-feed"),
      { params: Promise.resolve({ roomCode: "__UNKNOWN_PUBLIC_FEED_ROOM__" }) },
    );

    expect(response.status).toBe(404);
    expect(response.headers.get("cache-control")).toBe("no-store");
    await expect(response.json()).resolves.toEqual({
      ok: false,
      error: "Room not found. Check the six-character code.",
    });
  });
});
