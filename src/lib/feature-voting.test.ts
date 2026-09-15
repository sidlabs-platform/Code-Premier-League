import {
  mkdtempSync,
  rmSync,
  writeFileSync,
} from "node:fs";
import os from "node:os";
import path from "node:path";
import { afterEach, describe, expect, it, vi } from "vitest";
import { FeatureVoteStore } from "@/lib/feature-voting";
import { featureVoteSchema } from "@/lib/schemas";

const temporaryDirectories: string[] = [];

function temporaryDataFile(): string {
  const directory = mkdtempSync(path.join(os.tmpdir(), "cpl-feature-votes-"));
  temporaryDirectories.push(directory);
  return path.join(directory, "votes.json");
}

afterEach(() => {
  vi.restoreAllMocks();
  for (const directory of temporaryDirectories.splice(0)) {
    rmSync(directory, { force: true, recursive: true });
  }
});

describe("feature vote store", () => {
  it("keeps one active vote per voter and allows that vote to change", async () => {
    const store = new FeatureVoteStore(temporaryDataFile());
    const voterId = "a8bfcd94-3348-4a5b-a12f-142676cad327";

    const first = await store.vote(voterId, "bid-war-overlay");
    expect(first.totalVotes).toBe(1);
    expect(first.yourFeatureId).toBe("bid-war-overlay");

    const repeated = await store.vote(voterId, "bid-war-overlay");
    expect(repeated.totalVotes).toBe(1);
    expect(
      repeated.features.find((feature) => feature.id === "bid-war-overlay")?.votes,
    ).toBe(1);

    const switched = await store.vote(voterId, "mystery-player-reveal");
    expect(switched.totalVotes).toBe(1);
    expect(switched.yourFeatureId).toBe("mystery-player-reveal");
    expect(
      switched.features.find((feature) => feature.id === "bid-war-overlay")?.votes,
    ).toBe(0);
    expect(
      switched.features.find((feature) => feature.id === "mystery-player-reveal")
        ?.votes,
    ).toBe(1);
  });

  it("serializes concurrent changes from the same voter", async () => {
    const store = new FeatureVoteStore(temporaryDataFile());
    const voterId = "ba25f142-9c61-4972-981e-4472ac5d7e4b";

    await Promise.all([
      store.vote(voterId, "post-match-awards"),
      store.vote(voterId, "audience-reactions"),
    ]);

    const snapshot = store.getSnapshot(voterId);
    expect(snapshot.totalVotes).toBe(1);
    expect(snapshot.yourFeatureId).toBe("audience-reactions");
  });

  it("bounds retained voters by evicting the oldest vote", async () => {
    const store = new FeatureVoteStore(temporaryDataFile(), 2);
    const oldestVoter = "2470ecb6-3705-46ca-81cb-295591358c6c";
    const retainedVoter = "47903ef5-bdf0-43d9-b881-b55f37181bb2";
    const newestVoter = "91f14d67-b3d8-48b4-9213-ec8de88d23a8";

    await store.vote(oldestVoter, "bid-war-overlay");
    await store.vote(retainedVoter, "post-match-awards");
    const bounded = await store.vote(newestVoter, "audience-reactions");

    expect(bounded.totalVotes).toBe(2);
    expect(store.getSnapshot(oldestVoter).yourFeatureId).toBeNull();
    expect(store.getSnapshot(retainedVoter).yourFeatureId).toBe(
      "post-match-awards",
    );
    expect(store.getSnapshot(newestVoter).yourFeatureId).toBe(
      "audience-reactions",
    );

    const returning = await store.vote(oldestVoter, "mystery-player-reveal");
    expect(returning.totalVotes).toBe(2);
    expect(returning.yourFeatureId).toBe("mystery-player-reveal");
    expect(store.getSnapshot(retainedVoter).yourFeatureId).toBeNull();
  });

  it("retains only the newest configured votes when loading", () => {
    const dataFile = temporaryDataFile();
    const firstVoter = "1374debd-777b-43d2-ad1c-459fd6d43089";
    const secondVoter = "d2306556-5dd3-439a-b3f4-986bbdc03711";
    const thirdVoter = "12983181-9a2e-45f6-882b-1caaee8f7542";
    writeFileSync(
      dataFile,
      JSON.stringify({
        version: 1,
        updatedAt: 123,
        votes: {
          [firstVoter]: "bid-war-overlay",
          [secondVoter]: "squad-strategy-advisor",
          [thirdVoter]: "mystery-player-reveal",
        },
      }),
      "utf8",
    );
    vi.spyOn(console, "warn").mockImplementation(() => undefined);

    const store = new FeatureVoteStore(dataFile, 2);

    expect(store.getSnapshot(firstVoter).yourFeatureId).toBeNull();
    expect(store.getSnapshot(secondVoter).yourFeatureId).toBe(
      "squad-strategy-advisor",
    );
    expect(store.getSnapshot(thirdVoter).yourFeatureId).toBe(
      "mystery-player-reveal",
    );
    expect(store.getSnapshot(thirdVoter).totalVotes).toBe(2);
  });

  it("starts clean when persisted vote data is corrupt", () => {
    const dataFile = temporaryDataFile();
    writeFileSync(dataFile, "{not-json", "utf8");
    vi.spyOn(console, "error").mockImplementation(() => undefined);

    const store = new FeatureVoteStore(dataFile);

    expect(store.getSnapshot("55e68c52-ec33-4110-9ee6-cd19fe9df784").totalVotes).toBe(
      0,
    );
  });

  it("does not report or retain a vote when persistence fails", async () => {
    const directory = mkdtempSync(path.join(os.tmpdir(), "cpl-feature-votes-"));
    temporaryDirectories.push(directory);
    const blockedParent = path.join(directory, "blocked");
    writeFileSync(blockedParent, "not a directory", "utf8");
    vi.spyOn(console, "error").mockImplementation(() => undefined);
    const store = new FeatureVoteStore(path.join(blockedParent, "votes.json"));
    const voterId = "ee42171d-147a-4349-9c74-8200bbbc4fc4";

    await expect(store.vote(voterId, "squad-strategy-advisor")).rejects.toThrow(
      "Your vote could not be saved.",
    );
    expect(store.getSnapshot(voterId).totalVotes).toBe(0);
  });

  it("rejects feature IDs outside the active ballot", () => {
    expect(featureVoteSchema.safeParse({ featureId: "write-in-candidate" }).success).toBe(
      false,
    );
  });
});
