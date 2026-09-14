import type { RoomConfig } from "@/lib/types";

export const DEVCOIN_UNITS_PER_CRORE = 100;
export const STARTING_BALANCE = 50 * DEVCOIN_UNITS_PER_CRORE;
export const QUIZ_BONUS_CAP = 15 * DEVCOIN_UNITS_PER_CRORE;

export const DEFAULT_ROOM_CONFIG: RoomConfig = {
  maxParticipants: 24,
  bidIncrement: 50,
  timerSeconds: 12,
  quizEnabled: true,
  squadSize: 11,
  maxOverseas: 4,
};

export const REQUIRED_ROLE_COUNTS = {
  BAT: 3,
  BOWL: 3,
  AR: 1,
  WK: 1,
} as const;

export const ROOM_CODE_ALPHABET = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
