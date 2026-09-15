function jsonForScript(value) {
  return JSON.stringify(value)
    .replaceAll("<", "\\u003c")
    .replaceAll(">", "\\u003e")
    .replaceAll("&", "\\u0026")
    .replaceAll("\u2028", "\\u2028")
    .replaceAll("\u2029", "\\u2029");
}

function escapeHtml(value) {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}

export function renderDashboardHtml({ appUrl, instanceId, token }) {
  const config = jsonForScript({ appUrl, instanceId, token });
  const safeAppUrl = escapeHtml(appUrl);
  return `<!doctype html>
<html lang="en">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <title>Feature vote dashboard</title>
    <style>
      :root {
        color-scheme: light dark;
        --canvas-bg: var(--background-color-default, #0b1320);
        --canvas-panel: var(--background-color-muted, #111f31);
        --canvas-raised: var(--background-color-emphasis, #1a2d44);
        --canvas-text: var(--text-color-default, #f5f1e8);
        --canvas-muted: var(--text-color-muted, #9fb1c8);
        --canvas-line: var(--border-color-default, #33475f);
        --canvas-focus: var(--color-focus-outline, #68d9ff);
        --signal: var(--true-color-red, #ff6047);
        --signal-soft: var(--true-color-red-muted, #ff806d);
        --live: var(--true-color-green, #d8ff45);
        --info: var(--true-color-blue, #68d9ff);
        --font-ui: var(--font-sans, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif);
        --font-display: var(--font-sans-display, var(--font-ui));
      }

      * { box-sizing: border-box; }

      html, body { min-height: 100%; }

      body {
        margin: 0;
        background:
          linear-gradient(90deg, transparent 49.8%, color-mix(in srgb, var(--canvas-line) 35%, transparent) 50%, transparent 50.2%),
          var(--canvas-bg);
        color: var(--canvas-text);
        font-family: var(--font-ui);
        font-size: var(--text-body-medium, 14px);
        line-height: var(--leading-body-medium, 20px);
      }

      button, input { font: inherit; }

      button:focus-visible, input:focus-visible {
        outline: 3px solid var(--canvas-focus);
        outline-offset: 3px;
      }

      .shell {
        display: grid;
        grid-template-rows: auto auto 1fr;
        min-height: 100vh;
      }

      .masthead {
        align-items: center;
        border-bottom: 1px solid var(--canvas-line);
        display: flex;
        gap: 16px;
        justify-content: space-between;
        min-height: 72px;
        padding: 14px clamp(16px, 3vw, 32px);
      }

      .brand {
        align-items: center;
        display: flex;
        gap: 12px;
        min-width: 0;
      }

      .mark {
        background: var(--canvas-text);
        color: var(--canvas-bg);
        display: grid;
        font-family: var(--font-display);
        font-size: var(--text-title-medium, 18px);
        font-weight: var(--font-weight-semibold, 600);
        height: 42px;
        place-items: center;
        transform: skew(-8deg);
        width: 42px;
      }

      .brand-copy { min-width: 0; }

      .brand-copy strong {
        display: block;
        font-family: var(--font-display);
        font-size: var(--text-title-medium, 18px);
        font-weight: var(--font-weight-semibold, 600);
        letter-spacing: -0.02em;
        line-height: var(--leading-title-medium, 24px);
      }

      .brand-copy span,
      .source-label {
        color: var(--canvas-muted);
        display: block;
        font-size: var(--text-caption, 12px);
        overflow: hidden;
        text-overflow: ellipsis;
        white-space: nowrap;
      }

      .live-badge {
        align-items: center;
        border: 1px solid var(--canvas-line);
        border-radius: 999px;
        display: inline-flex;
        flex: 0 0 auto;
        font-size: var(--text-caption, 12px);
        font-weight: var(--font-weight-semibold, 600);
        gap: 7px;
        letter-spacing: 0.08em;
        padding: 7px 10px;
        text-transform: uppercase;
      }

      .live-dot {
        background: var(--live);
        border: 2px solid var(--canvas-bg);
        border-radius: 50%;
        box-shadow: 0 0 0 2px var(--live);
        height: 8px;
        width: 8px;
      }

      .control-strip {
        align-items: center;
        background: var(--canvas-panel);
        border-bottom: 1px solid var(--canvas-line);
        display: grid;
        gap: 10px;
        grid-template-columns: minmax(0, 1fr) auto;
        padding: 12px clamp(16px, 3vw, 32px);
      }

      .url-control {
        align-items: center;
        display: grid;
        gap: 8px;
        grid-template-columns: auto minmax(0, 1fr);
        min-width: 0;
      }

      .url-control label {
        color: var(--canvas-muted);
        font-size: var(--text-caption, 12px);
        font-weight: var(--font-weight-semibold, 600);
        letter-spacing: 0.08em;
        text-transform: uppercase;
      }

      .url-control input {
        background: var(--canvas-bg);
        border: 1px solid var(--canvas-line);
        border-radius: 6px;
        color: var(--canvas-text);
        min-height: 38px;
        min-width: 0;
        padding: 8px 10px;
        width: 100%;
      }

      .command {
        background: var(--signal);
        border: 1px solid var(--signal);
        border-radius: 6px;
        box-shadow: 3px 4px 0 color-mix(in srgb, var(--signal) 70%, black);
        color: #0b1320;
        cursor: pointer;
        font-size: var(--text-caption, 12px);
        font-weight: var(--font-weight-semibold, 600);
        letter-spacing: 0.06em;
        min-height: 38px;
        padding: 8px 14px;
        text-transform: uppercase;
      }

      .command:hover { transform: translateY(-1px); }
      .command:disabled { cursor: wait; opacity: 0.6; }

      .dashboard {
        display: grid;
        gap: clamp(20px, 4vw, 44px);
        grid-template-columns: minmax(210px, 0.46fr) minmax(0, 1.54fr);
        padding: clamp(20px, 4vw, 48px);
      }

      .signal-rail {
        align-content: start;
        border-right: 1px solid var(--canvas-line);
        display: grid;
        gap: 28px;
        padding-right: clamp(20px, 3vw, 40px);
      }

      .total-label,
      .sync-label {
        color: var(--canvas-muted);
        display: block;
        font-size: var(--text-caption, 12px);
        font-weight: var(--font-weight-semibold, 600);
        letter-spacing: 0.1em;
        text-transform: uppercase;
      }

      .total {
        color: var(--live);
        display: block;
        font-family: var(--font-display);
        font-size: clamp(64px, 9vw, 124px);
        font-weight: var(--font-weight-semibold, 600);
        letter-spacing: -0.07em;
        line-height: 0.84;
        margin-top: 10px;
      }

      .total-unit {
        color: var(--canvas-muted);
        display: block;
        font-family: var(--font-display);
        font-size: var(--text-title-medium, 18px);
        font-weight: var(--font-weight-semibold, 600);
        letter-spacing: 0.08em;
        margin-top: 12px;
        text-transform: uppercase;
      }

      .sync-card {
        border-bottom: 1px solid var(--canvas-line);
        border-top: 1px solid var(--canvas-line);
        display: grid;
        gap: 12px;
        padding: 16px 0;
      }

      .sync-meter {
        background: var(--canvas-line);
        height: 4px;
        overflow: hidden;
      }

      .sync-meter span {
        animation: sync 3s linear infinite;
        background: var(--info);
        display: block;
        height: 100%;
        transform-origin: left;
      }

      .sync-time {
        color: var(--canvas-text);
        font-variant-numeric: tabular-nums;
        margin: 0;
      }

      .status {
        color: var(--canvas-muted);
        font-size: var(--text-caption, 12px);
        margin: 0;
      }

      .status.error { color: var(--signal-soft); }

      .board { min-width: 0; }

      .board-heading {
        align-items: end;
        border-bottom: 1px solid var(--canvas-line);
        display: flex;
        gap: 20px;
        justify-content: space-between;
        padding-bottom: 14px;
      }

      .board-heading h1 {
        font-family: var(--font-display);
        font-size: clamp(30px, 4vw, 54px);
        font-weight: var(--font-weight-semibold, 600);
        letter-spacing: -0.045em;
        line-height: 0.95;
        margin: 0;
      }

      .board-heading span {
        color: var(--canvas-muted);
        font-size: var(--text-caption, 12px);
        text-align: right;
      }

      .feature-list {
        display: grid;
        list-style: none;
        margin: 0;
        padding: 0;
      }

      .feature {
        align-items: center;
        border-bottom: 1px solid var(--canvas-line);
        display: grid;
        gap: 10px 16px;
        grid-template-columns: 38px minmax(0, 1fr) auto;
        padding: 18px 4px 14px;
      }

      .feature.leading {
        background: linear-gradient(90deg, color-mix(in srgb, var(--live) 10%, transparent), transparent 72%);
      }

      .rank {
        color: var(--canvas-muted);
        font-family: var(--font-display);
        font-size: var(--text-title-medium, 18px);
        font-variant-numeric: tabular-nums;
        font-weight: var(--font-weight-semibold, 600);
      }

      .feature-copy { min-width: 0; }

      .feature-copy strong {
        display: block;
        font-family: var(--font-display);
        font-size: var(--text-title-medium, 18px);
        font-weight: var(--font-weight-semibold, 600);
        letter-spacing: -0.015em;
      }

      .feature-copy p {
        color: var(--canvas-muted);
        margin: 4px 0 0;
        max-width: 72ch;
      }

      .effort {
        color: var(--info);
        display: block;
        font-size: var(--text-caption, 12px);
        font-weight: var(--font-weight-semibold, 600);
        letter-spacing: 0.06em;
        margin-top: 6px;
        text-transform: uppercase;
      }

      .score {
        align-items: end;
        display: grid;
        justify-items: end;
      }

      .score strong {
        font-family: var(--font-display);
        font-size: var(--text-title-large, 26px);
        font-variant-numeric: tabular-nums;
        font-weight: var(--font-weight-semibold, 600);
        line-height: 1;
      }

      .score span {
        color: var(--canvas-muted);
        font-size: var(--text-caption, 12px);
        font-variant-numeric: tabular-nums;
      }

      .bar {
        background: var(--canvas-line);
        grid-column: 2 / 4;
        height: 5px;
        overflow: hidden;
      }

      .bar span {
        background: var(--signal);
        display: block;
        height: 100%;
        transform: scaleX(0);
        transform-origin: left;
        transition: transform 420ms cubic-bezier(.2, .8, .2, 1);
      }

      .leading .bar span { background: var(--live); }

      .empty {
        border-bottom: 1px solid var(--canvas-line);
        color: var(--canvas-muted);
        padding: 42px 4px;
      }

      .empty strong {
        color: var(--canvas-text);
        display: block;
        font-family: var(--font-display);
        font-size: var(--text-title-medium, 18px);
        margin-bottom: 6px;
      }

      @keyframes sync {
        from { transform: scaleX(0); }
        to { transform: scaleX(1); }
      }

      @media (max-width: 760px) {
        .masthead { align-items: flex-start; }
        .brand-copy span { max-width: 52vw; }
        .control-strip { grid-template-columns: 1fr; }
        .url-control { grid-template-columns: 1fr; }
        .command { width: 100%; }
        .dashboard { grid-template-columns: 1fr; }
        .signal-rail {
          border-bottom: 1px solid var(--canvas-line);
          border-right: 0;
          grid-template-columns: 1fr 1fr;
          padding: 0 0 22px;
        }
        .total { font-size: 64px; }
        .board-heading { align-items: flex-start; flex-direction: column; }
        .board-heading span { text-align: left; }
        .feature {
          grid-template-columns: 28px minmax(0, 1fr) 56px;
          gap: 8px 10px;
        }
        .feature-copy p { display: none; }
        .score strong { font-size: var(--text-title-medium, 18px); }
      }

      @media (prefers-reduced-motion: reduce) {
        *, *::before, *::after {
          animation-duration: 0.01ms !important;
          animation-iteration-count: 1 !important;
          transition-duration: 0.01ms !important;
        }
      }
    </style>
  </head>
  <body>
    <main class="shell">
      <header class="masthead">
        <div class="brand">
          <div class="mark" aria-hidden="true">V</div>
          <div class="brand-copy">
            <strong>Feature vote signal</strong>
            <span id="source-label">${safeAppUrl}</span>
          </div>
        </div>
        <span class="live-badge"><span class="live-dot" aria-hidden="true"></span>Live</span>
      </header>

      <form class="control-strip" id="config-form">
        <div class="url-control">
          <label for="app-url">App URL</label>
          <input id="app-url" name="appUrl" type="url" required value="${safeAppUrl}" spellcheck="false" />
        </div>
        <button class="command" id="apply-button" type="submit">Apply source</button>
      </form>

      <section class="dashboard">
        <aside class="signal-rail">
          <div>
            <span class="total-label">Total signal</span>
            <strong class="total" id="total">--</strong>
            <span class="total-unit">Votes received</span>
          </div>
          <div class="sync-card">
            <span class="sync-label">Automatic refresh</span>
            <div class="sync-meter" aria-hidden="true"><span></span></div>
            <p class="sync-time" id="sync-time">Connecting...</p>
            <p class="status" id="status" role="status" aria-live="polite"></p>
          </div>
        </aside>

        <div class="board">
          <div class="board-heading">
            <h1>What should ship next?</h1>
            <span>Live leaderboard<br />updates every 3 seconds</span>
          </div>
          <ol class="feature-list" id="feature-list">
            <li class="empty"><strong>Opening the signal</strong>Waiting for the first vote snapshot.</li>
          </ol>
        </div>
      </section>
    </main>

    <script>
      const config = ${config};
      const total = document.getElementById("total");
      const list = document.getElementById("feature-list");
      const status = document.getElementById("status");
      const syncTime = document.getElementById("sync-time");
      const sourceLabel = document.getElementById("source-label");
      const form = document.getElementById("config-form");
      const input = document.getElementById("app-url");
      const applyButton = document.getElementById("apply-button");
      const number = new Intl.NumberFormat();
      let hasSnapshot = false;

      function element(tag, className, text) {
        const node = document.createElement(tag);
        if (className) node.className = className;
        if (text !== undefined) node.textContent = text;
        return node;
      }

      function render(snapshot) {
        total.textContent = number.format(snapshot.totalVotes);
        list.replaceChildren();

        if (!snapshot.features.length) {
          const empty = element("li", "empty");
          empty.append(
            element("strong", "", "No features are on the ballot"),
            document.createTextNode("The hosted app returned an empty feature list."),
          );
          list.append(empty);
          return;
        }

        const maxVotes = Math.max(...snapshot.features.map((feature) => feature.votes));
        snapshot.features
          .slice()
          .sort((left, right) => right.votes - left.votes || left.title.localeCompare(right.title))
          .forEach((feature, index) => {
            const item = element("li", "feature" + (maxVotes > 0 && feature.votes === maxVotes ? " leading" : ""));
            const rank = element("span", "rank", String(index + 1).padStart(2, "0"));
            const copy = element("div", "feature-copy");
            copy.append(
              element("strong", "", feature.title),
              element("p", "", feature.description),
              element("span", "effort", "Estimated build " + feature.effort),
            );
            const score = element("div", "score");
            score.append(
              element("strong", "", number.format(feature.votes)),
              element("span", "", feature.percentage + "%"),
            );
            const bar = element("span", "bar");
            const fill = element("span");
            fill.style.transform = "scaleX(" + (feature.percentage / 100) + ")";
            bar.append(fill);
            item.append(rank, copy, score, bar);
            list.append(item);
          });
      }

      async function loadVotes() {
        try {
          const response = await fetch("/api/votes", { cache: "no-store" });
          const body = await response.json();
          if (!response.ok || !body.ok) {
            throw new Error(body.error || "The vote signal could not be loaded.");
          }
          render(body.snapshot);
          hasSnapshot = true;
          sourceLabel.textContent = body.appUrl;
          syncTime.textContent = "Synced " + new Date().toLocaleTimeString([], {
            hour: "2-digit",
            minute: "2-digit",
            second: "2-digit",
          });
          status.textContent = "";
          status.className = "status";
        } catch (error) {
          status.textContent = error instanceof Error ? error.message : "The vote signal could not be loaded.";
          status.className = "status error";
          if (!hasSnapshot) {
            total.textContent = "--";
            const empty = element("li", "empty");
            empty.append(
              element("strong", "", "Signal unavailable"),
              document.createTextNode("Check the app URL and confirm its feature-vote API is online."),
            );
            list.replaceChildren(empty);
          }
        }
      }

      form.addEventListener("submit", async (event) => {
        event.preventDefault();
        applyButton.disabled = true;
        status.textContent = "Updating source...";
        status.className = "status";
        try {
          const response = await fetch("/api/config", {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              "X-Canvas-Token": config.token,
            },
            body: JSON.stringify({ appUrl: input.value }),
          });
          const body = await response.json();
          if (!response.ok || !body.ok) {
            throw new Error(body.error || "The source URL could not be updated.");
          }
          input.value = body.appUrl;
          sourceLabel.textContent = body.appUrl;
          await loadVotes();
        } catch (error) {
          status.textContent = error instanceof Error ? error.message : "The source URL could not be updated.";
          status.className = "status error";
        } finally {
          applyButton.disabled = false;
        }
      });

      loadVotes();
      window.setInterval(loadVotes, 3_000);
    </script>
  </body>
</html>`;
}
