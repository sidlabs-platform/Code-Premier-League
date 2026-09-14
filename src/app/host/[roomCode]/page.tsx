import { HostConsole } from "@/components/host-console";

export default async function HostRoomPage({
  params,
}: {
  params: Promise<{ roomCode: string }>;
}) {
  const { roomCode } = await params;
  return <HostConsole roomCode={roomCode.toUpperCase()} />;
}
