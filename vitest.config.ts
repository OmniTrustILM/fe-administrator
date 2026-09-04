import { defineConfig } from 'vitest/config';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export default defineConfig({
    test: {
        globals: true,
        environment: 'happy-dom',
        include: ['**/*.spec.ts', 'src/components/**/*.unit.spec.{ts,tsx}'],
        exclude: ['node_modules', 'build', 'dist', '.claude/**'],
        // Some specs re-import large module graphs under vi.resetModules(). Those
        // re-imports became measurably slower to load once react-router v8 made the
        // dependency ESM-only, so the defaults (5s test / 10s hook) are too tight for
        // them. The tests themselves do the same amount of work as before.
        testTimeout: 20000,
        hookTimeout: 30000,
        coverage: {
            provider: 'v8',
            reporter: ['lcovonly', 'text-summary'],
            reportsDirectory: './coverage-vitest',
            include: [
                'src/*.{ts,tsx}',
                'src/utils/**/*.{ts,tsx}',
                'src/ducks/**/*.{ts,tsx}',
                'src/components/PagedList/PagedList.tsx',
                // The host's applied-slice helpers. Kept out of the component so they carry unit
                // tests: anything the component test reaches only through the browser is instrumented
                // by that run, but these are pure and are covered here instead.
                'src/components/PagedList/columnState.ts',
                // Row building runs in the test body rather than in the browser, so the component
                // test run never instruments it; its unit tests are what report its coverage.
                'src/components/CustomTable/columns/buildTableRows.tsx',
                'src/components/Widget/index.tsx',
                // Build hooks with their own unit tests; report them so Sonar sees the coverage.
                'scripts/set-openapi-contact.mjs',
                'scripts/patch-openapi-runtime.mjs',
            ],
            exclude: [
                'node_modules',
                'src/**/*.spec.{ts,tsx}',
                'scripts/**/*.spec.{ts,tsx}',
                'src/types/**/*',
                'src/utils/ct-window-shim.ts',
                'src/utils/TestStoreConsumer.tsx',
                'src/utils/TestRouteDisplay.tsx',
            ],
        },
    },
    resolve: {
        alias: [
            { find: 'utils/', replacement: path.resolve(__dirname, './src/utils/') + '/' },
            { find: 'types/', replacement: path.resolve(__dirname, './src/types/') + '/' },
            { find: 'components/', replacement: path.resolve(__dirname, './src/components/') + '/' },
            { find: 'ducks/', replacement: path.resolve(__dirname, './src/ducks/') + '/' },
            { find: 'ducks', replacement: path.resolve(__dirname, './src/ducks') },
            { find: 'src/', replacement: path.resolve(__dirname, './src/') + '/' },
            { find: 'playwright/', replacement: path.resolve(__dirname, './playwright/') + '/' },
        ],
    },
    define: {
        __BUILD_TIME__: JSON.stringify(new Date().toISOString()),
    },
});
