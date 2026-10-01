import { describe, expect, it } from "vitest";
import {
  calculateSquadReadiness,
  readinessBandFor,
  SQUAD_READINESS_PENALTY_CAP,
  SQUAD_READINESS_WEIGHTS,
} from "@/lib/readiness";
import type { ScoreBreakdown } from "@/lib/types";

function makeBreakdown(
  overrides: Partial<ScoreBreakdown> = {},
): ScoreBreakdown {
  return {
    batting: 0,
    bowling: 0,
    teamBalance: 0,
    form: 0,
    pressure: 0,
    fielding: 0,
    venue: 0,
    budgetEfficiency: 0,
    weightedScore: 0,
    penalties: [],
    ...overrides,
  };
}

describe("squad readiness insights", () => {
  it("uses normalized readiness weights", () => {
    expect(
      Object.values(SQUAD_READINESS_WEIGHTS).reduce(
        (total, weight) => total + weight,
        0,
      ),
    ).toBeCloseTo(1);
  });

  it("weights balance, form, and pressure into an integer index", () => {
    expect(
      calculateSquadReadiness(
        makeBreakdown({ teamBalance: 80, form: 60, pressure: 40 }),
      ),
    ).toEqual({
      score: 64,
      band: "Competitive",
      penaltyDeduction: 0,
    });
  });

  it("caps composition deductions to keep the index comparable", () => {
    const insight = calculateSquadReadiness(
      makeBreakdown({
        teamBalance: 100,
        form: 100,
        pressure: 100,
        penalties: [
          { label: "Incomplete squad", points: 20 },
          { label: "No wicketkeeper", points: 8 },
        ],
      }),
    );

    expect(insight.penaltyDeduction).toBe(SQUAD_READINESS_PENALTY_CAP);
    expect(insight.score).toBe(75);
  });

  it("never returns a negative readiness index", () => {
    expect(
      calculateSquadReadiness(
        makeBreakdown({
          penalties: [{ label: "Composition gap", points: 50 }],
        }),
      ).score,
    ).toBe(0);
  });

  it("marks the match-ready threshold as match ready", () => {
    expect(readinessBandFor(75)).toBe("Match ready");
  });

  it.each([
    [76, "Match ready"],
    [55, "Competitive"],
    [30, "Developing"],
    [29, "Rebuild"],
  ] as const)("maps a score of %i to %s", (score, band) => {
    expect(readinessBandFor(score)).toBe(band);
  });
});
