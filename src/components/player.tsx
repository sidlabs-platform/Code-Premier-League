import { Globe2, MapPin } from "lucide-react";
import { formatDevCoins } from "@/lib/currency";
import type { CataloguePlayer } from "@/lib/types";

export const ROLE_LABELS = {
  BAT: "Batter",
  BOWL: "Bowler",
  AR: "All-rounder",
  WK: "Wicketkeeper",
} as const;

export function PlayerAvatar({
  player,
  size = "large",
}: {
  player: CataloguePlayer;
  size?: "small" | "large";
}) {
  const initials = player.name
    .split(" ")
    .map((part) => part[0])
    .join("");

  return (
    <div
      className={`player-avatar player-avatar-${size}`}
      style={{ "--player-accent": player.accent } as React.CSSProperties}
      aria-label={`Initials avatar for ${player.name}`}
    >
      <span>{initials}</span>
      <i aria-hidden="true" />
    </div>
  );
}

export function PlayerIdentity({
  player,
  compact = false,
}: {
  player: CataloguePlayer;
  compact?: boolean;
}) {
  return (
    <div className={`player-identity ${compact ? "player-identity-compact" : ""}`}>
      <PlayerAvatar player={player} size={compact ? "small" : "large"} />
      <div>
        <span className="role-chip">{ROLE_LABELS[player.role]}</span>
        <h2>{player.name}</h2>
        <p className="player-call-sign">{player.callSign}</p>
        {!compact && (
          <div className="player-meta">
            <span>
              <MapPin size={14} aria-hidden="true" />
              {player.origin}
            </span>
            {player.overseas && (
              <span>
                <Globe2 size={14} aria-hidden="true" />
                Overseas
              </span>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

export function PlayerStatsBoard({ player }: { player: CataloguePlayer }) {
  const stats = [
    ["Bat", player.stats.batting],
    ["Bowl", player.stats.bowling],
    ["Form", player.stats.form],
    ["Clutch", player.stats.pressure],
    ["Field", player.stats.fielding],
    ["Venue", player.stats.venue],
  ];

  return (
    <div className="stats-board" aria-label={`${player.name} simulated game ratings`}>
      {stats.map(([label, value]) => (
        <div key={label}>
          <span>{label}</span>
          <strong>{value}</strong>
          <i style={{ width: `${value}%` }} aria-hidden="true" />
        </div>
      ))}
    </div>
  );
}

export function CatalogueRow({
  player,
  selected,
  disabled,
  onSelect,
}: {
  player: CataloguePlayer;
  selected: boolean;
  disabled: boolean;
  onSelect: () => void;
}) {
  return (
    <button
      type="button"
      className={`catalogue-row ${selected ? "is-selected" : ""}`}
      onClick={onSelect}
      disabled={disabled}
    >
      <PlayerAvatar player={player} size="small" />
      <span>
        <strong>{player.name}</strong>
        <small>
          {ROLE_LABELS[player.role]} · {formatDevCoins(player.basePrice)}
        </small>
      </span>
      <b>{player.callSign}</b>
    </button>
  );
}
