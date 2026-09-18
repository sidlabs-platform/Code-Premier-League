#!/usr/bin/env node
/**
 * Make the Jira Sprint Dashboard canvas open with one click.
 *
 * Problem
 * -------
 * The upstream canvas declares `required: ["cloudId", "siteUrl"]` on its open
 * input schema, and its open handler hard-fails with `jira_canvas_input_missing`
 * when those are absent. A one-click open from the Copilot UI supplies no input,
 * so it always errors. It only works when an agent turn explicitly passes the
 * site identifiers.
 *
 * Fix
 * ---
 * 1. Drop `required` from the open input schema so empty input validates.
 * 2. Resolve the site from saved config when input omits it, preferring:
 *      a. explicit open input (unchanged upstream behaviour)
 *      b. <repo>/.github/copilot-config/jira-sprint-dashboard.json (walks up from cwd)
 *      c. ~/.copilot/jira-sprint-dashboard/config.json (user-global fallback)
 *    With neither input nor config, the original error is still raised.
 *
 * This edits a third-party plugin under ~/.copilot/installed-plugins, so a plugin
 * update will revert it. Re-run this script after updating the plugin:
 *
 *     node scripts/patch-jira-canvas.mjs
 *
 * The script is idempotent and safe to run repeatedly.
 */

import { readFileSync, writeFileSync, existsSync, readdirSync } from "node:fs";
import { homedir } from "node:os";
import { join } from "node:path";
import { execFileSync } from "node:child_process";

const MARKER = "readSavedCanvasInput";
const EXTENSION_RELATIVE = join(
    "extensions",
    "jira-sprint-dashboard-canvas",
    "extension.mjs",
);

function findExtensionFile() {
    const directRoot = join(homedir(), ".copilot", "installed-plugins", "_direct");
    const roots = [directRoot, join(homedir(), ".copilot", "installed-plugins", "copilot-plugins")];
    for (const root of roots) {
        if (!existsSync(root)) continue;
        for (const entry of readdirSync(root)) {
            const candidate = join(root, entry, EXTENSION_RELATIVE);
            if (existsSync(candidate)) return candidate;
        }
    }
    return null;
}

const RESOLVER_BLOCK = `
const PROJECT_CONFIG_RELATIVE = join(".github", "copilot-config", "jira-sprint-dashboard.json");
const USER_CONFIG_PATH = join(homedir(), ".copilot", "jira-sprint-dashboard", "config.json");

function readJsonFileSafe(filePath) {
    try {
        const parsed = JSON.parse(readFileSync(filePath, "utf8"));
        return parsed && typeof parsed === "object" ? parsed : null;
    } catch {
        return null;
    }
}

function extractSavedInput(config) {
    if (!config || typeof config !== "object") return null;
    const candidate = config.input && typeof config.input === "object" ? config.input : config;
    const cloudId = typeof candidate.cloudId === "string" ? candidate.cloudId.trim() : "";
    const siteUrl = typeof candidate.siteUrl === "string" ? candidate.siteUrl.trim() : "";
    if (!cloudId || !siteUrl) return null;
    const projectId = normalizeProjectId(candidate.projectId);
    return projectId ? { cloudId, siteUrl, projectId } : { cloudId, siteUrl };
}

function findProjectConfig(startDir) {
    let current = startDir;
    const { root } = parse(current);
    for (let depth = 0; depth < 40; depth += 1) {
        const found = extractSavedInput(readJsonFileSafe(join(current, PROJECT_CONFIG_RELATIVE)));
        if (found) return found;
        if (current === root) break;
        const parent = dirname(current);
        if (parent === current) break;
        current = parent;
    }
    return null;
}

function readSavedCanvasInput() {
    return findProjectConfig(process.cwd())
        ?? extractSavedInput(readJsonFileSafe(USER_CONFIG_PATH));
}
`;

const PATCHED_RESOLVER = `function resolveCanvasIdentifiers(source) {
    const explicit = source && typeof source === "object" ? source : {};
    // Explicit cloudId+siteUrl always win, preserving the original behaviour.
    // Otherwise fall back to saved project/user config so a one-click open
    // (which supplies no input) still resolves a site instead of erroring.
    const base = extractSavedInput(explicit) ? explicit : { ...(readSavedCanvasInput() ?? {}) };
    const explicitProjectId = normalizeProjectId(explicit.projectId);
    const merged = explicitProjectId ? { ...base, projectId: explicitProjectId } : base;
    const identifiers = requireCanvasOpenInput(merged);
    const projectId = normalizeProjectId(merged.projectId);
    return projectId ? { ...identifiers, projectId } : identifiers;
}`;

const ORIGINAL_RESOLVER = `function resolveCanvasIdentifiers(source) {
    const identifiers = requireCanvasOpenInput(source);
    const projectId = normalizeProjectId(source?.projectId);
    return projectId ? { ...identifiers, projectId } : identifiers;
}`;

function fail(message) {
    console.error(`✗ ${message}`);
    process.exit(1);
}

const target = findExtensionFile();
if (!target) {
    fail("Jira sprint dashboard plugin not found under ~/.copilot/installed-plugins. Install the plugin first.");
}

let source = readFileSync(target, "utf8");

if (source.includes(MARKER)) {
    console.log(`✓ Already patched: ${target}`);
    process.exit(0);
}

// 1. Imports required by the resolver block.
const IMPORT_ANCHOR = 'import { createServer } from "node:http";\n';
if (!source.includes(IMPORT_ANCHOR)) fail("Could not find the import anchor; upstream layout changed.");
source = source.replace(
    IMPORT_ANCHOR,
    `${IMPORT_ANCHOR}import { readFileSync } from "node:fs";\nimport { homedir } from "node:os";\nimport { dirname, join, parse } from "node:path";\n`,
);

// 2. Saved-config resolver helpers, inserted after normalizeProjectId.
const NORMALIZE_FN = `function normalizeProjectId(value) {\n    return typeof value === "string" ? value.trim() : "";\n}\n`;
if (!source.includes(NORMALIZE_FN)) fail("Could not find normalizeProjectId; upstream layout changed.");
source = source.replace(NORMALIZE_FN, `${NORMALIZE_FN}${RESOLVER_BLOCK}`);

// 3. Fallback-aware identifier resolution.
if (!source.includes(ORIGINAL_RESOLVER)) fail("Could not find resolveCanvasIdentifiers; upstream layout changed.");
source = source.replace(ORIGINAL_RESOLVER, PATCHED_RESOLVER);

// 4. Allow empty open input through schema validation.
const REQUIRED_LINE = '        required: ["cloudId", "siteUrl"],\n';
if (!source.includes(REQUIRED_LINE)) fail("Could not find the required[] schema entry; upstream layout changed.");
source = source.replace(REQUIRED_LINE, "");

writeFileSync(target, source);

try {
    execFileSync(process.execPath, ["--check", target], { stdio: "pipe" });
} catch (error) {
    fail(`Patched file failed the syntax check: ${error.message}`);
}

console.log(`✓ Patched: ${target}`);
console.log("  Run /reload (or restart Copilot) to pick up the change.");
