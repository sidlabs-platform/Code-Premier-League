import { Suspense } from "react";
import Link from "next/link";
import { Brand, EducationalNotice } from "@/components/brand";
import { JoinForm } from "@/components/join-form";
import { LoadingBoard } from "@/components/ui";

export default function JoinPage() {
  return (
    <main className="join-page">
      <nav className="top-nav">
        <Brand />
        <Link href="/" className="text-link">
          Back to overview
        </Link>
      </nav>
      <div className="join-layout">
        <div className="join-copy">
          <h2>Your auction seat is one code away.</h2>
          <p>
            Join from your phone, track your DevCoins, and bid with large,
            thumb-friendly controls.
          </p>
          <div className="join-signal">
            <span>50</span>
            <div>
              <strong>Starting DevCrore</strong>
              <small>plus up to 15 from the dev quiz</small>
            </div>
          </div>
          <EducationalNotice />
        </div>
        <Suspense fallback={<LoadingBoard />}>
          <JoinForm />
        </Suspense>
      </div>
    </main>
  );
}
