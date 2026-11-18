import Callout from 'components/Callout';
import TextArea from 'components/TextArea';
import TextInput from 'components/TextInput';
import { Controller, useFormContext, useWatch } from 'react-hook-form';
import type { OAuth2ProviderSettingsModel } from 'types/auth-settings';
import { validatePositiveInteger, validateUrlWithRoute } from 'utils/validators';
import { buildValidationRules, getFieldErrorMessage } from 'utils/validators-helper';
import { DEFAULT_USERNAME_CLAIM } from 'utils/oauth2Providers';
import type { FormValues } from './form-model';
import FormSection from './FormSection';
import FormTextField from './FormTextField';
import FormValuesField from './FormValuesField';

type Props = {
    editMode: boolean;
    storedProvider?: OAuth2ProviderSettingsModel;
};

export default function GeneralSection({ editMode, storedProvider }: Readonly<Props>) {
    const { control } = useFormContext<FormValues>();
    const watchedJwkSet = useWatch({ control, name: 'jwkSet' });
    const watchedJwkSetUrl = useWatch({ control, name: 'jwkSetUrl' });
    const watchedUsernameClaim = useWatch({ control, name: 'usernameClaim' });

    const isUsernameClaimChanged =
        editMode &&
        !!storedProvider &&
        (watchedUsernameClaim.trim() || DEFAULT_USERNAME_CLAIM) !== (storedProvider.usernameClaim?.trim() || DEFAULT_USERNAME_CLAIM);

    return (
        <FormSection legend="General" description="Used both to check bearer tokens and to sign users in.">
            <div>
                <p className="text-sm text-content-subtle mb-2">
                    The URL where the JSON Web Key Set (JWKS) containing the public keys used to verify JWT tokens can be retrieved.
                </p>
                <Controller
                    name="jwkSetUrl"
                    control={control}
                    rules={buildValidationRules([
                        (value) => {
                            if (!watchedJwkSet && !value) {
                                return 'JWK Set URL is required if JWK Set is not provided';
                            }
                            return undefined;
                        },
                        validateUrlWithRoute,
                    ])}
                    render={({ field, fieldState }) => (
                        <TextInput
                            {...field}
                            id="jwkSetUrl"
                            type="text"
                            label="JWK Set Url"
                            required={!watchedJwkSet}
                            disabled={!!watchedJwkSet}
                            invalid={fieldState.error && fieldState.isTouched}
                            error={getFieldErrorMessage(fieldState)}
                        />
                    )}
                />
            </div>

            <div>
                <p className="text-sm text-content-subtle mb-2">Base64 encoded JWK Set, provided in case JWK Set URL is not available.</p>
                <Controller
                    name="jwkSet"
                    control={control}
                    render={({ field, fieldState }) => (
                        <TextArea
                            {...field}
                            id="jwkSet"
                            label="JWK Set"
                            required={!watchedJwkSetUrl}
                            rows={3}
                            placeholder="Enter JWK Set encoded in Base64"
                            disabled={!!watchedJwkSetUrl}
                            invalid={fieldState.error && fieldState.isTouched}
                            error={getFieldErrorMessage(fieldState)}
                        />
                    )}
                />
            </div>

            <FormTextField
                name="userInfoUrl"
                label="User Info Url"
                description="The URL containing information about user."
                validators={[validateUrlWithRoute]}
            />

            <FormValuesField
                name="audiences"
                label="Audiences"
                description="A list of expected audiences for validating the issued tokens, used to match the intended recipients of the tokens."
                placeholder="Select or add audiences"
                addPlaceholder="Add audience"
                storedValues={storedProvider?.audiences}
            />

            <div>
                <FormTextField
                    name="usernameClaim"
                    label="Username claim"
                    description="The token claim whose value is the user's account name. Defaults to username. Changing it on a provider already in use changes which account each token signs in to."
                    placeholder={DEFAULT_USERNAME_CLAIM}
                />
                {isUsernameClaimChanged && (
                    <Callout severity="warning" role="status" className="mt-2" dataTestId="username-claim-change-warning">
                        Existing accounts are not renamed. Before saving, check that each user's value under the new claim matches their
                        account name, your own included, or they will no longer sign in to their account.
                    </Callout>
                )}
            </div>

            <FormTextField
                name="skew"
                label="Skew Time"
                description="The allowed time skew, in seconds, for token validation, and how early a signed-in session's token is refreshed. Default value is 30 seconds."
                type="number"
                placeholder="Enter Time in Seconds"
                validators={[validatePositiveInteger()]}
            />
        </FormSection>
    );
}
