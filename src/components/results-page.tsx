"use client";

import Link from "next/link";
import { Brand, EducationalNotice } from "@/components/brand";
import { ResultsBoard } from "@/components/results-board";
import { ErrorBanner, LoadingBoard } from "@/components/ui";
import { useRoomSnapshot } from "@/lib/client";

export function ResultsPage({ roomCode }: { roomCode: string }) {
  const { snapshot, error, loading } = useRoomSnapshot(roomCode);

  if (loading || !snapshot) {
    return <LoadingBoard label="Calculating the final table" />;
  }

  return (
    <main className="results-page">
      <header className="app-header">
        <Brand />
        <div className="room-identity">
          <span>Final leaderboard</span>
          <strong>{snapshot.name}</strong>
        </div>
        <Link href={`/spectate/${roomCode}`} className="button button-secondary">
          Broadcast view
        </Link>
      </header>
      {error && <ErrorBanner message={error} />}
      <section className="results-hero">
        <span>ROOM {snapshot.code}</span>
        <h1>Every squad tells its own build story.</h1>
        <p>
          Scores are normalized to 100, weighted transparently, then adjusted for
          composition gaps. Expand any team for the full calculation.
        </p>
      </section>
      <ResultsBoard snapshot={snapshot} />
      <EducationalNotice />
    </main>
  );
}
