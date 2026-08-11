import { useEffect, useMemo } from 'react';
import { Controller, useFormContext, useWatch } from 'react-hook-form';
import Select from 'components/Select';
import type { CertificateListResponseModel } from 'types/certificate';

import { buildValidationRules, getFieldErrorMessage } from 'utils/validators-helper';
import { validateRequired } from 'utils/validators';
import cn from 'classnames';

type Props = Readonly<{
    certificates: CertificateListResponseModel[] | undefined;
    currentCertificate?: CertificateListResponseModel;
}>;

export default function CertificateField({ certificates, currentCertificate }: Props) {
    const { control, setValue } = useFormContext();
    const watchedCertificate = useWatch({ control, name: 'certificate' });

    const availableCertificates = useMemo(() => {
        if (!certificates) return certificates;
        return currentCertificate && !certificates.some((c) => c.uuid === currentCertificate.uuid)
            ? [currentCertificate, ...certificates]
            : certificates;
    }, [certificates, currentCertificate]);

    useEffect(() => {
        if (watchedCertificate && availableCertificates && !availableCertificates.some((c) => c.uuid === watchedCertificate)) {
            setValue('certificate', undefined);
        }
    }, [availableCertificates, watchedCertificate, setValue]);

    const optionsForCertificates = useMemo(() => {
        return availableCertificates?.map((certificate) => ({
            value: certificate.uuid,
            label: `${certificate.commonName} (${certificate.serialNumber})`,
        }));
    }, [availableCertificates]);

    return (
        <Controller
            name="certificate"
            control={control}
            rules={buildValidationRules([validateRequired()])}
            render={({ field, fieldState }) => (
                <div className="mb-4">
                    <Select
                        id="certificateSelect"
                        label="CA Certificate"
                        required
                        options={optionsForCertificates || []}
                        value={field.value}
                        onChange={(value) => field.onChange(value)}
                        placeholder="Select to change CA Certificate if needed"
                        isClearable={true}
                        error={getFieldErrorMessage(fieldState)}
                        className={cn({
                            'border-red-500': fieldState.error && fieldState.isTouched,
                        })}
                    />
                </div>
            )}
        />
    );
}
