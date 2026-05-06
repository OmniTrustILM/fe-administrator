import { test, expect } from 'vitest';

interface CommonSliceTestOptions<TState> {
    reducer: (state: TState | undefined, action: any) => TState;
    actions: {
        resetState: () => any;
        setCheckedRows: (payload: { checkedRows: string[] }) => any;
        clearDeleteErrorMessages?: () => any;
    };
    initialState: TState;
    dirtyOverrides: Partial<TState>;
    deleteErrorOverrides?: Partial<TState>;
    deleteErrorAssertions?: (state: TState) => void;
}

export function runCommonSliceTests<TState extends Record<string, any>>(opts: CommonSliceTestOptions<TState>) {
    const { reducer, actions, initialState, dirtyOverrides, deleteErrorOverrides, deleteErrorAssertions } = opts;

    test('resetState restores initialState', () => {
        const dirty = { ...initialState, ...dirtyOverrides } as TState;
        expect(reducer(dirty, actions.resetState())).toEqual(initialState);
    });

    test('setCheckedRows updates checkedRows', () => {
        const next = reducer(initialState, actions.setCheckedRows({ checkedRows: ['a', 'b'] }));
        expect((next as any).checkedRows).toEqual(['a', 'b']);
    });

    if (actions.clearDeleteErrorMessages && deleteErrorOverrides && deleteErrorAssertions) {
        test('clearDeleteErrorMessages clears error fields', () => {
            const state = { ...initialState, ...deleteErrorOverrides } as TState;
            const next = reducer(state, actions.clearDeleteErrorMessages!());
            deleteErrorAssertions(next);
        });
    }
}
