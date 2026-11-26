import { transformAttributeDescriptorDtoToModel, transformCustomAttributeDtoToModel } from 'ducks/transform/attributes';
import { map, type Observable } from 'rxjs';
import { backendClient } from 'src/api';
import type { AttributeDescriptorDto, AttributeDescriptorModel, CustomAttributeModel } from 'types/attributes';
import { Resource, type SecretType } from 'types/openapi';
import type { SecretCreationApi } from 'utils/secret-creation';

export const backendSecretCreationApi: SecretCreationApi = {
    createSecret: (request) => backendClient.secrets.createSecret(request),
    enableSecret: (uuid) => backendClient.secrets.enableSecret({ uuid }),
    getSecret: (uuid) => backendClient.secrets.getSecretDetails({ uuid }),
    vaultProfileApprovalProfiles: (vaultProfileUuid) =>
        backendClient.approvalProfiles.getAssociatedApprovalProfiles1({
            resource: Resource.VaultProfiles,
            associationObjectUuid: vaultProfileUuid,
        }),
};

export function loadSecretCustomAttributes(): Observable<CustomAttributeModel[]> {
    return backendClient.customAttributes
        .getResourceCustomAttributes({ resource: Resource.Secrets })
        .pipe(map((list) => list.map(transformCustomAttributeDtoToModel)));
}

export type SecretAttributesQuery = Readonly<{ vaultUuid: string; vaultProfileUuid: string; secretType: SecretType }>;

export type SecretAttributesLoader = (query: SecretAttributesQuery) => Observable<AttributeDescriptorModel[]>;

// The attributes a vault profile asks for when a secret of the type is created in it.
export const loadSecretAttributes: SecretAttributesLoader = (query) =>
    backendClient.vaultProfiles
        .listSecretAttributes(query)
        .pipe(map((list) => list.map((dto) => transformAttributeDescriptorDtoToModel(dto as AttributeDescriptorDto))));
