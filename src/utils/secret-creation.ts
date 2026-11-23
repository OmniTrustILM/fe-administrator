import { catchError, forkJoin, map, type Observable, of, switchMap } from 'rxjs';
import { type ApprovalProfileDto, type CreateSecretRequest, type SecretDetailDto, type SecretDto, SecretState } from 'types/openapi';
import { extractErrorReason } from 'utils/net';

export type SecretCreationApi = Readonly<{
    createSecret: (request: CreateSecretRequest) => Observable<SecretDetailDto>;
    enableSecret: (uuid: string) => Observable<void>;
    getSecret: (uuid: string) => Observable<SecretDetailDto>;
    vaultProfileApprovalProfiles: (vaultProfileUuid: string) => Observable<ApprovalProfileDto[]>;
}>;

// `needsApproval` is undefined when the vault profile's approval profiles could not be read; `stateRead` is false when the
// secret could not be read again, leaving only the state the create replied with.
export type CreatedSecret = Readonly<{
    secret: SecretDetailDto;
    stateRead: boolean;
    enableError?: string;
    needsApproval?: boolean;
}>;

// Core creates a secret disabled and settles its state only after replying, so it is read again once enabled; while it
// is still inactive, the vault profile's approval profiles say whether it will be held.
export function createAndEnableSecret(api: SecretCreationApi, request: CreateSecretRequest): Observable<CreatedSecret> {
    return api.createSecret(request).pipe(
        switchMap((secret) =>
            forkJoin({
                enable: api.enableSecret(secret.uuid).pipe(
                    map(() => ({ enabled: true, enableError: undefined as string | undefined })),
                    catchError((err) => of({ enabled: false, enableError: extractErrorReason(err) })),
                ),
                needsApproval: api.vaultProfileApprovalProfiles(request.vaultProfileUuid).pipe(
                    map((profiles): boolean | undefined => profiles.length > 0),
                    catchError(() => of(undefined)),
                ),
            }).pipe(
                switchMap(({ enable, needsApproval }) =>
                    api.getSecret(secret.uuid).pipe(
                        map((current) => ({ secret: current, stateRead: true })),
                        catchError(() => of({ secret: { ...secret, enabled: enable.enabled }, stateRead: false })),
                        map((read) => ({ ...read, enableError: enable.enableError, needsApproval })),
                    ),
                ),
            ),
        ),
    );
}

export type SecretUnusableReason = 'awaitingApproval' | 'storeFailed' | 'rejected' | 'disabled' | 'notReadBack' | 'approvalUnchecked';

// Why a secret just created cannot be used yet; undefined when it can. `needsApproval` only matters while the secret is
// still inactive, since a later state already tells whether approval held it.
export function secretUnusableReason({
    secret,
    needsApproval,
    stateRead,
}: {
    secret: Pick<SecretDto, 'enabled' | 'state'>;
    needsApproval?: boolean;
    stateRead: boolean;
}): SecretUnusableReason | undefined {
    const inactive = secret.state === SecretState.Inactive;
    if (secret.state === SecretState.PendingApproval || (inactive && needsApproval === true)) return 'awaitingApproval';
    if (secret.state === SecretState.Failed) return 'storeFailed';
    if (secret.state === SecretState.Rejected) return 'rejected';
    if (!secret.enabled) return 'disabled';
    if (!stateRead) return 'notReadBack';
    if (inactive && needsApproval === undefined) return 'approvalUnchecked';
    return undefined;
}
