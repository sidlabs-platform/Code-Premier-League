import { NextResponse } from "next/server";
import { ZodError } from "zod";
import { DomainError, roomStore } from "@/lib/store";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const response = await roomStore.createRoom(body, false);
    return NextResponse.json(response, {
      headers: { "Cache-Control": "no-store" },
    });
  } catch (error) {
    const message =
      error instanceof ZodError
        ? error.issues[0]?.message ?? "Invalid room configuration."
        : error instanceof DomainError
          ? error.message
          : "Could not create the room.";
    const status = error instanceof DomainError ? error.status : 400;
    return NextResponse.json(
      { ok: false, error: message },
      { status, headers: { "Cache-Control": "no-store" } },
    );
  }
}
