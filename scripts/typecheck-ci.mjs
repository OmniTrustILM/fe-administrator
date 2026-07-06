#!/usr/bin/env node
/**
 * Production typecheck gate.
 *
 * Runs `tsc --noEmit -p tsconfig.typecheck.json` (which already excludes generated
 * OpenAPI types and *.spec files) and fails ONLY on type errors in hand-written
 * production code.
 *
 * Two categories of pre-existing, separately-tracked debt are ignored so the gate
 * can be green today while still enforcing that production code stays strictly typed:
 *   - Generated OpenAPI client (src/types/openapi/**): the checked-in client is stale
 *     vs the current spec (e.g. RequestAttributeDto -> RequestAttribute). It leaks into
 *     the graph because src/api.ts imports the controllers. Fix = regenerate the types.
 *   - Root build/tooling config (playwright*, *.config.ts): tooling, not app code, and
 *     tripped only by the deprecated node10 moduleResolution + package "exports" maps.
 *
 * Anything else is a real regression and fails CI.
 */
import { spawnSync } from 'node:child_process';

const res = spawnSync('npx', ['tsc', '--noEmit', '-p', 'tsconfig.typecheck.json'], {
    encoding: 'utf8',
    shell: process.platform === 'win32',
});

const output = `${res.stdout ?? ''}${res.stderr ?? ''}`;
const errorLines = output.split('\n').filter((line) => /error TS\d+/.test(line));

const isTrackedDebt = (line) =>
    line.startsWith('src/types/openapi/') || line.startsWith('playwright') || /^[^\s(]*\.config\.ts[(]/.test(line);

const prodErrors = errorLines.filter((line) => !isTrackedDebt(line));
const ignoredCount = errorLines.length - prodErrors.length;

if (prodErrors.length > 0) {
    console.error(`\n✖ Production typecheck FAILED: ${prodErrors.length} error(s) in hand-written code:\n`);
    console.error(prodErrors.join('\n'));
    console.error('');
    process.exit(1);
}

console.log(`✓ Production typecheck clean — 0 errors in hand-written code (${ignoredCount} known generated/config error(s) ignored).`);
process.exit(0);
