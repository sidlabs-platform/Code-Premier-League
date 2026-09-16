import { CircleAlert, Compass, UsersRound } from "lucide-react";
import { formatDevCoins } from "@/lib/currency";
import { ROLE_LABELS, PlayerAvatar } from "@/components/player";
import { getSquadStrategy, ROLE_PRIORITY } from "@/lib/strategy";
import type { Participant, RoomSnapshot } from "@/lib/types";

export function SquadBoard({
  snapshot,
  participant,
  compact = false,
}: {
  snapshot: RoomSnapshot;
  participant: Omit<Participant, "tokenHash">;
  compact?: boolean;
}) {
  const activePlayer =
    snapshot.auction && ["active", "paused"].includes(snapshot.auction.state)
      ? snapshot.catalogue.find(
          (candidate) => candidate.id === snapshot.auction?.playerId,
        )
      : null;
  const minimumBid = activePlayer
    ? snapshot.auction?.highestBid
      ? snapshot.auction.highestBid + snapshot.config.bidIncrement
      : activePlayer.basePrice
    : undefined;
  const strategy = getSquadStrategy(
    participant,
    snapshot.config,
    snapshot.catalogue,
    { activePlayer, minimumBid },
  );

  return (
    <div className={`squad-board ${compact ? "squad-board-compact" : ""}`}>
      <div className="squad-summary">
        <span>
          <UsersRound size={16} aria-hidden="true" />
          {participant.squad.length}/{snapshot.config.squadSize} players
        </span>
        <strong>{formatDevCoins(participant.balance)} left</strong>
      </div>
      <div
        className={`strategy-advisor strategy-advisor-${strategy.primaryKind}`}
        data-testid="squad-strategy-advisor"
      >
        <div className="strategy-primary">
          <Compass size={18} aria-hidden="true" />
          <span>
            <small>Next best move</small>
            <strong>{strategy.primaryNeed}</strong>
          </span>
        </div>
        <div className="strategy-coverage">
          {ROLE_PRIORITY.map((role) => (
            <span key={role}>
              <small>{ROLE_LABELS[role]}</small>
              <strong>
                {strategy.roleCoverage[role].current}/
                {strategy.roleCoverage[role].required}
              </strong>
            </span>
          ))}
        </div>
        <div className="strategy-runway">
          <span>
            Overseas{" "}
            <strong>
              {strategy.overseasCount}/{strategy.maxOverseas}
            </strong>
          </span>
          <span>
            Avg/slot{" "}
            <strong>
              {strategy.averageBudgetPerOpenSlot === null
                ? "—"
                : formatDevCoins(strategy.averageBudgetPerOpenSlot, true)}
            </strong>
          </span>
        </div>
      </div>
      {participant.squad.length === 0 ? (
        <p className="squad-empty">No signings yet. Your first winning bid appears here.</p>
      ) : (
        <div className="squad-list">
          {participant.squad.map((entry) => {
            const player = snapshot.catalogue.find(
              (candidate) => candidate.id === entry.playerId,
            );
            if (!player) return null;
            return (
              <div key={entry.playerId} className="squad-player">
                <PlayerAvatar player={player} size="small" />
                <span>
                  <strong>{player.name}</strong>
                  <small>{ROLE_LABELS[player.role]}</small>
                </span>
                <b>{formatDevCoins(entry.price, true)}</b>
              </div>
            );
          })}
        </div>
      )}
      {strategy.missingRequirements.length > 0 && (
        <div className="gap-line">
          <CircleAlert size={16} aria-hidden="true" />
          <span>Still need: {strategy.missingRequirements.join(", ")}</span>
        </div>
      )}
    </div>
  );
}
