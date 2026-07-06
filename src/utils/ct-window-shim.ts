/**
 * Polyfill for CT test runner (Node): avoids "window is not defined" when spec
 * imports modules that reference window at load time
 */
if (typeof window === 'undefined') {
    Reflect.set(globalThis, 'window', { __ENV__: {} });
}
