import { act } from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { createRoot, type Root } from 'react-dom/client';

import { setupReactActEnvironment } from '../../test-utils/reactActEnvironment';
import { usePollWhileAttended } from './usePollWhileAttended';

setupReactActEnvironment();

const INTERVAL = 1_000;

function Harness({ poll, enabled }: Readonly<{ poll: () => void; enabled: boolean }>) {
    usePollWhileAttended(poll, enabled, INTERVAL);
    return null;
}

describe('usePollWhileAttended', () => {
    let container: HTMLDivElement;
    let root: Root;
    let visibility: DocumentVisibilityState;
    let focused: boolean;
    const poll = vi.fn();

    beforeEach(() => {
        vi.useFakeTimers();
        visibility = 'visible';
        focused = true;
        vi.spyOn(document, 'visibilityState', 'get').mockImplementation(() => visibility);
        vi.spyOn(document, 'hasFocus').mockImplementation(() => focused);
        poll.mockReset();
        container = document.createElement('div');
        document.body.appendChild(container);
        root = createRoot(container);
    });

    afterEach(async () => {
        await act(async () => root.unmount());
        container.remove();
        vi.useRealTimers();
        vi.restoreAllMocks();
    });

    const mount = async (enabled = true) => {
        await act(async () => {
            root.render(<Harness poll={poll} enabled={enabled} />);
        });
    };
    const advance = async (ms: number) => {
        await act(async () => {
            vi.advanceTimersByTime(ms);
        });
    };
    const blur = async () => {
        focused = false;
        await act(async () => {
            window.dispatchEvent(new Event('blur'));
        });
    };
    const refocus = async () => {
        focused = true;
        await act(async () => {
            window.dispatchEvent(new Event('focus'));
        });
    };

    it('polls on the interval, and not on start, since whatever enabled it has just read the page', async () => {
        await mount();
        expect(poll).not.toHaveBeenCalled();

        await advance(INTERVAL * 3);
        expect(poll).toHaveBeenCalledTimes(3);
    });

    it('sends nothing while disabled', async () => {
        await mount(false);

        await advance(INTERVAL * 3);
        expect(poll).not.toHaveBeenCalled();
    });

    it('pauses while its window lacks focus, and polls at once when focus returns', async () => {
        await mount();
        await blur();

        await advance(INTERVAL * 3);
        expect(poll).not.toHaveBeenCalled();

        await refocus();
        expect(poll).toHaveBeenCalledTimes(1);

        await advance(INTERVAL);
        expect(poll).toHaveBeenCalledTimes(2);
    });

    it('pauses while its tab is hidden, and resumes when it is shown again', async () => {
        await mount();
        visibility = 'hidden';
        await act(async () => {
            document.dispatchEvent(new Event('visibilitychange'));
        });

        await advance(INTERVAL * 3);
        expect(poll).not.toHaveBeenCalled();

        visibility = 'visible';
        await act(async () => {
            document.dispatchEvent(new Event('visibilitychange'));
        });
        expect(poll).toHaveBeenCalledTimes(1);
    });

    it('does not start on a page opened in the background, and polls once the page gets attention', async () => {
        focused = false;
        await mount();

        await advance(INTERVAL * 3);
        expect(poll).not.toHaveBeenCalled();

        await refocus();
        expect(poll).toHaveBeenCalledTimes(1);
    });

    it('polls once when focus and visibility both report the return, not twice', async () => {
        await mount();
        await blur();

        focused = true;
        await act(async () => {
            window.dispatchEvent(new Event('focus'));
            document.dispatchEvent(new Event('visibilitychange'));
        });
        expect(poll).toHaveBeenCalledTimes(1);
    });

    it('calls the latest callback without restarting the interval', async () => {
        await mount();
        await advance(INTERVAL / 2);

        const next = vi.fn();
        await act(async () => {
            root.render(<Harness poll={next} enabled />);
        });
        await advance(INTERVAL / 2);

        expect(poll).not.toHaveBeenCalled();
        expect(next).toHaveBeenCalledTimes(1);
    });

    it('stops when disabled and when unmounted', async () => {
        await mount();
        await mount(false);
        await advance(INTERVAL * 3);
        expect(poll).not.toHaveBeenCalled();

        await mount();
        await act(async () => root.unmount());
        root = createRoot(container);
        await advance(INTERVAL * 3);
        expect(poll).not.toHaveBeenCalled();
    });
});
