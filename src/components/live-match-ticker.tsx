import { Radio } from "lucide-react";
import { selectLiveMatchTickerEvents } from "@/lib/live-match-ticker";
import type { ActivityEvent } from "@/lib/types";

const tickerTime = new Intl.DateTimeFormat("en", {
  hour: "2-digit",
  minute: "2-digit",
  hour12: false,
  timeZone: "UTC",
});

export function LiveMatchTicker({ events }: { events: readonly ActivityEvent[] }) {
  const latestEvents = selectLiveMatchTickerEvents(events, 4);

  return (
    <section className="live-match-ticker" aria-labelledby="live-ticker-title">
      <div className="live-ticker-heading">
        <Radio size={16} aria-hidden="true" />
        <h2 id="live-ticker-title">Live auction ticker</h2>
        <span>On air · {latestEvents.length} updates</span>
      </div>
      <ul
        className="live-ticker-grid"
        role="log"
        aria-atomic="false"
        aria-relevant="additions"
      >
        {latestEvents.length > 0 ? (
          latestEvents.map((event, index) => (
            <li key={event.id} className={index === 0 ? "is-latest" : undefined}>
              <time dateTime={new Date(event.createdAt).toISOString()}>
                {tickerTime.format(event.createdAt)} UTC
              </time>
              <span>
                {event.type}
                {index === 0 ? " · Latest" : ""}
              </span>
              <p>{event.message}</p>
              <time dateTime={new Date(event.createdAt).toISOString()}>
                {event.type.toUpperCase()} · {tickerTime.format(event.createdAt)} UTC
              </time>
            </li>
          ))
        ) : (
          <li className="live-ticker-empty">
            <p>Waiting for the first room signal.</p>
          </li>
        )}
      </ul>
    </section>
  );
}
