import { z } from "zod";
import { FEATURE_VOTE_IDS } from "@/lib/feature-vote-options";

export const createRoomSchema = z.object({
  name: z.string().trim().min(3).max(48),
  maxParticipants: z.number().int().min(2).max(80),
  bidIncrement: z.number().int().min(25).max(500),
  timerSeconds: z.number().int().min(5).max(45),
  quizEnabled: z.boolean(),
});

export const featureVoteSchema = z.object({
  featureId: z.enum(FEATURE_VOTE_IDS),
});

const idempotencyKey = z.string().min(8).max(120);
const actorToken = z.string().min(20).max(200);

export const roomActionSchema = z.discriminatedUnion("type", [
  z.object({
    type: z.literal("join"),
    idempotencyKey,
    displayName: z.string().trim().min(2).max(24),
    teamName: z.string().trim().min(2).max(32).optional(),
  }),
  z.object({
    type: z.literal("bid"),
    idempotencyKey,
    actorToken,
    participantId: z.string().uuid(),
    amount: z.number().int().nonnegative(),
  }),
  z.object({
    type: z.literal("answerQuiz"),
    idempotencyKey,
    actorToken,
    participantId: z.string().uuid(),
    questionId: z.string(),
    selectedIndex: z.number().int().min(0).max(3),
  }),
  z.object({
    type: z.literal("openRegistration"),
    idempotencyKey,
    actorToken,
  }),
  z.object({
    type: z.literal("closeRegistration"),
    idempotencyKey,
    actorToken,
  }),
  z.object({
    type: z.literal("startQuiz"),
    idempotencyKey,
    actorToken,
  }),
  z.object({
    type: z.literal("revealQuiz"),
    idempotencyKey,
    actorToken,
  }),
  z.object({
    type: z.literal("nextQuiz"),
    idempotencyKey,
    actorToken,
  }),
  z.object({
    type: z.literal("startAuction"),
    idempotencyKey,
    actorToken,
    playerId: z.string(),
  }),
  z.object({
    type: z.literal("pauseAuction"),
    idempotencyKey,
    actorToken,
  }),
  z.object({
    type: z.literal("resumeAuction"),
    idempotencyKey,
    actorToken,
  }),
  z.object({
    type: z.literal("forceClose"),
    idempotencyKey,
    actorToken,
  }),
  z.object({
    type: z.literal("markUnsold"),
    idempotencyKey,
    actorToken,
  }),
  z.object({
    type: z.literal("endAuction"),
    idempotencyKey,
    actorToken,
  }),
  z.object({
    type: z.literal("publishResults"),
    idempotencyKey,
    actorToken,
  }),
  z.object({
    type: z.literal("resetRoom"),
    idempotencyKey,
    actorToken,
  }),
  z.object({
    type: z.literal("setSimulation"),
    idempotencyKey,
    actorToken,
    enabled: z.boolean(),
  }),
  z.object({
    type: z.literal("simulateTick"),
    idempotencyKey,
    actorToken,
  }),
]);

export type RoomAction = z.infer<typeof roomActionSchema>;
