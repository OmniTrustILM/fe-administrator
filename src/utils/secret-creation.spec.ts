import { of, throwError } from 'rxjs';
import { type CreateSecretRequest, type SecretDetailDto, SecretState } from 'types/openapi';
import { describe, expect, test } from 'vitest';
import { createAndEnableSecret, type SecretCreationApi, secretUnusableReason } from './secret-creation';

describe('secretUnusableReason', () => {
    const reason = (state: SecretState, enabled: boolean, needsApproval: boolean | undefined, stateRead = true) =>
        secretUnusableReason({ secret: { state, enabled }, needsApproval, stateRead });

    test('an enabled secret its vault profile does not hold is usable', () => {
        expect(reason(SecretState.Inactive, true, false)).toBeUndefined();
        expect(reason(SecretState.Active, true, undefined)).toBeUndefined();
    });

    test.each([
        [SecretState.PendingApproval, true, false, 'awaitingApproval'],
        [SecretState.Inactive, false, true, 'awaitingApproval'],
        [SecretState.Failed, true, false, 'storeFailed'],
        [SecretState.Rejected, true, false, 'rejected'],
        [SecretState.Inactive, false, false, 'disabled'],
        [SecretState.Inactive, true, undefined, 'approvalUnchecked'],
    ] as const)('%s, enabled %s, approval %s → %s', (state, enabled, needsApproval, expected) => {
        expect(reason(state, enabled, needsApproval)).toBe(expected);
    });

    test('a secret not read back is not confirmed usable', () => {
        expect(reason(SecretState.Active, true, false, false)).toBe('notReadBack');
    });
});

describe('createAndEnableSecret', () => {
    const request = { vaultUuid: 'v', vaultProfileUuid: 'vp', secretRequestDto: {} } as unknown as CreateSecretRequest;
    const created = { uuid: 's', enabled: false, state: SecretState.Inactive } as SecretDetailDto;
    const api = (overrides: Partial<SecretCreationApi> = {}): SecretCreationApi => ({
        createSecret: () => of(created),
        enableSecret: () => of(undefined),
        getSecret: () => of({ ...created, enabled: true, state: SecretState.Active }),
        vaultProfileApprovalProfiles: () => of([]),
        ...overrides,
    });
    const run = (calls: SecretCreationApi) =>
        new Promise((resolve, reject) => createAndEnableSecret(calls, request).subscribe({ next: resolve, error: reject }));

    test('enables the secret and reads it back', async () => {
        await expect(run(api())).resolves.toMatchObject({ secret: { enabled: true }, stateRead: true, needsApproval: false });
    });

    test('keeps the enable error and the create reply when the secret cannot be read back', async () => {
        const result = run(
            api({
                enableSecret: () => throwError(() => new Error('Access Denied')),
                getSecret: () => throwError(() => new Error('down')),
                vaultProfileApprovalProfiles: () => throwError(() => new Error('down')),
            }),
        );
        await expect(result).resolves.toMatchObject({
            secret: { uuid: 's', enabled: false },
            stateRead: false,
            enableError: 'Access Denied',
            needsApproval: undefined,
        });
    });
});
