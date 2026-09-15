import { existsSync, mkdirSync, readFileSync } from "node:fs";
import { mkdir, rename, writeFile } from "node:fs/promises";
import path from "node:path";
import { z } from "zod";
import {
  FEATURE_VOTE_IDS,
  FEATURE_VOTE_OPTIONS,
  isFeatureVoteId,
  type FeatureVoteId,
  type FeatureVoteSnapshot,
} from "@/lib/feature-vote-options";

const DATA_DIRECTORY = path.join(process.cwd(), ".data");
const DATA_FILE = path.join(DATA_DIRECTORY, "cpl-feature-votes.json");

const persistedFeatureVotesSchema = z.object({
  version: z.literal(1),
  updatedAt: z.number().int().nonnegative(),
  votes: z.record(z.string().uuid(), z.enum(FEATURE_VOTE_IDS)),
});

export class FeatureVoteError extends Error {
  constructor(
    message: string,
    readonly status = 400,
  ) {
    super(message);
  }
}

export class FeatureVoteStore {
  private votes = new Map<string, FeatureVoteId>();
  private updatedAt = Date.now();
  private operationQueue: Promise<void> = Promise.resolve();

  constructor(private readonly dataFile = DATA_FILE) {
    this.load();
  }

  private load(): void {
    if (!existsSync(this.dataFile)) {
      return;
    }

    try {
      const parsed = persistedFeatureVotesSchema.parse(
        JSON.parse(readFileSync(this.dataFile, "utf8")),
      );
      this.votes = new Map(Object.entries(parsed.votes));
      this.updatedAt = parsed.updatedAt;
    } catch (error) {
      console.error("CPL could not load feature vote persistence.", error);
      this.votes = new Map();
      this.updatedAt = Date.now();
    }
  }

  private async persist(
    votes: ReadonlyMap<string, FeatureVoteId>,
    updatedAt: number,
  ): Promise<void> {
    try {
      const directory = path.dirname(this.dataFile);
      if (!existsSync(directory)) {
        mkdirSync(directory, { recursive: true });
      }
      await mkdir(directory, { recursive: true });
      const temporaryFile = `${this.dataFile}.tmp`;
      await writeFile(
        temporaryFile,
        JSON.stringify(
          {
            version: 1,
            updatedAt,
            votes: Object.fromEntries(votes),
          },
          null,
          2,
        ),
        "utf8",
      );
      await rename(temporaryFile, this.dataFile);
    } catch (error) {
      console.error("CPL could not persist feature votes.", error);
      throw new FeatureVoteError(
        "Your vote could not be saved. Please try again.",
        503,
      );
    }
  }

  private runExclusive<T>(operation: () => Promise<T>): Promise<T> {
    const result = this.operationQueue.then(operation, operation);
    this.operationQueue = result.then(
      () => undefined,
      () => undefined,
    );
    return result;
  }

  getSnapshot(voterId: string): FeatureVoteSnapshot {
    const counts = new Map<FeatureVoteId, number>(
      FEATURE_VOTE_OPTIONS.map((feature) => [feature.id, 0]),
    );
    for (const featureId of this.votes.values()) {
      counts.set(featureId, (counts.get(featureId) ?? 0) + 1);
    }

    const totalVotes = this.votes.size;
    return {
      features: FEATURE_VOTE_OPTIONS.map((feature) => {
        const votes = counts.get(feature.id) ?? 0;
        return {
          ...feature,
          votes,
          percentage:
            totalVotes === 0 ? 0 : Math.round((votes / totalVotes) * 1000) / 10,
        };
      }),
      totalVotes,
      yourFeatureId: this.votes.get(voterId) ?? null,
      updatedAt: this.updatedAt,
    };
  }

  async vote(
    voterId: string,
    featureId: FeatureVoteId,
  ): Promise<FeatureVoteSnapshot> {
    if (!isFeatureVoteId(featureId)) {
      throw new FeatureVoteError("Choose a feature from the active ballot.");
    }

    return this.runExclusive(async () => {
      if (this.votes.get(voterId) === featureId) {
        return this.getSnapshot(voterId);
      }

      const nextVotes = new Map(this.votes);
      nextVotes.set(voterId, featureId);
      const updatedAt = Date.now();
      await this.persist(nextVotes, updatedAt);
      this.votes = nextVotes;
      this.updatedAt = updatedAt;
      return this.getSnapshot(voterId);
    });
  }
}

declare global {
  var __cplFeatureVoteStore: FeatureVoteStore | undefined;
}

export const featureVoteStore =
  globalThis.__cplFeatureVoteStore ?? new FeatureVoteStore();
globalThis.__cplFeatureVoteStore = featureVoteStore;
