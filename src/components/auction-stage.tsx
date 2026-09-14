"use client";

import { useMemo, useSyncExternalStore } from "react";
import { Clock3, Pause, RadioTower } from "lucide-react";
import { formatDevCoins } from "@/lib/currency";
import { PlayerIdentity, PlayerStatsBoard } from "@/components/player";
import type { RoomSnapshot } from "@/lib/types";

function subscribeClock(onChange: () => void) {
  const interval = window.setInterval(onChange, 100);
  return () => window.clearInterval(interval);
}

function getClientClock() {
  return Date.now();
}

function getServerClock() {
  return 0;
}

export function AuctionStage({
  snapshot,
  serverOffset,
  compact = false,
}: {
  snapshot: RoomSnapshot;
  serverOffset: number;
  compact?: boolean;
}) {
  const now = useSyncExternalStore(
    subscribeClock,
    getClientClock,
    getServerClock,
  );
  const auction = snapshot.auction;
  const player = snapshot.catalogue.find(
    (candidate) => candidate.id === auction?.playerId,
  );
  const winner = snapshot.participants.find(
    (participant) => participant.id === auction?.highestBidderId,
  );

  const remaining = useMemo(() => {
    if (!auction?.endsAt || auction.state !== "active") return null;
    if (now === 0) return null;
    return Math.max(0, auction.endsAt - (now + serverOffset));
  }, [auction?.endsAt, auction?.state, now, serverOffset]);

  if (!auction || !player) {
    return (
      <div className="auction-idle">
        <RadioTower size={34} aria-hidden="true" />
        <h2>Auction desk standing by</h2>
        <p>The host is preparing the next player profile.</p>
      </div>
    );
  }

  const seconds: number | null =
    remaining === null
      ? auction.pausedRemainingMs
        ? auction.pausedRemainingMs / 1000
        : null
      : remaining / 1000;
  const timerTone =
    seconds !== null && seconds <= 4 && auction.state === "active"
      ? "critical"
      : "normal";

  return (
    <section
      className={`auction-stage ${compact ? "auction-stage-compact" : ""}`}
      aria-label={`Auction for ${player.name}`}
    >
      <div className="auction-player">
        <PlayerIdentity player={player} compact={compact} />
        {!compact && <p className="player-bio">{player.bio}</p>}
        {!compact && <PlayerStatsBoard player={player} />}
      </div>
      <div className="auction-readout">
        <div className={`timer timer-${timerTone}`}>
          {auction.state === "paused" ? (
            <Pause size={18} aria-hidden="true" />
          ) : (
            <Clock3 size={18} aria-hidden="true" />
          )}
          <span>{auction.state === "paused" ? "HOLD" : "TIME"}</span>
          <strong>{seconds === null ? "--.-" : seconds.toFixed(1)}</strong>
        </div>
        <div className="bid-readout">
          <span>Highest bid</span>
          <strong>
            {auction.highestBid > 0
              ? formatDevCoins(auction.highestBid)
              : formatDevCoins(player.basePrice)}
          </strong>
          <p>{winner ? winner.teamName : "Opening price"}</p>
        </div>
        <span className={`state-flag state-${auction.state}`}>
          {auction.state.toUpperCase()}
        </span>
      </div>
      <p className="sr-only" aria-live="polite" aria-atomic="true">
        {winner
          ? `${winner.teamName} leads at ${formatDevCoins(auction.highestBid)}`
          : `${player.name} opens at ${formatDevCoins(player.basePrice)}`}
      </p>
    </section>
  );
}
