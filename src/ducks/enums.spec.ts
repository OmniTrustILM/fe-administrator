import { describe, expect, test } from 'vitest';

import type { EnumItemModel } from 'types/enums';
import { getEnumDescription, getEnumLabel } from './enums';

const platformEnum: { [key: string]: EnumItemModel } = {
    user: { code: 'user', label: 'User', description: 'Selected users receive notifications.' },
    group: { code: 'group', label: 'Group' },
};

describe('getEnumLabel', () => {
    test('returns the label for a known key', () => {
        expect(getEnumLabel(platformEnum, 'user')).toBe('User');
    });

    test('falls back to the key when the item is unknown', () => {
        expect(getEnumLabel(platformEnum, 'missing')).toBe('missing');
    });

    test('falls back to the key when the enum is undefined', () => {
        expect(getEnumLabel(undefined, 'user')).toBe('user');
    });
});

describe('getEnumDescription', () => {
    test('returns the description when present', () => {
        expect(getEnumDescription(platformEnum, 'user')).toBe('Selected users receive notifications.');
    });

    test('returns undefined when the item has no description', () => {
        expect(getEnumDescription(platformEnum, 'group')).toBeUndefined();
    });

    test('returns undefined for an unknown key', () => {
        expect(getEnumDescription(platformEnum, 'missing')).toBeUndefined();
    });

    test('returns undefined when the enum is undefined', () => {
        expect(getEnumDescription(undefined, 'user')).toBeUndefined();
    });

    test('returns undefined when the key is undefined', () => {
        expect(getEnumDescription(platformEnum, undefined)).toBeUndefined();
    });
});
