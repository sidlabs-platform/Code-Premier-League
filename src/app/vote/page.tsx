import type { Metadata } from "next";
import Link from "next/link";
import { ArrowLeft, LogIn } from "lucide-react";
import { Brand } from "@/components/brand";
import { FeatureVoteBoard } from "@/components/feature-vote-board";

export const metadata: Metadata = {
  title: "Vote for the next feature",
  description: "Choose which Code Premier League demo feature should be built next.",
};

const voteDesignContract = `<!--
THESIS: The feature poll is a live production rundown, not a stack of generic suggestion cards; every option reads as a build channel with visible audience signal.
OWN-WORLD: Matte ink field, paper ballot rows, coral command key, lime recorded state, cyan focus, hairline channels, and condensed tally numerals.
STORY: Visitors see the five proposed demo features, understand the effort and payoff, choose one, and immediately see their vote in the shared count.
FIRST VIEWPORT: A decisive voting invitation occupies the left channel while the complete five-option ballot and total tally remain visible in the main control surface.
FORM: Broadcast voting switcher, extending the established control-room system with a fixed rundown and one active command.
-->`;

export default function VotePage() {
  return (
    <main className="vote-page">
      <div
        aria-hidden="true"
        className="design-contract"
        dangerouslySetInnerHTML={{ __html: voteDesignContract }}
      />
      <nav className="top-nav" aria-label="Feature voting navigation">
        <Brand />
        <div className="nav-actions">
          <Link href="/" className="button button-quiet">
            <ArrowLeft size={17} aria-hidden="true" />
            Overview
          </Link>
          <Link href="/join" className="button button-secondary">
            <LogIn size={17} aria-hidden="true" />
            Join auction
          </Link>
        </div>
      </nav>

      <section className="vote-shell">
        <div className="vote-intro">
          <span className="live-line">
            <span className="tally-light" aria-hidden="true" />
            Ballot open
          </span>
          <h1>Call the next build.</h1>
          <p>
            Five live-demo ideas are on the board. Send one clear signal and
            help decide which feature enters the build queue next.
          </p>
          <div className="vote-rules">
            <span>Open to everyone</span>
            <span>No sign-in required</span>
            <span>One active choice</span>
          </div>
        </div>
        <FeatureVoteBoard />
      </section>
    </main>
  );
}
