import { describe, expect, test } from 'vitest';
import { LIST_VIEW_SCOPES, WorkflowListKey, isPathInScope, persistPaginationKey } from './listViewState';

describe('listViewState.isPathInScope', () => {
    test('matches the exact prefix', () => {
        expect(isPathInScope('/rules', ['/rules'])).toBe(true);
    });

    test('matches a nested path under the prefix', () => {
        expect(isPathInScope('/rules/1', ['/rules'])).toBe(true);
        expect(isPathInScope('/rules/detail/123', ['/rules'])).toBe(true);
    });

    test('does not match a different prefix or a partial-name collision', () => {
        expect(isPathInScope('/certificates', ['/rules'])).toBe(false);
        expect(isPathInScope('/rules-archive', ['/rules'])).toBe(false);
    });

    test('matches any of multiple prefixes', () => {
        expect(isPathInScope('/conditions/detail/9', ['/rules', '/conditions'])).toBe(true);
        expect(isPathInScope('/rules/1', ['/rules', '/conditions'])).toBe(true);
        expect(isPathInScope('/triggers', ['/rules', '/conditions'])).toBe(false);
    });
});

describe('listViewState scopes', () => {
    test('conditions stay in scope while drilling into a condition detail and back', () => {
        const prefixes = LIST_VIEW_SCOPES[WorkflowListKey.conditions];
        // list (rules tab 1) -> condition detail -> back to list
        expect(isPathInScope('/rules/1', prefixes)).toBe(true);
        expect(isPathInScope('/conditions/detail/abc', prefixes)).toBe(true);
        // navigating elsewhere resets
        expect(isPathInScope('/certificates', prefixes)).toBe(false);
    });

    test('executions stay in scope across the actions page and the execution detail', () => {
        const prefixes = LIST_VIEW_SCOPES[WorkflowListKey.executions];
        expect(isPathInScope('/actions/1', prefixes)).toBe(true);
        expect(isPathInScope('/executions/detail/abc', prefixes)).toBe(true);
        expect(isPathInScope('/triggers', prefixes)).toBe(false);
    });
});

describe('listViewState.persistPaginationKey', () => {
    test('pairs a list key with its route-independent pagination key', () => {
        expect(persistPaginationKey(WorkflowListKey.conditions)).toBe('custom-table-persistent:workflows:conditions');
    });
});
