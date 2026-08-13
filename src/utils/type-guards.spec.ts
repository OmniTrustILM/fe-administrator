import { describe, expect, test } from 'vitest';
import { isTimestampingWorkflow, isDocumentSigningWorkflow, isRawSigningWorkflow, isStaticKeyManagedSigning } from './type-guards';
import { ManagedSigningType, SigningScheme, SigningWorkflowType } from '../types/openapi';

describe('type-guards', () => {
    describe('Workflow Type Guards', () => {
        test('isTimestampingWorkflow should return true for Timestamping type', () => {
            const wf: any = { type: SigningWorkflowType.Timestamping };
            expect(isTimestampingWorkflow(wf)).toBe(true);
        });

        test('isTimestampingWorkflow should return false for other types', () => {
            const wf: any = { type: SigningWorkflowType.DocumentSigning };
            expect(isTimestampingWorkflow(wf)).toBe(false);
        });

        test('isDocumentSigningWorkflow should return true for DocumentSigning type', () => {
            const wf: any = { type: SigningWorkflowType.DocumentSigning };
            expect(isDocumentSigningWorkflow(wf)).toBe(true);
        });

        test('isDocumentSigningWorkflow should return false for other types', () => {
            const wf: any = { type: SigningWorkflowType.Timestamping };
            expect(isDocumentSigningWorkflow(wf)).toBe(false);
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
