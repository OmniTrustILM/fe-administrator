import type { PlatformEnum } from './openapi';

/**
 * Manual stand-in for the ProtocolChallengeSource contract enum: core already serves the field,
 * but the published OpenAPI spec has not caught up, so the generated types cannot carry it yet.
 * Once `npm run generate-types` emits ProtocolChallengeSource (and its PlatformEnum member),
 * switch the imports to types/openapi and delete this file.
 */
export enum ProtocolChallengeSource {
    ProtocolDefault = 'protocolDefault',
    CertificateRegistration = 'certificateRegistration',
}

export const ProtocolChallengeSourcePlatformEnum = 'ProtocolChallengeSource' as PlatformEnum;
