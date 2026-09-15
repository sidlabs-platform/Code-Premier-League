import { describe, expect, it } from "vitest";
import { GET } from "@/app/api/rooms/[roomCode]/public-feed/route";
import { roomStore } from "@/lib/store";

describe("GET /api/rooms/[roomCode]/public-feed", () => {
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
    await expect(response.json()).resolves.toMatchObject({
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
