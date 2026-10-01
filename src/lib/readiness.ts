import type { ScoreBreakdown } from "@/lib/types";

const READINESS_WEIGHTS = {
  teamBalance: 0.45,
  form: 0.3,
  pressure: 0.25,
} as const;

const MAX_PENALTY_DEDUCTION = 25;

export type ReadinessBand =
  | "Match ready"
  | "Competitive"
  | "Developing"
  | "Rebuild";

export type ReadinessInsight = {
  score: number;
  band: ReadinessBand;
  penaltyDeduction: number;
};

/**
 * Readiness bands: Match ready >= 75, Competitive >= 55,
 * Developing >= 30, and Rebuild below 30.
 */
export function readinessBandFor(score: number): ReadinessBand {
  if (score >= 75) {
    return "Match ready";
  }
  if (score >= 55) {
    return "Competitive";
  }
  if (score >= 30) {
    return "Developing";
  }
  return "Rebuild";
}

export function calculateSquadReadiness(
  breakdown: ScoreBreakdown,
): ReadinessInsight {
  const baseScore =
    breakdown.teamBalance * READINESS_WEIGHTS.teamBalance +
    breakdown.form * READINESS_WEIGHTS.form +
    breakdown.pressure * READINESS_WEIGHTS.pressure;
  const penaltyDeduction = Math.min(
    breakdown.penalties.reduce(
      (total, penalty) => total + penalty.points,
      0,
    ),
    MAX_PENALTY_DEDUCTION,
  );
  const score = Math.round(
    Math.max(0, Math.min(100, baseScore - penaltyDeduction)),
  );

  return {
    score,
    band: readinessBandFor(score),
    penaltyDeduction,
  };
}

export const SQUAD_READINESS_WEIGHTS = READINESS_WEIGHTS;
export const SQUAD_READINESS_PENALTY_CAP = MAX_PENALTY_DEDUCTION;
