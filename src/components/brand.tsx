import Link from "next/link";
import { Radio, ShieldCheck } from "lucide-react";

export function Brand({ compact = false }: { compact?: boolean }) {
  return (
    <Link
      href="/"
      className="brand-lockup"
      aria-label="Code Premier League home"
    >
      <span className="brand-mark" aria-hidden="true">
        <span>C</span>
        <span>P</span>
        <span>L</span>
      </span>
      {!compact && (
        <span>
          <strong>Code Premier League</strong>
          <small>Educational cricket auction</small>
        </span>
      )}
    </Link>
  );
}

export function AutoPlayPill() {
  return (
    <span className="simulation-pill">
      <Radio size={14} aria-hidden="true" />
      Auto-play
    </span>
  );
}

export function EducationalNotice() {
  return (
    <div className="educational-notice">
      <ShieldCheck size={18} aria-hidden="true" />
      <span>
        Unofficial educational simulation. Player names are used descriptively;
        all ratings, prices, bids, and outcomes are simulated. No affiliation,
        endorsement, real-money play, betting, or payments.
      </span>
    </div>
  );
}
