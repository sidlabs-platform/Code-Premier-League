import type { ActivityEvent } from "@/lib/types";

export const LIVE_MATCH_TICKER_LIMIT = 5;

export function selectLiveMatchTickerEvents(
  events: readonly ActivityEvent[],
  limit = LIVE_MATCH_TICKER_LIMIT,
): ActivityEvent[] {
  const boundedLimit = Math.max(0, Math.floor(limit));
  if (boundedLimit === 0) {
    return [];
  }

  return events.slice(-boundedLimit).reverse();
}
