import * as React from "react";
import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";
import { GET } from "@/app/api/rooms/[roomCode]/public-feed/route";
import { ResultsBoard } from "@/components/results-board";
import { rankParticipants } from "@/lib/scoring";
import type { RoomAction } from "@/lib/schemas";
import { roomStore } from "@/lib/store";
import type { RoomSnapshot } from "@/lib/types";

vi.mock("node:fs", async (importOriginal) => ({
  ...await importOriginal<typeof import("node:fs")>(),
  existsSync: () => false,
  mkdirSync: vi.fn(),
}));

vi.mock("node:fs/promises", () => ({
  mkdir: vi.fn(),
  rename: vi.fn(),
  writeFile: vi.fn(),
}));

async function createGame(quizEnabled = false) {
  const created = await roomStore.createRoom({
    name: "Result lifecycle test",
    maxParticipants: 12,
    bidIncrement: 50,
    timerSeconds: 45,
    quizEnabled,
  });
  const roomCode = created.snapshot!.code;
  const joined = await roomStore.applyAction(roomCode, {
    type: "join",
    idempotencyKey: "join-lifecycle",
    displayName: "Ada",
    teamName: "Alpha XI",
  });
  let sequence = 0;
  const host = async (
    action: Pick<RoomAction, "type"> & { playerId?: string; enabled?: boolean },
    idempotencyKey = `host-action-${++sequence}`,
  ) => {
    const response = await roomStore.applyAction(roomCode, {
      ...action,
      actorToken: created.hostToken!,
      idempotencyKey,
    });
    return response.snapshot!;
  };
  const bid = (amount = 100) => roomStore.applyAction(roomCode, {
    type: "bid",
    actorToken: joined.participantToken!,
    participantId: joined.participantId!,
    amount,
    idempotencyKey: `bid-action-${++sequence}`,
  });
  const feed = async () => {
    const response = await GET(
      new Request(`http://localhost/api/rooms/${roomCode}/public-feed`),
      { params: Promise.resolve({ roomCode }) },
    );
    expect(response.status).toBe(200);
    expect(response.headers.get("cache-control")).toBe("no-store");
    return response.json();
  };
  return { roomCode, host, bid, feed };
}

function expectCurrentScores(snapshot: RoomSnapshot) {
  const participants = snapshot.participants.map((participant) => ({
    ...participant,
    tokenHash: "test-only",
  }));
  expect(snapshot.results).toEqual(
    rankParticipants(participants, snapshot.config, snapshot.catalogue),
  );
}

describe("published result lifecycle", () => {
  beforeAll(() => vi.stubGlobal("React", React));
  afterAll(() => vi.unstubAllGlobals());

  it("withdraws a published scorecard on reopening and republishes current scores", async () => {
    const game = await createGame();
    await game.host({ type: "startAuction", playerId: "player-01" });
    await game.host({ type: "endAuction" });
    const published = await game.host({ type: "publishResults" });
    expectCurrentScores(published);
    const publishedFeed = await game.feed();
    expect(publishedFeed.feed.results).not.toBeNull();
    expect(ResultsBoard({ snapshot: published }).props.className.split(/\s+/)).toContain("results-board");

    const reopened = await game.host({ type: "startAuction", playerId: "player-02" });
    expect(reopened).toMatchObject({
      phase: "auction", resultsPublished: false, results: [],
    });
    const reopenedFeed = await game.feed();
    expect(reopenedFeed.feed.results).toBeNull();
    expect(ResultsBoard({ snapshot: reopened }).props.className).toBe("results-waiting");

    await game.bid(150);
    const ended = await game.host({ type: "endAuction" });
    expect(ended).toMatchObject({ phase: "results", resultsPublished: false });
    expectCurrentScores(ended);
    expect(ended.participants[0].squad).toHaveLength(1);
    const endedFeed = await game.feed();
    expect(endedFeed.feed.results).toBeNull();

    const republished = await game.host({ type: "publishResults" });
    expect(republished.resultsPublished).toBe(true);
    expectCurrentScores(republished);
    expect(republished.results).not.toEqual(published.results);
    const republishedFeed = await game.feed();
    expect(republishedFeed.feed.results).not.toBeNull();
    expect(republished.version).toBeGreaterThan(published.version);
    await game.host({ type: "publishResults" });
    const repeatedFeed = await game.feed();
    expect(repeatedFeed.feed.results).toEqual(republishedFeed.feed.results);

    if (process.env.CPL_CONTRACT_FIXTURES) {
      const { writeFile } = await vi.importActual<typeof import("node:fs/promises")>(
        "node:fs/promises",
      );
      await writeFile(process.env.CPL_CONTRACT_FIXTURES, JSON.stringify({
        published: publishedFeed,
        reopened: reopenedFeed,
        endedUnpublished: endedFeed,
        republished: republishedFeed,
        repeatedPublish: repeatedFeed,
      }, null, 2), "utf8");
    }
  });

  it.each(["active", "paused", "expired"] as const)(
    "settles a %s auction once before direct publication",
    async (state) => {
      const game = await createGame();
      await game.host({ type: "startAuction", playerId: "player-01" });
      await game.bid();
      if (state === "paused") await game.host({ type: "pauseAuction" });
      const now = Date.now();
      const clock = state === "expired"
        ? vi.spyOn(Date, "now").mockReturnValue(now + 46_000)
        : null;
      try {
        const published = await game.host({ type: "publishResults" }, "publish-once");
        expect(published).toMatchObject({
          phase: "results",
          resultsPublished: true,
          auction: { state: "sold", endsAt: null, pausedRemainingMs: null, soldPrice: 100 },
        });
        expect(published.participants[0].balance).toBe(4900);
        expect(published.participants[0].squad).toHaveLength(1);
        expect(published.auctionHistory).toHaveLength(1);
        expectCurrentScores(published);

        const retry = await game.host({ type: "publishResults" }, "publish-once");
        expect(retry.version).toBe(published.version);
        const repeated = await game.host({ type: "publishResults" });
        expect(repeated.results).toEqual(published.results);
        expect(repeated.participants[0].balance).toBe(4900);
        expect(repeated.participants[0].squad).toHaveLength(1);
        expect(repeated.auctionHistory).toHaveLength(1);
      } finally {
        clock?.mockRestore();
      }
    },
  );

  it("settles an auction with no bid as unsold before publication", async () => {
    const game = await createGame();
    await game.host({ type: "startAuction", playerId: "player-01" });
    const published = await game.host({ type: "publishResults" });
    expect(published.auction?.state).toBe("unsold");
    expect(published.participants[0].squad).toHaveLength(0);
    expect(published.participants[0].balance).toBe(5000);
    expectCurrentScores(published);
  });

  it("preserves valid published results when reentry fails", async () => {
    const game = await createGame();
    await game.host({ type: "startAuction", playerId: "player-01" });
    const published = await game.host({ type: "publishResults" });
    for (const playerId of ["missing-player", "player-01"]) {
      await expect(game.host({ type: "startAuction", playerId })).rejects.toThrow();
    }
    await expect(game.host({ type: "startQuiz" })).rejects.toThrow("Quiz mode is disabled.");
    const after = await roomStore.getSnapshot(game.roomCode);
    expect(after.phase).toBe("results");
    expect(after.resultsPublished).toBe(true);
    expect(after.results).toEqual(published.results);
    expect(after.version).toBe(published.version);
  });

  it("withdraws final scores on quiz reentry", async () => {
    const game = await createGame(true);
    await game.host({ type: "publishResults" });
    const quiz = await game.host({ type: "startQuiz" });
    expect(quiz).toMatchObject({ phase: "quiz", results: [], resultsPublished: false });
    expect((await game.feed()).feed.results).toBeNull();
  });

  it("withdraws final scores when auto-play reopens the auction", async () => {
    const created = await roomStore.createRoom({
      name: "Result simulation test",
      maxParticipants: 12,
      bidIncrement: 50,
      timerSeconds: 45,
      quizEnabled: false,
    }, true);
    const code = created.snapshot!.code;
    for (const [index, action] of [
      { type: "publishResults" },
      { type: "setSimulation", enabled: true },
      { type: "simulateTick" },
    ].entries()) {
      await roomStore.applyAction(code, {
        ...action,
        actorToken: created.hostToken!,
        idempotencyKey: `simulation-step-${index}`,
      });
    }
    expect(await roomStore.getSnapshot(code)).toMatchObject({
      phase: "auction", results: [], resultsPublished: false,
    });
  });

  it.each(["waiting", "quiz", "auction"] as const)(
    "does not render legacy final rows in %s phase",
    async (phase) => {
      const game = await createGame();
      const published = await game.host({ type: "publishResults" });
      const legacy = { ...published, phase };
      expect(ResultsBoard({ snapshot: legacy }).props.className).toBe("results-waiting");
    },
  );
});
