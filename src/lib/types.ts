export type PlayerRole = "BAT" | "BOWL" | "AR" | "WK";
export type AuctionState = "idle" | "active" | "paused" | "sold" | "unsold";
export type RoomPhase = "waiting" | "quiz" | "auction" | "results";

export type PlayerStats = {
  batting: number;
  bowling: number;
  form: number;
  pressure: number;
  fielding: number;
  venue: number;
};

export type CataloguePlayer = {
  id: string;
  name: string;
  callSign: string;
  role: PlayerRole;
  overseas: boolean;
  origin: string;
  basePrice: number;
  bio: string;
  accent: string;
  stats: PlayerStats;
};

export type ChallengeQuestion = {
  id: string;
  prompt: string;
  options: [string, string, string, string];
  correctIndex: number;
  explanation: string;
};

export type RoomConfig = {
  maxParticipants: number;
  bidIncrement: number;
  timerSeconds: number;
  quizEnabled: boolean;
  squadSize: number;
  maxOverseas: number;
};

export type SquadPlayer = {
  playerId: string;
  price: number;
  acquiredAt: number;
};

export type Participant = {
  id: string;
  displayName: string;
  teamName: string;
  tokenHash: string;
  joinedAt: number;
  lastSeenAt: number;
  isBot: boolean;
  connected: boolean;
  startingBalance: number;
  quizBonus: number;
  balance: number;
  squad: SquadPlayer[];
};

export type Bid = {
  id: string;
  auctionId: string;
  participantId: string;
  amount: number;
  sequence: number;
  createdAt: number;
  idempotencyKey: string;
};

export type ActiveAuction = {
  id: string;
  playerId: string;
  state: AuctionState;
  startedAt: number;
  endsAt: number | null;
  pausedRemainingMs: number | null;
  highestBid: number;
  highestBidderId: string | null;
  soldPrice: number | null;
  winnerId: string | null;
};

export type AuctionRecord = ActiveAuction & {
  closedAt: number;
};

export type ChallengeAnswer = {
  participantId: string;
  questionId: string;
  selectedIndex: number;
  correct: boolean;
  awarded: number;
  answeredAt: number;
};

export type QuizState = {
  questionIds: string[];
  currentIndex: number;
  revealed: boolean;
  answers: Record<string, Record<string, ChallengeAnswer>>;
  fastestByQuestion: Record<string, string | null>;
};

export type ScoreBreakdown = {
  batting: number;
  bowling: number;
  teamBalance: number;
  form: number;
  pressure: number;
  fielding: number;
  venue: number;
  budgetEfficiency: number;
  weightedScore: number;
  penalties: Array<{ label: string; points: number }>;
};

export type ScoringResult = {
  participantId: string;
  teamName: string;
  displayName: string;
  score: number;
  rank: number;
  strengths: string[];
  gaps: string[];
  breakdown: ScoreBreakdown;
};

export type ActivityEvent = {
  id: string;
  type:
    | "room"
    | "participant"
    | "quiz"
    | "auction"
    | "bid"
    | "sold"
    | "results"
    | "simulation";
  message: string;
  createdAt: number;
};

export type IdempotentRecord = {
  createdAt: number;
  response: ActionResponse;
};

export type RoomState = {
  id: string;
  code: string;
  name: string;
  createdAt: number;
  updatedAt: number;
  version: number;
  seed: number;
  hostTokenHash: string;
  phase: RoomPhase;
  registrationOpen: boolean;
  config: RoomConfig;
  participants: Record<string, Participant>;
  auction: ActiveAuction | null;
  auctionHistory: AuctionRecord[];
  bids: Bid[];
  soldPlayerIds: string[];
  unsoldPlayerIds: string[];
  quiz: QuizState;
  results: ScoringResult[];
  resultsPublished: boolean;
  systemWarning: string | null;
  simulation: {
    enabled: boolean;
    label: "Simulation";
  };
  events: ActivityEvent[];
  idempotency: Record<string, IdempotentRecord>;
};

export type PublicQuestion = {
  id: string;
  prompt: string;
  options: [string, string, string, string];
  answeredParticipantIds: string[];
  revealed: boolean;
  correctIndex?: number;
  explanation?: string;
};

export type RoomSnapshot = Omit<
  RoomState,
  "hostTokenHash" | "idempotency" | "quiz" | "participants"
> & {
  participants: Array<Omit<Participant, "tokenHash">>;
  quiz: {
    currentIndex: number;
    totalQuestions: number;
    currentQuestion: PublicQuestion | null;
  };
  catalogue: CataloguePlayer[];
  serverTime: number;
};

export type ActionResponse = {
  ok: boolean;
  snapshot?: RoomSnapshot;
  error?: string;
  participantId?: string;
  participantToken?: string;
  hostToken?: string;
};
