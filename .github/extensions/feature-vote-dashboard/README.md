# Feature vote dashboard canvas

Project-scoped Copilot canvas for monitoring the app's feature-vote leaderboard.
It reads `GET /api/feature-votes` from a configurable Code Premier League app
URL and refreshes the dashboard every three seconds.

Open it with canvas ID `feature-vote-dashboard` and an app URL:

```json
{
  "appUrl": "http://localhost:3001"
}
```

The canvas also exposes:

- `refresh_now` to fetch and return the latest totals immediately.
- `set_app_url` to change the source for the current open dashboard.

Only HTTP and HTTPS URLs without embedded credentials are accepted. Hosted
URLs must resolve exclusively to publicly routable IP addresses; private,
link-local, reserved, and loopback targets are rejected. `localhost` is the
explicit exception for local development, and redirects are limited and
checked under the same policy before each request. The extension proxies vote
data through a loopback-only server so hosted apps do not need additional CORS
configuration for the canvas.
