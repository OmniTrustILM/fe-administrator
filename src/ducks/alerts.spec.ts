import { describe, expect, test } from 'vitest';

import reducer, { actions, selectors } from './alerts';
import { initialState as sliceInitialState, MAX_STORED_ALERTS } from './alert-slice';

describe('alerts slice', () => {
    test('returns initial state for unknown action', () => {
        expect(reducer(undefined, { type: 'unknown' })).toEqual(sliceInitialState);
    });

    test('error action adds danger message and increments msgId', () => {
        const before = sliceInitialState;

        const next = reducer(before, actions.error('Something went wrong'));

        expect(next.messages).toHaveLength(1);
        expect(next.messages[0].message).toBe('Something went wrong');
        expect(next.messages[0].color).toBe('danger');
        expect(next.messages[0].id).toBe(0);
        expect(typeof next.messages[0].time).toBe('number');
        expect(next.msgId).toBe(1);
    });

    test('success action adds success message and increments msgId', () => {
        const before = { ...sliceInitialState, msgId: 5, messages: [] };

        const next = reducer(before, actions.success('All good'));

        expect(next.messages).toHaveLength(1);
        expect(next.messages[0].message).toBe('All good');
        expect(next.messages[0].color).toBe('success');
        expect(next.messages[0].id).toBe(5);
        expect(next.msgId).toBe(6);
    });

    test('info action adds info message and increments msgId', () => {
        const before = { ...sliceInitialState, msgId: 2, messages: [] };

        const next = reducer(before, actions.info('Some info'));

        expect(next.messages).toHaveLength(1);
        expect(next.messages[0].message).toBe('Some info');
        expect(next.messages[0].color).toBe('info');
        expect(next.messages[0].id).toBe(2);
        expect(next.msgId).toBe(3);
    });

    test('hide sets isHiding flag for existing message', () => {
        const before = {
            ...sliceInitialState,
            messages: [
                { id: 1, time: 0, message: 'Test', color: 'info' as const },
                { id: 2, time: 0, message: 'Other', color: 'danger' as const },
            ],
        };

        const next = reducer(before, actions.hide(2));

        expect(next.messages[0].isHiding).toBeUndefined();
        expect(next.messages[1].isHiding).toBe(true);
    });

    test('hide is a no-op for unknown id', () => {
        const before = {
            ...sliceInitialState,
            messages: [{ id: 1, time: 0, message: 'Test', color: 'info' as const }],
        };

        const next = reducer(before, actions.hide(999));

        expect(next).toEqual(before);
    });

    test('dismiss removes message by id', () => {
        const before = {
            ...sliceInitialState,
            messages: [
                { id: 1, time: 0, message: 'First', color: 'info' as const },
                { id: 2, time: 0, message: 'Second', color: 'danger' as const },
            ],
        };

        const next = reducer(before, actions.dismiss(1));

        expect(next.messages).toHaveLength(1);
        expect(next.messages[0].id).toBe(2);
    });

    test('dismiss is a no-op for unknown id', () => {
        const before = {
            ...sliceInitialState,
            messages: [{ id: 1, time: 0, message: 'Only', color: 'info' as const }],
        };

        const next = reducer(before, actions.dismiss(999));

        expect(next).toEqual(before);
    });

    test('dismissAll removes all messages', () => {
        const before = {
            ...sliceInitialState,
            msgId: 3,
            messages: [
                { id: 1, time: 0, message: 'First', color: 'info' as const },
                { id: 2, time: 0, message: 'Second', color: 'danger' as const },
            ],
        };

        const next = reducer(before, actions.dismissAll());

        expect(next.messages).toHaveLength(0);
        expect(next.msgId).toBe(3);
    });

    test('dismissAll is a no-op safe on empty state', () => {
        const next = reducer(sliceInitialState, actions.dismissAll());

        expect(next.messages).toHaveLength(0);
    });

    test('drops the oldest message once the retention cap is exceeded', () => {
        const before = {
            ...sliceInitialState,
            msgId: MAX_STORED_ALERTS,
            messages: Array.from({ length: MAX_STORED_ALERTS }, (_, index) => ({
                id: index,
                time: 0,
                message: `Message ${index}`,
                color: 'danger' as const,
            })),
        };

        const next = reducer(before, actions.error('Newest failure'));

        expect(next.messages).toHaveLength(MAX_STORED_ALERTS);
        expect(next.messages[0].id).toBe(1);
        expect(next.messages[next.messages.length - 1].message).toBe('Newest failure');
    });
});

describe('alerts selectors', () => {
    test('selectState returns alerts slice', () => {
        const alertsState = {
            ...sliceInitialState,
            messages: [{ id: 1, time: 0, message: 'Msg', color: 'info' as const }],
        };

        const state = { alerts: alertsState } as any;

        expect(selectors.selectState(state)).toEqual(alertsState);
    });

    test('selectMessages returns messages, or empty array when undefined', () => {
        const alertsState = {
            ...sliceInitialState,
            messages: [{ id: 1, time: 0, message: 'Msg', color: 'info' as const }],
        };
        const state = { alerts: alertsState } as any;

        expect(selectors.selectMessages(state)).toEqual(alertsState.messages);

        const emptyState = { alerts: undefined } as any;
        expect(selectors.selectMessages(emptyState)).toEqual([]);
    });
});
