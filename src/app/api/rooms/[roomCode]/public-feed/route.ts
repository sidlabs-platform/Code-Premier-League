import { NextResponse } from "next/server";
import {
  publicFeedCorsHeaders,
  projectPublicRoomFeed,
  type PublicRoomFeedResponse,
} from "@/lib/public-feed";
import { DomainError, roomStore } from "@/lib/store";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export function OPTIONS() {
  return new Response(null, {
    status: 204,
    headers: publicFeedCorsHeaders,
  });
}

export async function GET(
  _request: Request,
  context: { params: Promise<{ roomCode: string }> },
) {
  try {
    const { roomCode } = await context.params;
    const snapshot = await roomStore.getSnapshot(roomCode);
    const response: PublicRoomFeedResponse = {
      ok: true,
      feed: projectPublicRoomFeed(snapshot),
    };
    return NextResponse.json(response, { headers: publicFeedCorsHeaders });
  } catch (error) {
    const status = error instanceof DomainError ? error.status : 500;
    const message =
      error instanceof DomainError
        ? error.message
        : "Could not load the public room feed.";
    const response: PublicRoomFeedResponse = { ok: false, error: message };
    return NextResponse.json(response, {
      status,
      headers: publicFeedCorsHeaders,
    });
  }
}
