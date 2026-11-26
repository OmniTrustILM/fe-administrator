import type { ReactElement } from 'react';
import { useController, useFormContext } from 'react-hook-form';
import HostnameListInput from 'components/Input/HostnameListInput';
import Switch from 'components/Switch';
import { validateOid } from 'utils/validators';
import { buildValidationRules } from 'utils/validators-helper';

/** Form values of the certificate purpose a signing workflow requires of its signing certificate. */
export interface CertificatePurposeFormValues {
    requireNonRepudiation: boolean;
    requiredExtendedKeyUsageOids: string[];
}

export const emptyCertificatePurposeFormValues: CertificatePurposeFormValues = {
    requireNonRepudiation: false,
    requiredExtendedKeyUsageOids: [],
};

/** The non-repudiation switch and the required extended key usages, which the certificate picker filters by. */
export default function CertificatePurposeFields(): ReactElement {
    const { control } = useFormContext<CertificatePurposeFormValues>();
    const { field: nonRepudiation } = useController({ control, name: 'requireNonRepudiation' });
    const { field: ekuOids, fieldState: ekuOidsState } = useController({
        control,
        name: 'requiredExtendedKeyUsageOids',
        rules: buildValidationRules([validateOid()]),
    });

    return (
        <>
            <Switch
                id="requireNonRepudiation"
                checked={nonRepudiation.value}
                onChange={nonRepudiation.onChange}
                secondaryLabel="Require Non-Repudiation"
            />
            <div className="flex flex-col gap-1">
                <label htmlFor="requiredExtendedKeyUsageOidInput" className="block text-sm font-medium text-content-muted">
                    Required Extended Key Usages
                </label>
                <HostnameListInput
                    id="requiredExtendedKeyUsageOidInput"
                    values={ekuOids.value}
                    onValuesChange={ekuOids.onChange}
                    placeholder="Enter an OID and press Add"
                    validateValue={validateOid()}
                    invalid={!!ekuOidsState.error}
                />
                {ekuOidsState.error && <p className="text-xs text-danger mt-0.5">{ekuOidsState.error.message}</p>}
                {ekuOids.value.length === 0 && (
                    <p className="text-xs text-content-subtle">A certificate with any extended key usage qualifies.</p>
                )}
            </div>
        </>
    );
}
