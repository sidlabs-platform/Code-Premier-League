import { describe, expect, it } from "vitest";
import { PLAYER_CATALOGUE } from "@/lib/seed";

describe("player catalogue", () => {
  it("keeps enough players in every role for four complete squads", () => {
    const roleCounts = PLAYER_CATALOGUE.reduce<Record<string, number>>(
      (counts, player) => {
        counts[player.role] = (counts[player.role] ?? 0) + 1;
        return counts;
      },
      {},
    );

    expect(PLAYER_CATALOGUE).toHaveLength(44);
    expect(roleCounts.BAT).toBeGreaterThanOrEqual(12);
    expect(roleCounts.BOWL).toBeGreaterThanOrEqual(12);
    expect(roleCounts.AR).toBeGreaterThanOrEqual(4);
    expect(roleCounts.WK).toBeGreaterThanOrEqual(4);
  });

  it("keeps the overseas pool within four auto-play squads", () => {
    const overseasCount = PLAYER_CATALOGUE.filter((player) => player.overseas).length;

    expect(overseasCount).toBeLessThanOrEqual(16);
  });
});
