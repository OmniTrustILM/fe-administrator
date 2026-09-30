import { type SecretDto, SecretState, SecretType } from 'types/openapi';

// Core reads the binding key from a secretKey or generic secret; any other type fails at newAccount time.
export const EAB_SECRET_TYPES: readonly SecretType[] = [SecretType.SecretKey, SecretType.Generic];

// Core refuses to read a secret in these states, so a binding could never verify against one.
const UNREADABLE_SECRET_STATES: ReadonlySet<SecretState> = new Set([SecretState.Failed, SecretState.PendingApproval, SecretState.Rejected]);

export function isEabSecret(secret: Pick<SecretDto, 'type' | 'enabled' | 'state'>): boolean {
    return secret.enabled && EAB_SECRET_TYPES.includes(secret.type) && !UNREADABLE_SECRET_STATES.has(secret.state);
}

export function sameUuidSet(a: readonly string[] | undefined, b: readonly string[] | undefined): boolean {
    const left = new Set(a ?? []);
    const right = new Set(b ?? []);
    return left.size === right.size && [...left].every((uuid) => right.has(uuid));
}

// Omitting the list keeps what the profile has, so it is sent only when the operator changed it. `filled` is what an
// edit form was filled with, not the profile: a form never filled from it must not read as a cleared list.
export function eabRequestFields(
    values: { eabSecretUuids: string[] },
    filled: { eabSecretUuids: string[] } | undefined,
): { eabSecretUuids?: string[] } {
    const changed = filled ? !sameUuidSet(values.eabSecretUuids, filled.eabSecretUuids) : values.eabSecretUuids.length > 0;
    return changed ? { eabSecretUuids: values.eabSecretUuids } : {};
}

export function secretLabel(uuid: string, secrets: readonly Pick<SecretDto, 'uuid' | 'name'>[]): string {
    return secrets.find((secret) => secret.uuid === uuid)?.name ?? uuid;
}

export const EAB_HINT =
    "Accounts must bind with one of these keys. The secret's UUID is the kid an ACME client presents, its content the HMAC key. Only enabled Secret Key and Generic secrets are listed, leaving out failed, pending approval and rejected ones. Saving needs permission to read each secret's content and membership of its vault profile. Leave empty to let any client register.";

export const EAB_KEY_NOTICE =
    'The platform keeps this key only as the content of the secret created here. Closing without creating the secret discards the key.';

export const EAB_SECRET_SELECTED = 'Selected in External Account Binding secrets. Save the profile to bind it.';

export const EAB_SECRET_CREATED = 'Created. Edit the profile to add it to External Account Binding secrets.';

export const EAB_CLIENT_HINT = 'An ACME client registers with the Key ID as its EAB kid and the key as its HMAC key.';

// Why a secret just created for a binding cannot be added to the profile yet; undefined when it can bind right away.
// `needsApproval` is what the vault profile's approval profiles say, undefined when they could not be read; it only
// matters while the secret is still inactive, since a later state already tells whether approval held it.
// `stateRead` is false when the secret could not be read again, leaving only the state the create replied with.
export function newEabSecretProblem({
    secret,
    vaultProfileName,
    needsApproval,
    enableError,
    stateRead,
}: {
    secret: Pick<SecretDto, 'type' | 'enabled' | 'state'>;
    vaultProfileName: string;
    needsApproval: boolean | undefined;
    enableError?: string;
    stateRead: boolean;
}): string | undefined {
    const next = secret.enabled ? 'add it to the profile' : 'enable it and add it to the profile';
    const inactive = secret.state === SecretState.Inactive;
    if (secret.state === SecretState.PendingApproval || (inactive && needsApproval === true)) {
        return `Not usable yet: vault profile ${vaultProfileName} requires approval of new secrets. Once this one is approved, ${next}.`;
    }
    if (secret.state === SecretState.Failed) {
        return `Not usable: storing the secret in vault profile ${vaultProfileName} failed. Once that is fixed, ${next}.`;
    }
    if (secret.state === SecretState.Rejected) {
        return `Not usable: vault profile ${vaultProfileName} rejected the secret.`;
    }
    if (!secret.enabled) {
        const reason = enableError ? ` (${enableError})` : '';
        return `Not usable: the secret could not be enabled${reason}. Enable it, then add it to the profile.`;
    }
    if (!stateRead) {
        return `Not selected: the secret could not be read back from vault profile ${vaultProfileName}, so it is not confirmed usable. Once it shows as active, add it to the profile.`;
    }
    if (inactive && needsApproval === undefined) {
        return `Not selected: whether vault profile ${vaultProfileName} requires approval of new secrets could not be checked. Add it to the profile yourself if it needs none, or once it is approved.`;
    }
    return undefined;
}
