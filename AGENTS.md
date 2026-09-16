<!-- BEGIN:nextjs-agent-rules -->

# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->

## Jira Sprint Dashboard canvas defaults

When opening the "Jira Sprint Dashboard" canvas (`canvasId: jira-sprint-dashboard-canvas`,
`extensionId: plugin:jira-sprint-dashboard-canvas:jira-sprint-dashboard-canvas`) for this repo,
use the saved settings in `.github/copilot-config/jira-sprint-dashboard.json` as the `input`
instead of asking the user again, unless they request a different Jira site or project.
