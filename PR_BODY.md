Reachability Assessment for Vitest vulnerability (GHSA-5xrq-8626-4rwp / CVE-2026-47429)

Summary
- Updated devDependency "vitest" from 4.0.17 (vulnerable) -> 4.1.0 (patched) in package.json. NOTE: package-lock.json was NOT updated in this environment because npm cannot reach external registries from the runner; see "Lockfile update" below.

What the advisory affects
- The vulnerability affects Vitest's UI and Browser Mode APIs when the server is exposed to the network. Specifically, the UI/browser API handlers that serve attachments, read/write files, or run tests can be abused when the server is bound to a non-localhost host and allowWrite/allowExec settings permit privileged operations.
- See: GHSA-5xrq-8626-4rwp / CVE-2026-47429 — Vitest 4.1.0 patches this by gating write/exec features when the API host is non-local.

Reachability in this repository (confidence: high)
- This repository uses Vitest as a devDependency for unit tests. Evidence:
  - package.json scripts: "test": "vitest run", "test:watch": "vitest".
  - vitest.config.ts present and configured for node environment ("environment: 'node'").
  - Tests import from "vitest" (multiple files under src/*.test.ts, see grep results).
- The vulnerable functionality (UI server, Browser Mode attachments, allowWrite/allowExec) is not used by the current config:
  - vitest.config.ts sets test.environment = "node" and includes node-based unit tests; there is no configuration enabling the UI server, browser mode, or api.host override.
  - There are no references to api.host, allowWrite, allowExec, or browser.api in the repository.
- Therefore the attack surface described in the advisory is not reachable by default in this codebase. Running vitest locally to execute tests (vitest run) does not start the UI server or open Browser Mode unless the developer explicitly runs the UI or passes relevant flags (e.g. running `vitest --ui` or `vitest` with watch and `--api.host`), which we do not do in CI nor in current scripts.

Conclusion: The repository is not actively exposing the vulnerable UI/browser APIs in CI or default developer workflows (high confidence). Updating Vitest is still recommended to satisfy vulnerability scanners and to protect against accidental exposure.

Lockfile update and how to apply the fix locally / in CI
- I attempted to run `npm install --package-lock-only` in the runner to update package-lock.json, but the runner cannot reach the registry (network resolution error). Because of this, package-lock.json still references vitest@4.0.17 in this commit.
- To finalize the fix and update the lockfile in CI (recommended), run locally or in a CI environment with network access:
  1. npm install --package-lock-only
     OR: npm install vitest@4.1.0 --save-dev
  2. Commit the updated package-lock.json and push.
- CI maintainers: after merging, ensure the lockfile is updated by rerunning install in a networked environment. This is required for scanners to pick up the patched version in the lockfile.

References
- Advisory: https://github.com/vitest-dev/vitest/security/advisories/GHSA-5xrq-8626-4rwp
- Patch: vitest v4.1.0 release notes / commits

Notes for reviewers
- Change is minimal: single-line bump in package.json devDependencies.
- I could not update package-lock.json due to network restrictions in the runner. Please update the lockfile in CI or run `npm install vitest@4.1.0` locally and commit the resulting package-lock.json.

Acknowledgement: Changes performed to satisfy Dependabot advisory and reduce attack surface; reachability assessment above explains why this repo is low-risk even before lockfile update.
