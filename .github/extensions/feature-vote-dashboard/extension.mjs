import { randomBytes } from "node:crypto";
import { createServer } from "node:http";
import {
  CanvasError,
  createCanvas,
  joinSession,
} from "@github/copilot-sdk/extension";
import { renderDashboardHtml } from "./renderer.mjs";

const servers = new Map();

function normalizeAppUrl(value) {
  if (typeof value !== "string" || value.trim() === "") {
    throw new CanvasError("invalid_app_url", "A hosted app URL is required.");
  }

  let parsed;
  try {
    parsed = new URL(value.trim());
  } catch {
    throw new CanvasError(
      "invalid_app_url",
      "The hosted app URL must be a valid HTTP or HTTPS URL.",
    );
  }

  if (!["http:", "https:"].includes(parsed.protocol)) {
    throw new CanvasError(
      "invalid_app_url",
      "The hosted app URL must use HTTP or HTTPS.",
    );
  }

  if (parsed.username || parsed.password) {
    throw new CanvasError(
      "invalid_app_url",
      "The hosted app URL must not include credentials.",
    );
  }

  parsed.hash = "";
  parsed.search = "";
  parsed.pathname = parsed.pathname.replace(/\/+$/, "");
  return parsed.toString().replace(/\/$/, "");
}

function votesEndpoint(appUrl) {
  return new URL(`${appUrl}/api/feature-votes`);
}

function normalizeVoteSnapshot(payload) {
  const snapshot = payload?.snapshot;
  if (!payload?.ok || !snapshot || !Array.isArray(snapshot.features)) {
    throw new Error("The app returned an unexpected feature-vote response.");
  }

  const features = snapshot.features.slice(0, 20).map((feature) => {
    if (
      !feature ||
      typeof feature.id !== "string" ||
      typeof feature.title !== "string" ||
      typeof feature.description !== "string" ||
      typeof feature.effort !== "string" ||
      !Number.isFinite(feature.votes) ||
      !Number.isFinite(feature.percentage)
    ) {
      throw new Error("The app returned an invalid feature-vote entry.");
    }

    return {
      id: feature.id.slice(0, 120),
      title: feature.title.slice(0, 160),
      description: feature.description.slice(0, 600),
      effort: feature.effort.slice(0, 80),
      votes: Math.max(0, Math.floor(feature.votes)),
      percentage: Math.min(100, Math.max(0, feature.percentage)),
    };
  });

  if (!Number.isFinite(snapshot.totalVotes) || snapshot.totalVotes < 0) {
    throw new Error("The app returned an invalid total vote count.");
  }

  return {
    features,
    totalVotes: Math.floor(snapshot.totalVotes),
    updatedAt: Number.isFinite(snapshot.updatedAt)
      ? snapshot.updatedAt
      : Date.now(),
  };
}

async function fetchVoteSnapshot(appUrl) {
  let response;
  try {
    response = await fetch(votesEndpoint(appUrl), {
      cache: "no-store",
      headers: { Accept: "application/json" },
      redirect: "follow",
      signal: AbortSignal.timeout(8_000),
    });
  } catch (error) {
    throw new Error(
      error instanceof Error && error.name === "TimeoutError"
        ? "The hosted app did not respond within eight seconds."
        : "The hosted app could not be reached.",
    );
  }

  if (!response.ok) {
    throw new Error(`The hosted app returned HTTP ${response.status}.`);
  }

  let payload;
  try {
    payload = await response.json();
  } catch {
    throw new Error("The hosted app did not return valid JSON.");
  }

  return normalizeVoteSnapshot(payload);
}

function sendJson(res, status, body) {
  res.writeHead(status, {
    "Cache-Control": "no-store",
    "Content-Type": "application/json; charset=utf-8",
  });
  res.end(JSON.stringify(body));
}

async function readJson(req) {
  const chunks = [];
  let size = 0;
  for await (const chunk of req) {
    size += chunk.length;
    if (size > 4_096) {
      throw new Error("Request body is too large.");
    }
    chunks.push(chunk);
  }
  return JSON.parse(Buffer.concat(chunks).toString("utf8"));
}

async function startServer(instanceId, initialAppUrl) {
  const entry = {
    appUrl: normalizeAppUrl(initialAppUrl),
    token: randomBytes(24).toString("base64url"),
    server: null,
    url: "",
  };

  const server = createServer(async (req, res) => {
    const requestUrl = new URL(req.url ?? "/", "http://127.0.0.1");

    if (req.method === "GET" && requestUrl.pathname === "/") {
      res.writeHead(200, {
        "Cache-Control": "no-store",
        "Content-Security-Policy":
          "default-src 'none'; connect-src 'self'; img-src 'self' data:; script-src 'unsafe-inline'; style-src 'unsafe-inline';",
        "Content-Type": "text/html; charset=utf-8",
        "Referrer-Policy": "no-referrer",
        "X-Content-Type-Options": "nosniff",
      });
      res.end(
        renderDashboardHtml({
          appUrl: entry.appUrl,
          instanceId,
          token: entry.token,
        }),
      );
      return;
    }

    if (req.method === "GET" && requestUrl.pathname === "/api/votes") {
      try {
        const snapshot = await fetchVoteSnapshot(entry.appUrl);
        sendJson(res, 200, {
          ok: true,
          appUrl: entry.appUrl,
          snapshot,
        });
      } catch (error) {
        sendJson(res, 502, {
          ok: false,
          appUrl: entry.appUrl,
          error:
            error instanceof Error
              ? error.message
              : "The vote totals could not be loaded.",
        });
      }
      return;
    }

    if (req.method === "POST" && requestUrl.pathname === "/api/config") {
      if (req.headers["x-canvas-token"] !== entry.token) {
        sendJson(res, 403, { ok: false, error: "Invalid canvas token." });
        return;
      }

      try {
        const body = await readJson(req);
        entry.appUrl = normalizeAppUrl(body?.appUrl);
        sendJson(res, 200, { ok: true, appUrl: entry.appUrl });
      } catch (error) {
        sendJson(res, 400, {
          ok: false,
          error:
            error instanceof Error ? error.message : "The URL could not be updated.",
        });
      }
      return;
    }

    if (req.method === "GET" && requestUrl.pathname === "/favicon.ico") {
      res.writeHead(204);
      res.end();
      return;
    }

    sendJson(res, 404, { ok: false, error: "Not found." });
  });

  await new Promise((resolve, reject) => {
    server.once("error", reject);
    server.listen(0, "127.0.0.1", resolve);
  });
  const address = server.address();
  const port = typeof address === "object" && address ? address.port : 0;
  entry.server = server;
  entry.url = `http://127.0.0.1:${port}/`;
  return entry;
}

function requireInstance(instanceId) {
  const entry = servers.get(instanceId);
  if (!entry) {
    throw new CanvasError(
      "canvas_not_open",
      "Open the feature vote dashboard before invoking this action.",
    );
  }
  return entry;
}

await joinSession({
  canvases: [
    createCanvas({
      id: "feature-vote-dashboard",
      displayName: "Feature vote dashboard",
      description:
        "Shows a live, three-second leaderboard of feature votes from a configurable app URL.",
      inputSchema: {
        type: "object",
        additionalProperties: false,
        properties: {
          appUrl: {
            type: "string",
            format: "uri",
            description:
              "Base URL of the hosted Code Premier League app, such as http://localhost:3001.",
          },
        },
        required: ["appUrl"],
      },
      actions: [
        {
          name: "refresh_now",
          description:
            "Fetch the latest feature vote totals immediately and return a compact summary.",
          handler: async (ctx) => {
            const entry = requireInstance(ctx.instanceId);
            const snapshot = await fetchVoteSnapshot(entry.appUrl);
            return {
              appUrl: entry.appUrl,
              totalVotes: snapshot.totalVotes,
              features: snapshot.features.map((feature) => ({
                id: feature.id,
                title: feature.title,
                votes: feature.votes,
                percentage: feature.percentage,
              })),
              updatedAt: snapshot.updatedAt,
            };
          },
        },
        {
          name: "set_app_url",
          description:
            "Change the hosted app URL used by this open dashboard instance.",
          inputSchema: {
            type: "object",
            additionalProperties: false,
            properties: {
              appUrl: {
                type: "string",
                format: "uri",
                description: "New HTTP or HTTPS base URL for the hosted app.",
              },
            },
            required: ["appUrl"],
          },
          handler: async (ctx) => {
            const entry = requireInstance(ctx.instanceId);
            entry.appUrl = normalizeAppUrl(ctx.input?.appUrl);
            const snapshot = await fetchVoteSnapshot(entry.appUrl);
            return {
              appUrl: entry.appUrl,
              totalVotes: snapshot.totalVotes,
              updatedAt: snapshot.updatedAt,
            };
          },
        },
      ],
      open: async (ctx) => {
        const appUrl = normalizeAppUrl(ctx.input?.appUrl);
        let entry = servers.get(ctx.instanceId);
        if (!entry) {
          entry = await startServer(ctx.instanceId, appUrl);
          servers.set(ctx.instanceId, entry);
        } else {
          entry.appUrl = appUrl;
        }
        return {
          title: "Feature vote dashboard",
          status: `Refreshing every 3s from ${new URL(entry.appUrl).host}`,
          url: entry.url,
        };
      },
      onClose: async (ctx) => {
        const entry = servers.get(ctx.instanceId);
        if (entry?.server) {
          servers.delete(ctx.instanceId);
          await new Promise((resolve) => entry.server.close(resolve));
        }
      },
    }),
  ],
});
