import type { OAuth2ProviderSettingsModel } from 'types/auth-settings';
import { AuthenticationScheme } from 'utils/oauth2Providers';
import { validateResourceIndicator } from 'utils/validators';
import { useFormContext } from 'react-hook-form';
import type { FormValues } from './form-model';
import FormSection from './FormSection';
import FormTextField from './FormTextField';
import FormValuesField from './FormValuesField';

type Props = {
    providerName?: string;
    storedProvider?: OAuth2ProviderSettingsModel;
};

export default function ApplicationsSection({ providerName, storedProvider }: Readonly<Props>) {
    const { getValues } = useFormContext<FormValues>();

    const validateDiffersFromClientId = (value: string) =>
        getValues('schemes').includes(AuthenticationScheme.OAuth2Flow) && value.trim() && value.trim() === getValues('clientId').trim()
            ? "Must differ from the provider's Client Id"
            : undefined;

    return (
        <FormSection
            legend="Sign-in for applications"
            description="Applications such as desktop apps and CLIs discover this provider from the API's OAuth protected resource metadata and sign users in with a public client and PKCE."
        >
            <FormTextField
                name="applicationsName"
                label="Display name"
                description="The name applications show to users. The provider name is used when empty."
                placeholder={providerName ?? 'Provider name'}
            />

            <FormTextField
                name="applicationsClientId"
                label="Public client Id"
                description="The public client registered at the provider for applications, used with PKCE. Must differ from the provider's Client Id."
                validators={[validateDiffersFromClientId]}
            />

            <FormValuesField
                name="applicationsScopes"
                label="Application scopes"
                description="The scopes applications request when they sign a user in."
                placeholder="Select or add scopes"
                addPlaceholder="Add application scope"
                storedValues={storedProvider?.applications?.scopes}
            />

            <FormTextField
                name="applicationsResource"
                label="Resource"
                description="The RFC 8707 resource indicator applications send to the provider. Leave empty unless the provider needs one."
                placeholder="https://ilm.example.com/api"
                validators={[validateResourceIndicator()]}
            />
        </FormSection>
    );
}
