import path from 'node:path';
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react-swc';
import istanbul from 'vite-plugin-istanbul';
import tailwindcss from '@tailwindcss/vite';

async function loadProxyConfig() {
    try {
        const { default: customProxyConfig } = await import('./src/setupProxy.js');
        return customProxyConfig.server.proxy;
    } catch (_error) {
        return {};
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
                            { name: 'apexcharts-vendor', test: /[\\/]node_modules[\\/](apexcharts|react-apexcharts)[\\/]/ },
                            {
                                name: 'editor-vendor',
                                test: /[\\/]node_modules[\\/](highlight\.js|marked|react-simple-code-editor|html-react-parser|dompurify)[\\/]/,
                            },
                            { name: 'preline-vendor', test: /[\\/]node_modules[\\/](preline|@preline|@floating-ui)[\\/]/ },
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
                // Route openapi imports through the @czertainly/openapi-types
                // file: dep so Vite pre-bundles the whole generated tree
                // (~600 files) into a single cached chunk for dev.
                { find: /^types\/openapi(?=$|\/)/, replacement: '@czertainly/openapi-types' },
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
            include: [
                '@czertainly/openapi-types',
                '@czertainly/openapi-types/utils',
                // Deep-imported in src/api.ts (excluded from the barrel due to a name
                // collision with TokenInstanceManagementApi); pre-bundle it explicitly.
                '@czertainly/openapi-types/apis/TokenInstanceControllerApi',
            ],
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
        ].filter(Boolean),
    };
});
