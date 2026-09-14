import { describe, expect, it } from "vitest";
import { DEFAULT_ROOM_CONFIG, STARTING_BALANCE } from "@/lib/constants";
import { PLAYER_CATALOGUE } from "@/lib/seed";
import { rankParticipants, scoreParticipant, SCORE_WEIGHTS } from "@/lib/scoring";
import type { Participant } from "@/lib/types";

function makeParticipant(
  id: string,
  teamName: string,
  playerIds: string[],
  prices = playerIds.map(() => 250),
): Participant {
  const spend = prices.reduce((total, price) => total + price, 0);
  return {
    id,
    displayName: id,
    teamName,
    tokenHash: "hash",
    joinedAt: 1,
    lastSeenAt: 1,
    isBot: false,
    connected: true,
    startingBalance: STARTING_BALANCE,
    quizBonus: 0,
    balance: STARTING_BALANCE - spend,
    squad: playerIds.map((playerId, index) => ({
      playerId,
      price: prices[index],
      acquiredAt: index,
    })),
  };
}

describe("deterministic scoring", () => {
  it("uses weights that total 100 percent", () => {
    expect(
      Object.values(SCORE_WEIGHTS).reduce((total, weight) => total + weight, 0),
    ).toBeCloseTo(1);
  });

  it("applies explicit incomplete composition penalties", () => {
    const result = scoreParticipant(
      makeParticipant("one", "One", ["player-01"]),
      DEFAULT_ROOM_CONFIG,
    );
    expect(result.score).toBeGreaterThanOrEqual(0);
    expect(result.score).toBeLessThanOrEqual(100);
    expect(result.breakdown.penalties.some((penalty) =>
      penalty.label.startsWith("Incomplete squad"),
    )).toBe(true);
    expect(result.breakdown.penalties.some((penalty) =>
      penalty.label === "No wicketkeeper",
    )).toBe(true);
  });

  it("produces bit-identical ranks and deterministic tie ordering", () => {
    const playerIds = PLAYER_CATALOGUE.slice(0, 11).map((player) => player.id);
    const beta = makeParticipant("b", "Beta Builders", playerIds);
    const alpha = makeParticipant("a", "Alpha Architects", playerIds);
    const first = rankParticipants([beta, alpha], DEFAULT_ROOM_CONFIG);
    const second = rankParticipants([beta, alpha], DEFAULT_ROOM_CONFIG);

    expect(first).toEqual(second);
    expect(first.map((result) => result.teamName)).toEqual([
      "Alpha Architects",
      "Beta Builders",
    ]);
  });
});
