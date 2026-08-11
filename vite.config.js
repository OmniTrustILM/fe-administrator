import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react-swc';
import istanbul from 'vite-plugin-istanbul';
import tailwindcss from '@tailwindcss/vite';

async function loadProxyConfig() {
    try {
        const { default: customProxyConfig } = await import('./src/setupProxy.js');
        return customProxyConfig.server.proxy;
    } catch {
        // No custom proxy config present (src/setupProxy.js is optional) — fall back to no proxy.
        return {};
    }
}

/**
 * Content fingerprint of the openapi types, carried in a plugin name so that it takes part in
 * Vite's own dependency-cache hash (which covers plugin names).
 *
 * The types are consumed through the linked `@ilm/openapi-types` dependency so Vite pre-bundles
 * the whole tree into one cached chunk (see the alias below). That cache hash is otherwise built
 * from the lockfile and the config only, so edits inside a linked package never invalidate it:
 * the dev server keeps serving the previous pre-bundle and imports of newly added types fail at
 * runtime with "does not provide an export named ...". Mixing the fingerprint in lets Vite
 * re-optimize by itself, exactly when the types change.
 */
function openApiTypesFingerprint() {
    const typesDir = path.resolve(__dirname, './src/types/openapi');
    try {
        const files = fs
            .readdirSync(typesDir, { recursive: true, withFileTypes: true })
            .filter((entry) => entry.isFile())
            .map((entry) => path.join(entry.parentPath, entry.name))
            // Byte-wise ordering, not locale-aware: the fingerprint must not depend on the locale.
            .sort((a, b) => (a < b ? -1 : Number(a > b)));
        const hash = crypto.createHash('sha256');
        for (const file of files) {
            const relativePath = path.relative(typesDir, file);
            const contents = fs.readFileSync(file);
            // Delimit and length-prefix each record so that no two different file sets can hash to the
            // same byte stream (`a` + `bc` would otherwise be indistinguishable from `ab` + `c`).
            hash.update(`${relativePath}\0${contents.byteLength}\0`);
            hash.update(contents);
        }
        return hash.digest('hex');
    } catch (error) {
        // Covers the directory listing and every file read. Falling back to a fixed hash keeps the cache
        // behaving as it did before, which is also the stale-cache bug above — so say so rather than fail quietly.
        console.warn(`[openapi-types-fingerprint] cannot fingerprint ${typesDir}, the dependency cache may go stale:`, error);
        return 'unavailable';
    }
}

export default defineConfig(async ({ mode }) => {
    const proxyConfig = await loadProxyConfig();
    const coverageEnabled = process.env.COVERAGE === 'true' || mode === 'test';
    return {
        define: {
            __BUILD_TIME__: JSON.stringify(new Date().toISOString()),
        },
        server: {
            open: true,
            proxy: proxyConfig,
        },
        build: {
            outDir: 'build',
            rolldownOptions: {
                output: {
                    advancedChunks: {
                        groups: [
                            { name: 'react-vendor', test: /[\\/]node_modules[\\/](react|react-dom|react-router|scheduler)[\\/]/ },
                            {
                                name: 'redux-vendor',
                                test: /[\\/]node_modules[\\/](@reduxjs|react-redux|redux|redux-observable|rxjs|reselect|immer)[\\/]/,
                            },
                            { name: 'reactflow-vendor', test: /[\\/]node_modules[\\/](reactflow|@reactflow|dagre|graphlib)[\\/]/ },
                            { name: 'recharts-vendor', test: /[\\/]node_modules[\\/](recharts|victory-vendor|d3-[^\\/]+)[\\/]/ },
                            {
                                name: 'editor-vendor',
                                test: /[\\/]node_modules[\\/](highlight\.js|marked|react-simple-code-editor|html-react-parser|dompurify)[\\/]/,
                            },
                            { name: 'cron-vendor', test: /[\\/]node_modules[\\/](cron-parser|cronstrue|cron-expression-validator)[\\/]/ },
                            { name: 'form-vendor', test: /[\\/]node_modules[\\/](react-hook-form|regexp-tree)[\\/]/ },
                            { name: 'vendor', test: /[\\/]node_modules[\\/]/ },
                        ],
                    },
                },
            },
        },
        base: './',
        resolve: {
            // Aliases match the structure of import paths in tsconfig.js
            alias: [
                // Route openapi imports through the @ilm/openapi-types
                // file: dep so Vite pre-bundles the whole generated tree
                // (~600 files) into a single cached chunk for dev.
                { find: /^types\/openapi(?=$|\/)/, replacement: '@ilm/openapi-types' },
                { find: 'utils/', replacement: path.resolve(__dirname, './src/utils/') + '/' },
                { find: 'types/', replacement: path.resolve(__dirname, './src/types/') + '/' },
                { find: 'components/', replacement: path.resolve(__dirname, './src/components/') + '/' },
                { find: 'ducks/', replacement: path.resolve(__dirname, './src/ducks/') + '/' },
                { find: 'ducks', replacement: path.resolve(__dirname, './src/ducks') },
                { find: 'src/', replacement: path.resolve(__dirname, './src/') + '/' },
                { find: 'playwright/', replacement: path.resolve(__dirname, './playwright/') + '/' },
            ],
        },
        optimizeDeps: {
            include: ['@ilm/openapi-types', '@ilm/openapi-types/utils'],
        },
        css: {
            preprocessorOptions: {
                scss: {
                    includePaths: [path.resolve(__dirname, 'src')],
                    quietDeps: true,
                    silenceDeprecations: ['import', 'global-builtin', 'color-functions'],
                },
            },
        },
        plugins: [
            react(),
            coverageEnabled &&
                istanbul({
                    requireEnv: false,
                    include: ['src/**/*'],
                    exclude: ['node_modules/**/*'],
                }),
            tailwindcss(),
            { name: `openapi-types-fingerprint:${openApiTypesFingerprint()}` },
        ].filter(Boolean),
    };
});
