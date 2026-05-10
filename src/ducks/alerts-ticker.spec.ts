import { describe, expect, it, vi, beforeEach, afterEach } from 'vitest';
import { startAlertsTicker, resetTickerStarted } from './alerts-ticker';
import { actions } from './alerts';

describe('alerts-ticker', () => {
    let mockStore: any;
    let messages: any[];

    beforeEach(() => {
        vi.useFakeTimers();
        resetTickerStarted();
        messages = [];
        mockStore = {
            getState: vi.fn(() => ({
                alerts: {
                    messages,
                },
            })),
            dispatch: vi.fn(),
        };
    });

    afterEach(() => {
        vi.restoreAllMocks();
        vi.useRealTimers();
    });

    it('should dispatch hide after 7 seconds', () => {
        const now = 1000000;
        vi.setSystemTime(now);

        messages.push({
            id: 1,
            time: now - 7001,
            message: 'Old message',
            color: 'info',
        });

        startAlertsTicker(mockStore);
        vi.advanceTimersByTime(1000);

        expect(mockStore.dispatch).toHaveBeenCalledWith(actions.hide(1));
    });

    it('should dispatch dismiss after 8 seconds', () => {
        const now = 1000000;
        vi.setSystemTime(now);

        messages.push({
            id: 2,
            time: now - 8001,
            message: 'Very old message',
            color: 'info',
        });

        startAlertsTicker(mockStore);
        vi.advanceTimersByTime(1000);

        // It should dispatch both hide and dismiss if it's over 20s
        expect(mockStore.dispatch).toHaveBeenCalledWith(actions.hide(2));
        expect(mockStore.dispatch).toHaveBeenCalledWith(actions.dismiss(2));
    });

    it('should not dispatch anything if message is new', () => {
        const now = 1000000;
        vi.setSystemTime(now);

        messages.push({
            id: 3,
            time: now - 5000,
            message: 'New message',
            color: 'info',
        });

        startAlertsTicker(mockStore);
        vi.advanceTimersByTime(1000);

        expect(mockStore.dispatch).not.toHaveBeenCalled();
    });

    it('should not start multiple intervals', () => {
        const setIntervalSpy = vi.spyOn(globalThis, 'setInterval');

        startAlertsTicker(mockStore);
        startAlertsTicker(mockStore);
        startAlertsTicker(mockStore);

        expect(setIntervalSpy).toHaveBeenCalledTimes(1);
    });

    it('should handle missing alerts state gracefully', () => {
        mockStore.getState.mockReturnValue({});

        startAlertsTicker(mockStore);
        vi.advanceTimersByTime(1000);

        expect(mockStore.dispatch).not.toHaveBeenCalled();
    });

    it('should handle missing messages array gracefully', () => {
        mockStore.getState.mockReturnValue({ alerts: {} });

        startAlertsTicker(mockStore);
        vi.advanceTimersByTime(1000);

        expect(mockStore.dispatch).not.toHaveBeenCalled();
    });

    it('should process multiple messages', () => {
        const now = 1000000;
        vi.setSystemTime(now);

        messages.push(
            { id: 1, time: now - 18000, message: 'm1', color: 'info' },
            { id: 2, time: now - 21000, message: 'm2', color: 'info' },
            { id: 3, time: now - 5000, message: 'm3', color: 'info' },
        );

        startAlertsTicker(mockStore);
        vi.advanceTimersByTime(1000);

        expect(mockStore.dispatch).toHaveBeenCalledWith(actions.hide(1));
        expect(mockStore.dispatch).toHaveBeenCalledWith(actions.hide(2));
        expect(mockStore.dispatch).toHaveBeenCalledWith(actions.dismiss(2));
        expect(mockStore.dispatch).not.toHaveBeenCalledWith(actions.hide(3));
    });
});
