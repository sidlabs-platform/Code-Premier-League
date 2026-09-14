import { describe, expect, it } from "vitest";
import { DEFAULT_ROOM_CONFIG, STARTING_BALANCE } from "@/lib/constants";
import { validateBid } from "@/lib/rules";
import { PLAYER_CATALOGUE } from "@/lib/seed";
import type { Participant, RoomState } from "@/lib/types";

function participant(overrides: Partial<Participant> = {}): Participant {
  return {
    id: "participant-1",
    displayName: "Ari",
    teamName: "Merge Mavericks",
    tokenHash: "hash",
    joinedAt: 1,
    lastSeenAt: 1,
    isBot: false,
    connected: true,
    startingBalance: STARTING_BALANCE,
    quizBonus: 0,
    balance: STARTING_BALANCE,
    squad: [],
    ...overrides,
  };
}

function room(overrides: Partial<RoomState> = {}): RoomState {
  return {
    id: "room-1",
    code: "BYTE11",
    name: "Test",
    createdAt: 1,
    updatedAt: 1,
    version: 1,
    seed: 1,
    hostTokenHash: "host",
    phase: "auction",
    registrationOpen: false,
    config: DEFAULT_ROOM_CONFIG,
    participants: {},
    auction: {
      id: "auction-1",
      playerId: "player-01",
      state: "active",
      startedAt: 1,
      endsAt: 100,
      pausedRemainingMs: null,
      highestBid: 100,
      highestBidderId: null,
      soldPrice: null,
      winnerId: null,
    },
    auctionHistory: [],
    bids: [],
    soldPlayerIds: [],
    unsoldPlayerIds: [],
    quiz: {
      questionIds: [],
      currentIndex: 0,
      revealed: false,
      answers: {},
      fastestByQuestion: {},
    },
    results: [],
    resultsPublished: false,
    systemWarning: null,
    simulation: { enabled: false, label: "Simulation" },
    events: [],
    idempotency: {},
    ...overrides,
  };
}

describe("bid validation", () => {
  it("accepts the exact next increment", () => {
    expect(validateBid(room(), participant(), 150)).toEqual({
      ok: true,
      minimumBid: 150,
    });
  });

  it("rejects self-outbids, low bids, and over-budget bids", () => {
    expect(
      validateBid(
        room({
          auction: {
            ...room().auction!,
            highestBidderId: "participant-1",
          },
        }),
        participant(),
        150,
      ),
    ).toMatchObject({ ok: false, reason: "You already hold the highest bid." });

    expect(validateBid(room(), participant(), 125)).toMatchObject({
      ok: false,
      minimumBid: 150,
    });

    expect(
      validateBid(room(), participant({ balance: 120 }), 150),
    ).toMatchObject({ ok: false, reason: "That bid exceeds your available budget." });
  });

  it("enforces squad and overseas caps", () => {
    const fullSquad = participant({
      squad: Array.from({ length: 11 }, (_, index) => ({
        playerId: `player-${String(index + 1).padStart(2, "0")}`,
        price: 100,
        acquiredAt: index,
      })),
    });
    expect(validateBid(room(), fullSquad, 150)).toMatchObject({
      ok: false,
      reason: "Your squad is already full.",
    });

    const overseasIds = PLAYER_CATALOGUE.filter((player) => player.overseas)
      .slice(0, 5)
      .map((player) => player.id);
    const overseasCapped = participant({
      squad: overseasIds.slice(0, 4).map((playerId, index) => ({
        playerId,
        price: 100,
        acquiredAt: index,
      })),
    });
    const overseasRoom = room();
    overseasRoom.auction!.playerId = overseasIds[4];
    expect(validateBid(overseasRoom, overseasCapped, 150)).toMatchObject({
      ok: false,
      reason: "Your squad already has 4 overseas players.",
    });
  });
});
