import { Fragment } from 'react/jsx-runtime';
import Badge from 'components/Badge';
import type { OAuth2ProviderSettingsModel } from 'types/auth-settings';

export enum AuthenticationScheme {
    JwtBearer = 'JwtBearer',
    OAuth2Flow = 'OAuth2Flow',
    Application = 'Application',
}

export const authenticationSchemeLabels: Record<AuthenticationScheme, string> = {
    [AuthenticationScheme.JwtBearer]: 'JWT Bearer',
    [AuthenticationScheme.OAuth2Flow]: 'OAuth2 Flow',
    [AuthenticationScheme.Application]: 'Application',
};

export const DEFAULT_SKEW_SECONDS = 30;
export const DEFAULT_SESSION_MAX_INACTIVE_SECONDS = 900;
export const DEFAULT_DELEGATE_CLAIM = 'client_id';
export const DEFAULT_USERNAME_CLAIM = 'username';

export function schemesOfProvider(provider: OAuth2ProviderSettingsModel): AuthenticationScheme[] {
    const schemes: AuthenticationScheme[] = [];
    if (
        provider.issuerUrl ||
        provider.allowedDelegates?.length ||
        (provider.delegateClaim && provider.delegateClaim !== DEFAULT_DELEGATE_CLAIM)
    ) {
        schemes.push(AuthenticationScheme.JwtBearer);
    }
    if (
        provider.clientId ||
        provider.authorizationUrl ||
        provider.tokenUrl ||
        provider.logoutUrl ||
        provider.postLogoutUrl ||
        provider.scope?.length ||
        (provider.sessionMaxInactiveInterval !== undefined && provider.sessionMaxInactiveInterval !== DEFAULT_SESSION_MAX_INACTIVE_SECONDS)
    ) {
        schemes.push(AuthenticationScheme.OAuth2Flow);
    }
    if (provider.applications?.enabled) {
        schemes.push(AuthenticationScheme.Application);
    }
    return schemes;
}

export function withRequiredSchemes(schemes: AuthenticationScheme[]): AuthenticationScheme[] {
    if (!schemes.includes(AuthenticationScheme.Application)) return schemes;
    return Object.values(AuthenticationScheme).filter((scheme) => scheme === AuthenticationScheme.JwtBearer || schemes.includes(scheme));
}

export function formatSeconds(seconds: number): string {
    if (seconds === 0) return '0 s';
    if (seconds % 3600 === 0) return `${seconds / 3600} h`;
    if (seconds % 60 === 0) return `${seconds / 60} min`;
    return `${seconds} s`;
}

export function isValidJWTBearerProvider(provider: OAuth2ProviderSettingsModel) {
    return Boolean(provider.issuerUrl);
}
export function isValidOAuth2FlowProvider(provider: OAuth2ProviderSettingsModel) {
    return Boolean(
        provider.clientId &&
            provider.authorizationUrl &&
            provider.tokenUrl &&
            (provider.jwkSetUrl || provider.jwkSet) &&
            provider.logoutUrl &&
            provider.postLogoutUrl,
    );
}

export function renderOAuth2StateBadges(provider: OAuth2ProviderSettingsModel) {
    const badges = [];
    if (isValidJWTBearerProvider(provider)) {
        badges.push('JWT Bearer');
    }
    if (isValidOAuth2FlowProvider(provider)) {
        badges.push('OAuth2 Flow');
    }
    if (provider.applications?.enabled) {
        badges.push(authenticationSchemeLabels[AuthenticationScheme.Application]);
    }
    return (
        <div>
            {badges.map((el) => (
                <Fragment key={el}>
                    <Badge color="secondary"> {el} </Badge>&nbsp;
                </Fragment>
            ))}
        </div>
    );
}
