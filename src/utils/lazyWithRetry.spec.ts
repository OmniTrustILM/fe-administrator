import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import {
    handleVitePreloadError,
    loadWithReload,
    RELOAD_COOLDOWN_MS,
    RELOAD_NAVIGATION_TIMEOUT_MS,
    RELOAD_TIMESTAMP_KEY,
    resetReloadGuardForTests,
} from './lazyWithRetry';

function preloadErrorEvent(payload: unknown): Event & { payload?: unknown } {
    const event = new Event('vite:preloadError', { cancelable: true }) as Event & { payload?: unknown };
    event.payload = payload;
    return event;
}

describe('lazyWithRetry', () => {
    let reloadSpy: ReturnType<typeof vi.fn>;
    const originalLocationDescriptor = Object.getOwnPropertyDescriptor(globalThis, 'location');

    beforeEach(() => {
        globalThis.sessionStorage.clear();
        resetReloadGuardForTests();
        reloadSpy = vi.fn();
        // globalThis.location.reload is read-only in happy-dom; redefine it with a spy.
        Object.defineProperty(globalThis, 'location', {
            value: { ...globalThis.location, reload: reloadSpy },
            configurable: true,
            writable: true,
        });
    });

    afterEach(() => {
        vi.restoreAllMocks();
        // Restore the original globalThis.location so the override doesn't leak into other tests.
        if (originalLocationDescriptor) {
            Object.defineProperty(globalThis, 'location', originalLocationDescriptor);
        }
    });

    describe('loadWithReload (fallback for unwrapped imports)', () => {
        it('returns the module on success without clearing the guard (a sibling 404 must not loop)', async () => {
            // clearing on success would let a concurrently-failing chunk reload forever, since the
            // cross-reload guard depends on this timestamp — leave it to expire via the cooldown
            const timestamp = String(Date.now());
            globalThis.sessionStorage.setItem(RELOAD_TIMESTAMP_KEY, timestamp);
            const module = { default: 'Component' };

            const result = await loadWithReload(() => Promise.resolve(module));

            expect(result).toBe(module);
            expect(reloadSpy).not.toHaveBeenCalled();
            expect(globalThis.sessionStorage.getItem(RELOAD_TIMESTAMP_KEY)).toBe(timestamp);
        });

        it('production handoff: handler reloads, then the swallowed undefined import stays pending', async () => {
            // the real production sequence — the global handler fires first (synchronously),
            // reloads and sets reloadInFlight; Vite's preload wrapper then resolves the import to
            // undefined, which loadWithReload must hold (not resolve to undefined) until navigation.
            const event = preloadErrorEvent(new Error('Failed to fetch dynamically imported module'));
            handleVitePreloadError(event);
            expect(reloadSpy).toHaveBeenCalledTimes(1);
            expect(event.defaultPrevented).toBe(true);

            const pending = loadWithReload(() => Promise.resolve(undefined));
            pending.catch(() => {}); // holdForReload rejects after the timeout — keep it handled in tests

            const settled = await Promise.race([pending.then(() => 'resolved'), Promise.resolve('pending')]);
            expect(settled).toBe('pending');
            expect(reloadSpy).toHaveBeenCalledTimes(1);
            // the timestamp guard remains for the cooldown
            expect(Number(globalThis.sessionStorage.getItem(RELOAD_TIMESTAMP_KEY))).toBeGreaterThan(0);
        });

        it('returns a spurious undefined as-is when no reload is in flight (surfaces instead of hanging)', async () => {
            // an undefined resolution NOT caused by the preload handler must not be mistaken for a
            // swallowed chunk and held forever — it should surface (here, resolve to undefined).
            const result = await loadWithReload(() => Promise.resolve(undefined));

            expect(result).toBeUndefined();
            expect(reloadSpy).not.toHaveBeenCalled();
        });

        it('reloads once and records the attempt timestamp on the first failure (stale chunk)', async () => {
            // never resolves — the page is expected to reload instead
            const pending = loadWithReload(() => Promise.reject(new Error('Failed to fetch dynamically imported module')));
            pending.catch(() => {}); // holdForReload rejects after the timeout — keep it handled in tests

            // give the rejected promise a tick to be handled
            await Promise.resolve();

            expect(reloadSpy).toHaveBeenCalledTimes(1);
            // a fresh timestamp is recorded so a repeat failure within the cooldown won't loop
            expect(Number(globalThis.sessionStorage.getItem(RELOAD_TIMESTAMP_KEY))).toBeGreaterThan(0);

            // the returned promise stays pending (Suspense keeps its fallback)
            const settled = await Promise.race([pending.then(() => 'resolved'), Promise.resolve('pending')]);
            expect(settled).toBe('pending');
        });

        it('does not loop when a sibling chunk succeeds while another is genuinely missing', async () => {
            // simulate the post-reload state: a timestamp from the reload that just happened
            globalThis.sessionStorage.setItem(RELOAD_TIMESTAMP_KEY, String(Date.now()));

            // chunk A exists and resolves — must NOT clear the timestamp
            await loadWithReload(() => Promise.resolve({ default: 'A' }));

            // chunk B is a true 404; within the cooldown it must propagate, not reload again
            const error = new Error('Failed to fetch dynamically imported module');
            await expect(loadWithReload(() => Promise.reject(error))).rejects.toBe(error);
            expect(reloadSpy).not.toHaveBeenCalled();
        });

        it('rethrows without reloading if a reload was attempted within the cooldown (genuinely missing chunk)', async () => {
            globalThis.sessionStorage.setItem(RELOAD_TIMESTAMP_KEY, String(Date.now()));
            const error = new Error('Failed to fetch dynamically imported module');

            await expect(loadWithReload(() => Promise.reject(error))).rejects.toBe(error);
            expect(reloadSpy).not.toHaveBeenCalled();
        });

        it('reloads again once the cooldown has elapsed (later deploy, flag never cleared)', async () => {
            // a stale attempt older than the cooldown — e.g. a reload from an earlier deploy that
            // recovered without ever clearing the flag, then a new deploy left another stale chunk
            globalThis.sessionStorage.setItem(RELOAD_TIMESTAMP_KEY, String(Date.now() - RELOAD_COOLDOWN_MS - 1));

            const pending = loadWithReload(() => Promise.reject(new Error('Failed to fetch dynamically imported module')));
            pending.catch(() => {}); // holdForReload rejects after the timeout — keep it handled in tests
            await Promise.resolve();

            expect(reloadSpy).toHaveBeenCalledTimes(1);
        });

        it('rethrows non-chunk errors without reloading (module evaluation/runtime error)', async () => {
            const error = new Error('Cannot read properties of undefined');

            await expect(loadWithReload(() => Promise.reject(error))).rejects.toBe(error);
            expect(reloadSpy).not.toHaveBeenCalled();
            expect(globalThis.sessionStorage.getItem(RELOAD_TIMESTAMP_KEY)).toBeNull();
        });

        it('rejects after the navigation timeout if the reload never navigates away (blocked/no-op reload)', async () => {
            vi.useFakeTimers();
            try {
                const pending = loadWithReload(() => Promise.reject(new Error('Failed to fetch dynamically imported module')));
                const assertion = expect(pending).rejects.toThrow('Page did not reload after a chunk-load failure');

                // flush the rejection handling, then fire the navigation timeout
                await vi.advanceTimersByTimeAsync(RELOAD_NAVIGATION_TIMEOUT_MS);

                await assertion;
                expect(reloadSpy).toHaveBeenCalledTimes(1);
            } finally {
                vi.useRealTimers();
            }
        });
    });

    describe('handleVitePreloadError (production preload path)', () => {
        it('reloads once and prevents default for a stale-chunk fetch failure', () => {
            const event = preloadErrorEvent(new Error('Failed to fetch dynamically imported module'));

            handleVitePreloadError(event);

            expect(reloadSpy).toHaveBeenCalledTimes(1);
            // preventDefault stops Vite from rethrowing while the page reloads
            expect(event.defaultPrevented).toBe(true);
            expect(Number(globalThis.sessionStorage.getItem(RELOAD_TIMESTAMP_KEY))).toBeGreaterThan(0);
        });

        it('reloads for a stale dependency-preload (CSS) failure', () => {
            const event = preloadErrorEvent(new Error('Unable to preload CSS for /assets/index-abc123.css'));

            handleVitePreloadError(event);

            expect(reloadSpy).toHaveBeenCalledTimes(1);
            expect(event.defaultPrevented).toBe(true);
        });

        it('swallows sibling chunk errors while a reload is already in flight (one navigation, many events)', () => {
            // a single deploy-stale navigation fires the route chunk error plus its dep-preload errors
            const first = preloadErrorEvent(new Error('Failed to fetch dynamically imported module'));
            const sibling = preloadErrorEvent(new Error('Unable to preload CSS for /assets/index-abc123.css'));

            handleVitePreloadError(first);
            handleVitePreloadError(sibling);

            // only the first triggers the reload, but BOTH are prevented so neither hits the ErrorBoundary
            expect(reloadSpy).toHaveBeenCalledTimes(1);
            expect(first.defaultPrevented).toBe(true);
            expect(sibling.defaultPrevented).toBe(true);
        });

        it('lets module-evaluation errors propagate (no reload, default not prevented)', () => {
            const event = preloadErrorEvent(new Error('Cannot read properties of undefined'));

            handleVitePreloadError(event);

            expect(reloadSpy).not.toHaveBeenCalled();
            // not prevented → Vite rethrows → the error reaches the ErrorBoundary
            expect(event.defaultPrevented).toBe(false);
        });

        it('lets a repeat chunk failure within the cooldown propagate instead of reloading again', () => {
            globalThis.sessionStorage.setItem(RELOAD_TIMESTAMP_KEY, String(Date.now()));
            const event = preloadErrorEvent(new Error('Failed to fetch dynamically imported module'));

            handleVitePreloadError(event);

            expect(reloadSpy).not.toHaveBeenCalled();
            // not prevented → genuinely missing chunk surfaces to the ErrorBoundary, no reload loop
            expect(event.defaultPrevented).toBe(false);
        });

        it('reloads again once the cooldown has elapsed (later deploy)', () => {
            globalThis.sessionStorage.setItem(RELOAD_TIMESTAMP_KEY, String(Date.now() - RELOAD_COOLDOWN_MS - 1));
            const event = preloadErrorEvent(new Error('Failed to fetch dynamically imported module'));

            handleVitePreloadError(event);

            expect(reloadSpy).toHaveBeenCalledTimes(1);
            expect(event.defaultPrevented).toBe(true);
        });

        it('still reloads when sessionStorage access throws (storage disabled / private mode)', () => {
            // hardened privacy settings can make getItem/setItem throw — recovery must not be defeated
            vi.spyOn(globalThis.sessionStorage, 'getItem').mockImplementation(() => {
                throw new Error('storage disabled');
            });
            vi.spyOn(globalThis.sessionStorage, 'setItem').mockImplementation(() => {
                throw new Error('storage disabled');
            });
            // first navigation to the page (not a reload), so the loop guard lets the reload proceed
            vi.spyOn(globalThis.performance, 'getEntriesByType').mockReturnValue([{ type: 'navigate' } as PerformanceNavigationTiming]);
            const event = preloadErrorEvent(new Error('Failed to fetch dynamically imported module'));

            handleVitePreloadError(event);

            expect(reloadSpy).toHaveBeenCalledTimes(1);
            expect(event.defaultPrevented).toBe(true);
        });

        it('does not reload again when storage is unavailable and the page already reloaded (bounded loop)', () => {
            // storage can't persist a cooldown, but the navigation type shows this load is itself a
            // reload — the previous reload didn't fix the chunk, so stop instead of looping
            vi.spyOn(globalThis.sessionStorage, 'getItem').mockImplementation(() => {
                throw new Error('storage disabled');
            });
            vi.spyOn(globalThis.performance, 'getEntriesByType').mockReturnValue([{ type: 'reload' } as PerformanceNavigationTiming]);
            const event = preloadErrorEvent(new Error('Failed to fetch dynamically imported module'));

            handleVitePreloadError(event);

            expect(reloadSpy).not.toHaveBeenCalled();
            // not prevented → the genuinely missing chunk surfaces to the ErrorBoundary
            expect(event.defaultPrevented).toBe(false);
        });
    });
});
