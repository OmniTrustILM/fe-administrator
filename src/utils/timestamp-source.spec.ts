import { describe, expect, test } from 'vitest';
import {
    ManagedSigningType,
    type SigningProfileDto,
    SigningRecordPersistenceMode,
    SigningScheme,
    SigningWorkflowType,
} from 'types/openapi';
import { isEligibleTimestampSource } from './timestamp-source';

const durableTimestampingProfile = {
    uuid: 'tsa-1',
    name: 'TSA',
    version: 1,
    enabled: true,
    workflow: { type: SigningWorkflowType.Timestamping },
    signingScheme: { signingScheme: SigningScheme.Managed, managedSigningType: ManagedSigningType.StaticKey },
    recordPolicy: { recordingEnabled: true, persistenceMode: SigningRecordPersistenceMode.Immediate },
} as SigningProfileDto;

describe('isEligibleTimestampSource', () => {
    test('accepts a managed static-key TIMESTAMPING profile that records immediately or durably deferred', () => {
        expect(isEligibleTimestampSource(durableTimestampingProfile)).toBe(true);
        expect(
            isEligibleTimestampSource({
                ...durableTimestampingProfile,
                recordPolicy: { recordingEnabled: true, persistenceMode: SigningRecordPersistenceMode.DeferredDurable },
            }),
        ).toBe(true);
    });

    test('rejects a profile whose recording is off or best effort', () => {
        expect(
            isEligibleTimestampSource({
                ...durableTimestampingProfile,
                recordPolicy: { recordingEnabled: false, persistenceMode: SigningRecordPersistenceMode.Immediate },
            }),
        ).toBe(false);
        expect(
            isEligibleTimestampSource({
                ...durableTimestampingProfile,
                recordPolicy: { recordingEnabled: true, persistenceMode: SigningRecordPersistenceMode.BestEffort },
            }),
        ).toBe(false);
        expect(isEligibleTimestampSource({ ...durableTimestampingProfile, recordPolicy: undefined })).toBe(false);
    });

    test('rejects a profile of another workflow, a delegated scheme or a one-time key', () => {
        expect(isEligibleTimestampSource({ ...durableTimestampingProfile, workflow: { type: SigningWorkflowType.ContentSigning } })).toBe(
            false,
        );
        expect(
            isEligibleTimestampSource({ ...durableTimestampingProfile, signingScheme: { signingScheme: SigningScheme.Delegated } }),
        ).toBe(false);
        expect(
            isEligibleTimestampSource({
                ...durableTimestampingProfile,
                signingScheme: { signingScheme: SigningScheme.Managed, managedSigningType: ManagedSigningType.OneTimeKey },
            } as SigningProfileDto),
        ).toBe(false);
    });
});
