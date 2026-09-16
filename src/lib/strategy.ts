import { REQUIRED_ROLE_COUNTS } from "@/lib/constants";
import { PLAYER_CATALOGUE } from "@/lib/seed";
import type {
  CataloguePlayer,
  Participant,
  PlayerRole,
  RoomConfig,
} from "@/lib/types";

export const ROLE_PRIORITY: PlayerRole[] = ["WK", "AR", "BOWL", "BAT"];

export type RoleCoverage = Record<
  PlayerRole,
  {
    current: number;
    required: number;
    missing: number;
  }
>;

export type SquadStrategy = {
  roleCoverage: RoleCoverage;
  playersInSquad: number;
  squadSize: number;
  openSlots: number;
  overseasCount: number;
  maxOverseas: number;
  overseasSlots: number;
  remainingBalance: number;
  averageBudgetPerOpenSlot: number | null;
  missingRequirements: string[];
  primaryKind: "overseas" | "role" | "budget" | "full" | "complete";
  primaryNeed: string;
  guidance: string[];
};

type StrategyContext = {
  activePlayer?: CataloguePlayer | null;
  minimumBid?: number;
};

function roleLabel(role: PlayerRole): string {
  return {
    BAT: "batter",
    BOWL: "bowler",
    AR: "all-rounder",
    WK: "wicketkeeper",
  }[role];
}

function roleNeed(role: PlayerRole, count: number): string {
  return `${count} ${roleLabel(role)}${count === 1 ? "" : "s"}`;
}

export function getSquadStrategy(
  participant: Pick<Participant, "squad" | "balance">,
  config: RoomConfig,
  catalogue = PLAYER_CATALOGUE,
  context: StrategyContext = {},
): SquadStrategy {
  const catalogueById = new Map(catalogue.map((player) => [player.id, player]));
  const counts: Record<PlayerRole, number> = {
    BAT: 0,
    BOWL: 0,
    AR: 0,
    WK: 0,
  };
  let overseasCount = 0;

  for (const entry of participant.squad) {
    const player = catalogueById.get(entry.playerId);
    if (!player) continue;
    counts[player.role] += 1;
    if (player.overseas) overseasCount += 1;
  }

  const roleCoverage = ROLE_PRIORITY.reduce<RoleCoverage>((coverage, role) => {
    const required = REQUIRED_ROLE_COUNTS[role];
    const current = counts[role];
    coverage[role] = {
      current,
      required,
      missing: Math.max(0, required - current),
    };
    return coverage;
  }, {} as RoleCoverage);
  const playersInSquad = participant.squad.length;
  const openSlots = Math.max(0, config.squadSize - playersInSquad);
  const overseasSlots = Math.max(0, config.maxOverseas - overseasCount);
  const remainingBalance = Math.max(0, participant.balance);
  const averageBudgetPerOpenSlot =
    openSlots > 0 ? Math.floor(remainingBalance / openSlots) : null;

  let availableRequirementSlots = openSlots;
  const missingRequirements = ROLE_PRIORITY.flatMap((role) => {
    const needed = Math.min(
      roleCoverage[role].missing,
      availableRequirementSlots,
    );
    availableRequirementSlots -= needed;
    return needed > 0 ? [roleNeed(role, needed)] : [];
  });
  if (availableRequirementSlots > 0) {
    missingRequirements.push(
      `${availableRequirementSlots} open squad slot${
        availableRequirementSlots === 1 ? "" : "s"
      }`,
    );
  }

  const roleMinimumsExceedSlots =
    ROLE_PRIORITY.reduce(
      (total, role) => total + roleCoverage[role].missing,
      0,
    ) > openSlots;
  const guidance = [
    `${playersInSquad}/${config.squadSize} squad slots filled`,
    `${overseasCount}/${config.maxOverseas} overseas players`,
    averageBudgetPerOpenSlot === null
      ? "No open slots remain for budget runway"
      : `${averageBudgetPerOpenSlot} DevLakh average runway per open slot`,
  ];
  if (roleMinimumsExceedSlots && openSlots > 0) {
    guidance.push("Role minimums exceed the available squad slots");
  }
  if (context.activePlayer?.overseas && overseasCount >= config.maxOverseas) {
    guidance.push("The active player would exceed the overseas limit");
  }
  if (
    context.minimumBid !== undefined &&
    context.minimumBid > remainingBalance &&
    openSlots > 0
  ) {
    guidance.push("The next bid is above the remaining balance");
  }

  let primaryKind: SquadStrategy["primaryKind"];
  let primaryNeed: string;
  if (openSlots === 0) {
    primaryKind = roleMinimumsExceedSlots ? "full" : "complete";
    primaryNeed = roleMinimumsExceedSlots
      ? "Squad size reached — no open slots."
      : "Squad requirements complete.";
  } else if (context.activePlayer?.overseas && overseasCount >= config.maxOverseas) {
    primaryKind = "overseas";
    primaryNeed = "Overseas limit reached — target a domestic player.";
  } else {
    const nextRole = ROLE_PRIORITY.find(
      (role) => roleCoverage[role].missing > 0,
    );
    if (nextRole) {
      primaryKind = "role";
      primaryNeed = `Need ${roleNeed(nextRole, 1)}.`;
    } else if (
      context.minimumBid !== undefined &&
      context.minimumBid > remainingBalance
    ) {
      primaryKind = "budget";
      primaryNeed = "Budget is below the next bid — protect your runway.";
    } else if (remainingBalance === 0) {
      primaryKind = "budget";
      primaryNeed = "Budget exhausted — no balance remains.";
    } else {
      primaryKind = "complete";
      primaryNeed = "Squad requirements complete — add depth.";
    }
  }

  return {
    roleCoverage,
    playersInSquad,
    squadSize: config.squadSize,
    openSlots,
    overseasCount,
    maxOverseas: config.maxOverseas,
    overseasSlots,
    remainingBalance,
    averageBudgetPerOpenSlot,
    missingRequirements,
    primaryKind,
    primaryNeed,
    guidance,
  };
}
