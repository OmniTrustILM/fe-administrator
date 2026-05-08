import { describe, expect, test } from 'vitest';
import { mutators } from './attributeEditorMutators';

describe('attributeEditorMutators', () => {
    describe('setAttribute', () => {
        test('changes value at key via changeValue', () => {
            const mutator = mutators().setAttribute;
            let capturedUpdater: ((prev: any) => any) | null = null;
            const changeValue = (_state: any, key: string, updater: (prev: any) => any) => {
                capturedUpdater = updater;
            };
            const state = { formState: { values: {} } } as any;
            const tools = { changeValue } as any;
            mutator(['attrKey', 'newVal'], state, tools);
            expect(capturedUpdater).toBeDefined();
            expect(capturedUpdater!('previous')).toBe('newVal');
        });
    });

    describe('clearAttributes', () => {
        test('clears keys in formState.values that start with __attributes__', () => {
            const mutator = mutators().clearAttributes;
            const state = {
                formState: {
                    values: {
                        __attributes__id1__attr1: 'v1',
                        __attributes__id1__attr2: 'v2',
                        other: 'keep',
                    },
                },
            } as any;
            const tools = {} as any;
            mutator(['id1'], state, tools);
            expect(state.formState.values.__attributes__id1__attr1).toBeUndefined();
            expect(state.formState.values.__attributes__id1__attr2).toBeUndefined();
            expect(state.formState.values.other).toBe('keep');
        });
        test('when id is empty string still clears by prefix __attributes__', () => {
            const mutator = mutators().clearAttributes;
            const state = {
                formState: {
                    values: {
                        __attributes____attr: 'x',
                    },
                },
            } as any;
            mutator([''], state, {} as any);
            expect(state.formState.values.__attributes____attr).toBeUndefined();
        });
    });
});
