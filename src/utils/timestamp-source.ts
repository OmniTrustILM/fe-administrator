import { type SigningProfileDto, SigningRecordPersistenceMode, type SigningRecordPolicyDto } from 'types/openapi';
import { isStaticKeyManagedSigning, isTimestampingWorkflow } from 'utils/type-guards';

const durablePersistenceModes: ReadonlySet<SigningRecordPersistenceMode> = new Set([
    SigningRecordPersistenceMode.Immediate,
    SigningRecordPersistenceMode.DeferredDurable,
]);

function recordsEveryTokenDurably(recordPolicy: SigningRecordPolicyDto | undefined): boolean {
    const persistenceMode = recordPolicy?.persistenceMode;
    return recordPolicy?.recordingEnabled === true && persistenceMode !== undefined && durablePersistenceModes.has(persistenceMode);
}

/**
 * Whether Core accepts the profile as a content-signing profile's timestamp source: an ILM-managed static-key TIMESTAMPING
 * profile that records every token durably.
 */
export function isEligibleTimestampSource(profile: SigningProfileDto): boolean {
    return (
        isTimestampingWorkflow(profile.workflow) &&
        isStaticKeyManagedSigning(profile.signingScheme) &&
        recordsEveryTokenDurably(profile.recordPolicy)
    );
}
