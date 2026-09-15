import { describe, expect, it } from "vitest";
import { selectLiveMatchTickerEvents } from "@/lib/live-match-ticker";
import type { ActivityEvent } from "@/lib/types";

function event(id: string, createdAt: number): ActivityEvent {
  return {
    id,
    type: "auction",
    message: `Signal ${id}`,
    createdAt,
  };
}

describe("live match ticker", () => {
  it("returns the newest events first without mutating the source", () => {
    const events = [event("one", 1), event("two", 2), event("three", 3)];

    expect(selectLiveMatchTickerEvents(events, 2).map(({ id }) => id)).toEqual([
      "three",
      "two",
    ]);
    expect(events.map(({ id }) => id)).toEqual(["one", "two", "three"]);
  });

  it("returns no events when the limit is not positive", () => {
    expect(selectLiveMatchTickerEvents([event("one", 1)], 0)).toEqual([]);
    expect(selectLiveMatchTickerEvents([event("one", 1)], -2)).toEqual([]);
  });
});
