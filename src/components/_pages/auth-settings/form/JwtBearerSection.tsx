import type { OAuth2ProviderSettingsModel } from 'types/auth-settings';
import { validateUrlWithRoute } from 'utils/validators';
import FormSection from './FormSection';
import FormTextField from './FormTextField';
import FormValuesField from './FormValuesField';

type Props = {
    storedProvider?: OAuth2ProviderSettingsModel;
};

export default function JwtBearerSection({ storedProvider }: Readonly<Props>) {
    return (
        <FormSection legend="JWT Bearer" description="Accepts tokens from this provider sent to the API as bearer tokens.">
            <FormTextField
                name="issuerUrl"
                label="Issuer Url"
                description="URL of issuer issuing authentication tokens. If provided, authentication via JWT token is enabled for this provider."
                required
                validators={[validateUrlWithRoute]}
            />

            <FormValuesField
                name="allowedDelegates"
                label="Allowed delegates"
                description="A provider without allowed delegates refuses delegation tokens. Identifiers are matched exactly; there is no wildcard."
                placeholder="Select or add delegates"
                addPlaceholder="Add delegate"
                storedValues={storedProvider?.allowedDelegates}
            />

            <FormTextField
                name="delegateClaim"
                label="Delegate claim"
                description="The claim inside the token's outermost act object that identifies the delegate. Defaults to client_id."
                placeholder="client_id"
            />
        </FormSection>
    );
}
