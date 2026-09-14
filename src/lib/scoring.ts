import { REQUIRED_ROLE_COUNTS } from "@/lib/constants";
import { PLAYER_CATALOGUE } from "@/lib/seed";
import type {
  CataloguePlayer,
  Participant,
  PlayerRole,
  RoomConfig,
  ScoreBreakdown,
  ScoringResult,
} from "@/lib/types";

const WEIGHTS = {
  batting: 0.22,
  bowling: 0.22,
  teamBalance: 0.16,
  form: 0.1,
  pressure: 0.1,
  fielding: 0.08,
  venue: 0.07,
  budgetEfficiency: 0.05,
} as const;

function average(values: number[]): number {
  return values.length === 0
    ? 0
    : values.reduce((total, value) => total + value, 0) / values.length;
}

function rounded(value: number): number {
  return Math.round(value * 10) / 10;
}

function roleCounts(players: CataloguePlayer[]): Record<PlayerRole, number> {
  return players.reduce<Record<PlayerRole, number>>(
    (counts, player) => {
      counts[player.role] += 1;
      return counts;
    },
    { BAT: 0, BOWL: 0, AR: 0, WK: 0 },
  );
}

function teamBalanceScore(players: CataloguePlayer[]): number {
  const counts = roleCounts(players);
  const coverage =
    Object.entries(REQUIRED_ROLE_COUNTS).reduce((score, [role, required]) => {
      return score + Math.min(counts[role as PlayerRole] / required, 1);
    }, 0) / Object.keys(REQUIRED_ROLE_COUNTS).length;
  const spread = Math.min(new Set(players.map((player) => player.role)).size / 4, 1);
  return rounded((coverage * 0.75 + spread * 0.25) * 100);
}

export function scoreParticipant(
  participant: Participant,
  config: RoomConfig,
  catalogue = PLAYER_CATALOGUE,
): Omit<ScoringResult, "rank"> {
  const catalogueById = new Map(catalogue.map((player) => [player.id, player]));
  const players = participant.squad
    .map((entry) => catalogueById.get(entry.playerId))
    .filter((player): player is CataloguePlayer => Boolean(player));
  const counts = roleCounts(players);
  const overseas = players.filter((player) => player.overseas).length;
  const spend = participant.squad.reduce((total, entry) => total + entry.price, 0);
  const available = participant.startingBalance + participant.quizBonus;

  const breakdown: ScoreBreakdown = {
    batting: rounded(average(players.map((player) => player.stats.batting))),
    bowling: rounded(average(players.map((player) => player.stats.bowling))),
    teamBalance: teamBalanceScore(players),
    form: rounded(average(players.map((player) => player.stats.form))),
    pressure: rounded(average(players.map((player) => player.stats.pressure))),
    fielding: rounded(average(players.map((player) => player.stats.fielding))),
    venue: rounded(average(players.map((player) => player.stats.venue))),
    budgetEfficiency: rounded(available === 0 ? 0 : ((available - spend) / available) * 100),
    weightedScore: 0,
    penalties: [],
  };

  for (const [role, required] of Object.entries(REQUIRED_ROLE_COUNTS)) {
    const missing = Math.max(0, required - counts[role as PlayerRole]);
    if (missing > 0) {
      breakdown.penalties.push({
        label: `Missing ${missing} ${role} slot${missing === 1 ? "" : "s"}`,
        points: missing * 4,
      });
    }
  }

  if (counts.WK === 0) {
    breakdown.penalties.push({ label: "No wicketkeeper", points: 8 });
  }

  if (overseas > config.maxOverseas) {
    breakdown.penalties.push({
      label: "Overseas limit exceeded",
      points: (overseas - config.maxOverseas) * 10,
    });
  }

  if (players.length < config.squadSize) {
    breakdown.penalties.push({
      label: `Incomplete squad (${players.length}/${config.squadSize})`,
      points: (config.squadSize - players.length) * 2.5,
    });
  }

  const weightedScore =
    breakdown.batting * WEIGHTS.batting +
    breakdown.bowling * WEIGHTS.bowling +
    breakdown.teamBalance * WEIGHTS.teamBalance +
    breakdown.form * WEIGHTS.form +
    breakdown.pressure * WEIGHTS.pressure +
    breakdown.fielding * WEIGHTS.fielding +
    breakdown.venue * WEIGHTS.venue +
    breakdown.budgetEfficiency * WEIGHTS.budgetEfficiency;
  const penaltyTotal = breakdown.penalties.reduce(
    (total, penalty) => total + penalty.points,
    0,
  );

  breakdown.weightedScore = rounded(weightedScore);
  const score = rounded(Math.max(0, Math.min(100, weightedScore - penaltyTotal)));

  const metricStrengths = [
    ["Batting depth", breakdown.batting],
    ["Bowling threat", breakdown.bowling],
    ["Team balance", breakdown.teamBalance],
    ["Current form", breakdown.form],
    ["Pressure game", breakdown.pressure],
    ["Fielding energy", breakdown.fielding],
    ["Venue range", breakdown.venue],
    ["Budget efficiency", breakdown.budgetEfficiency],
  ] as const;

  const strengths = [...metricStrengths]
    .sort((left, right) => right[1] - left[1])
    .slice(0, 2)
    .map(([label]) => label);

  return {
    participantId: participant.id,
    teamName: participant.teamName,
    displayName: participant.displayName,
    score,
    strengths,
    gaps: breakdown.penalties.map((penalty) => penalty.label),
    breakdown,
  };
}

export function rankParticipants(
  participants: Participant[],
  config: RoomConfig,
  catalogue = PLAYER_CATALOGUE,
): ScoringResult[] {
  return participants
    .map((participant) => scoreParticipant(participant, config, catalogue))
    .sort((left, right) => {
      return (
        right.score - left.score ||
        right.breakdown.budgetEfficiency - left.breakdown.budgetEfficiency ||
        left.teamName.localeCompare(right.teamName) ||
        left.participantId.localeCompare(right.participantId)
      );
    })
    .map((result, index) => ({ ...result, rank: index + 1 }));
}

export const SCORE_WEIGHTS = WEIGHTS;
