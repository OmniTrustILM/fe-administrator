import { delay, of, throwError } from 'rxjs';
import type { AttributeDescriptorModel } from 'types/attributes';
import {
    type ApprovalProfileDto,
    AttributeContentType,
    AttributeType,
    ComplianceStatus,
    type CreateSecretRequest,
    type SecretDetailDto,
    SecretState,
    SecretType,
} from 'types/openapi';
import { createMockStore } from 'utils/test-helpers';
import type { EabKeyApi } from './GenerateEabKeyDialog';

export const VAULT_PROFILE = { uuid: 'vp-1', name: 'Vault One', enabled: true, vaultInstance: { uuid: 'vault-1', name: 'Vault' } };

export const CREATED_SECRET_UUID = '5f0c3d2e-created';

export const VAULT_PATH_ATTRIBUTE: AttributeDescriptorModel = {
    type: AttributeType.Data,
    name: 'path',
    uuid: 'vault-path-attribute',
    contentType: AttributeContentType.String,
    properties: { label: 'Path', required: true, readOnly: false, visible: true, list: false, multiSelect: false },
};

export type EabSecretStoreOptions = Readonly<{
    vaultAttributes?: AttributeDescriptorModel[];
    attributesLoading?: boolean;
    onAction?: (action: unknown) => void;
}>;

export function createEabSecretStore({ vaultAttributes = [], attributesLoading = false, onAction }: EabSecretStoreOptions = {}) {
    const store = createMockStore({
        vaultProfiles: { vaultProfiles: [VAULT_PROFILE] },
        secrets: {
            syncVaultProfileAttributeDescriptors: [],
            isFetchingSyncVaultProfileAttributes: false,
            secretCreationAttributeDescriptors: vaultAttributes,
            isFetchingSecretCreationAttributes: attributesLoading,
        },
        enums: { platformEnums: { SecretType: { [SecretType.SecretKey]: { label: 'Secret Key' } } } },
    });
    if (onAction) {
        const dispatch = store.dispatch;
        store.dispatch = ((action: Parameters<typeof dispatch>[0]) => {
            onAction(action);
            return dispatch(action);
        }) as typeof dispatch;
    }
    return store;
}

export type EabKeyApiBehaviour = Readonly<{
    generatedKey?: string;
    generateFails?: boolean;
    createFails?: boolean;
    createDelayMs?: number;
    enableFails?: boolean;
    approvalRequired?: boolean;
    approvalLookupFails?: boolean;
    // What the secret has become by the time it is read again; Core settles it after replying to the create.
    stateAfterCreate?: SecretState;
}>;

// Core replies to a create before the secret is enabled or has reached its vault.
function createdSecret(request: CreateSecretRequest): SecretDetailDto {
    return {
        uuid: CREATED_SECRET_UUID,
        name: request.secretRequestDto.name,
        type: request.secretRequestDto.secret.type,
        sourceVaultProfile: { uuid: VAULT_PROFILE.uuid, name: VAULT_PROFILE.name },
        state: SecretState.Inactive,
        enabled: false,
        version: 1,
        complianceStatus: ComplianceStatus.NotChecked,
        syncVaultProfiles: [],
        createdAt: '2026-09-29T10:00:00Z',
        updatedAt: '2026-09-29T10:00:00Z',
        attributes: [],
    };
}

export function stubEabKeyApi(behaviour: EabKeyApiBehaviour, onCreate: (request: CreateSecretRequest) => void): EabKeyApi {
    let generations = 0;
    let requests: CreateSecretRequest[] = [];
    const lastRequest = () => requests[requests.length - 1].secretRequestDto;
    return {
        generateKey: () => {
            generations += 1;
            return behaviour.generateFails
                ? throwError(() => new Error('boom'))
                : of({ key: `${behaviour.generatedKey ?? 'generated-key'}-${generations}` });
        },
        createSecret: (request) => {
            requests = [...requests, request];
            onCreate(request);
            if (behaviour.createFails) return throwError(() => new Error('Secret with name already exists'));
            return of(createdSecret(request)).pipe(delay(behaviour.createDelayMs ?? 0));
        },
        enableSecret: () => (behaviour.enableFails ? throwError(() => new Error('Access Denied')) : of(undefined)),
        getSecret: (uuid) =>
            of({
                ...createdSecret({
                    vaultUuid: VAULT_PROFILE.vaultInstance.uuid,
                    vaultProfileUuid: VAULT_PROFILE.uuid,
                    secretRequestDto: lastRequest(),
                }),
                uuid,
                enabled: !behaviour.enableFails,
                state: behaviour.stateAfterCreate ?? SecretState.Inactive,
            }),
        vaultProfileApprovalProfiles: () => {
            if (behaviour.approvalLookupFails) return throwError(() => new Error('Access Denied'));
            return of(behaviour.approvalRequired ? [{ uuid: 'ap-1', name: 'Four eyes' } as ApprovalProfileDto] : []);
        },
    };
}
