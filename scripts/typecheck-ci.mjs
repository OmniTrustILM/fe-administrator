#!/usr/bin/env node
/**
 * Production typecheck gate.
 *
 * Runs `tsc --noEmit -p tsconfig.typecheck.json` (which already excludes generated
 * OpenAPI types and *.spec files) and fails ONLY on type errors in hand-written
 * production code.
 *
 * A small, explicit allowlist of pre-existing, separately-tracked debt is ignored
 * so the gate can be green today while still enforcing that production code stays
 * strictly typed. Each entry is an EXACT file path — fixing/regenerating the file
 * removes its entry and the gate then enforces it. New errors in any other file
 * (including files that merely share a directory or the `.config.ts` suffix) fail
 * the build.
 */
import { spawnSync } from 'node:child_process';
import { createRequire } from 'node:module';

// Exact tsc diagnostic paths (everything before the first `(`) that are known,
// tracked debt. Keep this list minimal and justified; do not use prefixes.
const KNOWN_DEBT = new Set([
    // Generated OpenAPI client is stale vs the current spec (imports RequestAttributeDto,
    // now RequestAttribute). Leaks into the graph via src/api.ts. Fix = regenerate types.
    'src/types/openapi/apis/TokenInstanceControllerApi.ts',
    // Root Playwright config, tripped only by the deprecated node10 moduleResolution +
    // package "exports" maps resolving '@tailwindcss/vite'. Tooling, not app code.
    'playwright-ct.config.ts',
]);

// Resolve the tsc binary from node_modules and run it with the current Node executable
// (both absolute paths) so the command never relies on PATH resolution.
const require = createRequire(import.meta.url);
const tscBin = require.resolve('typescript/bin/tsc');
const res = spawnSync(process.execPath, [tscBin, '--noEmit', '-p', 'tsconfig.typecheck.json'], {
    encoding: 'utf8',
});

// Guard against a false green when tsc never actually ran (missing binary, spawn
// ENOENT). A tsc that launched and found type errors emits `error TS` lines and
// exits non-zero (typically 2); a tsc that crashed on startup emits none. So the
// danger case — reported below — is a non-zero exit with zero parsed error lines.
if (res.error) {
    console.error(`\n✖ Could not run tsc: ${res.error.message}\n`);
    process.exit(1);
}

const output = `${res.stdout ?? ''}${res.stderr ?? ''}`;
const errorLines = output.split('\n').filter((line) => /error TS\d+/.test(line));

if (res.status !== 0 && errorLines.length === 0) {
    console.error(
        `\n✖ tsc exited ${res.status} (signal ${res.signal ?? 'none'}) but emitted no "error TS" lines — it likely failed to run or its output format changed:\n`,
    );
    console.error(output);
    process.exit(1);
}

// tsc formats each diagnostic as `<path>(line,col): error TSxxxx: ...`. Match debt
// by EXACT path only (the segment before the first `(`); a diagnostic with no path
// (e.g. a global TS error) yields a non-matching key and is treated as a real error.
const pathOf = (line) => {
    const paren = line.indexOf('(');
    const path = paren === -1 ? line : line.slice(0, paren);
    // tsc emits backslash-separated paths on Windows; normalise so the forward-slash
    // KNOWN_DEBT entries match regardless of platform.
    return path.replaceAll('\\', '/');
};
const prodErrors = errorLines.filter((line) => !KNOWN_DEBT.has(pathOf(line)));
const ignoredCount = errorLines.length - prodErrors.length;

if (prodErrors.length > 0) {
    console.error(`\n✖ Production typecheck FAILED: ${prodErrors.length} error(s) in hand-written code:\n`);
    console.error(prodErrors.join('\n'));
    console.error('');
    process.exit(1);
}

console.log(`✓ Production typecheck clean — 0 errors in hand-written code (${ignoredCount} known generated/config error(s) ignored).`);
process.exit(0);
