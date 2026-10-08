import { defineConfig, devices } from '@playwright/experimental-ct-react';
import type { ReporterDescription } from '@playwright/test';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import react from '@vitejs/plugin-react-swc';
import tailwindcss from '@tailwindcss/vite';
import istanbul from 'vite-plugin-istanbul';

import { playwrightCoverage } from './scripts/playwright-coverage.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// One shard of a sharded CI run writes a blob report and raw coverage; the CI merge job combines the shards into one
// test report and one coverage report (scripts/merge-playwright-coverage.js).
const isShard = !!process.env.PW_SHARD;

const testReporters: ReporterDescription[] = isShard
    ? [['blob', { outputDir: 'blob-report' }]]
    : [
          ['html', { outputFolder: 'playwright-report', open: 'never' }],
          ['junit', { outputFile: 'playwright-report/junit.xml' }],
      ];

export default defineConfig({
    testDir: './src',
    testMatch: '**/*.spec.tsx',
    testIgnore: ['**/*.unit.spec.ts', '**/*.unit.spec.tsx', '**/*.vitest.spec.ts', '**/*.vitest.spec.tsx'],
    timeout: 30 * 1000,
    fullyParallel: true,
    forbidOnly: !!process.env.CI,
    retries: process.env.CI ? 2 : 0,
    workers: process.env.CI ? 2 : undefined,
    use: {
        trace: 'on-first-retry',
        ctPort: 3100,
        ctViteConfig: {
            define: {
                __BUILD_TIME__: JSON.stringify(new Date().toISOString()),
            },
            plugins: [
                react(),
                tailwindcss(),
                istanbul({
                    include: ['src/**/*.ts', 'src/**/*.tsx'],
                    exclude: ['node_modules', '**/*.spec.ts', '**/*.spec.tsx'],
                    extension: ['.ts', '.tsx'],
                }),
            ],
            resolve: {
                alias: [
                    { find: 'react-hook-form', replacement: path.resolve(__dirname, 'node_modules/react-hook-form/dist/index.esm.mjs') },
                    { find: 'utils/', replacement: path.resolve(__dirname, './src/utils/') + '/' },
                    { find: 'types/', replacement: path.resolve(__dirname, './src/types/') + '/' },
                    { find: 'components/', replacement: path.resolve(__dirname, './src/components/') + '/' },
                    { find: 'ducks/', replacement: path.resolve(__dirname, './src/ducks/') + '/' },
                    { find: 'ducks', replacement: path.resolve(__dirname, './src/ducks') },
                    { find: 'src/', replacement: path.resolve(__dirname, './src/') + '/' },
                    { find: 'playwright/', replacement: path.resolve(__dirname, './playwright/') + '/' },
                ],
                dedupe: ['react', 'react-dom', 'react-hook-form'],
            },
            optimizeDeps: {
                include: ['react-hook-form'],
            },
            build: {
                sourcemap: 'inline',
                minify: false,
                rollupOptions: {
                    output: {
                        sourcemapExcludeSources: false,
                        manualChunks: (id) => {
                            if (id.includes('node_modules/react-hook-form')) return 'vendor-react-hook-form';
                            return undefined;
                        },
                    },
                },
                commonjsOptions: {
                    include: [/react-hook-form/, /node_modules/],
                },
            },
            esbuild: {
                sourcemap: true,
            },
        },
    },
    projects: [
        { name: 'chromium', use: { ...devices['Desktop Chrome'] } },
        { name: 'firefox', use: { ...devices['Desktop Firefox'] } },
        { name: 'webkit', use: { ...devices['Desktop Safari'] } },
    ],
    reporter: [
        ['list'],
        ...testReporters,
        [
            'monocart-reporter',
            {
                name: 'CT Report',
                outputFile: './monocart-report/index.html',
                sourcePath: (filePath: string) => {
                    const fp = filePath.replaceAll('\\', '/');
                    const m = /(^|\/)(src\/.*)$/.exec(fp);
                    if (m) return m[2];
                    const cwd = process.cwd().replaceAll('\\', '/');
                    if (fp.startsWith(cwd + '/')) return fp.slice(cwd.length + 1);
                    return fp;
                },
                coverage: {
                    ...playwrightCoverage,
                    reports: isShard ? [['raw', { merge: true }]] : ['lcovonly', 'text-summary'],
                },
            },
        ],
    ],
});
