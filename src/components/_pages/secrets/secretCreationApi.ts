import { backendClient } from 'src/api';
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
