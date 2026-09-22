import { describe, expect, it } from "vitest";
import { projectPublicRoomFeed } from "@/lib/public-feed";
import type { RoomSnapshot } from "@/lib/types";

const LEADER_ID = "participant-leader-secret";
const OTHER_ID = "participant-other-secret";

function createSnapshot(
  overrides: Partial<RoomSnapshot> = {},
): RoomSnapshot {
  return {
    id: "room-internal-id",
    code: "CPL123",
    name: "Premier Demo",
    createdAt: 1_700_000_000_000,
    updatedAt: 1_700_000_010_000,
    version: 17,
    seed: 987654,
    phase: "auction",
    registrationOpen: false,
    config: {
      maxParticipants: 12,
      bidIncrement: 50,
      timerSeconds: 20,
      quizEnabled: true,
      squadSize: 11,
      maxOverseas: 4,
    },
    participants: [
      {
        id: LEADER_ID,
        displayName: "Zara",
        teamName: "Zulu XI",
        joinedAt: 2,
        lastSeenAt: 3,
        isBot: false,
        connected: true,
        startingBalance: 5_000,
        quizBonus: 100,
        balance: 4_700,
        squad: [{ playerId: "player-02", price: 300, acquiredAt: 4 }],
      },
      {
        id: OTHER_ID,
        displayName: "Ada",
        teamName: "Alpha XI",
        joinedAt: 1,
        lastSeenAt: 3,
        isBot: false,
        connected: true,
        startingBalance: 5_000,
        quizBonus: 0,
        balance: 5_000,
        squad: [],
      },
    ],
    auction: {
      id: "auction-internal-id",
      playerId: "player-01",
      state: "active",
      startedAt: 1_700_000_009_000,
      endsAt: 1_700_000_029_000,
      pausedRemainingMs: null,
      highestBid: 350,
      highestBidderId: LEADER_ID,
      soldPrice: null,
      winnerId: null,
    },
    auctionHistory: [],
    bids: [
      {
        id: "bid-internal-id",
        auctionId: "auction-internal-id",
        participantId: LEADER_ID,
        amount: 350,
        sequence: 2,
        createdAt: 1_700_000_010_000,
        idempotencyKey: "bid-idempotency-secret",
      },
    ],
    soldPlayerIds: ["player-02"],
    unsoldPlayerIds: [],
    quiz: {
      currentIndex: 0,
      totalQuestions: 5,
      currentQuestion: {
        id: "quiz-01",
        prompt: "Private quiz prompt",
        options: ["A", "B", "C", "D"],
        answeredParticipantIds: [LEADER_ID],
        revealed: true,
        correctIndex: 2,
        explanation: "Private quiz answer",
      },
    },
    results: [
      {
        participantId: LEADER_ID,
        teamName: "Zulu XI",
        displayName: "Zara",
        score: 82.4,
        rank: 2,
        strengths: ["Bowling threat"],
        gaps: [],
        breakdown: {
          batting: 80,
          bowling: 90,
          teamBalance: 75,
          form: 82,
          pressure: 84,
          fielding: 79,
          venue: 77,
          budgetEfficiency: 91,
          weightedScore: 82.4,
          penalties: [],
        },
      },
      {
        participantId: OTHER_ID,
        teamName: "Alpha XI",
        displayName: "Ada",
        score: 87.6,
        rank: 1,
        strengths: ["Team balance"],
        gaps: [],
        breakdown: {
          batting: 88,
          bowling: 84,
          teamBalance: 92,
          form: 86,
          pressure: 85,
          fielding: 90,
          venue: 82,
          budgetEfficiency: 89,
          weightedScore: 87.6,
          penalties: [],
        },
      },
    ],
    resultsPublished: false,
    systemWarning: "Private system warning",
    simulation: { enabled: false, label: "Simulation" },
    events: [
      {
        id: "event-internal-id-1",
        type: "auction",
        message: "Player entered the auction.",
        createdAt: 1_700_000_009_000,
      },
      {
        id: "event-internal-id-2",
        type: "bid",
        message: "Zulu XI bid 350 DevLakh.",
        createdAt: 1_700_000_010_000,
      },
    ],
    catalogue: [
      {
        id: "player-01",
        name: "Demo Batter",
        callSign: "DB",
        role: "BAT",
        overseas: false,
        origin: "India",
        basePrice: 100,
        bio: "Private catalogue biography",
        accent: "#000000",
        stats: {
          batting: 90,
          bowling: 20,
          form: 80,
          pressure: 82,
          fielding: 78,
          venue: 79,
        },
      },
    ],
    serverTime: 1_700_000_010_500,
    ...overrides,
  };
}

function collectKeys(value: unknown): string[] {
  if (Array.isArray(value)) {
    return value.flatMap(collectKeys);
  }
  if (value === null || typeof value !== "object") {
    return [];
  }
  return Object.entries(value).flatMap(([key, nested]) => [
    key,
    ...collectKeys(nested),
  ]);
}

describe("public room feed projection", () => {
  it("projects active auction and teams without leaking internal state", () => {
    const snapshotWithSecrets = {
      ...createSnapshot(),
      hostTokenHash: "host-token-secret",
      idempotency: { "action-secret": { response: "private" } },
      participants: createSnapshot().participants.map((participant) => ({
        ...participant,
        tokenHash: `token-${participant.id}`,
      })),
    };

    const feed = projectPublicRoomFeed(snapshotWithSecrets);

    expect(feed).toMatchObject({
      code: "CPL123",
      name: "Premier Demo",
      phase: "auction",
      version: 17,
      serverTime: 1_700_000_010_500,
      currentAuction: {
        player: {
          id: "player-01",
          name: "Demo Batter",
          callSign: "DB",
          role: "BAT",
          overseas: false,
          basePrice: 100,
        },
        state: "active",
        endsAt: 1_700_000_029_000,
        pausedRemainingMs: null,
        highestBid: 350,
        leadingTeam: {
          displayName: "Zara",
          teamName: "Zulu XI",
        },
      },
      teams: [
        {
          displayName: "Ada",
          teamName: "Alpha XI",
          squadSize: 0,
          balance: 5_000,
        },
        {
          displayName: "Zara",
          teamName: "Zulu XI",
          squadSize: 1,
          balance: 4_700,
        },
      ],
      latestEvent: {
        type: "bid",
        message: "Zulu XI bid 350 DevLakh.",
        createdAt: 1_700_000_010_000,
      },
      results: null,
    });

    const serialized = JSON.stringify(feed);
    for (const secret of [
      LEADER_ID,
      OTHER_ID,
      "host-token-secret",
      "bid-idempotency-secret",
      "Private quiz answer",
      "Private catalogue biography",
      "Private system warning",
    ]) {
      expect(serialized).not.toContain(secret);
    }

    const forbiddenKeys = new Set([
      "auctionId",
      "answers",
      "bids",
      "bio",
      "breakdown",
      "hostTokenHash",
      "idempotency",
      "participantId",
      "seed",
      "stats",
      "tokenHash",
    ]);
    expect(collectKeys(feed).filter((key) => forbiddenKeys.has(key))).toEqual([]);
  });

  it("keeps unpublished results hidden and publishes only compact ranked rows", () => {
    expect(projectPublicRoomFeed(createSnapshot()).results).toBeNull();

    const feed = projectPublicRoomFeed(
      createSnapshot({ phase: "results", resultsPublished: true }),
    );

    expect(feed.results).toEqual([
      {
        rank: 1,
        displayName: "Ada",
        teamName: "Alpha XI",
        score: 87.6,
      },
      {
        rank: 2,
        displayName: "Zara",
        teamName: "Zulu XI",
        score: 82.4,
      },
    ]);
  });

  it.each(["waiting", "quiz", "auction"] as const)(
    "withholds legacy published rows during the %s phase",
    (phase) => {
      expect(
        projectPublicRoomFeed(
          createSnapshot({ phase, resultsPublished: true }),
        ).results,
      ).toBeNull();
    },
  );

  it("uses null for auctions without a public player or resolvable leader", () => {
    const noBid = projectPublicRoomFeed(
      createSnapshot({
        auction: {
          ...createSnapshot().auction!,
          highestBid: 0,
          highestBidderId: null,
        },
      }),
    );
    expect(noBid.currentAuction?.leadingTeam).toBeNull();

    const missingLeader = projectPublicRoomFeed(
      createSnapshot({
        auction: {
          ...createSnapshot().auction!,
          highestBidderId: "missing-participant",
        },
      }),
    );
    expect(missingLeader.currentAuction?.leadingTeam).toBeNull();

    const missingPlayer = projectPublicRoomFeed(
      createSnapshot({
        auction: {
          ...createSnapshot().auction!,
          playerId: "missing-player",
        },
      }),
    );
    expect(missingPlayer.currentAuction).toBeNull();
  });
});
