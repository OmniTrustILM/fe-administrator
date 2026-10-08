// Merges the raw coverage of sharded Playwright runs into coverage-playwright/lcov.info. The raw V8 data is merged
// before it is mapped back to the sources, so the result matches a single unsharded run.
//
// Usage: node scripts/merge-playwright-coverage.js <raw-dir>...

import fs from 'node:fs';
import path from 'node:path';

import { CoverageReport } from 'monocart-coverage-reports';
import { playwrightCoverage } from './playwright-coverage.js';

const inputDir = process.argv.slice(2);
if (inputDir.length === 0) {
    console.error('Usage: node scripts/merge-playwright-coverage.js <raw-dir>...');
    process.exit(1);
}

// The merge skips an input it cannot read and carries on, which would leave a shard out of the report unnoticed.
const unreadable = inputDir.filter((dir) => !fs.existsSync(dir) || !fs.readdirSync(dir).some((name) => name.startsWith('coverage-')));
if (unreadable.length > 0) {
    console.error(`No raw coverage in: ${unreadable.map((dir) => path.resolve(dir)).join(', ')}`);
    process.exit(1);
}

const result = await new CoverageReport({
    ...playwrightCoverage,
    name: 'Coverage Report - CT Report',
    inputDir,
    reports: ['lcovonly', 'text-summary'],
}).generate();

if (!result) {
    console.error('The merge produced no coverage report.');
    process.exit(1);
}
