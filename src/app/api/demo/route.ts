import { NextResponse } from "next/server";
import { roomStore } from "@/lib/store";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST() {
  const response = await roomStore.createRoom(
    {
      name: "Code Premier League Auto-play",
      maxParticipants: 24,
      bidIncrement: 50,
      timerSeconds: 8,
      quizEnabled: true,
    },
    true,
  );
  return NextResponse.json(response, {
    headers: { "Cache-Control": "no-store" },
  });
}
