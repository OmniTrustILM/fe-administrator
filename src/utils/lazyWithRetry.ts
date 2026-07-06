import { lazy } from 'react';

// sessionStorage key holding the timestamp of the last auto-reload attempt (used as a cooldown).
export const RELOAD_TIMESTAMP_KEY = 'chunk-reload-timestamp';

// How long after an auto-reload a repeat chunk failure is attributed to that reload
// rather than to a fresh stale-chunk situation. A failure inside this window means the
// reload didn't help (the chunk is genuinely missing) → don't reload again, avoiding a
// loop. A failure after it — e.g. a later deploy — is a new situation and recovers again.
// The timestamp is never actively cleared; it simply expires after this window.
export const RELOAD_COOLDOWN_MS = 10_000;

// How long to hold the Suspense fallback after triggering a reload before giving up. A real
// reload navigates away near-instantly, so this only bites when location.reload() is a no-op
// (sandboxed iframe / embedded webview): the held promise then rejects so the chunk error
// reaches the ErrorBoundary instead of hanging on the spinner. Kept a few seconds (not sub-second)
// so a genuinely slow reload doesn't flash the ErrorBoundary before the new document commits.
export const RELOAD_NAVIGATION_TIMEOUT_MS = 5_000;

// Browser-specific messages thrown when a dynamically imported chunk cannot be fetched, plus
// the message Vite's preload helper throws when a dependency preload (e.g. a stale CSS link)
// fails — both indicate a stale asset after a deploy and are recoverable by reloading.
const CHUNK_LOAD_ERROR_PATTERNS = [
    'Failed to fetch dynamically imported module', // Chromium
    'error loading dynamically imported module', // Firefox
    'Importing a module script failed', // Safari
    'Unable to preload CSS for', // Vite dependency-preload failure (stale CSS chunk)
];

export function isChunkLoadError(error: unknown): boolean {
    const message = error instanceof Error ? error.message : String(error);
    return CHUNK_LOAD_ERROR_PATTERNS.some((pattern) => message.includes(pattern));
}

// A promise that holds the Suspense fallback while the page navigates away after a reload, then
// rejects if navigation never happens within the timeout (reload blocked / no-op) so the error
// surfaces to the ErrorBoundary instead of hanging forever.
function holdForReload<T>(): Promise<T> {
    return new Promise<T>((_resolve, reject) => {
        globalThis.setTimeout(() => {
            reject(new Error('Page did not reload after a chunk-load failure'));
        }, RELOAD_NAVIGATION_TIMEOUT_MS);
    });
}

// Set once we trigger a reload in this page's lifetime. Lets us swallow the sibling
// vite:preloadError events that a single deploy-stale navigation fires (the route chunk plus its
// preloaded dependencies) so none of them momentarily surface to the ErrorBoundary before the
// page navigates away. Deliberately in-memory (never persisted): on the reloaded page it must
// start false so a genuinely missing chunk is judged by the cooldown and propagates.
let reloadInFlight = false;

// Test-only: reset the in-memory reload-in-flight guard between cases.
export function resetReloadGuardForTests(): void {
    reloadInFlight = false;
}

// sessionStorage can throw (Safari private mode, hardened privacy settings, disabled storage).
// `available: false` signals that so reloadOnce can fall back to a storage-free loop guard
// rather than treating a thrown read as "no prior attempt" and reloading forever.
function readReloadTimestamp(): { available: boolean; lastAttempt: number } {
    try {
        return { available: true, lastAttempt: Number(globalThis.sessionStorage.getItem(RELOAD_TIMESTAMP_KEY)) };
    } catch {
        return { available: false, lastAttempt: 0 };
    }
}

function writeReloadTimestamp(value: number): void {
    try {
        globalThis.sessionStorage.setItem(RELOAD_TIMESTAMP_KEY, String(value));
    } catch {
        // storage unavailable — proceed without persisting the cooldown
    }
}

// Whether the current page load was itself a reload. Used only as the loop guard when
// sessionStorage is unavailable: if we already reloaded and the chunk still fails, reloading
// again won't help, so this bounds the worst case to a single reload instead of a tight loop.
function isReloadNavigation(): boolean {
    try {
        const [navigation] = globalThis.performance.getEntriesByType('navigation') as PerformanceNavigationTiming[];
        return navigation?.type === 'reload';
    } catch {
        return false;
    }
}

export function reloadOnce(): boolean {
    // A reload is already navigating away — don't trigger another.
    if (reloadInFlight) {
        return false;
    }
    const { available, lastAttempt } = readReloadTimestamp();
    // Primary cooldown: a persisted timestamp. When storage is unavailable we can't persist one,
    // so fall back to the navigation type — a reload that lands on the same failing chunk stops here.
    const withinCooldown = available ? Boolean(lastAttempt) && Date.now() - lastAttempt < RELOAD_COOLDOWN_MS : isReloadNavigation();
    if (withinCooldown) {
        return false;
    }
    reloadInFlight = true;
    writeReloadTimestamp(Date.now());
    globalThis.location.reload();
    return true;
}

// Vite wraps every production route import() in its preload helper, which catches a failed
// chunk fetch, dispatches a cancelable `vite:preloadError` event, and only rethrows the error
// when the event's default is NOT prevented. This handler is therefore the single recovery
// point in production. It reloads once for a stale-chunk fetch failure and calls
// preventDefault() so that:
//   - module-evaluation/runtime errors (payload isn't a chunk-load error) keep propagating,
//   - and a repeat failure within the cooldown (genuinely missing chunk) also keeps
//     propagating to the ErrorBoundary instead of being swallowed into a reload loop.
// Once a reload is in flight, every further chunk-load error is swallowed too: a single
// deploy-stale navigation fires multiple events (the chunk plus its dep preloads) and only the
// first triggers the reload — preventing the siblings keeps them off the ErrorBoundary while the
// page navigates away.
export function handleVitePreloadError(event: Event & { payload?: unknown }): void {
    if (isChunkLoadError(event.payload) && (reloadOnce() || reloadInFlight)) {
        event.preventDefault();
    }
}

export async function loadWithReload<T>(factory: () => Promise<T>): Promise<T> {
    try {
        const module = await factory();
        // When handleVitePreloadError above has already swallowed a chunk failure, Vite's
        // preload wrapper resolves the import to `undefined` while a reload is in flight — hold
        // the Suspense fallback until the page navigates away. Gate on reloadInFlight (always set
        // before a swallow) so a spurious `undefined` from any other source still surfaces to the
        // ErrorBoundary rather than hanging forever.
        if (module === undefined && reloadInFlight) {
            return holdForReload<T>();
        }
        // Deliberately don't touch the cooldown timestamp on success: clearing it for any chunk
        // that loads would defeat the cross-reload loop guard when a sibling chunk is genuinely
        // missing (the timestamp would be gone, so reloadOnce would reload again → loop). The
        // timestamp simply expires after RELOAD_COOLDOWN_MS, which is enough for a later deploy.
        return module;
    } catch (error) {
        // Fallback for dynamic imports that aren't wrapped by Vite's preload helper (e.g. the
        // dev server's native import(), where vite:preloadError never fires). Only a failed
        // chunk fetch is recoverable by reloading; module evaluation/runtime errors must
        // propagate untouched — a reload would not fix them and would mask the cause.
        if (isChunkLoadError(error) && (reloadOnce() || reloadInFlight)) {
            return holdForReload<T>();
        }
        throw error;
    }
}

// Mirrors React's own `lazy` signature (whose constraint is `ComponentType<any>`); reusing its
// parameter type keeps per-route component prop typing without writing an explicit `any` here.
export const lazyWithRetry: typeof lazy = (factory) => lazy(() => loadWithReload(factory));
