import { randomUUID } from "node:crypto";
import { NextRequest, NextResponse } from "next/server";
import { ZodError, z } from "zod";
import {
  FeatureVoteError,
  featureVoteStore,
} from "@/lib/feature-voting";
import { featureVoteSchema } from "@/lib/schemas";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const VOTER_COOKIE = "cpl-feature-voter";
const VOTER_COOKIE_MAX_AGE = 60 * 60 * 24 * 365;
const voterIdSchema = z.string().uuid();

function voterIdentity(request: NextRequest): {
  voterId: string;
  isNew: boolean;
} {
  const stored = request.cookies.get(VOTER_COOKIE)?.value;
  const parsed = voterIdSchema.safeParse(stored);
  if (parsed.success) {
    return { voterId: parsed.data, isNew: false };
  }
  return { voterId: randomUUID(), isNew: true };
}

function isJsonRequest(request: NextRequest): boolean {
  const mediaType = request.headers
    .get("content-type")
    ?.split(";", 1)[0]
    ?.trim()
    .toLowerCase();
  return mediaType === "application/json";
}

function responseWithIdentity(
  body: object,
  status: number,
  voterId: string,
  setCookie: boolean,
) {
  const response = NextResponse.json(body, {
    status,
    headers: { "Cache-Control": "no-store" },
  });
  if (setCookie) {
    response.cookies.set(VOTER_COOKIE, voterId, {
      httpOnly: true,
      maxAge: VOTER_COOKIE_MAX_AGE,
      path: "/",
      sameSite: "lax",
      secure: process.env.NODE_ENV === "production",
    });
  }
  return response;
}

export async function GET(request: NextRequest) {
  const { voterId, isNew } = voterIdentity(request);
  return responseWithIdentity(
    { ok: true, snapshot: featureVoteStore.getSnapshot(voterId) },
    200,
    voterId,
    isNew,
  );
}

export async function POST(request: NextRequest) {
  const { voterId, isNew } = voterIdentity(request);

  try {
    if (!isJsonRequest(request)) {
      throw new FeatureVoteError("Votes must be submitted as JSON.", 415);
    }
    const input = featureVoteSchema.parse(await request.json());
    const snapshot = await featureVoteStore.vote(voterId, input.featureId);
    return responseWithIdentity(
      { ok: true, snapshot },
      200,
      voterId,
      isNew,
    );
  } catch (error) {
    const message =
      error instanceof ZodError
        ? error.issues[0]?.message ?? "Choose one feature to vote for."
        : error instanceof FeatureVoteError
          ? error.message
          : "Your vote could not be recorded.";
    const status =
      error instanceof FeatureVoteError
        ? error.status
        : error instanceof ZodError || error instanceof SyntaxError
          ? 400
          : 500;
    return responseWithIdentity(
      { ok: false, error: message },
      status,
      voterId,
      isNew,
    );
  }
}
