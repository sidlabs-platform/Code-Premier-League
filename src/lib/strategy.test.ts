import { describe, expect, it } from "vitest";
import { DEFAULT_ROOM_CONFIG, STARTING_BALANCE } from "@/lib/constants";
import { PLAYER_CATALOGUE } from "@/lib/seed";
import { getSquadStrategy } from "@/lib/strategy";
import type { Participant, RoomConfig } from "@/lib/types";

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

function squad(...playerIds: string[]) {
  return playerIds.map((playerId, index) => ({
    playerId,
    price: 100,
    acquiredAt: index,
  }));
}

describe("squad strategy advisor", () => {
  it("prioritizes the most important role need and calculates runway", () => {
    const strategy = getSquadStrategy(participant(), DEFAULT_ROOM_CONFIG);

    expect(strategy.primaryNeed).toBe("Need 1 wicketkeeper.");
    expect(strategy.roleCoverage.WK).toMatchObject({
      current: 0,
      required: 1,
      missing: 1,
    });
    expect(strategy.openSlots).toBe(11);
    expect(strategy.averageBudgetPerOpenSlot).toBe(454);
    expect(strategy.missingRequirements).toEqual([
      "1 wicketkeeper",
      "1 all-rounder",
      "3 bowlers",
      "3 batters",
      "3 open squad slots",
    ]);
  });

  it("recognizes a complete squad and caps the overseas count", () => {
    const strategy = getSquadStrategy(
      participant({
        squad: squad(...PLAYER_CATALOGUE.slice(0, 11).map((player) => player.id)),
        balance: 0,
      }),
      DEFAULT_ROOM_CONFIG,
    );

    expect(strategy.openSlots).toBe(0);
    expect(strategy.primaryNeed).toBe("Squad requirements complete.");
    expect(strategy.overseasCount).toBe(0);
    expect(strategy.averageBudgetPerOpenSlot).toBeNull();
    expect(strategy.missingRequirements).toEqual([]);
  });

  it("warns when an active overseas player is blocked by the rule", () => {
    const overseas = PLAYER_CATALOGUE.find((player) => player.overseas)!;
    const strategy = getSquadStrategy(
      participant({
        squad: squad(
          ...PLAYER_CATALOGUE.filter((player) => player.overseas)
            .slice(0, 4)
            .map((player) => player.id),
        ),
      }),
      DEFAULT_ROOM_CONFIG,
      PLAYER_CATALOGUE,
      { activePlayer: overseas, minimumBid: overseas.basePrice },
    );

    expect(strategy.overseasCount).toBe(4);
    expect(strategy.overseasSlots).toBe(0);
    expect(strategy.primaryNeed).toBe(
      "Overseas limit reached — target a domestic player.",
    );
  });

  it("handles unknown catalogue entries and an unaffordable next bid", () => {
    const strategy = getSquadStrategy(
      participant({
        squad: squad("missing-player"),
        balance: 20,
      }),
      DEFAULT_ROOM_CONFIG,
      PLAYER_CATALOGUE,
      {
        activePlayer: PLAYER_CATALOGUE[0],
        minimumBid: 100,
      },
    );

    expect(strategy.playersInSquad).toBe(1);
    expect(strategy.roleCoverage.BAT.current).toBe(0);
    expect(strategy.overseasCount).toBe(0);
    expect(strategy.primaryNeed).toBe("Need 1 wicketkeeper.");
    expect(strategy.guidance).toContain("The next bid is above the remaining balance");
  });

  it("handles constrained squad sizes and exhausted budgets", () => {
    const config: RoomConfig = { ...DEFAULT_ROOM_CONFIG, squadSize: 2 };
    const strategy = getSquadStrategy(
      participant({ balance: 0 }),
      config,
    );

    expect(strategy.openSlots).toBe(2);
    expect(strategy.missingRequirements).toEqual([
      "1 wicketkeeper",
      "1 all-rounder",
    ]);
    expect(strategy.guidance).toContain(
      "Role minimums exceed the available squad slots",
    );
  });
});
