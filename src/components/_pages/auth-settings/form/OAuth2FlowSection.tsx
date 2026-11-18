import type { OAuth2ProviderSettingsModel } from 'types/auth-settings';
import { AuthenticationScheme, schemesOfProvider } from 'utils/oauth2Providers';
import { validatePositiveInteger, validateUrlWithRoute } from 'utils/validators';
import FormSection from './FormSection';
import FormTextField from './FormTextField';
import FormValuesField from './FormValuesField';

type Props = {
    editMode: boolean;
    storedProvider?: OAuth2ProviderSettingsModel;
};

export default function OAuth2FlowSection({ editMode, storedProvider }: Readonly<Props>) {
    const hasStoredFlow = Boolean(storedProvider && schemesOfProvider(storedProvider).includes(AuthenticationScheme.OAuth2Flow));
    return (
        <FormSection legend="OAuth2 Flow" description="Signs users in to the administrator interface through the provider's login page.">
            <FormTextField
                name="clientId"
                label="Client Id"
                description="The client ID used to identify the client application during the authorization process."
                required
                deps={['applicationsClientId']}
            />

            <FormTextField
                name="clientSecret"
                label="Client Secret"
                description="The client secret used by the client application to authenticate with the authorization server."
                type="password"
                required={!editMode || !hasStoredFlow}
            />

            <FormTextField
                name="authorizationUrl"
                label="Authorization Url"
                description="The URL where the authorization server redirects the user for login and authorization."
                required
                validators={[validateUrlWithRoute]}
            />

            <FormTextField
                name="tokenUrl"
                label="Token Url"
                description="The URL used to exchange the authorization code or credentials for an access token."
                required
            />

            <FormTextField
                name="logoutUrl"
                label="Logout Url"
                description="URL to end session on provider side."
                required
                validators={[validateUrlWithRoute]}
            />

            <FormTextField
                name="postLogoutUrl"
                label="Post Logout Url"
                description="URL that user will be redirected after logout from application."
                required
                validators={[validateUrlWithRoute]}
            />

            <FormValuesField
                name="scope"
                label="Scope"
                description="The list of scopes that define the access levels and permissions requested by the client application."
                placeholder="Select or add scopes"
                addPlaceholder="Add scope"
                storedValues={storedProvider?.scope}
            />

            <FormTextField
                name="sessionMaxInactiveInterval"
                label="Session Max Inactive Interval"
                description="Duration in seconds after which will inactive user's session be terminated. Default value is 15 minutes."
                type="number"
                placeholder="Enter Time in Seconds"
                validators={[validatePositiveInteger()]}
            />
        </FormSection>
    );
}
