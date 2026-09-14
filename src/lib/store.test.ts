import { describe, expect, it } from "vitest";
import { roomStore } from "@/lib/store";

describe("authoritative room store", () => {
  it("serializes competing bids, prevents self-outbid, and applies an idempotent sale", async () => {
    const created = await roomStore.createRoom({
      name: `Race Room ${Date.now()}`,
      maxParticipants: 12,
      bidIncrement: 50,
      timerSeconds: 20,
      quizEnabled: false,
    });
    const roomCode = created.snapshot!.code;
    const hostToken = created.hostToken!;

    const alpha = await roomStore.applyAction(roomCode, {
      type: "join",
      idempotencyKey: "join-alpha-0001",
      displayName: `Alpha-${Date.now()}`,
      teamName: "Alpha Architects",
    });
    const beta = await roomStore.applyAction(roomCode, {
      type: "join",
      idempotencyKey: "join-beta-00001",
      displayName: `Beta-${Date.now()}`,
      teamName: "Beta Builders",
    });

    await roomStore.applyAction(roomCode, {
      type: "startAuction",
      idempotencyKey: "start-player-001",
      actorToken: hostToken,
      playerId: "player-01",
    });

    const race = await Promise.allSettled([
      roomStore.applyAction(roomCode, {
        type: "bid",
        idempotencyKey: "alpha-bid-00001",
        actorToken: alpha.participantToken!,
        participantId: alpha.participantId!,
        amount: 100,
      }),
      roomStore.applyAction(roomCode, {
        type: "bid",
        idempotencyKey: "beta-bid-000001",
        actorToken: beta.participantToken!,
        participantId: beta.participantId!,
        amount: 100,
      }),
    ]);

    expect(race.filter((result) => result.status === "fulfilled")).toHaveLength(1);
    expect(race.filter((result) => result.status === "rejected")).toHaveLength(1);

    const afterRace = await roomStore.getSnapshot(roomCode);
    const leaderId = afterRace.auction!.highestBidderId!;
    const leaderSession =
      leaderId === alpha.participantId
        ? {
            participantId: alpha.participantId!,
            token: alpha.participantToken!,
          }
        : {
            participantId: beta.participantId!,
            token: beta.participantToken!,
          };

    await expect(
      roomStore.applyAction(roomCode, {
        type: "bid",
        idempotencyKey: "self-bid-0000001",
        actorToken: leaderSession.token,
        participantId: leaderSession.participantId,
        amount: 150,
      }),
    ).rejects.toThrow("You already hold the highest bid.");

    const closeAction = {
      type: "forceClose" as const,
      idempotencyKey: "close-sale-00001",
      actorToken: hostToken,
    };
    const firstClose = await roomStore.applyAction(roomCode, closeAction);
    const secondClose = await roomStore.applyAction(roomCode, closeAction);

    expect(secondClose.snapshot?.version).toBe(firstClose.snapshot?.version);
    const winner = secondClose.snapshot!.participants.find(
      (participant) => participant.id === leaderId,
    )!;
    expect(winner.squad).toHaveLength(1);
    expect(winner.balance).toBe(4900);
    expect(secondClose.snapshot!.soldPlayerIds).toEqual(["player-01"]);
  });
});
