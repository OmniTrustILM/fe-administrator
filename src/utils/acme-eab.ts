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
    'The platform does not store this key. Copy it now, save it as the content of a Secret Key or Generic secret, enable that secret and add it to the profile. It is not shown again.';
