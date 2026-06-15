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
        coverage: {
            provider: 'v8',
            reporter: ['lcovonly', 'text-summary'],
            reportsDirectory: './coverage-vitest',
            include: [
                'src/*.{ts,tsx}',
                'src/utils/**/*.{ts,tsx}',
                'src/ducks/**/*.{ts,tsx}',
                'src/components/ListStateScopeCleaner/**/*.{ts,tsx}',
            ],
            exclude: [
                'node_modules',
                'src/**/*.spec.{ts,tsx}',
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
