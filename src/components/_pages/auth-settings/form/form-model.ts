import type { OAuth2ProviderSettingsModel, OAuth2ProviderSettingsUpdateDto } from 'types/auth-settings';
import { AuthenticationScheme, DEFAULT_DELEGATE_CLAIM, schemesOfProvider, withRequiredSchemes } from 'utils/oauth2Providers';

export interface FormValues {
    schemes: AuthenticationScheme[];
    name: string;
    issuerUrl: string;
    clientId: string;
    clientSecret: string;
    authorizationUrl: string;
    tokenUrl: string;
    jwkSetUrl: string;
    jwkSet: string;
    scope: string[];
    logoutUrl: string;
    postLogoutUrl: string;
    userInfoUrl: string;
    audiences: string[];
    usernameClaim: string;
    allowedDelegates: string[];
    delegateClaim: string;
    skew: string;
    sessionMaxInactiveInterval: string;
    applicationsName: string;
    applicationsClientId: string;
    applicationsScopes: string[];
    applicationsResource: string;
}

export function toFormValues(provider?: OAuth2ProviderSettingsModel): FormValues {
    return {
        schemes: provider ? withRequiredSchemes(schemesOfProvider(provider)) : [],
        name: provider?.name || '',
        issuerUrl: provider?.issuerUrl || '',
        clientId: provider?.clientId || '',
        clientSecret: '',
        authorizationUrl: provider?.authorizationUrl || '',
        tokenUrl: provider?.tokenUrl || '',
        jwkSetUrl: provider?.jwkSetUrl || '',
        jwkSet: provider?.jwkSet || '',
        scope: provider?.scope || [],
        logoutUrl: provider?.logoutUrl || '',
        postLogoutUrl: provider?.postLogoutUrl || '',
        userInfoUrl: provider?.userInfoUrl || '',
        audiences: provider?.audiences || [],
        usernameClaim: provider?.usernameClaim || '',
        allowedDelegates: provider?.allowedDelegates || [],
        delegateClaim: provider?.delegateClaim || '',
        skew: provider?.skew?.toString() || '',
        sessionMaxInactiveInterval: provider?.sessionMaxInactiveInterval?.toString() || '',
        applicationsName: provider?.applications?.name || '',
        applicationsClientId: provider?.applications?.clientId || '',
        applicationsScopes: provider?.applications?.scopes || [],
        applicationsResource: provider?.applications?.resource || '',
    };
}

export function toUpdateModel(values: FormValues): OAuth2ProviderSettingsUpdateDto {
    const jwtBearer = values.schemes.includes(AuthenticationScheme.JwtBearer);
    const oauth2Flow = values.schemes.includes(AuthenticationScheme.OAuth2Flow);
    const application = values.schemes.includes(AuthenticationScheme.Application);

    return {
        issuerUrl: (jwtBearer && values.issuerUrl) || undefined,
        clientId: (oauth2Flow && values.clientId) || undefined,
        clientSecret: (oauth2Flow && values.clientSecret) || undefined,
        authorizationUrl: (oauth2Flow && values.authorizationUrl) || undefined,
        tokenUrl: (oauth2Flow && values.tokenUrl) || undefined,
        jwkSetUrl: values.jwkSetUrl || undefined,
        jwkSet: values.jwkSet || undefined,
        scope: oauth2Flow && values.scope.length > 0 ? values.scope : undefined,
        logoutUrl: (oauth2Flow && values.logoutUrl) || undefined,
        postLogoutUrl: (oauth2Flow && values.postLogoutUrl) || undefined,
        userInfoUrl: values.userInfoUrl || undefined,
        audiences: values.audiences.length > 0 ? values.audiences : undefined,
        usernameClaim: values.usernameClaim.trim() || undefined,
        allowedDelegates: jwtBearer ? values.allowedDelegates : [],
        delegateClaim: (jwtBearer && values.delegateClaim.trim()) || DEFAULT_DELEGATE_CLAIM,
        skew: values.skew ? Number.parseInt(values.skew, 10) : undefined,
        sessionMaxInactiveInterval:
            oauth2Flow && values.sessionMaxInactiveInterval ? Number.parseInt(values.sessionMaxInactiveInterval, 10) : undefined,
        applications: application
            ? {
                  enabled: true,
                  name: values.applicationsName.trim() || undefined,
                  clientId: values.applicationsClientId.trim() || undefined,
                  scopes: values.applicationsScopes,
                  resource: values.applicationsResource.trim() || undefined,
              }
            : { enabled: false, scopes: [] },
    };
}

const requiredFieldsOfScheme = {
    [AuthenticationScheme.JwtBearer]: ['issuerUrl'],
    [AuthenticationScheme.OAuth2Flow]: ['clientId', 'authorizationUrl', 'tokenUrl', 'logoutUrl', 'postLogoutUrl'],
    [AuthenticationScheme.Application]: [],
} as const satisfies Record<AuthenticationScheme, (keyof FormValues)[]>;

type RequiredFieldName = (typeof requiredFieldsOfScheme)[AuthenticationScheme][number];

export function incompleteSchemes(
    schemes: AuthenticationScheme[],
    values: Partial<Pick<FormValues, RequiredFieldName>>,
): AuthenticationScheme[] {
    return schemes.filter((scheme) => requiredFieldsOfScheme[scheme].some((name: RequiredFieldName) => !values[name]));
}

export function removedSchemes(initial: AuthenticationScheme[], chosen: AuthenticationScheme[]): AuthenticationScheme[] {
    return initial.filter((scheme) => !chosen.includes(scheme));
}
