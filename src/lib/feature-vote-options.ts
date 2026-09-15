export const FEATURE_VOTE_IDS = [
  "bid-war-overlay",
  "squad-strategy-advisor",
  "post-match-awards",
  "mystery-player-reveal",
  "audience-reactions",
] as const;

export type FeatureVoteId = (typeof FEATURE_VOTE_IDS)[number];

export type FeatureVoteOption = {
  id: FeatureVoteId;
  title: string;
  description: string;
  effort: string;
};

export type FeatureVoteSnapshot = {
  features: Array<
    FeatureVoteOption & {
      votes: number;
      percentage: number;
    }
  >;
  totalVotes: number;
  yourFeatureId: FeatureVoteId | null;
  updatedAt: number;
};

export const FEATURE_VOTE_OPTIONS: readonly FeatureVoteOption[] = [
  {
    id: "bid-war-overlay",
    title: "Live Bid-War Overlay",
    description:
      "Animate the latest bids, pulse the leading team, and take over the screen when a player is sold.",
    effort: "2-3 hours",
  },
  {
    id: "squad-strategy-advisor",
    title: "Squad Strategy Advisor",
    description:
      "Flag missing roles, overseas limits, weak areas, and the safe budget per remaining squad slot.",
    effort: "3-4 hours",
  },
  {
    id: "post-match-awards",
    title: "Post-Match Awards Reveal",
    description:
      "Reveal Quiz Champion, Best Bargain, Biggest Signing, and Most Balanced Squad before the podium.",
    effort: "2-3 hours",
  },
  {
    id: "mystery-player-reveal",
    title: "Mystery Player Reveal",
    description:
      "Reveal role and country first, then unveil the player, simulated ratings, and base price.",
    effort: "2-3 hours",
  },
  {
    id: "audience-reactions",
    title: "Audience Reaction Bursts",
    description:
      "Let participants send limited, rate-controlled reactions to the spectator screen during the auction.",
    effort: "3-4 hours",
  },
];

export function isFeatureVoteId(value: string): value is FeatureVoteId {
  return FEATURE_VOTE_IDS.some((featureId) => featureId === value);
}
