import { useMemo } from 'react';
import { FormProvider, useForm, useWatch } from 'react-hook-form';
import { AcmeIdentifierAuthorizationMode, type AcmePreauthorizedIdentifierDto } from 'types/openapi';
import { createMockStore, withProviders } from 'utils/test-helpers';
import { IDENTIFIER_ENUMS } from 'components/_pages/acme-profiles/identifiers/identifierEnumsFixture';
import PreauthorizedIdentifiersFields, {
    type IdentifierPolicyFormValues,
} from 'components/_pages/acme-profiles/identifiers/PreauthorizedIdentifiersFields';

type Props = Readonly<{
    identifiers?: AcmePreauthorizedIdentifierDto[];
    mode?: AcmeIdentifierAuthorizationMode;
}>;

function Form({ identifiers = [], mode = AcmeIdentifierAuthorizationMode.PreauthorizedOrChallenge }: Props) {
    const methods = useForm<IdentifierPolicyFormValues>({
        mode: 'onChange',
        defaultValues: { preauthorizedIdentifiers: identifiers, identifierAuthorizationMode: mode },
    });
    const values = useWatch({ control: methods.control });

    return (
        <FormProvider {...methods}>
            <PreauthorizedIdentifiersFields />
            <span data-testid="valid">{String(methods.formState.isValid)}</span>
            <pre data-testid="values">{JSON.stringify(values)}</pre>
        </FormProvider>
    );
}

export default function PreauthorizedIdentifiersFieldsHarness(props: Props) {
    const store = useMemo(() => createMockStore({ enums: { platformEnums: IDENTIFIER_ENUMS } }), []);
    return withProviders(<Form {...props} />, { store });
}
