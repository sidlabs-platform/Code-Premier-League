import { Activity, Award, Gauge, Info, Medal, Sparkles } from "lucide-react";
import { formatDevCoins } from "@/lib/currency";
import { calculateSquadReadiness } from "@/lib/readiness";
import type { RoomSnapshot, ScoringResult } from "@/lib/types";

const metricLabels: Record<keyof ScoringResult["breakdown"], string> = {
  batting: "Batting",
  bowling: "Bowling",
  teamBalance: "Team balance",
  form: "Form",
  pressure: "Pressure",
  fielding: "Fielding",
  venue: "Venue adaptability",
  budgetEfficiency: "Budget efficiency",
  weightedScore: "Weighted score",
  penalties: "Penalties",
};

export function ResultsBoard({
  snapshot,
  broadcast = false,
}: {
  snapshot: RoomSnapshot;
  broadcast?: boolean;
}) {
  if (!snapshot.resultsPublished) {
    return (
      <div className="results-waiting">
        <Gauge size={36} aria-hidden="true" />
        <h1>Scores are on the host desk</h1>
        <p>The leaderboard appears here when the host publishes the final signal.</p>
      </div>
    );
  }

  return (
    <div className={`results-board ${broadcast ? "results-broadcast" : ""}`}>
      <div className="podium-line">
        {snapshot.results.slice(0, 3).map((result, index) => (
          <article key={result.participantId} className={`podium podium-${index + 1}`}>
            <span className="podium-rank">
              {index === 0 ? <Award aria-hidden="true" /> : <Medal aria-hidden="true" />}
              #{result.rank}
            </span>
            <h2>{result.teamName}</h2>
            <p>managed by {result.displayName}</p>
            <strong>{result.score.toFixed(1)}</strong>
            <small>CPL score</small>
            <div className="strength-line">
              {result.strengths.map((strength) => (
                <span key={strength}>{strength}</span>
              ))}
            </div>
          </article>
        ))}
      </div>

      <div className="leaderboard-table" role="table" aria-label="Final leaderboard">
        <div className="leaderboard-row leaderboard-head" role="row">
          <span role="columnheader">Rank</span>
          <span role="columnheader">Team</span>
          <span role="columnheader">Squad</span>
          <span role="columnheader">Budget left</span>
          <span role="columnheader">Score</span>
        </div>
        {snapshot.results.map((result) => {
          const participant = snapshot.participants.find(
            (candidate) => candidate.id === result.participantId,
          );
          const readiness = calculateSquadReadiness(result.breakdown);
          return (
            <details key={result.participantId} className="leaderboard-detail">
              <summary className="leaderboard-row" role="row">
                <strong role="cell">#{result.rank}</strong>
                <span role="cell">
                  <b>{result.teamName}</b>
                  <small>{result.displayName}</small>
                  <small className="leaderboard-mobile-meta">
                    {participant?.squad.length ?? 0}/{snapshot.config.squadSize} players
                    · {formatDevCoins(participant?.balance ?? 0, true)} left
                  </small>
                </span>
                <span role="cell">
                  {participant?.squad.length ?? 0}/{snapshot.config.squadSize}
                </span>
                <span role="cell">{formatDevCoins(participant?.balance ?? 0, true)}</span>
                <strong role="cell">{result.score.toFixed(1)}</strong>
              </summary>
              <div className="score-explanation">
                <section
                  className="readiness-signal"
                  aria-label={`${result.teamName} squad readiness`}
                >
                  <div className="readiness-score">
                    <Activity size={20} aria-hidden="true" />
                    <span>Squad readiness</span>
                    <strong>{readiness.score}</strong>
                    <small>{readiness.band}</small>
                  </div>
                  <p>
                    A match-day signal weighted from team balance, current form,
                    and pressure performance. Composition deductions are capped at
                    25 points.
                  </p>
                  <dl>
                    <div>
                      <dt>Balance</dt>
                      <dd>{result.breakdown.teamBalance.toFixed(1)}</dd>
                    </div>
                    <div>
                      <dt>Form</dt>
                      <dd>{result.breakdown.form.toFixed(1)}</dd>
                    </div>
                    <div>
                      <dt>Pressure</dt>
                      <dd>{result.breakdown.pressure.toFixed(1)}</dd>
                    </div>
                    <div>
                      <dt>Deduction</dt>
                      <dd>−{readiness.penaltyDeduction}</dd>
                    </div>
                  </dl>
                </section>
                <div className="score-metrics">
                  {(
                    [
                      "batting",
                      "bowling",
                      "teamBalance",
                      "form",
                      "pressure",
                      "fielding",
                      "venue",
                      "budgetEfficiency",
                    ] as const
                  ).map((metric) => (
                    <div key={metric}>
                      <span>{metricLabels[metric]}</span>
                      <strong>{result.breakdown[metric].toFixed(1)}</strong>
                      <i
                        style={{ width: `${result.breakdown[metric]}%` }}
                        aria-hidden="true"
                      />
                    </div>
                  ))}
                </div>
                <div className="penalty-box">
                  <h3>
                    <Info size={16} aria-hidden="true" />
                    How calculated
                  </h3>
                  <p>
                    Batting 22% · Bowling 22% · Balance 16% · Form 10% ·
                    Pressure 10% · Fielding 8% · Venue 7% · Budget 5%
                  </p>
                  {result.breakdown.penalties.length > 0 ? (
                    <ul>
                      {result.breakdown.penalties.map((penalty) => (
                        <li key={penalty.label}>
                          <span>{penalty.label}</span>
                          <strong>−{penalty.points}</strong>
                        </li>
                      ))}
                    </ul>
                  ) : (
                    <p className="clean-score">
                      <Sparkles size={15} aria-hidden="true" />
                      No composition penalties
                    </p>
                  )}
                </div>
              </div>
            </details>
          );
        })}
      </div>
    </div>
  );
}
