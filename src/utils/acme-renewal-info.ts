import type { AcmeProfileResponseModel } from 'types/acme-profiles';
import { composeValidators, validateInteger, validateRange, validateRequired } from 'utils/validators';
import { buildValidationRules } from 'utils/validators-helper';

export const RENEWAL_INFO_RETRY_AFTER_MIN = 300;
export const RENEWAL_INFO_RETRY_AFTER_MAX = 86400;
export const DEFAULT_RENEWAL_INFO_RETRY_AFTER = '21600';

export type AcmeRenewalInfoFormValues = {
    renewalInfoEnabled: boolean;
    renewalInfoRetryAfter: string;
};

const retryAfterValidators = [
    validateRequired(),
    validateInteger(),
    validateRange(RENEWAL_INFO_RETRY_AFTER_MIN, RENEWAL_INFO_RETRY_AFTER_MAX),
];

export const renewalInfoRetryAfterRules = buildValidationRules(retryAfterValidators);

export const renewalInfoRetryAfterError = (value: string): string | undefined => composeValidators(...retryAfterValidators)(value);

export function renewalInfoValues(profile: AcmeProfileResponseModel | undefined): AcmeRenewalInfoFormValues {
    return {
        renewalInfoEnabled: profile?.renewalInfoEnabled ?? false,
        renewalInfoRetryAfter: profile?.renewalInfoRetryAfter?.toString() ?? DEFAULT_RENEWAL_INFO_RETRY_AFTER,
    };
}

/** An ACME profile edit replaces the whole profile, so both fields are always sent. */
export function renewalInfoRequestFields(values: AcmeRenewalInfoFormValues) {
    return {
        renewalInfoEnabled: values.renewalInfoEnabled,
        renewalInfoRetryAfter: Number.parseInt(values.renewalInfoRetryAfter, 10),
    };
}
