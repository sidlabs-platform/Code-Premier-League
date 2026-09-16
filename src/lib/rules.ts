import { PLAYER_CATALOGUE } from "@/lib/seed";
import { getSquadStrategy } from "@/lib/strategy";
import type { Participant, RoomState } from "@/lib/types";

export type BidDecision =
  | { ok: true; minimumBid: number }
  | { ok: false; reason: string; minimumBid: number };

export function minimumBid(room: RoomState): number {
  if (!room.auction) {
    return 0;
  }

  const player = PLAYER_CATALOGUE.find(
    (candidate) => candidate.id === room.auction?.playerId,
  );
  if (!player) {
    return 0;
  }

  return room.auction.highestBid === 0
    ? player.basePrice
    : room.auction.highestBid + room.config.bidIncrement;
}

export function validateBid(
  room: RoomState,
  participant: Participant | undefined,
  amount: number,
): BidDecision {
  const required = minimumBid(room);

  if (!participant) {
    return { ok: false, reason: "Participant session was not found.", minimumBid: required };
  }
  if (!room.auction || room.auction.state !== "active") {
    return { ok: false, reason: "Bidding is not open for a player.", minimumBid: required };
  }
  if (!Number.isInteger(amount)) {
    return { ok: false, reason: "Bid amount must be a whole DevLakh.", minimumBid: required };
  }
  if (room.auction.highestBidderId === participant.id) {
    return { ok: false, reason: "You already hold the highest bid.", minimumBid: required };
  }
  if (amount < required) {
    return {
      ok: false,
      reason: `The next valid bid is ${required} DevLakh.`,
      minimumBid: required,
    };
  }
  if (amount > participant.balance) {
    return { ok: false, reason: "That bid exceeds your available budget.", minimumBid: required };
  }
  const player = PLAYER_CATALOGUE.find(
    (candidate) => candidate.id === room.auction?.playerId,
  );
  if (!player) {
    return { ok: false, reason: "The active player is unavailable.", minimumBid: required };
  }

  const strategy = getSquadStrategy(participant, room.config, PLAYER_CATALOGUE, {
    activePlayer: player,
    minimumBid: required,
  });
  if (strategy.openSlots === 0) {
    return { ok: false, reason: "Your squad is already full.", minimumBid: required };
  }

  if (player.overseas && strategy.overseasCount >= room.config.maxOverseas) {
    return {
      ok: false,
      reason: `Your squad already has ${room.config.maxOverseas} overseas players.`,
      minimumBid: required,
    };
  }

  return { ok: true, minimumBid: required };
}

export function squadGaps(room: Pick<RoomState, "config">, participant: Participant): string[] {
  return getSquadStrategy(participant, room.config).missingRequirements;
}
