import { describe, expect, test } from 'vitest';
import { isTimestampingWorkflow, isContentSigningWorkflow, isRawSigningWorkflow, isStaticKeyManagedSigning } from './type-guards';
import { ManagedSigningType, SigningScheme, SigningWorkflowType } from '../types/openapi';

describe('type-guards', () => {
    describe('Workflow Type Guards', () => {
        test('isTimestampingWorkflow should return true for Timestamping type', () => {
            const wf: any = { type: SigningWorkflowType.Timestamping };
            expect(isTimestampingWorkflow(wf)).toBe(true);
        });

        test('isTimestampingWorkflow should return false for other types', () => {
            const wf: any = { type: SigningWorkflowType.ContentSigning };
            expect(isTimestampingWorkflow(wf)).toBe(false);
        });

        test('isContentSigningWorkflow should return true for ContentSigning type', () => {
            const wf: any = { type: SigningWorkflowType.ContentSigning };
            expect(isContentSigningWorkflow(wf)).toBe(true);
        });

        test('isContentSigningWorkflow should return false for other types', () => {
            const wf: any = { type: SigningWorkflowType.Timestamping };
            expect(isContentSigningWorkflow(wf)).toBe(false);
        });

        test('isRawSigningWorkflow should return true for RawSigning type', () => {
            const wf: any = { type: SigningWorkflowType.RawSigning };
            expect(isRawSigningWorkflow(wf)).toBe(true);
        });

        test('isRawSigningWorkflow should return false for other types', () => {
            const wf: any = { type: SigningWorkflowType.Timestamping };
            expect(isRawSigningWorkflow(wf)).toBe(false);
        });
    });

    describe('Signing Scheme Type Guards', () => {
        test('isStaticKeyManagedSigning should return true for Managed StaticKey', () => {
            const sc: any = {
                signingScheme: SigningScheme.Managed,
                managedSigningType: ManagedSigningType.StaticKey,
            };
            expect(isStaticKeyManagedSigning(sc)).toBe(true);
        });

        test('isStaticKeyManagedSigning should return false for other schemes', () => {
            const sc: any = {
                signingScheme: SigningScheme.Delegated,
                managedSigningType: ManagedSigningType.StaticKey,
            };
            expect(isStaticKeyManagedSigning(sc)).toBe(false);
        });

        test('isStaticKeyManagedSigning should return false for other managed types', () => {
            const sc: any = {
                signingScheme: SigningScheme.Managed,
                managedSigningType: 'Other' as any,
            };
            expect(isStaticKeyManagedSigning(sc)).toBe(false);
        });
    });
});
