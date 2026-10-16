import { describe, expect, test } from 'vitest';
import { KeyUsage } from 'types/openapi';
import { getKeyUsageOptions } from './index';

describe('getKeyUsageOptions', () => {
    test('usesOnlyTheAvailableUsages', () => {
        // given
        const availableUsages = [KeyUsage.Sign, KeyUsage.Verify];

        // when
        const options = getKeyUsageOptions(availableUsages, undefined);

        // then
        expect(options.map((option) => option.value)).toEqual(availableUsages);
    });

    test('keepsKeyTypeFilteringForTheAvailableUsages', () => {
        // given
        const availableUsages = [KeyUsage.Sign, KeyUsage.Verify];
        const privateKeyUsages = [KeyUsage.Sign, KeyUsage.Decrypt, KeyUsage.Unwrap];

        // when
        const options = getKeyUsageOptions(availableUsages, undefined, privateKeyUsages);

        // then
        expect(options.map((option) => option.value)).toEqual([KeyUsage.Sign]);
    });
});
