import { describe, expect, test } from 'vitest';
import {
    DEFAULT_RENEWAL_INFO_FORM_VALUES,
    daysToSeconds,
    hoursToSeconds,
    refreshIntervalHoursError,
    refreshRecheckDaysError,
    renewalInfoFormValuesFromDto,
    renewalInfoUpdateDtoFromFormValues,
} from './renewal-info-settings';

describe('renewal info settings transforms', () => {
    test('shows the defaults when the backend returns no section', () => {
        expect(renewalInfoFormValuesFromDto(undefined)).toEqual({
            refreshMinHours: '1',
            refreshMaxHours: '24',
            refreshDefaultHours: '6',
            refreshBatchSize: '20',
            refreshRecheckDays: '7',
        });
        expect(renewalInfoFormValuesFromDto(undefined)).toEqual(DEFAULT_RENEWAL_INFO_FORM_VALUES);
    });

    test('converts seconds to hours and days', () => {
        expect(
            renewalInfoFormValuesFromDto({
                refreshMinInterval: 5400,
                refreshMaxInterval: 172800,
                refreshDefaultInterval: 7200,
                refreshBatchSize: 50,
                refreshRecheckInterval: 1209600,
            }),
        ).toEqual({
            refreshMinHours: '1.5',
            refreshMaxHours: '48',
            refreshDefaultHours: '2',
            refreshBatchSize: '50',
            refreshRecheckDays: '14',
        });
    });

    test('converts hours and days to seconds', () => {
        expect(
            renewalInfoUpdateDtoFromFormValues({
                refreshMinHours: '1.5',
                refreshMaxHours: '48',
                refreshDefaultHours: '2',
                refreshBatchSize: '30',
                refreshRecheckDays: '14',
            }),
        ).toEqual({
            refreshMinInterval: 5400,
            refreshMaxInterval: 172800,
            refreshDefaultInterval: 7200,
            refreshBatchSize: 30,
            refreshRecheckInterval: 1209600,
        });
    });

    test('the default form values map to the documented defaults in seconds', () => {
        expect(renewalInfoUpdateDtoFromFormValues(DEFAULT_RENEWAL_INFO_FORM_VALUES)).toEqual({
            refreshMinInterval: 3600,
            refreshMaxInterval: 86400,
            refreshDefaultInterval: 21600,
            refreshBatchSize: 20,
            refreshRecheckInterval: 604800,
        });
    });

    test.each([
        ['0.0166', false],
        ['0.016', true],
        ['0', true],
        ['168', false],
        ['168.0001', false],
        ['168.1', true],
        ['abc', true],
    ])('interval of %s hours refused: %s', (hours, refused) => {
        expect(refreshIntervalHoursError(hours) !== undefined).toBe(refused);
    });

    test.each([
        ['0.042', false],
        ['0.04', true],
        ['365', false],
        ['365.1', true],
        ['366', true],
    ])('re-check of %s days refused: %s', (days, refused) => {
        expect(refreshRecheckDaysError(days) !== undefined).toBe(refused);
    });

    test('an accepted value never converts to less than the backend minimum', () => {
        for (const hours of ['0.0166', '0.01667', '0.017', '1']) {
            expect(refreshIntervalHoursError(hours)).toBeUndefined();
            expect(hoursToSeconds(hours)).toBeGreaterThanOrEqual(60);
        }
        for (const days of ['0.0417', '0.042', '1']) {
            expect(refreshRecheckDaysError(days)).toBeUndefined();
            expect(daysToSeconds(days)).toBeGreaterThanOrEqual(3600);
        }
    });
});
