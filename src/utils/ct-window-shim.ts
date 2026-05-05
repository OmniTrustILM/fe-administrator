/**
 * Polyfill for CT test runner (Node): avoids "window is not defined" when spec
 * imports modules that reference window at load time
 */
if ((globalThis as any).window === undefined) {
    (globalThis as any).window = { __ENV__: {} };
}
