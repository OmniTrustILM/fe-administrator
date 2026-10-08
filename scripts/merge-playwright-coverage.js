// Merges the raw coverage of sharded Playwright runs into coverage-playwright/lcov.info. The raw V8 data is merged
// before it is mapped back to the sources, so the result matches a single unsharded run.
//
// Usage: node scripts/merge-playwright-coverage.js <raw-dir>...

import { CoverageReport } from 'monocart-coverage-reports';
import { playwrightCoverage } from './playwright-coverage.js';

const inputDir = process.argv.slice(2);
if (inputDir.length === 0) {
    console.error('Usage: node scripts/merge-playwright-coverage.js <raw-dir>...');
    process.exit(1);
}

await new CoverageReport({
    ...playwrightCoverage,
    name: 'Coverage Report - CT Report',
    inputDir,
    reports: ['lcovonly', 'text-summary'],
}).generate();
