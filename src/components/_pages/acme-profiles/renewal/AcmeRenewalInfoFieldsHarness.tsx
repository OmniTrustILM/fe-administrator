import { FormProvider, useForm, useWatch } from 'react-hook-form';
import type { AcmeProfileResponseModel } from 'types/acme-profiles';
import { type AcmeRenewalInfoFormValues, renewalInfoRequestFields, renewalInfoValues } from 'utils/acme-renewal-info';
import AcmeRenewalInfoFields from './AcmeRenewalInfoFields';

type Props = Readonly<{
    profile?: Pick<AcmeProfileResponseModel, 'renewalInfoEnabled' | 'renewalInfoRetryAfter'>;
}>;

export default function AcmeRenewalInfoFieldsHarness({ profile }: Props) {
    const methods = useForm<AcmeRenewalInfoFormValues>({
        mode: 'onChange',
        defaultValues: renewalInfoValues(profile as AcmeProfileResponseModel | undefined),
    });
    const values = useWatch({ control: methods.control }) as AcmeRenewalInfoFormValues;

    return (
        <FormProvider {...methods}>
            <AcmeRenewalInfoFields />
            <span data-testid="valid">{String(methods.formState.isValid)}</span>
            <pre data-testid="request">{JSON.stringify(renewalInfoRequestFields(values))}</pre>
        </FormProvider>
    );
}
