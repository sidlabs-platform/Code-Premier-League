import {
  existsSync,
  mkdirSync,
  readFileSync,
} from "node:fs";
import { mkdir, rename, writeFile } from "node:fs/promises";
import { createHash, randomBytes, randomUUID } from "node:crypto";
import path from "node:path";
import {
  DEFAULT_ROOM_CONFIG,
  QUIZ_BONUS_CAP,
  ROOM_CODE_ALPHABET,
  STARTING_BALANCE,
} from "@/lib/constants";
import { pickSeeded, seededValue } from "@/lib/random";
import { validateBid } from "@/lib/rules";
import { CHALLENGE_QUESTIONS, PLAYER_CATALOGUE } from "@/lib/seed";
import { rankParticipants } from "@/lib/scoring";
import { createRoomSchema, roomActionSchema, type RoomAction } from "@/lib/schemas";
import type {
  ActionResponse,
  ActivityEvent,
  ActiveAuction,
  Participant,
  RoomSnapshot,
  RoomState,
} from "@/lib/types";

const IDEMPOTENCY_TTL_MS = 5 * 60_000;
const IDEMPOTENCY_LIMIT = 500;
const EVENT_LIMIT = 120;
const DATA_DIRECTORY = path.join(process.cwd(), ".data");
const DATA_FILE = path.join(DATA_DIRECTORY, "cpl-rooms.json");

export class DomainError extends Error {
  constructor(
    message: string,
    readonly status = 400,
  ) {
    super(message);
  }
}

function digestToken(token: string): string {
  return createHash("sha256").update(token).digest("hex");
}

function createToken(): string {
  return randomBytes(32).toString("base64url");
}

function sameToken(expectedHash: string, token: string): boolean {
  return expectedHash === digestToken(token);
}

function addEvent(
  room: RoomState,
  type: ActivityEvent["type"],
  message: string,
  createdAt = Date.now(),
): void {
  room.events.push({
    id: randomUUID(),
    type,
    message,
    createdAt,
  });
  room.events = room.events.slice(-EVENT_LIMIT);
}

function getPlayer(playerId: string) {
  return PLAYER_CATALOGUE.find((player) => player.id === playerId);
}

function createAuction(room: RoomState, playerId: string, now: number): ActiveAuction {
  return {
    id: randomUUID(),
    playerId,
    state: "active",
    startedAt: now,
    endsAt: now + room.config.timerSeconds * 1000,
    pausedRemainingMs: null,
    highestBid: 0,
    highestBidderId: null,
    soldPrice: null,
    winnerId: null,
  };
}

function idempotencyActor(action: RoomAction): string {
  if (action.type === "join") {
    return `join:${action.displayName.toLocaleLowerCase()}`;
  }
  return digestToken(action.actorToken).slice(0, 16);
}

class RoomStore {
  private readonly rooms = new Map<string, RoomState>();
  private readonly locks = new Map<string, Promise<void>>();
  private persistQueue: Promise<void> = Promise.resolve();

  constructor() {
    this.load();
  }

  private load(): void {
    if (!existsSync(DATA_FILE)) {
      return;
    }

    try {
      const parsed = JSON.parse(readFileSync(DATA_FILE, "utf8")) as RoomState[];
      for (const room of parsed) {
        this.rooms.set(room.code, room);
      }
    } catch (error) {
      console.error("CPL could not load local room persistence.", error);
    }
  }

  private async persist(room?: RoomState): Promise<void> {
    const write = async () => {
      try {
        if (!existsSync(DATA_DIRECTORY)) {
          mkdirSync(DATA_DIRECTORY, { recursive: true });
        }
        await mkdir(DATA_DIRECTORY, { recursive: true });
        const temporaryFile = `${DATA_FILE}.tmp`;
        await writeFile(
          temporaryFile,
          JSON.stringify([...this.rooms.values()], null, 2),
          "utf8",
        );
        await rename(temporaryFile, DATA_FILE);
        if (room) room.systemWarning = null;
      } catch (error) {
        console.error("CPL could not persist room state.", error);
        if (room) {
          room.systemWarning =
            "Local persistence is unavailable. The live room still works, but a server restart will reset it.";
        }
      }
    };
    this.persistQueue = this.persistQueue.then(write, write);
    await this.persistQueue;
  }

  private withRoomLock<T>(code: string, operation: () => Promise<T> | T): Promise<T> {
    const previous = this.locks.get(code) ?? Promise.resolve();
    const result = previous.then(operation, operation);
    const sentinel = result.then(
      () => undefined,
      () => undefined,
    );
    this.locks.set(code, sentinel);
    return result.finally(() => {
      if (this.locks.get(code) === sentinel) {
        this.locks.delete(code);
      }
    });
  }

  private requireRoom(code: string): RoomState {
    const room = this.rooms.get(code.toUpperCase());
    if (!room) {
      throw new DomainError("Room not found. Check the six-character code.", 404);
    }
    return room;
  }

  private assertHost(room: RoomState, token: string): void {
    if (!sameToken(room.hostTokenHash, token)) {
      throw new DomainError("Host authorization is missing or expired.", 401);
    }
  }

  private assertParticipant(
    room: RoomState,
    participantId: string,
    token: string,
  ): Participant {
    const participant = room.participants[participantId];
    if (!participant || !sameToken(participant.tokenHash, token)) {
      throw new DomainError("Participant authorization is missing or expired.", 401);
    }
    participant.lastSeenAt = Date.now();
    participant.connected = true;
    return participant;
  }

  private bump(room: RoomState, now = Date.now()): void {
    room.version += 1;
    room.updatedAt = now;
  }

  private pruneIdempotency(room: RoomState, now: number): void {
    const active = Object.entries(room.idempotency)
      .filter(([, record]) => now - record.createdAt < IDEMPOTENCY_TTL_MS)
      .sort((left, right) => right[1].createdAt - left[1].createdAt)
      .slice(0, IDEMPOTENCY_LIMIT);
    room.idempotency = Object.fromEntries(active);
  }

  private finalizeAuction(room: RoomState, forceUnsold = false, now = Date.now()): void {
    const auction = room.auction;
    if (!auction || !["active", "paused"].includes(auction.state)) {
      return;
    }

    const player = getPlayer(auction.playerId);
    const winner = auction.highestBidderId
      ? room.participants[auction.highestBidderId]
      : undefined;
    const sold = !forceUnsold && Boolean(player && winner && auction.highestBid > 0);

    if (sold && player && winner) {
      winner.balance -= auction.highestBid;
      winner.squad.push({
        playerId: player.id,
        price: auction.highestBid,
        acquiredAt: now,
      });
      auction.state = "sold";
      auction.soldPrice = auction.highestBid;
      auction.winnerId = winner.id;
      room.soldPlayerIds.push(player.id);
      addEvent(
        room,
        "sold",
        `${player.name} sold to ${winner.teamName} for ${auction.highestBid} DevLakh.`,
        now,
      );
    } else {
      auction.state = "unsold";
      room.unsoldPlayerIds.push(auction.playerId);
      addEvent(room, "auction", `${player?.name ?? "Player"} marked unsold.`, now);
    }

    auction.endsAt = null;
    auction.pausedRemainingMs = null;
    room.auctionHistory.push({ ...auction, closedAt: now });
  }

  private tick(room: RoomState, now = Date.now()): boolean {
    if (
      room.auction?.state === "active" &&
      room.auction.endsAt !== null &&
      room.auction.endsAt <= now
    ) {
      this.finalizeAuction(room, false, now);
      this.bump(room, now);
      return true;
    }
    return false;
  }

  private snapshot(room: RoomState, now = Date.now()): RoomSnapshot {
    const activeQuestionId = room.quiz.questionIds[room.quiz.currentIndex];
    const question = CHALLENGE_QUESTIONS.find(
      (candidate) => candidate.id === activeQuestionId,
    );
    const answers = activeQuestionId
      ? room.quiz.answers[activeQuestionId] ?? {}
      : {};
    const currentQuestion = question
      ? {
          id: question.id,
          prompt: question.prompt,
          options: question.options,
          answeredParticipantIds: Object.keys(answers),
          revealed: room.quiz.revealed,
          ...(room.quiz.revealed
            ? {
                correctIndex: question.correctIndex,
                explanation: question.explanation,
              }
            : {}),
        }
      : null;

    const participants = Object.values(room.participants)
      .sort(
        (left, right) =>
          Number(left.isBot) - Number(right.isBot) ||
          left.joinedAt - right.joinedAt,
      )
      .map(({ tokenHash, ...participant }) => {
        void tokenHash;
        return participant;
      });

    return {
      id: room.id,
      code: room.code,
      name: room.name,
      createdAt: room.createdAt,
      updatedAt: room.updatedAt,
      version: room.version,
      seed: room.seed,
      phase: room.phase,
      registrationOpen: room.registrationOpen,
      config: room.config,
      participants,
      auction: room.auction,
      auctionHistory: room.auctionHistory,
      bids: room.bids.slice(-80),
      soldPlayerIds: room.soldPlayerIds,
      unsoldPlayerIds: room.unsoldPlayerIds,
      quiz: {
        currentIndex: room.quiz.currentIndex,
        totalQuestions: room.quiz.questionIds.length,
        currentQuestion,
      },
      results: room.results,
      resultsPublished: room.resultsPublished,
      systemWarning: room.systemWarning,
      simulation: room.simulation,
      events: room.events.slice(-60),
      catalogue: PLAYER_CATALOGUE,
      serverTime: now,
    };
  }

  private roomCode(): string {
    for (let attempt = 0; attempt < 100; attempt += 1) {
      const bytes = randomBytes(6);
      const code = Array.from(
        bytes,
        (byte) => ROOM_CODE_ALPHABET[byte % ROOM_CODE_ALPHABET.length],
      ).join("");
      if (!this.rooms.has(code)) return code;
    }
    throw new DomainError("Could not allocate a room code. Try again.", 503);
  }

  async createRoom(raw: unknown, demo = false): Promise<ActionResponse> {
    const input = createRoomSchema.parse(raw);
    const now = Date.now();
    const code = this.roomCode();
    const hostToken = createToken();
    const seed = Number.parseInt(code, 36) || now;
    const room: RoomState = {
      id: randomUUID(),
      code,
      name: input.name,
      createdAt: now,
      updatedAt: now,
      version: 1,
      seed,
      hostTokenHash: digestToken(hostToken),
      phase: "waiting",
      registrationOpen: true,
      config: {
        ...DEFAULT_ROOM_CONFIG,
        maxParticipants: input.maxParticipants,
        bidIncrement: input.bidIncrement,
        timerSeconds: input.timerSeconds,
        quizEnabled: input.quizEnabled,
      },
      participants: {},
      auction: null,
      auctionHistory: [],
      bids: [],
      soldPlayerIds: [],
      unsoldPlayerIds: [],
      quiz: {
        questionIds: pickSeeded(CHALLENGE_QUESTIONS, seed, 5).map(
          (question) => question.id,
        ),
        currentIndex: 0,
        revealed: false,
        answers: {},
        fastestByQuestion: {},
      },
      results: [],
      resultsPublished: false,
      systemWarning: null,
      simulation: {
        enabled: demo,
        label: "Simulation",
      },
      events: [],
      idempotency: {},
    };

    addEvent(room, "room", `${room.name} created. Registration is open.`, now);
    if (demo) {
      const botNames = [
        ["Ada Loop", "Runtime Royals"],
        ["Lin Merge", "Branch Blazers"],
        ["Sam Cache", "Packet Pioneers"],
        ["Noor Stack", "Syntax Strikers"],
      ] as const;
      for (const [displayName, teamName] of botNames) {
        const id = randomUUID();
        room.participants[id] = {
          id,
          displayName,
          teamName,
          tokenHash: "simulation",
          joinedAt: now,
          lastSeenAt: now,
          isBot: true,
          connected: true,
          startingBalance: STARTING_BALANCE,
          quizBonus: 0,
          balance: STARTING_BALANCE,
          squad: [],
        };
      }
      addEvent(room, "simulation", "Four automated teams joined auto-play.", now);
    }
    this.rooms.set(code, room);
    await this.persist(room);

    return {
      ok: true,
      hostToken,
      snapshot: this.snapshot(room),
    };
  }

  async getSnapshot(code: string): Promise<RoomSnapshot> {
    return this.withRoomLock(code.toUpperCase(), async () => {
      const room = this.requireRoom(code);
      const changed = this.tick(room);
      if (changed) await this.persist(room);
      return this.snapshot(room);
    });
  }

  async applyAction(code: string, raw: unknown): Promise<ActionResponse> {
    const action = roomActionSchema.parse(raw);
    return this.withRoomLock(code.toUpperCase(), async () => {
      const room = this.requireRoom(code);
      const now = Date.now();
      this.tick(room, now);
      this.pruneIdempotency(room, now);
      const cacheKey = `${idempotencyActor(action)}:${action.idempotencyKey}`;
      const cached = room.idempotency[cacheKey];
      if (cached) {
        return cached.response;
      }

      const credentials = this.applyValidatedAction(room, action, now);
      this.bump(room, now);
      const response: ActionResponse = {
        ok: true,
        ...credentials,
        snapshot: this.snapshot(room, now),
      };
      room.idempotency[cacheKey] = { createdAt: now, response };
      await this.persist(room);
      return response;
    });
  }

  private applyValidatedAction(
    room: RoomState,
    action: RoomAction,
    now: number,
  ): Pick<ActionResponse, "participantId" | "participantToken"> {
    if (action.type === "join") {
      if (!room.registrationOpen || room.phase !== "waiting") {
        throw new DomainError("Registration is closed for this room.");
      }
      const participants = Object.values(room.participants);
      const realParticipants = participants.filter((participant) => !participant.isBot);
      if (realParticipants.length >= room.config.maxParticipants) {
        throw new DomainError("This room has reached its participant limit.");
      }
      if (
        participants.some(
          (participant) =>
            participant.displayName.toLocaleLowerCase() ===
            action.displayName.toLocaleLowerCase(),
        )
      ) {
        throw new DomainError("That display name is already in this room.");
      }
      const participantToken = createToken();
      const participantId = randomUUID();
      const participant: Participant = {
        id: participantId,
        displayName: action.displayName,
        teamName: action.teamName?.trim() || `${action.displayName}'s XI`,
        tokenHash: digestToken(participantToken),
        joinedAt: now,
        lastSeenAt: now,
        isBot: false,
        connected: true,
        startingBalance: STARTING_BALANCE,
        quizBonus: 0,
        balance: STARTING_BALANCE,
        squad: [],
      };
      room.participants[participantId] = participant;
      if (room.simulation.enabled) {
        room.simulation.enabled = false;
        addEvent(
          room,
          "simulation",
          "Simulation paused because a live participant joined.",
          now,
        );
      }
      addEvent(room, "participant", `${participant.displayName} joined ${room.name}.`, now);
      return { participantId, participantToken };
    }

    if (action.type === "bid") {
      const participant = this.assertParticipant(
        room,
        action.participantId,
        action.actorToken,
      );
      const decision = validateBid(room, participant, action.amount);
      if (!decision.ok) throw new DomainError(decision.reason);
      if (!room.auction) throw new DomainError("No active auction.");

      const bid = {
        id: randomUUID(),
        auctionId: room.auction.id,
        participantId: participant.id,
        amount: action.amount,
        sequence: room.bids.length + 1,
        createdAt: now,
        idempotencyKey: action.idempotencyKey,
      };
      room.bids.push(bid);
      room.auction.highestBid = action.amount;
      room.auction.highestBidderId = participant.id;
      room.auction.endsAt = now + room.config.timerSeconds * 1000;
      addEvent(
        room,
        "bid",
        `${participant.teamName} bid ${action.amount} DevLakh.`,
        now,
      );
      return {};
    }

    if (action.type === "answerQuiz") {
      const participant = this.assertParticipant(
        room,
        action.participantId,
        action.actorToken,
      );
      if (room.phase !== "quiz" || room.quiz.revealed) {
        throw new DomainError("This quiz question is not accepting answers.");
      }
      const questionId = room.quiz.questionIds[room.quiz.currentIndex];
      if (questionId !== action.questionId) {
        throw new DomainError("That question is no longer active.");
      }
      room.quiz.answers[questionId] ??= {};
      if (room.quiz.answers[questionId][participant.id]) {
        throw new DomainError("You already answered this question.");
      }
      const question = CHALLENGE_QUESTIONS.find(
        (candidate) => candidate.id === questionId,
      );
      if (!question) throw new DomainError("Quiz question not found.");
      const correct = question.correctIndex === action.selectedIndex;
      const fastest = correct && !room.quiz.fastestByQuestion[questionId];
      const potentialAward = correct ? (fastest ? 300 : 200) : 0;
      const awarded = Math.min(
        potentialAward,
        Math.max(0, QUIZ_BONUS_CAP - participant.quizBonus),
      );
      if (fastest) room.quiz.fastestByQuestion[questionId] = participant.id;
      participant.quizBonus += awarded;
      participant.balance += awarded;
      room.quiz.answers[questionId][participant.id] = {
        participantId: participant.id,
        questionId,
        selectedIndex: action.selectedIndex,
        correct,
        awarded,
        answeredAt: now,
      };
      addEvent(
        room,
        "quiz",
        `${participant.displayName} locked an answer.`,
        now,
      );
      return {};
    }

    this.assertHost(room, action.actorToken);

    switch (action.type) {
      case "openRegistration":
        if (room.phase !== "waiting") throw new DomainError("The game has already started.");
        room.registrationOpen = true;
        addEvent(room, "room", "Registration opened.", now);
        break;
      case "closeRegistration":
        room.registrationOpen = false;
        addEvent(room, "room", "Registration closed.", now);
        break;
      case "startQuiz":
        if (!room.config.quizEnabled) throw new DomainError("Quiz mode is disabled.");
        if (Object.keys(room.participants).length === 0) {
          throw new DomainError("At least one participant must join first.");
        }
        room.phase = "quiz";
        room.registrationOpen = false;
        room.quiz.currentIndex = 0;
        room.quiz.revealed = false;
        addEvent(room, "quiz", "The five-question DevCoin sprint started.", now);
        break;
      case "revealQuiz":
        if (room.phase !== "quiz") throw new DomainError("The quiz is not active.");
        room.quiz.revealed = true;
        addEvent(room, "quiz", "Answer revealed.", now);
        break;
      case "nextQuiz":
        if (room.phase !== "quiz") throw new DomainError("The quiz is not active.");
        if (!room.quiz.revealed) throw new DomainError("Reveal the answer first.");
        if (room.quiz.currentIndex >= room.quiz.questionIds.length - 1) {
          room.phase = "auction";
          room.quiz.revealed = false;
          addEvent(room, "quiz", "Quiz complete. Auction desk is live.", now);
        } else {
          room.quiz.currentIndex += 1;
          room.quiz.revealed = false;
          addEvent(
            room,
            "quiz",
            `Question ${room.quiz.currentIndex + 1} is live.`,
            now,
          );
        }
        break;
      case "startAuction": {
        if (room.auction && ["active", "paused"].includes(room.auction.state)) {
          throw new DomainError("Close the current player before selecting another.");
        }
        const player = getPlayer(action.playerId);
        if (!player) throw new DomainError("Player not found.");
        if (
          room.soldPlayerIds.includes(player.id) ||
          room.unsoldPlayerIds.includes(player.id)
        ) {
          throw new DomainError("That player has already left the auction pool.");
        }
        room.phase = "auction";
        room.registrationOpen = false;
        room.auction = createAuction(room, player.id, now);
        addEvent(room, "auction", `${player.name} entered the auction.`, now);
        break;
      }
      case "pauseAuction":
        if (
          !room.auction ||
          room.auction.state !== "active" ||
          room.auction.endsAt === null
        ) {
          throw new DomainError("There is no active countdown to pause.");
        }
        room.auction.pausedRemainingMs = Math.max(0, room.auction.endsAt - now);
        room.auction.endsAt = null;
        room.auction.state = "paused";
        addEvent(room, "auction", "Auction paused by host.", now);
        break;
      case "resumeAuction":
        if (!room.auction || room.auction.state !== "paused") {
          throw new DomainError("The auction is not paused.");
        }
        room.auction.endsAt =
          now + (room.auction.pausedRemainingMs ?? room.config.timerSeconds * 1000);
        room.auction.pausedRemainingMs = null;
        room.auction.state = "active";
        addEvent(room, "auction", "Auction resumed.", now);
        break;
      case "forceClose":
        if (!room.auction || !["active", "paused"].includes(room.auction.state)) {
          throw new DomainError("There is no open auction to close.");
        }
        this.finalizeAuction(room, false, now);
        break;
      case "markUnsold":
        if (!room.auction || !["active", "paused"].includes(room.auction.state)) {
          throw new DomainError("There is no open auction to mark unsold.");
        }
        this.finalizeAuction(room, true, now);
        break;
      case "endAuction":
        if (room.auction && ["active", "paused"].includes(room.auction.state)) {
          this.finalizeAuction(room, false, now);
        }
        room.results = rankParticipants(Object.values(room.participants), room.config);
        room.phase = "results";
        room.resultsPublished = false;
        addEvent(room, "results", "Auction closed. Scores are ready for review.", now);
        break;
      case "publishResults":
        room.results = rankParticipants(Object.values(room.participants), room.config);
        room.phase = "results";
        room.resultsPublished = true;
        addEvent(room, "results", "Final leaderboard published.", now);
        break;
      case "resetRoom":
        room.phase = "waiting";
        room.registrationOpen = true;
        room.auction = null;
        room.auctionHistory = [];
        room.bids = [];
        room.soldPlayerIds = [];
        room.unsoldPlayerIds = [];
        room.results = [];
        room.resultsPublished = false;
        room.quiz.currentIndex = 0;
        room.quiz.revealed = false;
        room.quiz.answers = {};
        room.quiz.fastestByQuestion = {};
        for (const participant of Object.values(room.participants)) {
          participant.balance = participant.startingBalance;
          participant.quizBonus = 0;
          participant.squad = [];
        }
        room.events = [];
        addEvent(room, "room", "Room reset to its seeded starting state.", now);
        break;
      case "setSimulation":
        if (
          action.enabled &&
          Object.values(room.participants).some((participant) => !participant.isBot)
        ) {
          throw new DomainError(
            "Auto-play stays off while live participants are in the room.",
          );
        }
        room.simulation.enabled = action.enabled;
        addEvent(
          room,
          "simulation",
          action.enabled ? "Auto-play started." : "Auto-play paused.",
          now,
        );
        break;
      case "simulateTick":
        this.simulate(room, now);
        break;
    }

    return {};
  }

  private simulate(room: RoomState, now: number): void {
    if (!room.simulation.enabled) {
      throw new DomainError("Auto-play is paused.");
    }
    if (Object.values(room.participants).some((participant) => !participant.isBot)) {
      room.simulation.enabled = false;
      throw new DomainError("Auto-play stopped because a live participant joined.");
    }
    if (room.auction && ["sold", "unsold"].includes(room.auction.state)) {
      room.auction = null;
    }
    if (!room.auction) {
      const available = PLAYER_CATALOGUE.filter(
        (player) =>
          !room.soldPlayerIds.includes(player.id) &&
          !room.unsoldPlayerIds.includes(player.id),
      );
      if (available.length === 0) {
        room.results = rankParticipants(Object.values(room.participants), room.config);
        room.phase = "results";
        room.resultsPublished = true;
        room.simulation.enabled = false;
        addEvent(room, "results", "Auto-play completed and published results.", now);
        return;
      }
      const player =
        available[Math.floor(seededValue(room.seed, room.version) * available.length)];
      room.phase = "auction";
      room.registrationOpen = false;
      room.auction = createAuction(room, player.id, now);
      addEvent(room, "simulation", `${player.name} loaded into auto-play.`, now);
      return;
    }
    if (room.auction.state !== "active") return;

    const player = getPlayer(room.auction.playerId);
    if (!player) {
      this.finalizeAuction(room, true, now);
      return;
    }
    const auctionBidCount = room.bids.filter(
      (bid) => bid.auctionId === room.auction?.id,
    ).length;
    // Keep automated bidding competitive without exhausting all four team budgets
    // before the complete catalogue can be allocated.
    if (auctionBidCount >= 2) {
      this.finalizeAuction(room, false, now);
      return;
    }

    const minimum =
      room.auction.highestBid === 0
        ? player.basePrice
        : room.auction.highestBid + room.config.bidIncrement;
    const automatedTeams = Object.values(room.participants)
      .filter((participant) => participant.isBot)
      .sort((left, right) => left.teamName.localeCompare(right.teamName));
    const overseasPlayers = PLAYER_CATALOGUE.filter(
      (candidate) => candidate.overseas,
    ).length;
    const baseOverseasQuota = Math.floor(
      overseasPlayers / automatedTeams.length,
    );
    const extraOverseasSlots = overseasPlayers % automatedTeams.length;
    const overseasQuotas = new Map(
      automatedTeams.map((participant, index) => [
        participant.id,
        baseOverseasQuota + (index < extraOverseasSlots ? 1 : 0),
      ]),
    );
    const bots = automatedTeams.filter((participant) => {
      if (!participant.isBot || participant.id === room.auction?.highestBidderId) {
        return false;
      }
      const overseasQuota = overseasQuotas.get(participant.id) ?? 0;
      const typeQuota = player.overseas
        ? overseasQuota
        : room.config.squadSize - overseasQuota;
      const typeCount = participant.squad.filter(
        (entry) => getPlayer(entry.playerId)?.overseas === player.overseas,
      ).length;
      if (typeCount >= typeQuota) return false;
      const rating =
        (player.stats.batting +
          player.stats.bowling +
          player.stats.form +
          player.stats.pressure) /
        4;
      const strategy = 650 + rating * 10 + participant.squad.length * 30;
      return minimum <= strategy && validateBid(room, participant, minimum).ok;
    });

    if (bots.length === 0) {
      this.finalizeAuction(room, false, now);
      return;
    }

    let preferredBots = bots;
    if (player.overseas) {
      const overseasCounts = preferredBots.map(
        (bot) =>
          bot.squad.filter(
            (entry) => getPlayer(entry.playerId)?.overseas,
          ).length,
      );
      const smallestOverseasCount = Math.min(...overseasCounts);
      preferredBots = preferredBots.filter(
        (bot) =>
          bot.squad.filter(
            (entry) => getPlayer(entry.playerId)?.overseas,
          ).length === smallestOverseasCount,
      );
    }
    const smallestSquad = Math.min(
      ...preferredBots.map((bot) => bot.squad.length),
    );
    preferredBots = preferredBots.filter(
      (bot) => bot.squad.length === smallestSquad,
    );
    const highestBalance = Math.max(...preferredBots.map((bot) => bot.balance));
    preferredBots = preferredBots.filter((bot) => bot.balance === highestBalance);
    const bot =
      preferredBots[
        Math.floor(
          seededValue(room.seed, room.version + 7) * preferredBots.length,
        )
      ];
    room.bids.push({
      id: randomUUID(),
      auctionId: room.auction.id,
      participantId: bot.id,
      amount: minimum,
      sequence: room.bids.length + 1,
      createdAt: now,
      idempotencyKey: `simulation-${room.version}`,
    });
    room.auction.highestBid = minimum;
    room.auction.highestBidderId = bot.id;
    room.auction.endsAt = now + room.config.timerSeconds * 1000;
    addEvent(room, "bid", `${bot.teamName} placed an automated ${minimum} DevLakh bid.`, now);
  }
}

declare global {
  var __cplRoomStore: RoomStore | undefined;
}

export const roomStore = globalThis.__cplRoomStore ?? new RoomStore();
globalThis.__cplRoomStore = roomStore;
