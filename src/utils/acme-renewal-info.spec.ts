import { describe, expect, test } from 'vitest';
import {
    DEFAULT_RENEWAL_INFO_RETRY_AFTER,
    renewalInfoRequestFields,
    renewalInfoRetryAfterError,
    renewalInfoValues,
} from './acme-renewal-info';

describe('acme renewal info form helpers', () => {
    test('defaults to off and 21600 seconds without a profile', () => {
        expect(renewalInfoValues(undefined)).toEqual({ renewalInfoEnabled: false, renewalInfoRetryAfter: '21600' });
        expect(DEFAULT_RENEWAL_INFO_RETRY_AFTER).toBe('21600');
    });

    test('fills the values from the profile', () => {
        expect(renewalInfoValues({ renewalInfoEnabled: true, renewalInfoRetryAfter: 3600 } as any)).toEqual({
            renewalInfoEnabled: true,
            renewalInfoRetryAfter: '3600',
        });
    });

    test('falls back to the defaults for a profile without the fields', () => {
        expect(renewalInfoValues({} as any)).toEqual({ renewalInfoEnabled: false, renewalInfoRetryAfter: '21600' });
    });

    test('always sends both fields', () => {
        expect(renewalInfoRequestFields({ renewalInfoEnabled: false, renewalInfoRetryAfter: '600' })).toEqual({
            renewalInfoEnabled: false,
            renewalInfoRetryAfter: 600,
        });
    });

    test.each([
        ['299', true],
        ['300', false],
        ['86400', false],
        ['86401', true],
        ['abc', true],
        ['', true],
    ])('retry-after %s refused: %s', (value, refused) => {
        expect(renewalInfoRetryAfterError(value) !== undefined).toBe(refused);
    });
});
