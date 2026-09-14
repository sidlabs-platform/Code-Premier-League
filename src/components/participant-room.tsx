"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { CheckCircle2, Coins, Gavel, LogIn, Trophy, UsersRound } from "lucide-react";
import { AuctionStage } from "@/components/auction-stage";
import { Brand, EducationalNotice } from "@/components/brand";
import { SquadBoard } from "@/components/squad";
import { Button, ErrorBanner, LoadingBoard, Metric, Panel } from "@/components/ui";
import {
  participantStorageKey,
  type ParticipantSession,
  useRoomSnapshot,
} from "@/lib/client";
import { formatDevCoins } from "@/lib/currency";

export function ParticipantRoom({ roomCode }: { roomCode: string }) {
  const { snapshot, error: roomError, loading, serverOffset, act } =
    useRoomSnapshot(roomCode);
  const [session] = useState<ParticipantSession | null>(() => {
    if (typeof window === "undefined") return null;
    const stored = localStorage.getItem(participantStorageKey(roomCode));
    if (!stored) return null;
    try {
      return JSON.parse(stored) as ParticipantSession;
    } catch {
      localStorage.removeItem(participantStorageKey(roomCode));
      return null;
    }
  });
  const [actionError, setActionError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  const participant = snapshot?.participants.find(
    (candidate) => candidate.id === session?.participantId,
  );
  const auctionPlayer = snapshot?.catalogue.find(
    (candidate) => candidate.id === snapshot.auction?.playerId,
  );
  const nextBid = useMemo(() => {
    if (!snapshot || !auctionPlayer) return 0;
    return snapshot.auction?.highestBid
      ? snapshot.auction.highestBid + snapshot.config.bidIncrement
      : auctionPlayer.basePrice;
  }, [auctionPlayer, snapshot]);

  async function participantAction(
    type: string,
    payload: Record<string, unknown> = {},
  ) {
    if (!session) return;
    setPending(true);
    setActionError(null);
    try {
      await act(
        {
          type,
          actorToken: session.participantToken,
          participantId: session.participantId,
          ...payload,
        },
        `participant-${type}`,
      );
    } catch (caught) {
      setActionError(
        caught instanceof Error ? caught.message : "The action was not accepted.",
      );
    } finally {
      setPending(false);
    }
  }

  if (loading || !snapshot) {
    return <LoadingBoard label="Joining the live auction signal" />;
  }

  if (!session || !participant) {
    return (
      <main className="centered-page">
        <div className="session-missing">
          <LogIn size={38} aria-hidden="true" />
          <h1>Join credentials not found</h1>
          <p>
            Join this room in the same browser to receive a secure participant
            session.
          </p>
          <Link href={`/join?room=${roomCode}`} className="button button-primary">
            Join room {roomCode}
          </Link>
        </div>
      </main>
    );
  }

  const currentQuestion = snapshot.quiz.currentQuestion;
  const answered = currentQuestion?.answeredParticipantIds.includes(participant.id);
  const isLeader = snapshot.auction?.highestBidderId === participant.id;

  return (
    <main className="app-shell participant-shell">
      <header className="app-header participant-header">
        <Brand />
        <div className="room-identity">
          <span>Room {snapshot.code}</span>
          <strong>{participant.teamName}</strong>
        </div>
        <span className="connection-pill">
          <span aria-hidden="true" />
          Live
        </span>
      </header>

      {(roomError || actionError || snapshot.systemWarning) && (
        <div className="shell-alerts">
          {roomError && <ErrorBanner message={roomError} />}
          {actionError && <ErrorBanner message={actionError} />}
          {snapshot.systemWarning && <ErrorBanner message={snapshot.systemWarning} />}
        </div>
      )}

      <section className="participant-metrics">
        <Metric
          label="Available budget"
          value={formatDevCoins(participant.balance)}
          tone="accent"
        />
        <Metric
          label="Quiz bonus"
          value={`+${formatDevCoins(participant.quizBonus)}`}
        />
        <Metric
          label="Squad"
          value={`${participant.squad.length}/${snapshot.config.squadSize}`}
        />
      </section>

      <div className="participant-grid">
        <div className="participant-main">
          {snapshot.phase === "waiting" && (
            <section className="waiting-room">
              <div className="waiting-pulse" aria-hidden="true">
                <span />
                <UsersRound />
              </div>
              <h1>You&apos;re on the team sheet.</h1>
              <p>
                The host is registering teams. Keep this tab open; the next phase
                arrives automatically.
              </p>
              <strong>{snapshot.participants.length} teams connected</strong>
            </section>
          )}

          {snapshot.phase === "quiz" && currentQuestion && (
            <Panel className="participant-quiz">
              <div className="quiz-progress">
                <span>
                  Question {snapshot.quiz.currentIndex + 1} of{" "}
                  {snapshot.quiz.totalQuestions}
                </span>
                <strong>+2 DC · fastest +1</strong>
              </div>
              <h1>{currentQuestion.prompt}</h1>
              <div className="answer-grid">
                {currentQuestion.options.map((option, index) => {
                  const correct =
                    currentQuestion.revealed &&
                    currentQuestion.correctIndex === index;
                  return (
                    <Button
                      key={option}
                      variant={correct ? "primary" : "secondary"}
                      className={correct ? "answer-correct" : ""}
                      disabled={answered || currentQuestion.revealed || pending}
                      onClick={() =>
                        void participantAction("answerQuiz", {
                          questionId: currentQuestion.id,
                          selectedIndex: index,
                        })
                      }
                    >
                      <span>{String.fromCharCode(65 + index)}</span>
                      {option}
                    </Button>
                  );
                })}
              </div>
              {answered && !currentQuestion.revealed && (
                <p className="answer-locked">
                  <CheckCircle2 size={17} aria-hidden="true" />
                  Answer locked. Waiting for the host reveal.
                </p>
              )}
              {currentQuestion.revealed && (
                <div className="answer-explanation" role="status">
                  <strong>Answer revealed</strong>
                  <p>{currentQuestion.explanation}</p>
                </div>
              )}
            </Panel>
          )}

          {snapshot.phase === "auction" && (
            <>
              <AuctionStage snapshot={snapshot} serverOffset={serverOffset} />
              <Panel className="bid-controls">
                <div className="bid-control-heading">
                  <div>
                    <h2>{isLeader ? "You hold the bid" : "Make your move"}</h2>
                    <p>
                      Every accepted bid resets the server-owned countdown.
                    </p>
                  </div>
                  <Coins size={26} aria-hidden="true" />
                </div>
                <div className="bid-button-grid">
                  {[0, 1, 4].map((extra) => {
                    const amount =
                      nextBid + snapshot.config.bidIncrement * extra;
                    return (
                      <Button
                        key={extra}
                        className="bid-button"
                        disabled={
                          pending ||
                          isLeader ||
                          snapshot.auction?.state !== "active" ||
                          amount > participant.balance
                        }
                        onClick={() => void participantAction("bid", { amount })}
                        data-testid={`bid-${extra}`}
                      >
                        <Gavel size={20} aria-hidden="true" />
                        <span>
                          <small>{extra === 0 ? "Next bid" : `Jump +${extra + 1}`}</small>
                          <strong>{formatDevCoins(amount)}</strong>
                        </span>
                      </Button>
                    );
                  })}
                </div>
                {isLeader && (
                  <p className="leading-message" aria-live="polite">
                    You are leading. Another team must bid before you can raise.
                  </p>
                )}
              </Panel>
            </>
          )}

          {snapshot.phase === "results" && (
            <section className="participant-results-callout">
              <Trophy size={40} aria-hidden="true" />
              <h1>
                {snapshot.resultsPublished
                  ? "The final table is live."
                  : "Scores are being checked."}
              </h1>
              <p>
                Your transparent score includes squad strength, composition, form,
                pressure, fielding, venue range, and budget efficiency.
              </p>
              {snapshot.resultsPublished && (
                <Link
                  href={`/results/${roomCode}`}
                  className="button button-primary button-large"
                >
                  View leaderboard
                </Link>
              )}
            </section>
          )}
        </div>

        <aside className="participant-rail">
          <Panel title="Your squad">
            <SquadBoard snapshot={snapshot} participant={participant} />
          </Panel>
          <Panel title="Latest signals">
            <ol className="activity-feed">
              {[...snapshot.events].reverse().slice(0, 8).map((event) => (
                <li key={event.id}>
                  <span>
                    {new Date(event.createdAt).toLocaleTimeString([], {
                      hour: "2-digit",
                      minute: "2-digit",
                    })}
                  </span>
                  <p>{event.message}</p>
                </li>
              ))}
            </ol>
          </Panel>
          <EducationalNotice />
        </aside>
      </div>
    </main>
  );
}
