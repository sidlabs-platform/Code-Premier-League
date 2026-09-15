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
