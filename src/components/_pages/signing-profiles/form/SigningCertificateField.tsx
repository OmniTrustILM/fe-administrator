import { type ReactElement, useEffect, useMemo, useRef, useState } from 'react';
import { Controller, type ControllerFieldState, useFormContext, useWatch } from 'react-hook-form';
import { useDispatch, useSelector } from 'react-redux';
import Select from 'components/Select';
import {
    actions as signingProfileActions,
    type SigningCertificatesQuery,
    selectors as signingProfileSelectors,
} from 'ducks/signing-profiles';
import { type CertificateDto, SigningWorkflowType } from 'types/openapi';
import { validateRequired } from 'utils/validators';
import { buildValidationRules, getFieldErrorMessage } from 'utils/validators-helper';
import type { SigningProfileFormValues } from './signingProfileFormValues';

type CertificateOption = { value: string; label: string };

const certificateOption = (certificate: CertificateDto): CertificateOption => ({
    value: certificate.uuid,
    label: certificate.commonName
        ? `${certificate.commonName} (${certificate.serialNumber || certificate.fingerprint || certificate.uuid})`
        : certificate.uuid,
});

/** The certificate filters of the workflow: the qualified-timestamp floor for timestamping, the certificate purpose for the signing workflows. */
function signingCertificatesQuery(
    workflowType: SigningWorkflowType,
    qualifiedTimestamp: boolean,
    requireNonRepudiation: boolean,
    requiredExtendedKeyUsageOids: string[],
): SigningCertificatesQuery {
    return workflowType === SigningWorkflowType.Timestamping
        ? { workflowType, qualifiedTimestamp: qualifiedTimestamp || undefined }
        : { workflowType, requireNonRepudiation, requiredExtendedKeyUsageOids };
}

// A string key keeps a re-render with an equal OID list from re-running the query.
const oidListKey = (oids: string[]) => oids.join(' ');
const oidsOfKey = (key: string) => (key === '' ? [] : key.split(' '));

/** Lists the certificates the workflow's filters admit, re-querying whenever a filter changes. */
function useSigningCertificateOptions(): CertificateOption[] {
    const dispatch = useDispatch();
    const certificates = useSelector(signingProfileSelectors.signingCertificates);
    const { control } = useFormContext<SigningProfileFormValues>();
    const workflowType = useWatch({ control, name: 'workflowType' });
    const qualifiedTimestamp = useWatch({ control, name: 'qualifiedTimestamp' });
    const requireNonRepudiation = useWatch({ control, name: 'requireNonRepudiation' });
    const requiredEkuOidsKey = oidListKey(useWatch({ control, name: 'requiredExtendedKeyUsageOids' }));

    useEffect(() => {
        const query = signingCertificatesQuery(workflowType, qualifiedTimestamp, requireNonRepudiation, oidsOfKey(requiredEkuOidsKey));
        dispatch(signingProfileActions.listSigningCertificates(query));
    }, [dispatch, workflowType, qualifiedTimestamp, requireNonRepudiation, requiredEkuOidsKey]);

    return useMemo(() => certificates.map(certificateOption), [certificates]);
}

/**
 * The selected certificate while the certificate purpose filters it out of the list, named by the last list that offered it.
 * A signing workflow keeps such a pick, because the purpose narrows the list after the operator chose.
 */
function useWithheldCertificate(options: CertificateOption[], certificateUuid: string): CertificateOption | undefined {
    const { control } = useFormContext<SigningProfileFormValues>();
    const workflowType = useWatch({ control, name: 'workflowType' });
    const [lastOffered, setLastOffered] = useState<CertificateOption>();

    useEffect(() => {
        const offered = options.find((option) => option.value === certificateUuid);
        if (offered) setLastOffered(offered);
    }, [options, certificateUuid]);

    if (workflowType === SigningWorkflowType.Timestamping || !certificateUuid) return undefined;
    if (options.some((option) => option.value === certificateUuid)) return undefined;
    return { value: certificateUuid, label: lastOffered?.value === certificateUuid ? lastOffered.label : certificateUuid };
}

/** Required certificate select, which names a selected certificate this profile no longer admits. */
export default function SigningCertificateField(): ReactElement {
    const isFetching = useSelector(signingProfileSelectors.isFetchingSigningCertificates);
    const listed = useSelector(signingProfileSelectors.signingCertificatesListed);
    const failedFetch = useSelector(signingProfileSelectors.failedSigningCertificatesFetch);
    const { control, getValues, trigger } = useFormContext<SigningProfileFormValues>();
    const certificateUuid = useWatch({ control, name: 'certificateUuid' });
    const options = useSigningCertificateOptions();
    const withheld = useWithheldCertificate(options, certificateUuid);
    const unadmittedLabel = withheld && listed ? withheld.label : undefined;

    // The rule reads the live verdict through this ref. A Controller captures its rules at registration.
    const unadmittedLabelRef = useRef(unadmittedLabel);
    unadmittedLabelRef.current = unadmittedLabel;
    const notAdmitted = () =>
        unadmittedLabelRef.current ? `${unadmittedLabelRef.current} is not among the certificates this profile admits.` : undefined;

    // biome-ignore lint/correctness/useExhaustiveDependencies: the certificate is re-validated whenever the knobs withhold or release it.
    useEffect(() => {
        if (getValues('certificateUuid')) void trigger('certificateUuid');
    }, [unadmittedLabel, getValues, trigger]);

    // The purpose error shows before the field is touched, as it follows a knob changed on another tab.
    const errorMessage = (fieldState: ControllerFieldState) => {
        if (failedFetch) return `The signing certificates could not be listed. ${failedFetch.reason ?? ''}`.trim();
        return unadmittedLabel ? fieldState.error?.message : getFieldErrorMessage(fieldState);
    };

    return (
        <Controller
            name="certificateUuid"
            control={control}
            rules={buildValidationRules([validateRequired(), notAdmitted])}
            render={({ field, fieldState }) => (
                <Select
                    id="certificateUuid"
                    label="Certificate"
                    value={field.value}
                    onChange={field.onChange}
                    options={withheld ? [...options, withheld] : options}
                    placeholder="Select a certificate"
                    isDisabled={isFetching}
                    placement="bottom"
                    required
                    error={errorMessage(fieldState)}
                />
            )}
        />
    );
}
