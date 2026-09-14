"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Bot } from "lucide-react";
import { createDemo, hostStorageKey } from "@/lib/client";
import { ErrorBanner, LoadingBoard } from "@/components/ui";

export function DemoLauncher() {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    void createDemo()
      .then((response) => {
        if (!active || !response.snapshot || !response.hostToken) return;
        localStorage.setItem(
          hostStorageKey(response.snapshot.code),
          response.hostToken,
        );
        router.replace(`/host/${response.snapshot.code}`);
      })
      .catch((caught) => {
        if (active) {
          setError(caught instanceof Error ? caught.message : "Auto-play launch failed.");
        }
      });
    return () => {
      active = false;
    };
  }, [router]);

  return (
    <main className="centered-page">
      <div className="auto-launch-card">
        <Bot size={38} aria-hidden="true" />
        <h1>Preparing auto-play</h1>
        <p>Setting up four automated teams and the curated player catalogue.</p>
        {error ? <ErrorBanner message={error} /> : <LoadingBoard label="Setting the auction desk" />}
      </div>
    </main>
  );
}
