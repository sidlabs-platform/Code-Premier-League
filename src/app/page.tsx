import Link from "next/link";
import {
  ArrowRight,
  Bot,
  Braces,
  Gavel,
  RadioTower,
  Trophy,
  UsersRound,
  Vote,
} from "lucide-react";
import { AutoPlayPill, Brand, EducationalNotice } from "@/components/brand";
import { CreateRoomForm } from "@/components/create-room-form";
import { CATALOGUE_LAST_UPDATED } from "@/lib/seed";

export default function LandingPage() {
  return (
    <main className="landing-page">
      <nav className="top-nav" aria-label="Primary navigation">
        <Brand />
        <div className="nav-actions">
          <Link href="/vote" className="button button-primary vote-next-link">
            <span className="vote-menu-dot" aria-hidden="true" />
            <Vote size={17} aria-hidden="true" />
            Vote next
          </Link>
          <Link href="/join" className="button button-secondary">
            Join auction
          </Link>
          <Link href="#host" className="button button-quiet nav-low-priority">
            Host a room
          </Link>
          <Link href="/demo" className="button button-quiet nav-low-priority">
            <Bot size={17} aria-hidden="true" />
            Auto-play
          </Link>
        </div>
      </nav>

      <section className="landing-stage">
        <div className="landing-copy">
          <div className="live-line">
            <span className="tally-light" aria-hidden="true" />
            Live multiplayer cricket auction
          </div>
          <h1>
            Draft a squad.
            <br />
            <span>Ship the win.</span>
          </h1>
          <p>
            A fast educational auction where developers earn bonus DevCoins,
            outbid the room, and build the highest-scoring squad.
          </p>
          <div className="hero-actions">
            <Link href="/join" className="button button-primary button-large">
              Join auction
              <ArrowRight size={20} aria-hidden="true" />
            </Link>
            <Link href="#host" className="button button-secondary button-large">
              Host a room
            </Link>
            <Link href="/demo" className="button button-secondary button-large">
              <Bot size={19} aria-hidden="true" />
              Auto-play
            </Link>
          </div>
          <EducationalNotice />
        </div>

        <figure className="hero-console">
          <figcaption className="sr-only">
            Illustrative live auction console showing a player, countdown, leading
            team, and bid control.
          </figcaption>
          <div className="console-topline">
            <Brand compact />
            <AutoPlayPill />
            <span>ROOM BYTE11</span>
          </div>
          <div className="hero-bid">
            <div className="featured-player">
              <span>JB</span>
              <i aria-hidden="true" />
            </div>
            <div>
              <small>BOWLER · SIMULATED GAME RATINGS</small>
              <h2>Jasprit Bumrah</h2>
              <p>IND-02 · India</p>
            </div>
            <div className="hero-price">
              <small>HIGHEST BID</small>
              <strong>8.5</strong>
              <span>DevCrore</span>
            </div>
          </div>
          <div className="hero-channel-row">
            <div>
              <span>TIME</span>
              <strong>06.8</strong>
            </div>
            <div>
              <span>LEADING</span>
              <strong>Merge Mavericks</strong>
            </div>
            <span className="hero-command-key" aria-hidden="true">
              +0.5 BID
            </span>
          </div>
          <div className="hero-participants">
            <span>
              <UsersRound size={16} aria-hidden="true" /> 18 connected
            </span>
            <span>
              <RadioTower size={16} aria-hidden="true" /> live sync
            </span>
            <span>
              <Trophy size={16} aria-hidden="true" /> deterministic score
            </span>
          </div>
        </figure>
      </section>

      <section className="run-of-show" aria-label="How Code Premier League works">
        <article>
          <Braces size={24} aria-hidden="true" />
          <div>
            <h2>Earn</h2>
            <p>Five rapid dev questions can unlock up to 15 bonus DevCrore.</p>
          </div>
        </article>
        <article>
          <Gavel size={24} aria-hidden="true" />
          <div>
            <h2>Bid</h2>
            <p>Authoritative bids reset the clock and protect every team budget.</p>
          </div>
        </article>
        <article>
          <Trophy size={24} aria-hidden="true" />
          <div>
            <h2>Build</h2>
            <p>Transparent weighted scoring turns your selected XI into a final rank.</p>
          </div>
        </article>
      </section>

      <section className="host-section" id="host">
        <div className="host-section-copy">
          <h2>Host from one decisive console.</h2>
          <p>
            Control registration, quiz reveals, player selection, the auction clock,
            sales, and the final broadcast without juggling tabs.
          </p>
          <ul>
            <li>Credential-free Local Mode</li>
            <li>Short room code and QR-ready join panel</li>
            <li>Refresh recovery and a curated player catalogue</li>
          </ul>
        </div>
        <CreateRoomForm />
      </section>

      <footer className="landing-footer">
        <Brand />
        <p>
          Unofficial, non-commercial educational simulation. No player, team,
          board, or league affiliation or endorsement is implied. All game
          ratings and valuations are simulated. No copyright or trademark
          infringement is intended. No wagering or real-money play.
          Catalogue snapshot: {CATALOGUE_LAST_UPDATED}.
        </p>
      </footer>
    </main>
  );
}
