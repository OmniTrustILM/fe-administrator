import { transformCustomAttributeDtoToModel } from 'ducks/transform/attributes';
import { map, type Observable } from 'rxjs';
import { backendClient } from 'src/api';
import type { CustomAttributeModel } from 'types/attributes';
import { Resource } from 'types/openapi';
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
