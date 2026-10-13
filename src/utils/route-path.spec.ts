import { describe, expect, test } from 'vitest';
import { toRoutePath } from './route-path';

describe('toRoutePath', () => {
    test.each([
        ['/secrets/', '/secrets'],
        ['/secrets///', '/secrets'],
        ['/secrets', '/secrets'],
        ['/', '/'],
        ['//', '/'],
        ['', ''],
    ])('%j becomes %j', (path, expected) => {
        expect(toRoutePath(path)).toBe(expected);
    });

    test('stays linear on a long run of slashes', () => {
        const path = `/a${'/'.repeat(100_000)}b`;
        expect(toRoutePath(path)).toBe(path);
    });
});
