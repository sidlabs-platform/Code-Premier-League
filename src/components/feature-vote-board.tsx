"use client";

import { useEffect, useState, type FormEvent } from "react";
import { Check, LoaderCircle, RefreshCw, Vote } from "lucide-react";
import { Button, ErrorBanner } from "@/components/ui";
import type {
  FeatureVoteId,
  FeatureVoteSnapshot,
} from "@/lib/feature-vote-options";

type VoteApiResponse = {
  ok: boolean;
  snapshot?: FeatureVoteSnapshot;
  error?: string;
};

async function parseVoteResponse(response: Response): Promise<FeatureVoteSnapshot> {
  const body = (await response.json()) as VoteApiResponse;
  if (!response.ok || !body.ok || !body.snapshot) {
    throw new Error(body.error ?? "The feature poll could not be loaded.");
  }
  return body.snapshot;
}

export function FeatureVoteBoard() {
  const [snapshot, setSnapshot] = useState<FeatureVoteSnapshot | null>(null);
  const [selectedId, setSelectedId] = useState<FeatureVoteId | null>(null);
  const [loading, setLoading] = useState(true);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [status, setStatus] = useState("");

  async function refresh() {
    setError(null);
    try {
      const response = await fetch("/api/feature-votes", { cache: "no-store" });
      const next = await parseVoteResponse(response);
      setSnapshot(next);
      setSelectedId(next.yourFeatureId);
    } catch (caught) {
      setError(
        caught instanceof Error ? caught.message : "The feature poll could not be loaded.",
      );
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void refresh();
  }, []);

  async function submitVote(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!selectedId || pending) return;

    setPending(true);
    setError(null);
    setStatus("");
    try {
      const response = await fetch("/api/feature-votes", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ featureId: selectedId }),
        cache: "no-store",
      });
      const next = await parseVoteResponse(response);
      setSnapshot(next);
      setSelectedId(next.yourFeatureId);
      setStatus("Vote recorded. The scoreboard is up to date.");
    } catch (caught) {
      setError(
        caught instanceof Error ? caught.message : "Your vote could not be recorded.",
      );
    } finally {
      setPending(false);
    }
  }

  if (loading) {
    return (
      <div className="vote-board-loading" role="status">
        <LoaderCircle className="spinner" aria-hidden="true" />
        <span>Opening the feature ballot</span>
      </div>
    );
  }

  if (!snapshot) {
    return (
      <div className="vote-board-failure">
        {error && <ErrorBanner message={error} />}
        <Button variant="secondary" onClick={() => void refresh()}>
          <RefreshCw size={17} aria-hidden="true" />
          Try again
        </Button>
      </div>
    );
  }

  const selectionUnchanged = selectedId === snapshot.yourFeatureId;

  return (
    <form className="feature-ballot" onSubmit={submitVote}>
      <div className="vote-board-heading">
        <h2>Choose one build.</h2>
        <div className="vote-total" aria-label={`${snapshot.totalVotes} total votes`}>
          <strong>{snapshot.totalVotes}</strong>
          <span>{snapshot.totalVotes === 1 ? "vote" : "votes"}</span>
        </div>
      </div>

      {error && <ErrorBanner message={error} />}

      <fieldset className="vote-options" disabled={pending}>
        <legend className="sr-only">Select the next feature to build</legend>
        {snapshot.features.map((feature, index) => {
          const selected = selectedId === feature.id;
          const recorded = snapshot.yourFeatureId === feature.id;
          return (
            <label
              className={`vote-option ${selected ? "vote-option-selected" : ""}`}
              key={feature.id}
            >
              <input
                type="radio"
                name="feature"
                value={feature.id}
                checked={selected}
                onChange={() => {
                  setSelectedId(feature.id);
                  setStatus("");
                }}
              />
              <span className="vote-option-number">
                {String(index + 1).padStart(2, "0")}
              </span>
              <span className="vote-option-copy">
                <span className="vote-option-title">
                  <strong>{feature.title}</strong>
                  {recorded && (
                    <span className="your-vote">
                      <Check size={13} aria-hidden="true" />
                      Your vote
                    </span>
                  )}
                </span>
                <span>{feature.description}</span>
                <small>Estimated demo build: {feature.effort}</small>
              </span>
              <span className="vote-option-score">
                <strong>{feature.votes}</strong>
                <span>{feature.percentage}%</span>
              </span>
              <span className="vote-meter" aria-hidden="true">
                <span
                  style={{ transform: `scaleX(${feature.percentage / 100})` }}
                />
              </span>
            </label>
          );
        })}
      </fieldset>

      <div className="vote-submit-rail">
        <p>
          One active vote per browser. You can change your choice. This is an
          informal product poll, not an identity-verified election.
        </p>
        <Button
          className="vote-submit"
          type="submit"
          disabled={!selectedId || selectionUnchanged || pending}
        >
          {pending ? (
            <LoaderCircle className="spinner" size={18} aria-hidden="true" />
          ) : (
            <Vote size={18} aria-hidden="true" />
          )}
          {snapshot.yourFeatureId ? "Update vote" : "Cast vote"}
        </Button>
      </div>

      <p className="vote-status" aria-live="polite">
        {status ||
          (selectionUnchanged && snapshot.yourFeatureId
            ? "Your current vote is shown above."
            : "")}
      </p>
    </form>
  );
}
