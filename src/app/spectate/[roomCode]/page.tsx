import { SpectatorView } from "@/components/spectator-view";

export default async function SpectatePage({
  params,
}: {
  params: Promise<{ roomCode: string }>;
}) {
  const { roomCode } = await params;
  return <SpectatorView roomCode={roomCode.toUpperCase()} />;
}
