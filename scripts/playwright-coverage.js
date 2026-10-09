// Coverage options for the Playwright component tests. Shared by playwright-ct.config.ts, which collects the
// coverage, and scripts/merge-playwright-coverage.js, which merges the coverage of sharded runs, so a sharded and
// an unsharded run filter the same sources into the same report.

const sourceFilter = (p) => {
    if (!p) return false;

    p = p.replaceAll('\\', '/');

    if (p.startsWith('localhost-')) return false;
    if (p.includes('/assets/') || p.includes('assets/')) return false;
    if (p.endsWith('.css')) return false;
    if (p.includes('node_modules')) return false;
    if (p.includes('/_pages/')) return false;
    if (p.includes('/types/openapi/')) return false; // Exclude generated types

    return /^src\/.*\.(ts|tsx|js|jsx)$/.test(p);
};

export const playwrightCoverage = {
    outputDir: './coverage-playwright',
    sourceFilter,
};
