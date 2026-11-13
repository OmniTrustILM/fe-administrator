import { useState } from 'react';
import { FormProvider, useForm, useWatch } from 'react-hook-form';
import {
    buildEstProfileEditRequest,
    type EstProfileFormValues,
    estProfileFormValues,
    RESPONSE_TIMING_FIELDS,
    validateEstProfile,
} from 'utils/est-profile';
import { withProviders } from 'utils/test-helpers';
import AdvancedOptions from './AdvancedOptions';

type Props = Readonly<{
    initial?: Partial<EstProfileFormValues>;
    serverKeyGeneration?: boolean;
    initiallyExpanded?: boolean;
}>;

function Content({ initial, serverKeyGeneration = false, initiallyExpanded = false }: Props) {
    const methods = useForm<EstProfileFormValues>({ defaultValues: { ...estProfileFormValues(), ...initial }, mode: 'onChange' });
    const watched = useWatch({ control: methods.control });
    const values = { ...estProfileFormValues(), ...watched } as EstProfileFormValues;
    const errors = validateEstProfile(values, { creating: false });
    const [submitted, setSubmitted] = useState('');

    const submit = () => {
        const { issueWaitTimeout, retryAfter, serverKeyGenerationTimeout } = buildEstProfileEditRequest(values);
        setSubmitted(JSON.stringify({ issueWaitTimeout, retryAfter, serverKeyGenerationTimeout }));
    };

    return (
        <FormProvider {...methods}>
            <AdvancedOptions errors={errors} serverKeyGeneration={serverKeyGeneration} initiallyExpanded={initiallyExpanded} />
            <pre data-testid="values">
                {JSON.stringify(Object.fromEntries(RESPONSE_TIMING_FIELDS.map((field) => [field, values[field]])))}
            </pre>
            <button type="button" data-testid="submit" onClick={submit}>
                Submit
            </button>
            <pre data-testid="submitted">{submitted}</pre>
        </FormProvider>
    );
}

export default function AdvancedOptionsHarness(props: Props) {
    return withProviders(<Content {...props} />);
}
