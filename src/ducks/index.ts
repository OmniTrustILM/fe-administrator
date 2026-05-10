import type { ApiClients } from '../api';
import type { UnknownAction } from 'redux';
import { type Epic, combineEpics } from 'redux-observable';
import acmeAccountsEpics from './acme-accounts-epics';
import acmeProfilesEpics from './acme-profiles-epics';
import cmpProfilesEpics from './cmp-profiles-epics';
import scepProfilesEpics from './scep-profiles-epics';

import appRedirectEpics from './app-redirect-epics';
import auditLogsEpics from './auditLogs-epics';

import profileApprovalEpics from './approval-profiles-epics';

import approvalsEpic from './approvals-epic';

import authEpics from './auth-epics';
import authSettingsEpics from './auth-settings-epics';
import authoritiesEpics from './authorities-epics';
import groupsEpics from './certificateGroups-epics';
import certificatesEpics from './certificates-epics';
import complianceProfilesEpics from './compliance-profiles-epics';
import connectorsEpics from './connectors-epic';
import proxiesEpics from './proxies-epic';
import credentialsEpics from './credentials-epics';
import cryptographicKeyEpics from './cryptographic-keys-epics';
import cryptographicOperationsEpics from './cryptographic-operations-epics';
import customAttributesEpics from './customAttributes-epics';
import discoveriesEpics from './discoveries-epics';
import entitiesEpics from './entities-epics';
import enumsEpics from './enums-epics';
import filtersEpics from './filters-epics';
import globalMetadataEpics from './globalMetadata-epics';
import infoEpics from './info-epics';
import locationsEpics from './locations-epics';
import notificationsEpics from './notifications-epics';
import notificationProfilesEpics from './notification-profiles-epics';
import oidsEpics from './oid-epics';
import raProfilesEpics from './ra-profiles-epics';
import type { reducers } from './reducers';
import resourcesEpics from './resource-epics';
import rolesEpics from './roles-epics';
import rulesEpics from './rules-epics';
import schedulerEpics from './scheduler-epics';
import settingsEpics from './settings-epics';
import startupEpics from './startup-epics';
import dashboardEpics from './statisticsDashboard-epics';
import tokenProfileEpics from './token-profiles-epics';
import tokenEpics from './tokens-epics';
import trustedCertificatesEpics from './trusted-certificates-epics';
import usersEpics from './users-epics';
import utilsActuatorEpics from './utilsActuator-epics';
import cbomActuatorEpics from './cbomActuator-epics';
import utilsCertificateEpics from './utilsCertificate-epics';
import utilsCertificateRequestEpics from './utilsCertificateRequest-epics';
import utilsOidEpics from './utilsOid-epics';
import cbomEpics from './cbom-epics';
import loginEpics from './login-epics';
import secretsEpics from './secrets-epics';
import vaultProfilesEpics from './vault-profiles-epics';
import vaultsEpics from './vaults-epics';
import timeQualityConfigurationsEpics from './time-quality-configurations-epics';
import tspProfilesEpics from './tsp-profiles-epics';

export interface EpicDependencies {
    apiClients: ApiClients;
}

export type AppState = ReturnType<typeof reducers>;

export type AppEpic = Epic<UnknownAction, UnknownAction, AppState, EpicDependencies>;

export const epics = combineEpics(
    ...startupEpics,
    ...authEpics,
    ...authSettingsEpics,
    ...appRedirectEpics,
    ...dashboardEpics,
    ...groupsEpics,
    ...connectorsEpics,
    ...proxiesEpics,
    ...discoveriesEpics,
    ...usersEpics,
    ...rolesEpics,
    ...resourcesEpics,
    ...rulesEpics,
    ...certificatesEpics,
    ...authoritiesEpics,
    ...raProfilesEpics,
    ...acmeAccountsEpics,
    ...acmeProfilesEpics,
    ...cmpProfilesEpics,
    ...scepProfilesEpics,
    ...complianceProfilesEpics,
    ...credentialsEpics,
    ...entitiesEpics,
    ...filtersEpics,
    ...locationsEpics,
    ...auditLogsEpics,
    ...customAttributesEpics,
    ...globalMetadataEpics,
    ...settingsEpics,
    ...schedulerEpics,
    ...profileApprovalEpics,
    ...approvalsEpic,
    ...notificationsEpics,
    ...notificationProfilesEpics,
    ...enumsEpics,
    ...infoEpics,
    ...tokenEpics,
    ...tokenProfileEpics,
    ...trustedCertificatesEpics,
    ...cryptographicKeyEpics,
    ...cryptographicOperationsEpics,
    ...utilsOidEpics,
    ...utilsCertificateEpics,
    ...utilsCertificateRequestEpics,
    ...utilsActuatorEpics,
    ...cbomActuatorEpics,
    ...oidsEpics,
    ...cbomEpics,
    ...loginEpics,
    ...secretsEpics,
    ...vaultProfilesEpics,
    ...vaultsEpics,
    ...timeQualityConfigurationsEpics,
    ...tspProfilesEpics,
);
