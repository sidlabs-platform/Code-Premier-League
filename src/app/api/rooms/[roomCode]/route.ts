import { NextResponse } from "next/server";
import { DomainError, roomStore } from "@/lib/store";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(
  _request: Request,
  context: { params: Promise<{ roomCode: string }> },
) {
  try {
    const { roomCode } = await context.params;
    const snapshot = await roomStore.getSnapshot(roomCode);
    return NextResponse.json(
      { ok: true, snapshot },
      { headers: { "Cache-Control": "no-store" } },
    );
  } catch (error) {
    const status = error instanceof DomainError ? error.status : 500;
    const message =
      error instanceof DomainError ? error.message : "Could not load the room.";
    return NextResponse.json(
      { ok: false, error: message },
      { status, headers: { "Cache-Control": "no-store" } },
    );
  }
}
