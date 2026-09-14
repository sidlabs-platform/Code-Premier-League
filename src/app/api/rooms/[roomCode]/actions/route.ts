import { NextResponse } from "next/server";
import { ZodError } from "zod";
import { DomainError, roomStore } from "@/lib/store";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(
  request: Request,
  context: { params: Promise<{ roomCode: string }> },
) {
  try {
    const { roomCode } = await context.params;
    const body = await request.json();
    const response = await roomStore.applyAction(roomCode, body);
    return NextResponse.json(response, {
      headers: { "Cache-Control": "no-store" },
    });
  } catch (error) {
    const message =
      error instanceof ZodError
        ? error.issues[0]?.message ?? "Invalid room action."
        : error instanceof DomainError
          ? error.message
          : "The room action could not be completed.";
    const status = error instanceof DomainError ? error.status : 400;
    return NextResponse.json(
      { ok: false, error: message },
      { status, headers: { "Cache-Control": "no-store" } },
    );
  }
}
