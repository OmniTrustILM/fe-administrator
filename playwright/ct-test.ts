import { test as base, expect } from '@playwright/experimental-ct-react';
import { addCoverageReport } from 'monocart-reporter';

export const test = base.extend<{ autoCoverage: void }>({
    autoCoverage: [
        async ({ page }, use, testInfo) => {
            const isChromium = testInfo.project.name === 'chromium' || testInfo.project.name.toLowerCase().includes('chromium');

            if (isChromium) {
                await Promise.all([
                    page.coverage.startJSCoverage({ resetOnNavigation: false }),
                    page.coverage.startCSSCoverage({ resetOnNavigation: false }),
                ]);
            }

            await use();

            if (isChromium) {
                const [js, css] = await Promise.all([page.coverage.stopJSCoverage(), page.coverage.stopCSSCoverage()]);

                const coverageList = [...js, ...css];

                await addCoverageReport(coverageList, testInfo);
            }
        },
        { auto: true, scope: 'test' },
    ],
});

export { expect };

// Re-exported so a spec can type a helper that takes the page fixture without reaching past this module. Specs are
// outside the typecheck project, so an import of a type this module does not export fails silently rather than loudly.
export type { Locator, Page } from '@playwright/experimental-ct-react';
