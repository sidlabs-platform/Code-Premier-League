"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { QRCodeSVG } from "qrcode.react";
import {
  Bot,
  Check,
  Clipboard,
  Eye,
  FastForward,
  Lock,
  Pause,
  Play,
  RotateCcw,
  Send,
  Square,
  Trophy,
  Unlock,
  UsersRound,
} from "lucide-react";
import { AuctionStage } from "@/components/auction-stage";
import { AutoPlayPill, Brand, EducationalNotice } from "@/components/brand";
import { CatalogueRow } from "@/components/player";
import { SquadBoard } from "@/components/squad";
import { Button, EmptyState, ErrorBanner, LoadingBoard, Metric, Panel } from "@/components/ui";
import { formatDevCoins } from "@/lib/currency";
import { hostStorageKey, useRoomSnapshot } from "@/lib/client";

export function HostConsole({ roomCode }: { roomCode: string }) {
  const { snapshot, error: roomError, loading, serverOffset, act } =
    useRoomSnapshot(roomCode);
  const [hostToken] = useState<string | null>(() =>
    typeof window === "undefined"
      ? null
      : localStorage.getItem(hostStorageKey(roomCode)),
  );
  const [actionError, setActionError] = useState<string | null>(null);
  const [pending, setPending] = useState<string | null>(null);
  const [selectedPlayer, setSelectedPlayer] = useState<string>("");
  const [copied, setCopied] = useState(false);
  const [joinUrl] = useState(() =>
    typeof window === "undefined"
      ? `/join?room=${roomCode}`
      : `${window.location.origin}/join?room=${roomCode}`,
  );
  const simulationBusy = useRef(false);

  const availablePlayers = useMemo(() => {
    if (!snapshot) return [];
    return snapshot.catalogue.filter(
      (player) =>
        !snapshot.soldPlayerIds.includes(player.id) &&
        !snapshot.unsoldPlayerIds.includes(player.id),
    );
  }, [snapshot]);

  const effectiveSelectedPlayer = availablePlayers.some(
    (player) => player.id === selectedPlayer,
  )
    ? selectedPlayer
    : (availablePlayers[0]?.id ?? "");

  const hostAction = useCallback(
    async (type: string, payload: Record<string, unknown> = {}) => {
      if (!hostToken) {
        setActionError("Host credentials are missing in this browser.");
        return;
      }
      setPending(type);
      setActionError(null);
      try {
        await act({ type, actorToken: hostToken, ...payload }, `host-${type}`);
      } catch (caught) {
        setActionError(
          caught instanceof Error ? caught.message : "Host action failed.",
        );
      } finally {
        setPending(null);
      }
    },
    [act, hostToken],
  );

  useEffect(() => {
    if (!snapshot?.simulation.enabled || !hostToken) return;
    const interval = window.setInterval(() => {
      if (simulationBusy.current) return;
      simulationBusy.current = true;
      void act(
        { type: "simulateTick", actorToken: hostToken },
        "simulation-tick",
      )
        .catch((caught) => {
          setActionError(
            caught instanceof Error ? caught.message : "Auto-play step failed.",
          );
        })
        .finally(() => {
          simulationBusy.current = false;
        });
    }, 1450);
    return () => window.clearInterval(interval);
  }, [act, hostToken, snapshot?.simulation.enabled]);

  async function copyJoinLink() {
    await navigator.clipboard.writeText(joinUrl);
    setCopied(true);
    window.setTimeout(() => setCopied(false), 1500);
  }

  if (loading || !snapshot) {
    return <LoadingBoard label="Opening host control room" />;
  }

  const realParticipants = snapshot.participants.filter(
    (participant) => !participant.isBot,
  );
  const automatedTeams = snapshot.participants.filter(
    (participant) => participant.isBot,
  );
  const quizQuestion = snapshot.quiz.currentQuestion;
  const auctionOpen = snapshot.auction
    ? ["active", "paused"].includes(snapshot.auction.state)
    : false;

  return (
    <main className="app-shell host-shell">
      <header className="app-header">
        <Brand />
        <div className="room-identity">
          <span>Host control</span>
          <strong>{snapshot.name}</strong>
        </div>
        <div className="header-actions">
          {snapshot.simulation.enabled && <AutoPlayPill />}
          <Link href={`/spectate/${roomCode}`} className="button button-quiet">
            <Eye size={17} aria-hidden="true" />
            Broadcast view
          </Link>
        </div>
      </header>

      {(roomError || actionError || snapshot.systemWarning) && (
        <div className="shell-alerts">
          {roomError && <ErrorBanner message={roomError} />}
          {actionError && <ErrorBanner message={actionError} />}
          {snapshot.systemWarning && <ErrorBanner message={snapshot.systemWarning} />}
        </div>
      )}

      <section className="host-status-strip">
        <Metric label="Room code" value={snapshot.code} tone="accent" />
        <Metric
          label="Live participants"
          value={`${realParticipants.length}/${snapshot.config.maxParticipants}`}
          tone={snapshot.registrationOpen ? "live" : "neutral"}
        />
        <Metric label="Phase" value={snapshot.phase.toUpperCase()} />
        <Metric label="Players sold" value={snapshot.soldPlayerIds.length} />
        <Metric label="Snapshot" value={`v${snapshot.version}`} />
      </section>

      <div className="host-grid">
        <div className="host-main">
          <Panel className="join-signal-panel">
            <div className="join-share">
              <div>
                <span>ROOM SIGNAL</span>
                <strong data-testid="host-room-code">{snapshot.code}</strong>
                <p>{joinUrl}</p>
              </div>
              <div className="qr-frame" aria-label="QR code for participant join link">
                <QRCodeSVG value={joinUrl} size={118} level="M" />
              </div>
            </div>
            <div className="join-share-actions">
              <Button variant="secondary" onClick={() => void copyJoinLink()}>
                {copied ? <Check size={17} /> : <Clipboard size={17} />}
                {copied ? "Copied" : "Copy join link"}
              </Button>
              <Button
                variant={snapshot.registrationOpen ? "danger" : "primary"}
                onClick={() =>
                  void hostAction(
                    snapshot.registrationOpen
                      ? "closeRegistration"
                      : "openRegistration",
                  )
                }
                disabled={snapshot.phase !== "waiting"}
              >
                {snapshot.registrationOpen ? (
                  <Lock size={17} aria-hidden="true" />
                ) : (
                  <Unlock size={17} aria-hidden="true" />
                )}
                {snapshot.registrationOpen ? "Close registration" : "Open registration"}
              </Button>
            </div>
          </Panel>

          {snapshot.phase === "quiz" && quizQuestion ? (
            <Panel
              title={`Quiz ${snapshot.quiz.currentIndex + 1}/${snapshot.quiz.totalQuestions}`}
              className="quiz-host-panel"
            >
              <h3>{quizQuestion.prompt}</h3>
              <div className="quiz-host-options">
                {quizQuestion.options.map((option, index) => (
                  <div
                    key={option}
                    className={
                      quizQuestion.revealed && quizQuestion.correctIndex === index
                        ? "is-correct"
                        : ""
                    }
                  >
                    <span>{String.fromCharCode(65 + index)}</span>
                    {option}
                  </div>
                ))}
              </div>
              <p>
                {quizQuestion.answeredParticipantIds.length} answers locked
                {quizQuestion.revealed && quizQuestion.explanation
                  ? ` · ${quizQuestion.explanation}`
                  : ""}
              </p>
              <div className="button-row">
                {!quizQuestion.revealed ? (
                  <Button
                    onClick={() => void hostAction("revealQuiz")}
                    disabled={pending === "revealQuiz"}
                  >
                    <Eye size={17} aria-hidden="true" />
                    Reveal answer
                  </Button>
                ) : (
                  <Button
                    onClick={() => void hostAction("nextQuiz")}
                    disabled={pending === "nextQuiz"}
                  >
                    <FastForward size={17} aria-hidden="true" />
                    {snapshot.quiz.currentIndex === snapshot.quiz.totalQuestions - 1
                      ? "Open auction desk"
                      : "Next question"}
                  </Button>
                )}
              </div>
            </Panel>
          ) : (
            <AuctionStage
              snapshot={snapshot}
              serverOffset={serverOffset}
            />
          )}

          <Panel title="Auction commands" className="command-panel">
            <div className="player-selector">
              <div className="catalogue-list" aria-label="Available player catalogue">
                {availablePlayers.slice(0, 18).map((player) => (
                  <CatalogueRow
                    key={player.id}
                    player={player}
                    selected={effectiveSelectedPlayer === player.id}
                    disabled={auctionOpen}
                    onSelect={() => setSelectedPlayer(player.id)}
                  />
                ))}
              </div>
              <div className="command-stack">
                <Button
                  onClick={() =>
                    void hostAction("startAuction", {
                      playerId: effectiveSelectedPlayer,
                    })
                  }
                  disabled={
                    !effectiveSelectedPlayer ||
                    auctionOpen ||
                    pending === "startAuction"
                  }
                  data-testid="start-auction"
                >
                  <Play size={17} aria-hidden="true" />
                  Start selected player
                </Button>
                {snapshot.auction?.state === "active" ? (
                  <Button
                    variant="secondary"
                    onClick={() => void hostAction("pauseAuction")}
                  >
                    <Pause size={17} aria-hidden="true" />
                    Pause timer
                  </Button>
                ) : snapshot.auction?.state === "paused" ? (
                  <Button
                    variant="secondary"
                    onClick={() => void hostAction("resumeAuction")}
                  >
                    <Play size={17} aria-hidden="true" />
                    Resume timer
                  </Button>
                ) : null}
                <Button
                  variant="secondary"
                  onClick={() => void hostAction("forceClose")}
                  disabled={!auctionOpen}
                  data-testid="force-close"
                >
                  <Square size={17} aria-hidden="true" />
                  Force close &amp; sell
                </Button>
                <Button
                  variant="danger"
                  onClick={() => void hostAction("markUnsold")}
                  disabled={!auctionOpen}
                >
                  Mark unsold
                </Button>
              </div>
            </div>
          </Panel>
        </div>

        <aside className="host-rail">
          <Panel
            title="Run of show"
            action={<span className="phase-chip">{snapshot.phase}</span>}
          >
            <div className="run-controls">
              {snapshot.phase === "waiting" && snapshot.config.quizEnabled && (
                <Button
                  onClick={() => void hostAction("startQuiz")}
                  disabled={snapshot.participants.length === 0}
                >
                  Start five-question quiz
                </Button>
              )}
              {snapshot.phase === "waiting" && !snapshot.config.quizEnabled && (
                <p>Quiz is disabled. Select the first player when ready.</p>
              )}
              {snapshot.phase === "auction" && (
                <Button
                  variant="secondary"
                  onClick={() => void hostAction("endAuction")}
                  data-testid="end-auction"
                >
                  End auction &amp; score
                </Button>
              )}
              {snapshot.phase === "results" && !snapshot.resultsPublished && (
                <Button
                  onClick={() => void hostAction("publishResults")}
                  data-testid="publish-results"
                >
                  <Send size={17} aria-hidden="true" />
                  Publish leaderboard
                </Button>
              )}
              {snapshot.resultsPublished && (
                <Link
                  href={`/results/${roomCode}`}
                  className="button button-primary"
                >
                  <Trophy size={17} aria-hidden="true" />
                  Open results
                </Link>
              )}
            </div>
          </Panel>

          <Panel
            title="Auto-play controls"
            action={<Bot size={18} aria-hidden="true" />}
          >
            <p className="panel-copy">
              {automatedTeams.length > 0
                ? "Automated teams select players and place seeded, budget-aware bids. Auto-play turns off if a live participant joins."
                : "Auto-play rooms begin with four automated teams and can be started from the home screen."}
            </p>
            {automatedTeams.length > 0 ? (
              <Button
                variant={snapshot.simulation.enabled ? "danger" : "secondary"}
                onClick={() =>
                  void hostAction("setSimulation", {
                    enabled: !snapshot.simulation.enabled,
                  })
                }
                disabled={realParticipants.length > 0}
              >
                {snapshot.simulation.enabled ? (
                  <Pause size={17} aria-hidden="true" />
                ) : (
                  <Play size={17} aria-hidden="true" />
                )}
                {snapshot.simulation.enabled ? "Pause auto-play" : "Run auto-play"}
              </Button>
            ) : (
              <Link href="/demo" className="button button-secondary">
                <Play size={17} aria-hidden="true" />
                Start auto-play room
              </Link>
            )}
          </Panel>

          <Panel
            title="Teams on channel"
            action={
              <span className="participant-count">
                <UsersRound size={15} aria-hidden="true" />
                {snapshot.participants.length}
              </span>
            }
          >
            {snapshot.participants.length === 0 ? (
              <EmptyState
                title="Waiting for teams"
                detail="Share the room code or QR panel to begin."
              />
            ) : (
              <div className="participant-list">
                {snapshot.participants.map((participant) => (
                  <details key={participant.id}>
                    <summary>
                      <span className={participant.isBot ? "bot-dot" : "live-dot"} />
                      <span>
                        <strong>{participant.teamName}</strong>
                        <small>
                          {participant.displayName}
                          {participant.isBot ? " · automated" : ""}
                        </small>
                      </span>
                      <b>{formatDevCoins(participant.balance, true)}</b>
                    </summary>
                    <SquadBoard
                      snapshot={snapshot}
                      participant={participant}
                      compact
                    />
                  </details>
                ))}
              </div>
            )}
          </Panel>

          <Panel title="Activity signal">
            <ol className="activity-feed">
              {[...snapshot.events].reverse().slice(0, 10).map((event) => (
                <li key={event.id}>
                  <span>{new Date(event.createdAt).toLocaleTimeString([], {
                    hour: "2-digit",
                    minute: "2-digit",
                    second: "2-digit",
                  })}</span>
                  <p>{event.message}</p>
                </li>
              ))}
            </ol>
          </Panel>

          <Panel title="Room maintenance">
            <Button
              variant="quiet"
              onClick={() => void hostAction("resetRoom")}
            >
              <RotateCcw size={16} aria-hidden="true" />
              Reset seeded room
            </Button>
          </Panel>
          <EducationalNotice />
        </aside>
      </div>
    </main>
  );
}
