import { combineReducers } from 'redux';

import { slice as acmeAccountsSlice } from './acme-accounts';
import { slice as acmeProfilesSlice } from './acme-profiles';
import { slice as cmpProfilesSlice } from './cmp-profiles';
import { slice as scepProfilesSlice } from './scep-profiles';

import { alertsSlice } from './alert-slice';
import { slice as appRedirectSlice } from './app-redirect';
import { slice as auditLogsSlice } from './auditLogs';
import { slice as authSlice } from './auth';
import { slice as authSettingsSlice } from './auth-settings';
import { slice as userInterfaceSlice } from './user-interface';

import { slice as profileApprovalSlice } from './approval-profiles';

import { slice as approvalSlice } from './approvals';

import { slice as authoritiesSlice } from './authorities';
import { slice as groupsSlice } from './certificateGroups';
import { slice as certificatesSlice } from './certificates';
import { slice as initialComplianceProfilesSlice } from './compliance-profiles';
import { slice as connectorsSlice } from './connectors';
import { slice as initialCredentialsSlice } from './credentials';
import { slice as cryptographicKeySlice } from './cryptographic-keys';
import { slice as cryptographicOperationsSlice } from './cryptographic-operations';
import { slice as customAttributesSlice } from './customAttributes';
import { slice as proxiesSlice } from './proxies';
import { slice as discoveriesSlice } from './discoveries';
import { slice as initialEntitiesSlice } from './entities';
import { slice as enumsSlice } from './enums';
import { slice as infoSlice } from './info';
import { slice as initialFiltersSlice } from './filters';
import { slice as globalMetadataSlice } from './globalMetadata';
import { slice as initialLocationsSlice } from './locations';
import { slice as notificationsSlice } from './notifications';
import { slice as notificationProfilesSlice } from './notification-profiles';
import { slice as pagingSlice } from './paging';
import { slice as raProfilesSlice } from './ra-profiles';
import { slice as resourceSlice } from './resource';
import { slice as rolesSlice } from './roles';
import { slice as rulesSlice } from './rules';
import { slice as eventHistorySlice } from './event-history';
import { slice as schedulerSlice } from './scheduler';
import { slice as signingProfilesSlice } from './signing-profiles';
import { slice as settingsSlice } from './settings';
import { slice as dashboardSlice } from './statisticsDashboard';
import { slice as tokenProfileSlice } from './token-profiles';
import { slice as tokenSlice } from './tokens';
import { slice as tablePaginationSlice } from './table-pagination';
import { slice as listFiltersSlice } from './list-filters';
import { slice as listScopesSlice } from './list-scopes';
import { slice as trustedCertificatesSlice } from './trusted-certificates';
import { slice as usersSlice } from './users';
import { slice as utilsActuatorSlice } from './utilsActuator';
import { slice as cbomActuatorSlice } from './cbomActuator';
import { slice as utilsCertificateSlice } from './utilsCertificate';
import { slice as utilsCertificateRequestSlice } from './utilsCertificateRequest';
import { slice as utilsOidSlice } from './utilsOid';
import { slice as oidsSlice } from './oids';
import { slice as loginSlice } from './login';
import { slice as cbomSlice } from './cbom';
import { slice as secretsSlice } from './secrets';
import { slice as vaultProfilesSlice } from './vault-profiles';
import { slice as vaultsSlice } from './vaults';
import { slice as timeQualityConfigurationsSlice } from './time-quality-configurations';
import { slice as tspProfilesSlice } from './tsp-profiles';
import { slice as tspProfileBasicCredentialsSlice } from './tsp-profile-basic-credentials';

export const reducers = combineReducers({
    [alertsSlice.name]: alertsSlice.reducer,
    [userInterfaceSlice.name]: userInterfaceSlice.reducer,
    [appRedirectSlice.name]: appRedirectSlice.reducer,
    [authSlice.name]: authSlice.reducer,
    [authSettingsSlice.name]: authSettingsSlice.reducer,
    [dashboardSlice.name]: dashboardSlice.reducer,
    [groupsSlice.name]: groupsSlice.reducer,
    [connectorsSlice.name]: connectorsSlice.reducer,
    [proxiesSlice.name]: proxiesSlice.reducer,
    [discoveriesSlice.name]: discoveriesSlice.reducer,
    [pagingSlice.name]: pagingSlice.reducer,
    [usersSlice.name]: usersSlice.reducer,
    [rolesSlice.name]: rolesSlice.reducer,
    [resourceSlice.name]: resourceSlice.reducer,
    [rulesSlice.name]: rulesSlice.reducer,
    [eventHistorySlice.name]: eventHistorySlice.reducer,
    [certificatesSlice.name]: certificatesSlice.reducer,
    [authoritiesSlice.name]: authoritiesSlice.reducer,
    [raProfilesSlice.name]: raProfilesSlice.reducer,
    [acmeAccountsSlice.name]: acmeAccountsSlice.reducer,
    [acmeProfilesSlice.name]: acmeProfilesSlice.reducer,
    [scepProfilesSlice.name]: scepProfilesSlice.reducer,
    [cmpProfilesSlice.name]: cmpProfilesSlice.reducer,
    [initialComplianceProfilesSlice.name]: initialComplianceProfilesSlice.reducer,
    [initialCredentialsSlice.name]: initialCredentialsSlice.reducer,
    [initialEntitiesSlice.name]: initialEntitiesSlice.reducer,
    [initialFiltersSlice.name]: initialFiltersSlice.reducer,
    [initialLocationsSlice.name]: initialLocationsSlice.reducer,
    [auditLogsSlice.name]: auditLogsSlice.reducer,
    [customAttributesSlice.name]: customAttributesSlice.reducer,
    [globalMetadataSlice.name]: globalMetadataSlice.reducer,
    [settingsSlice.name]: settingsSlice.reducer,
    [schedulerSlice.name]: schedulerSlice.reducer,
    [signingProfilesSlice.name]: signingProfilesSlice.reducer,
    [profileApprovalSlice.name]: profileApprovalSlice.reducer,
    [approvalSlice.name]: approvalSlice.reducer,
    [notificationsSlice.name]: notificationsSlice.reducer,
    [notificationProfilesSlice.name]: notificationProfilesSlice.reducer,
    [enumsSlice.name]: enumsSlice.reducer,
    [infoSlice.name]: infoSlice.reducer,
    [tokenSlice.name]: tokenSlice.reducer,
    [tokenProfileSlice.name]: tokenProfileSlice.reducer,
    [tablePaginationSlice.name]: tablePaginationSlice.reducer,
    [listFiltersSlice.name]: listFiltersSlice.reducer,
    [listScopesSlice.name]: listScopesSlice.reducer,
    [trustedCertificatesSlice.name]: trustedCertificatesSlice.reducer,
    [cryptographicKeySlice.name]: cryptographicKeySlice.reducer,
    [cryptographicOperationsSlice.name]: cryptographicOperationsSlice.reducer,
    [utilsOidSlice.name]: utilsOidSlice.reducer,
    [utilsCertificateSlice.name]: utilsCertificateSlice.reducer,
    [utilsCertificateRequestSlice.name]: utilsCertificateRequestSlice.reducer,
    [utilsActuatorSlice.name]: utilsActuatorSlice.reducer,
    [cbomActuatorSlice.name]: cbomActuatorSlice.reducer,
    [oidsSlice.name]: oidsSlice.reducer,
    [loginSlice.name]: loginSlice.reducer,
    [cbomSlice.name]: cbomSlice.reducer,
    [secretsSlice.name]: secretsSlice.reducer,
    [vaultProfilesSlice.name]: vaultProfilesSlice.reducer,
    [vaultsSlice.name]: vaultsSlice.reducer,
    [timeQualityConfigurationsSlice.name]: timeQualityConfigurationsSlice.reducer,
    [tspProfilesSlice.name]: tspProfilesSlice.reducer,
    [tspProfileBasicCredentialsSlice.name]: tspProfileBasicCredentialsSlice.reducer,
});
