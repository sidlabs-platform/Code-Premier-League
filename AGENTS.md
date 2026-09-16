<!-- BEGIN:nextjs-agent-rules -->

# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->

## Jira Sprint Dashboard canvas defaults

The "Jira Sprint Dashboard" canvas (`canvasId: jira-sprint-dashboard-canvas`,
`extensionId: plugin:jira-sprint-dashboard-canvas:jira-sprint-dashboard-canvas`) is configured by
`.github/copilot-config/jira-sprint-dashboard.json`. Open it with empty input (`{}`) and it
resolves that file itself — do not ask the user to supply a site or project again.

### One-click open (local plugin patch)

Upstream, this canvas declares `required: ["cloudId", "siteUrl"]` on its open input schema and its
open handler throws `jira_canvas_input_missing` without them. A one-click open from the UI passes
no input, so it always failed; it only worked when an agent turn explicitly supplied the
identifiers. `scripts/patch-jira-canvas.mjs` fixes that locally by dropping `required` and
resolving the site from saved config when input omits it, in this order:

1. explicit open input (unchanged upstream behaviour),
2. `.github/copilot-config/jira-sprint-dashboard.json`, found by walking up from the process cwd,
3. `~/.copilot/jira-sprint-dashboard/config.json` for sessions outside this repo.

With neither input nor config it still raises the original error, so nothing is silently masked.

The patch edits a third-party plugin under `~/.copilot/installed-plugins`, so **a plugin update
reverts it**. If one-click opening breaks again, re-run:

```sh
node scripts/patch-jira-canvas.mjs
```

It is idempotent, verifies the result with `node --check`, and fails loudly if upstream has
changed shape rather than corrupting the file. Reload extensions afterwards to pick it up. The
pristine file is kept alongside it as `extension.mjs.orig` if you need to revert.

## Azure DevOps canvas defaults

When opening the "Azure DevOps" canvas (`canvasId: azure-devops`,
`extensionId: plugin:azure-devops-copilot-plugin:azure-devops`) for this repo, the intended
connection is the one recorded in `.github/copilot-config/azure-devops.json`
(org `sid-msft`, project `agentic-webinar`). Do not ask the user to pick a project again
unless they request a different org or project.

This canvas does not take the connection as `input`: its schema accepts only empty input or a
deep link (`pullRequestUrl` / `workItemUrl`, or organization + project + `pullRequestId` /
`workItemId`). Open it with empty input and it resolves the connection pinned in
`~/.copilot/azure-devops-canvas/connection.json`.

If the canvas ever shows a stale or missing project, fix that record rather than the `input`:
set **both** `default` and `lastUsed` to the desired connection. `lastUsed` is resolved ahead of
`default`, so pinning a default alone will not displace a stale `lastUsed` entry.
