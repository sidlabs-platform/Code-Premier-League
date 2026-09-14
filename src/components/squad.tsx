import { CircleAlert, UsersRound } from "lucide-react";
import { formatDevCoins } from "@/lib/currency";
import { ROLE_LABELS, PlayerAvatar } from "@/components/player";
import { squadGaps } from "@/lib/rules";
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
  const gaps = squadGaps(
    { config: snapshot.config },
    participant as Participant,
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
      {!compact && gaps.length > 0 && (
        <div className="gap-line">
          <CircleAlert size={16} aria-hidden="true" />
          <span>Still need: {gaps.join(", ")}</span>
        </div>
      )}
    </div>
  );
}
