import { ParticipantRoom } from "@/components/participant-room";

export default async function RoomPage({
  params,
}: {
  params: Promise<{ roomCode: string }>;
}) {
  const { roomCode } = await params;
  return <ParticipantRoom roomCode={roomCode.toUpperCase()} />;
}
