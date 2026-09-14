import { ResultsPage } from "@/components/results-page";

export default async function ResultsRoute({
  params,
}: {
  params: Promise<{ roomCode: string }>;
}) {
  const { roomCode } = await params;
  return <ResultsPage roomCode={roomCode.toUpperCase()} />;
}
