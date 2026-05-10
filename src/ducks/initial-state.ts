import { slice as acmeAccountsSlice, initialState as initialAcmeAccountsState } from './acme-accounts';
import { slice as acmeProfilesSlice, initialState as initialAcmeProfilesState } from './acme-profiles';
import { slice as cmpProfilesSlice, initialState as initialCmpProfilesState } from './cmp-profiles';
import { initialState as initialScepProfilesState, slice as scepProfilesSlice } from './scep-profiles';

import { alertsSlice, initialState as initialAlertsState } from './alert-slice';
import { slice as appRedirectSlice, initialState as initialAppRedirectState } from './app-redirect';
import { slice as auditLogsSlice, initialState as initialAuditLogsState } from './auditLogs';
import { slice as authSlice, initialState as initialAuthState } from './auth';
import { slice as initialUserInterfaceSlice, initialState as initialUserInterfaceState } from './user-interface';

import { initialState as initialProfileApprovalState, slice as profileApprovalSlice } from './approval-profiles';

import { slice as approvalSlice, initialState as initialApprovalState } from './approvals';

import { slice as authoritiesSlice, initialState as initialAuthoritiesState } from './authorities';
import { slice as groupsSlice, initialState as initialGroupsState } from './certificateGroups';
import { slice as certificatesSlice, initialState as initialCertificatesState } from './certificates';
import { slice as initialComplianceProfilesSlice, initialState as initialComplianceProfilesState } from './compliance-profiles';
import { slice as connectorsSlice, initialState as initialConnectorsState } from './connectors';
import { slice as initialCredentialsSlice, initialState as initialCredentialsState } from './credentials';
import { slice as cryptographicKeySlice, initialState as initialCryptographicKeyAttributesState } from './cryptographic-keys';
import {
    slice as cryptographicOperationsSlice,
    initialState as initialCryptographicOperationsAttributesState,
} from './cryptographic-operations';
import { slice as customAttributesSlice, initialState as initialCustomAttributesState } from './customAttributes';
import { slice as discoveriesSlice, initialState as initialDiscoveriesState } from './discoveries';
import { slice as initialEntitiesSlice, initialState as initialEntitiesState } from './entities';
import { slice as enumsSlice, initialState as initialEnumsState } from './enums';
import { slice as initialFiltersSlice, initialState as initialFiltersState } from './filters';
import { slice as globalMetadataSlice, initialState as initialGlobalMetadataState } from './globalMetadata';
import { slice as initialLocationsSlice, initialState as initialLocationsState } from './locations';
import { initialState as initialNotificationsState, slice as notificationsSlice } from './notifications';
import { initialState as initialPagingState, slice as pagingSlice } from './paging';
import { initialState as initialRaProfilesState, slice as raProfilesSlice } from './ra-profiles';
import { initialState as initialResouceState, slice as resourceSlice } from './resource';
import { initialState as initialRolesState, slice as rolesSlice } from './roles';
import { initialState as initialRulesState, slice as rulesSlice } from './rules';
import { initialState as initialSchedulerState, slice as schedulerSlice } from './scheduler';
import { initialState as initialSettingsState, slice as settingsSlice } from './settings';
import { slice as dashboardSlice, initialState as initialDashboardState } from './statisticsDashboard';
import { initialState as initialTokenProfileAttributesState, slice as tokenProfileSlice } from './token-profiles';
import { initialState as initialTokenAttributesState, slice as tokenSlice } from './tokens';
import { initialState as initialUsersState, slice as usersSlice } from './users';
import { initialState as initialUtilsActuatorState, slice as utilsActuatorSlice } from './utilsActuator';
import { initialState as initialCbomActuatorState, slice as cbomActuatorSlice } from './cbomActuator';
import { initialState as initialUtilsCertificateState, slice as utilsCertificateSlice } from './utilsCertificate';
import { initialState as initialUtilsCertificateRequestState, slice as utilsCertificateRequestSlice } from './utilsCertificateRequest';
import { initialState as initialUtilsOidState, slice as utilsOidSlice } from './utilsOid';
import { initialState as initialOidsState, slice as oidsSlice } from './oids';
import { initialState as initialInfoState, slice as infoSlice } from './info';
import { initialState as initialCbomState, slice as cbomSlice } from './cbom';
import { initialState as initialSecretsState, slice as secretsSlice } from './secrets';
import { initialState as initialVaultProfilesState, slice as vaultProfilesSlice } from './vault-profiles';
import { initialState as initialVaultsState, slice as vaultsSlice } from './vaults';

export const initialState = {
    [alertsSlice.name]: initialAlertsState,
    [initialUserInterfaceSlice.name]: initialUserInterfaceState,
    [appRedirectSlice.name]: initialAppRedirectState,
    [authSlice.name]: initialAuthState,
    [dashboardSlice.name]: initialDashboardState,
    [groupsSlice.name]: initialGroupsState,
    [connectorsSlice.name]: initialConnectorsState,
    [discoveriesSlice.name]: initialDiscoveriesState,
    [pagingSlice.name]: initialPagingState,
    [usersSlice.name]: initialUsersState,
    [rolesSlice.name]: initialRolesState,
    [rulesSlice.name]: initialRulesState,
    [resourceSlice.name]: initialResouceState,
    [certificatesSlice.name]: initialCertificatesState,
    [authoritiesSlice.name]: initialAuthoritiesState,
    [raProfilesSlice.name]: initialRaProfilesState,
    [acmeAccountsSlice.name]: initialAcmeAccountsState,
    [acmeProfilesSlice.name]: initialAcmeProfilesState,
    [scepProfilesSlice.name]: initialScepProfilesState,
    [cmpProfilesSlice.name]: initialCmpProfilesState,
    [initialComplianceProfilesSlice.name]: initialComplianceProfilesState,
    [initialCredentialsSlice.name]: initialCredentialsState,
    [initialEntitiesSlice.name]: initialEntitiesState,
    [initialFiltersSlice.name]: initialFiltersState,
    [initialLocationsSlice.name]: initialLocationsState,
    [auditLogsSlice.name]: initialAuditLogsState,
    [customAttributesSlice.name]: initialCustomAttributesState,
    [globalMetadataSlice.name]: initialGlobalMetadataState,
    [settingsSlice.name]: initialSettingsState,
    [schedulerSlice.name]: initialSchedulerState,
    [profileApprovalSlice.name]: initialProfileApprovalState,
    [approvalSlice.name]: initialApprovalState,
    [notificationsSlice.name]: initialNotificationsState,
    [enumsSlice.name]: initialEnumsState,
    [tokenSlice.name]: initialTokenAttributesState,
    [tokenProfileSlice.name]: initialTokenProfileAttributesState,
    [cryptographicKeySlice.name]: initialCryptographicKeyAttributesState,
    [cryptographicOperationsSlice.name]: initialCryptographicOperationsAttributesState,
    [utilsOidSlice.name]: initialUtilsOidState,
    [utilsCertificateSlice.name]: initialUtilsCertificateState,
    [utilsCertificateRequestSlice.name]: initialUtilsCertificateRequestState,
    [utilsActuatorSlice.name]: initialUtilsActuatorState,
    [cbomActuatorSlice.name]: initialCbomActuatorState,
    [oidsSlice.name]: initialOidsState,
    [infoSlice.name]: initialInfoState,
    [cbomSlice.name]: initialCbomState,
    [secretsSlice.name]: initialSecretsState,
    [vaultProfilesSlice.name]: initialVaultProfilesState,
    [vaultsSlice.name]: initialVaultsState,
};
