import type { CertificateRenewalInfoSettingsDto, CertificateRenewalInfoSettingsUpdateDto } from 'types/openapi';

const SECONDS_PER_HOUR = 3600;
const SECONDS_PER_DAY = 86400;

/** Renewal information settings as edited in the form: intervals in hours and days, the rest as plain numbers. */
export type RenewalInfoFormValues = {
    refreshMinHours: string;
    refreshMaxHours: string;
    refreshDefaultHours: string;
    refreshBatchSize: string;
    refreshRecheckDays: string;
};

export const DEFAULT_RENEWAL_INFO_FORM_VALUES: RenewalInfoFormValues = {
    refreshMinHours: '1',
    refreshMaxHours: '24',
    refreshDefaultHours: '6',
    refreshBatchSize: '20',
    refreshRecheckDays: '7',
};

/** Bounds in seconds the backend accepts. */
export const REFRESH_INTERVAL_SECONDS = { min: 60, max: 604800 } as const;
export const REFRESH_RECHECK_SECONDS = { min: 3600, max: 31536000 } as const;

export const hoursToSeconds = (hours: string) => Math.round(Number(hours) * SECONDS_PER_HOUR);
export const daysToSeconds = (days: string) => Math.round(Number(days) * SECONDS_PER_DAY);

const secondsError = (seconds: number, bounds: { min: number; max: number }, range: string): string | undefined =>
    Number.isFinite(seconds) && seconds >= bounds.min && seconds <= bounds.max ? undefined : `Value must be between ${range}`;

/** Checked on the value as it is sent, so an accepted value can never convert to less than the backend minimum. */
export const refreshIntervalHoursError = (hours: string) =>
    secondsError(hoursToSeconds(hours), REFRESH_INTERVAL_SECONDS, '1 minute (0.0167 hours) and 168 hours');
export const refreshRecheckDaysError = (days: string) =>
    secondsError(daysToSeconds(days), REFRESH_RECHECK_SECONDS, '1 hour (0.0417 days) and 365 days');

export function renewalInfoFormValuesFromDto(dto: CertificateRenewalInfoSettingsDto | undefined): RenewalInfoFormValues {
    if (!dto) return { ...DEFAULT_RENEWAL_INFO_FORM_VALUES };

    return {
        refreshMinHours: (dto.refreshMinInterval / SECONDS_PER_HOUR).toString(),
        refreshMaxHours: (dto.refreshMaxInterval / SECONDS_PER_HOUR).toString(),
        refreshDefaultHours: (dto.refreshDefaultInterval / SECONDS_PER_HOUR).toString(),
        refreshBatchSize: dto.refreshBatchSize.toString(),
        refreshRecheckDays: (dto.refreshRecheckInterval / SECONDS_PER_DAY).toString(),
    };
}

export function renewalInfoUpdateDtoFromFormValues(values: RenewalInfoFormValues): CertificateRenewalInfoSettingsUpdateDto {
    return {
        refreshMinInterval: hoursToSeconds(values.refreshMinHours),
        refreshMaxInterval: hoursToSeconds(values.refreshMaxHours),
        refreshDefaultInterval: hoursToSeconds(values.refreshDefaultHours),
        refreshBatchSize: Number.parseInt(values.refreshBatchSize, 10),
        refreshRecheckInterval: daysToSeconds(values.refreshRecheckDays),
    };
}
