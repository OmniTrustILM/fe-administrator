import {
    type EstProfileDetailDto,
    type EstProfileEditRequestDto,
    EstAuthenticationPolicy,
    type EstProfileRequestDto,
    FilterConditionOperator,
    FilterFieldSource,
    CertificateSubjectType,
    type ProtocolCertificateAssociationsRequestDto,
    type RequestAttribute,
    Resource,
    type SearchFilterRequestDto,
    type SecretDto,
    SecretState,
    SecretType,
    type TokenProfileDetailDto,
} from 'types/openapi';

export interface EstProfileFormValues {
    name: string;
    description: string;
    // Empty when no RA profile is chosen.
    raProfileUuid: string;
    systemDefault: boolean;
    // Undefined until the operator picks one: no policy is a safe default for a profile that authenticates clients.
    authenticationPolicy: EstAuthenticationPolicy | undefined;
    basicCredentialSecretUuids: string[];
    trustedCaCertificateUuids: string[];
    allowRenewal: boolean;
    allowRekey: boolean;
    // Kept as the text of the input, so a blank field stays distinguishable from 0.
    renewalThreshold: string;
    serverKeyGeneration: boolean;
    keyRecovery: boolean;
    keyRecoveryTokenProfileUuid: string;
    // Seconds, kept as the text of the inputs like the renewal threshold.
    issueWaitTimeout: string;
    retryAfter: string;
    serverKeyGenerationTimeout: string;
}

// Attributes and associations come from their own editors, already in request form.
export interface EstProfileRequestExtras {
    issueCertificateAttributes?: RequestAttribute[];
    customAttributes?: RequestAttribute[];
    keyRecoveryKeyAttributes?: RequestAttribute[];
    certificateAssociations?: ProtocolCertificateAssociationsRequestDto;
}

export type EstProfileFormErrors = Partial<
    Record<
        | 'name'
        | 'authenticationPolicy'
        | 'basicCredentialSecretUuids'
        | 'trustedCaCertificateUuids'
        | 'keyRecoveryTokenProfileUuid'
        | 'renewalThreshold'
        | ResponseTimingField,
        string
    >
>;

const CERTIFICATE_POLICIES: ReadonlySet<EstAuthenticationPolicy> = new Set([
    EstAuthenticationPolicy.VendorMtls,
    EstAuthenticationPolicy.RaMtls,
]);

export function showsBasicCredentialSecrets(policy: EstAuthenticationPolicy | undefined): boolean {
    return policy === EstAuthenticationPolicy.RaBasic;
}

export function showsTrustedCaCertificates(policy: EstAuthenticationPolicy | undefined): boolean {
    return policy !== undefined && CERTIFICATE_POLICIES.has(policy);
}

// A label equal to an EST operation (in any case) or a dot segment would collide with the EST URL path.
const RESERVED_OPERATIONS: ReadonlySet<string> = new Set([
    'cacerts',
    'csrattrs',
    'simpleenroll',
    'simplereenroll',
    'serverkeygen',
    'fullcmc',
]);
const DOT_SEGMENTS: ReadonlySet<string> = new Set(['.', '..']);

export function isReservedEstLabel(label: string): boolean {
    return DOT_SEGMENTS.has(label) || RESERVED_OPERATIONS.has(label.toLowerCase());
}

// Core keeps server-generated keys only when server key generation is on, so recovery cannot stand without it.
function keyRecoveryApplies(values: Pick<EstProfileFormValues, 'serverKeyGeneration' | 'keyRecovery'>): boolean {
    return values.serverKeyGeneration && values.keyRecovery;
}

function parseRenewalThreshold(text: string): number | undefined {
    return text.trim() === '' ? undefined : Number(text);
}

export type ResponseTimingField = 'issueWaitTimeout' | 'retryAfter' | 'serverKeyGenerationTimeout';
type ResponseTimingValues = Pick<EstProfileFormValues, ResponseTimingField>;

export const RESPONSE_TIMING_FIELDS: readonly ResponseTimingField[] = ['issueWaitTimeout', 'retryAfter', 'serverKeyGenerationTimeout'];

// Core's defaults and minimums, in seconds.
export const RESPONSE_TIMING_DEFAULTS: Readonly<Record<ResponseTimingField, number>> = {
    issueWaitTimeout: 10,
    retryAfter: 30,
    serverKeyGenerationTimeout: 30,
};
const RESPONSE_TIMING_MINIMUMS: Readonly<Record<ResponseTimingField, number>> = {
    issueWaitTimeout: 0,
    retryAfter: 1,
    serverKeyGenerationTimeout: 1,
};

export function defaultResponseTimingValues(): ResponseTimingValues {
    return {
        issueWaitTimeout: String(RESPONSE_TIMING_DEFAULTS.issueWaitTimeout),
        retryAfter: String(RESPONSE_TIMING_DEFAULTS.retryAfter),
        serverKeyGenerationTimeout: String(RESPONSE_TIMING_DEFAULTS.serverKeyGenerationTimeout),
    };
}

export function hasCustomResponseTiming(values: ResponseTimingValues): boolean {
    return RESPONSE_TIMING_FIELDS.some((field) => Number(values[field]) !== RESPONSE_TIMING_DEFAULTS[field]);
}

export function responseTimingSummary(values: ResponseTimingValues): string {
    return `Response timing: wait ${values.issueWaitTimeout} s · Retry-After ${values.retryAfter} s · key generation wait ${values.serverKeyGenerationTimeout} s`;
}

function parseSeconds(text: string): number | undefined {
    const trimmed = text.trim();
    return /^\d+$/.test(trimmed) ? Number(trimmed) : undefined;
}

function validateResponseTiming(values: ResponseTimingValues, errors: EstProfileFormErrors) {
    for (const field of RESPONSE_TIMING_FIELDS) {
        const seconds = parseSeconds(values[field]);
        const minimum = RESPONSE_TIMING_MINIMUMS[field];
        if (seconds === undefined || seconds < minimum) {
            errors[field] = `Enter a whole number of seconds, ${minimum} or more.`;
        }
    }
}

// The name is checked only when creating, as an EST Profile cannot be renamed.
export function validateEstProfile(values: EstProfileFormValues, { creating }: { creating: boolean }): EstProfileFormErrors {
    const errors: EstProfileFormErrors = {};
    if (creating && isReservedEstLabel(values.name)) {
        errors.name = 'The name must not be an EST operation name or a dot segment.';
    }
    if (!values.authenticationPolicy) {
        errors.authenticationPolicy = 'Select an authentication policy.';
    }
    if (showsBasicCredentialSecrets(values.authenticationPolicy) && values.basicCredentialSecretUuids.length === 0) {
        errors.basicCredentialSecretUuids = 'Select at least one basic-auth secret for the RA Basic Credential policy.';
    }
    if (showsTrustedCaCertificates(values.authenticationPolicy) && values.trustedCaCertificateUuids.length === 0) {
        errors.trustedCaCertificateUuids = 'Select at least one trusted CA certificate for a certificate-based policy.';
    }
    if (keyRecoveryApplies(values) && !values.keyRecoveryTokenProfileUuid) {
        errors.keyRecoveryTokenProfileUuid = 'Select the token profile that keeps the recoverable keys.';
    }
    const threshold = parseRenewalThreshold(values.renewalThreshold);
    if (threshold !== undefined && !(Number.isInteger(threshold) && threshold >= 0)) {
        errors.renewalThreshold = 'Enter a whole number of days, 0 or more.';
    }
    validateResponseTiming(values, errors);
    return errors;
}

function buildBaseRequest(values: EstProfileFormValues, extras: EstProfileRequestExtras) {
    const keyRecovery = keyRecoveryApplies(values);
    return {
        description: values.description,
        raProfileUuid: values.raProfileUuid || undefined,
        systemDefault: values.systemDefault,
        // Callers validate first: a profile without a policy is never sent.
        authenticationPolicy: values.authenticationPolicy as EstAuthenticationPolicy,
        basicCredentialSecretUuids: showsBasicCredentialSecrets(values.authenticationPolicy) ? values.basicCredentialSecretUuids : [],
        trustedCaCertificateUuids: showsTrustedCaCertificates(values.authenticationPolicy) ? values.trustedCaCertificateUuids : [],
        allowRenewal: values.allowRenewal,
        allowRekey: values.allowRekey,
        renewalThreshold: parseRenewalThreshold(values.renewalThreshold),
        serverKeyGeneration: values.serverKeyGeneration,
        keyRecovery,
        keyRecoveryTokenProfileUuid: keyRecovery ? values.keyRecoveryTokenProfileUuid || undefined : undefined,
        keyRecoveryKeyAttributes: keyRecovery ? (extras.keyRecoveryKeyAttributes ?? []) : [],
        issueCertificateAttributes: extras.issueCertificateAttributes ?? [],
        customAttributes: extras.customAttributes ?? [],
        certificateAssociations: extras.certificateAssociations,
        issueWaitTimeout: Number(values.issueWaitTimeout),
        retryAfter: Number(values.retryAfter),
        serverKeyGenerationTimeout: Number(values.serverKeyGenerationTimeout),
    };
}

export function buildEstProfileCreateRequest(values: EstProfileFormValues, extras: EstProfileRequestExtras = {}): EstProfileRequestDto {
    return { name: values.name, ...buildBaseRequest(values, extras) };
}

export function buildEstProfileEditRequest(values: EstProfileFormValues, extras: EstProfileRequestExtras = {}): EstProfileEditRequestDto {
    return buildBaseRequest(values, extras);
}

export function estProfileFormValues(profile?: EstProfileDetailDto): EstProfileFormValues {
    return {
        name: profile?.name ?? '',
        description: profile?.description ?? '',
        raProfileUuid: profile?.raProfile?.uuid ?? '',
        systemDefault: profile?.systemDefault ?? false,
        authenticationPolicy: profile?.authenticationPolicy,
        basicCredentialSecretUuids: profile?.basicCredentialSecrets?.map((secret) => secret.uuid) ?? [],
        trustedCaCertificateUuids: profile?.trustedCaCertificates?.map((certificate) => certificate.uuid) ?? [],
        allowRenewal: profile?.allowRenewal ?? true,
        allowRekey: profile?.allowRekey ?? true,
        renewalThreshold: profile?.renewalThreshold === undefined ? '' : String(profile.renewalThreshold),
        serverKeyGeneration: profile?.serverKeyGeneration ?? false,
        keyRecovery: profile?.keyRecovery ?? false,
        keyRecoveryTokenProfileUuid: profile?.keyRecoveryTokenProfile?.uuid ?? '',
        ...(profile
            ? {
                  issueWaitTimeout: String(profile.issueWaitTimeout),
                  retryAfter: String(profile.retryAfter),
                  serverKeyGenerationTimeout: String(profile.serverKeyGenerationTimeout),
              }
            : defaultResponseTimingValues()),
    };
}

// Core refuses to read a secret in these states, so an RA could never authenticate with one.
const UNREADABLE_SECRET_STATES: ReadonlySet<SecretState> = new Set([SecretState.Failed, SecretState.PendingApproval, SecretState.Rejected]);

export function isEstBasicAuthSecret(secret: Pick<SecretDto, 'type' | 'enabled' | 'state'>): boolean {
    return secret.type === SecretType.BasicAuth && secret.enabled && !UNREADABLE_SECRET_STATES.has(secret.state);
}

// Core accepts a trusted CA only when its subject type is a root or intermediate CA. The certificate list DTO does not
// carry the subject type, so the certificate search filters on it instead.
export const EST_TRUSTED_CA_FILTERS: readonly SearchFilterRequestDto[] = [
    {
        fieldSource: FilterFieldSource.Property,
        fieldIdentifier: 'SUBJECT_TYPE',
        condition: FilterConditionOperator.Equals,
        value: [CertificateSubjectType.RootCa, CertificateSubjectType.IntermediateCa],
    },
];

// Core requires the token profile to export a key pair; key recovery keeps generated key pairs.
export function canExportKeyPair(tokenProfile: Pick<TokenProfileDetailDto, 'keyTransfer'>): boolean {
    return (tokenProfile.keyTransfer?.exportableKeyTypes?.keyPair?.length ?? 0) > 0;
}

// Saved attributes can only be edited while their descriptors are loaded; an empty list after a failed lookup would replace them with nothing.
export function attributesLackDescriptors(bound: readonly unknown[] | undefined, descriptors: readonly unknown[] | undefined): boolean {
    return (bound?.length ?? 0) > 0 && (descriptors?.length ?? 0) === 0;
}

export function customAttributesLackDescriptors(
    profile: Pick<EstProfileDetailDto, 'customAttributes' | 'certificateAssociations'> | undefined,
    descriptors: Record<string, readonly unknown[] | undefined>,
): boolean {
    return (
        attributesLackDescriptors(profile?.customAttributes, descriptors[Resource.EstProfiles]) ||
        attributesLackDescriptors(profile?.certificateAssociations?.customAttributes, descriptors[Resource.Certificates])
    );
}
