import type {
  ActivityEvent,
  AuctionState,
  PlayerRole,
  RoomPhase,
  RoomSnapshot,
} from "@/lib/types";

export type PublicFeedPlayer = {
  id: string;
  name: string;
  callSign: string;
  role: PlayerRole;
  overseas: boolean;
  basePrice: number;
};

export type PublicFeedTeam = {
  displayName: string;
  teamName: string;
  squadSize: number;
  balance: number;
};

export type PublicFeedAuction = {
  player: PublicFeedPlayer;
  state: AuctionState;
  endsAt: number | null;
  pausedRemainingMs: number | null;
  highestBid: number;
  leadingTeam: Pick<PublicFeedTeam, "displayName" | "teamName"> | null;
};

export type PublicFeedEvent = Pick<
  ActivityEvent,
  "type" | "message" | "createdAt"
>;

export type PublicFeedResult = {
  rank: number;
  displayName: string;
  teamName: string;
  score: number;
};

export type PublicRoomFeed = {
  code: string;
  name: string;
  phase: RoomPhase;
  version: number;
  serverTime: number;
  currentAuction: PublicFeedAuction | null;
  teams: PublicFeedTeam[];
  latestEvent: PublicFeedEvent | null;
  results: PublicFeedResult[] | null;
};

export type PublicRoomFeedResponse =
  | { ok: true; feed: PublicRoomFeed }
  | { ok: false; error: string };

const textCollator = new Intl.Collator("en", {
  sensitivity: "base",
  usage: "sort",
});

function compareText(left: string, right: string): number {
  return (
    textCollator.compare(left, right) ||
    (left < right ? -1 : left > right ? 1 : 0)
  );
}

export function projectPublicRoomFeed(snapshot: RoomSnapshot): PublicRoomFeed {
  const teams = snapshot.participants
    .map(({ displayName, teamName, squad, balance }) => ({
      displayName,
      teamName,
      squadSize: squad.length,
      balance,
    }))
    .sort(
      (left, right) =>
        compareText(left.teamName, right.teamName) ||
        compareText(left.displayName, right.displayName),
    );

  const auctionPlayer = snapshot.auction
    ? snapshot.catalogue.find(
        (player) => player.id === snapshot.auction?.playerId,
      )
    : undefined;
  const leadingParticipant = snapshot.auction?.highestBidderId
    ? snapshot.participants.find(
        (participant) => participant.id === snapshot.auction?.highestBidderId,
      )
    : undefined;

  const currentAuction =
    snapshot.auction && auctionPlayer
      ? {
          player: {
            id: auctionPlayer.id,
            name: auctionPlayer.name,
            callSign: auctionPlayer.callSign,
            role: auctionPlayer.role,
            overseas: auctionPlayer.overseas,
            basePrice: auctionPlayer.basePrice,
          },
          state: snapshot.auction.state,
          endsAt: snapshot.auction.endsAt,
          pausedRemainingMs: snapshot.auction.pausedRemainingMs,
          highestBid: snapshot.auction.highestBid,
          leadingTeam: leadingParticipant
            ? {
                displayName: leadingParticipant.displayName,
                teamName: leadingParticipant.teamName,
              }
            : null,
        }
      : null;

  const latestEvent = snapshot.events.at(-1);

  return {
    code: snapshot.code,
    name: snapshot.name,
    phase: snapshot.phase,
    version: snapshot.version,
    serverTime: snapshot.serverTime,
    currentAuction,
    teams,
    latestEvent: latestEvent
      ? {
          type: latestEvent.type,
          message: latestEvent.message,
          createdAt: latestEvent.createdAt,
        }
      : null,
    results: snapshot.phase === "results" && snapshot.resultsPublished
      ? [...snapshot.results]
          .sort(
            (left, right) =>
              left.rank - right.rank ||
              compareText(left.teamName, right.teamName) ||
              compareText(left.displayName, right.displayName),
          )
          .map(({ rank, displayName, teamName, score }) => ({
            rank,
            displayName,
            teamName,
            score,
          }))
      : null,
  };
}
