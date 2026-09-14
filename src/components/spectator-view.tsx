"use client";

import Link from "next/link";
import { Eye, UsersRound } from "lucide-react";
import { AuctionStage } from "@/components/auction-stage";
import { AutoPlayPill, Brand, EducationalNotice } from "@/components/brand";
import { ResultsBoard } from "@/components/results-board";
import { ErrorBanner, LoadingBoard, Metric } from "@/components/ui";
import { formatDevCoins } from "@/lib/currency";
import { useRoomSnapshot } from "@/lib/client";

export function SpectatorView({ roomCode }: { roomCode: string }) {
  const { snapshot, error, loading, serverOffset } = useRoomSnapshot(roomCode);

  if (loading || !snapshot) {
    return <LoadingBoard label="Tuning the broadcast feed" />;
  }

  return (
    <main className="broadcast-shell">
      <header className="broadcast-header">
        <Brand />
        <div className="broadcast-title">
          <Eye size={18} aria-hidden="true" />
          <span>Read-only broadcast</span>
          <strong>{snapshot.name}</strong>
        </div>
        <div className="broadcast-actions">
          {snapshot.simulation.enabled && <AutoPlayPill />}
          <Link href={`/join?room=${roomCode}`} className="button button-primary">
            Join {roomCode}
          </Link>
        </div>
      </header>

      {error && <ErrorBanner message={error} />}

      <section className="broadcast-strip">
        <Metric label="Room" value={snapshot.code} tone="accent" />
        <Metric label="Phase" value={snapshot.phase.toUpperCase()} />
        <Metric
          label="Teams"
          value={snapshot.participants.length}
          tone="live"
        />
        <Metric label="Sold" value={snapshot.soldPlayerIds.length} />
      </section>

      {snapshot.phase === "results" ? (
        <ResultsBoard snapshot={snapshot} broadcast />
      ) : (
        <div className="broadcast-grid">
          <AuctionStage
            snapshot={snapshot}
            serverOffset={serverOffset}
          />
          <aside className="broadcast-leaders">
            <div className="broadcast-leaders-heading">
              <UsersRound size={20} aria-hidden="true" />
              <h2>Team channels</h2>
            </div>
            {snapshot.participants
              .sort(
                (left, right) =>
                  right.squad.length - left.squad.length ||
                  right.balance - left.balance,
              )
              .map((participant) => (
                <div key={participant.id} className="broadcast-team">
                  <span>{participant.squad.length}</span>
                  <div>
                    <strong>{participant.teamName}</strong>
                    <small>
                      {participant.isBot ? "Automated team" : participant.displayName}
                    </small>
                  </div>
                  <b>{formatDevCoins(participant.balance, true)}</b>
                </div>
              ))}
          </aside>
        </div>
      )}

      <footer className="broadcast-footer">
        <EducationalNotice />
        <p aria-live="polite">
          {snapshot.events.at(-1)?.message ?? "Waiting for the next room signal."}
        </p>
      </footer>
    </main>
  );
}
