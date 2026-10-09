import { useEffect, useRef } from 'react';

/**
 * Calls `poll` every `intervalMs` while `enabled`, and only while the page has the user's attention: its tab is visible
 * and its window has focus. A page in a background tab or behind another window sends nothing, so several open tabs
 * never poll at once. Coming back polls straight away and then on the interval again. Starting, or being enabled, does
 * not poll: whatever enabled it has just read what is on screen.
 */
export function usePollWhileAttended(poll: () => void, enabled: boolean, intervalMs: number): void {
    // The latest callback, so a tick sees the current render's state without restarting the timer.
    const pollRef = useRef(poll);
    useEffect(() => {
        pollRef.current = poll;
    }, [poll]);

    useEffect(() => {
        if (!enabled) return;

        let timer: ReturnType<typeof setInterval> | undefined;
        const attended = () => document.visibilityState === 'visible' && document.hasFocus();
        const start = () => {
            if (timer === undefined) timer = setInterval(() => pollRef.current(), intervalMs);
        };
        const stop = () => {
            clearInterval(timer);
            timer = undefined;
        };
        const onAttentionChange = () => {
            if (!attended()) {
                stop();
            } else if (timer === undefined) {
                pollRef.current();
                start();
            }
        };

        if (attended()) start();
        document.addEventListener('visibilitychange', onAttentionChange);
        window.addEventListener('focus', onAttentionChange);
        window.addEventListener('blur', onAttentionChange);
        return () => {
            stop();
            document.removeEventListener('visibilitychange', onAttentionChange);
            window.removeEventListener('focus', onAttentionChange);
            window.removeEventListener('blur', onAttentionChange);
        };
    }, [enabled, intervalMs]);
}
