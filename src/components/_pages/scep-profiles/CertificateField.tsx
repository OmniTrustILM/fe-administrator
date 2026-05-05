import { useEffect, useMemo } from 'react';
import { Controller, useFormContext, useWatch } from 'react-hook-form';
import Select from 'components/Select';
import type { CertificateListResponseModel } from 'types/certificate';

import { buildValidationRules, getFieldErrorMessage } from 'utils/validators-helper';
import { validateRequired } from 'utils/validators';
import cn from 'classnames';

type Props = Readonly<{
    certificates: CertificateListResponseModel[] | undefined;
}>;

export default function CertificateField({ certificates }: Props) {
    const { control, setValue } = useFormContext();
    const watchedCertificate = useWatch({ control, name: 'certificate' });

    useEffect(() => {
        if (watchedCertificate && certificates && !certificates?.find((c) => c.uuid === watchedCertificate)) {
            setValue('certificate', undefined);
        }
    }, [certificates, watchedCertificate, setValue]);

    const optionsForCertificates = useMemo(() => {
        return certificates?.map((certificate) => ({
            value: certificate.uuid,
            label: `${certificate.commonName} (${certificate.serialNumber})`,
        }));
    }, [certificates]);

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
                        onChange={(value) => field.onChange(value as string | undefined)}
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
