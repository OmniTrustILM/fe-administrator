import { selectors } from 'ducks/auth';
import { featureFlags } from 'utils/feature-flags';
import { lazy, Suspense, useMemo } from 'react';
import { useSelector } from 'react-redux';
import { HashRouter, Navigate, Route, Routes } from 'react-router';

import AppRedirect from './AppRedirect';
import Layout from './Layout';
import Spinner from './Spinner';

import { Resource } from 'types/openapi';
import Login from './_pages/login';

const AuditLogs = lazy(() => import('./_pages/auditLogs'));
const CertificatesDashboard = lazy(() => import('./_pages/dashboard/CertificatesDashboard'));
const SecretsDashboard = lazy(() => import('./_pages/dashboard/SecretsDashboard'));
const AuthenticationSettings = lazy(() => import('./_pages/auth-settings'));
const OAuth2ProviderDetail = lazy(() => import('./_pages/auth-settings/detail'));

const LoggingSettings = lazy(() => import('./_pages/logging-settings'));

const TrustedCertificateDetail = lazy(() =>
    import('./_pages/trusted-certificates/detail/TrustedCertificateDetail').then((m) => ({ default: m.TrustedCertificateDetail })),
);
const TrustedCertificatesList = lazy(() =>
    import('./_pages/trusted-certificates/list/TrustedCertificateList').then((m) => ({ default: m.TrustedCertificatesList })),
);

const AcmeAccountDetail = lazy(() => import('./_pages/acme-accounts/detail'));
const AcmeAccountsList = lazy(() => import('./_pages/acme-accounts/list'));

const AcmeProfileDetail = lazy(() => import('./_pages/acme-profiles/detail'));
const AcmeProfilesList = lazy(() => import('./_pages/acme-profiles/list'));

const AuthorityDetail = lazy(() => import('./_pages/authorities/detail'));
const AuthoritiesList = lazy(() => import('./_pages/authorities/list'));
const AuthorityForm = lazy(() => import('./_pages/authorities/form'));

const CertificateDetail = lazy(() => import('./_pages/certificates/detail'));
const CertificateEdit = lazy(() => import('./_pages/certificates/form'));
const CertificatesList = lazy(() => import('./_pages/certificates/list'));

const ComplianceProfileDetail = lazy(() => import('./_pages/compliance-profiles/detail'));
const ComplianceProfilesList = lazy(() => import('./_pages/compliance-profiles/list'));

const ConnectorDetail = lazy(() => import('./_pages/connectors/detail'));
const ConnectorsList = lazy(() => import('./_pages/connectors/list'));

const ProxyDetail = lazy(() => import('./_pages/proxies/detail/ProxyDetail').then((m) => ({ default: m.ProxyDetail })));
const ProxiesList = lazy(() => import('./_pages/proxies/list/ProxiesList').then((m) => ({ default: m.ProxiesList })));

const ApprovalProfileDetails = lazy(() => import('./_pages/approval-profiles/detail'));
const ApprovalProfiles = lazy(() => import('./_pages/approval-profiles/list'));

const ApprovalDetails = lazy(() => import('./_pages/approvals/details'));
const ApprovalsList = lazy(() => import('./_pages/approvals/list'));

const CredentialDetail = lazy(() => import('./_pages/credentials/detail'));
const CredentialsList = lazy(() => import('./_pages/credentials/list'));

const CryptographicKeyDetail = lazy(() => import('./_pages/cryptographic-keys/detail'));
const CryptographicKeyList = lazy(() => import('./_pages/cryptographic-keys/list'));
const SecretsList = lazy(() => import('./_pages/secrets/list'));
const SecretDetail = lazy(() => import('./_pages/secrets/detail'));

const CustomAttributesDetail = lazy(() => import('./_pages/custom-attributes/detail'));
const CustomAttributesList = lazy(() => import('./_pages/custom-attributes/list'));

const DiscoveryDetail = lazy(() => import('./_pages/discoveries/detail'));
const DiscoveriesList = lazy(() => import('./_pages/discoveries/list'));

const EntityDetail = lazy(() => import('./_pages/entities/detail'));
const EntitiesList = lazy(() => import('./_pages/entities/list'));

const ScepProfileDetail = lazy(() => import('./_pages/scep-profiles/detail'));
const ScepProfilesList = lazy(() => import('./_pages/scep-profiles/list'));

const CmpProfileDetails = lazy(() => import('./_pages/cmp-profiles/details'));
const CmpProfilesList = lazy(() => import('./_pages/cmp-profiles/list'));

const GlobalMetadataDetail = lazy(() => import('./_pages/global-metadata/detail'));
const GlobalMetadataList = lazy(() => import('./_pages/global-metadata/list'));

const TimeQualityConfigurationDetail = lazy(() =>
    import('./_pages/time-quality-configurations/detail/TimeQualityConfigurationDetail').then((m) => ({
        default: m.TimeQualityConfigurationDetail,
    })),
);
const TimeQualityConfigurationForm = lazy(() =>
    import('./_pages/time-quality-configurations/form/TimeQualityConfigurationForm').then((m) => ({
        default: m.TimeQualityConfigurationForm,
    })),
);
const TimeQualityConfigurationsList = lazy(() =>
    import('./_pages/time-quality-configurations/list/TimeQualityConfigurationsList').then((m) => ({
        default: m.TimeQualityConfigurationsList,
    })),
);

const TspProfileDetail = lazy(() => import('./_pages/tsp-profiles/detail/TspProfileDetail').then((m) => ({ default: m.TspProfileDetail })));
const TspProfileForm = lazy(() => import('./_pages/tsp-profiles/form/TspProfileForm').then((m) => ({ default: m.TspProfileForm })));
const TspProfilesList = lazy(() => import('./_pages/tsp-profiles/list/TspProfilesList').then((m) => ({ default: m.TspProfilesList })));

const GroupDetail = lazy(() => import('./_pages/group/detail'));
const GroupList = lazy(() => import('./_pages/group/list'));

const LocationDetail = lazy(() => import('./_pages/locations/detail'));
const LocationsList = lazy(() => import('./_pages/locations/list'));

const RaProfileDetail = lazy(() => import('./_pages/ra-profiles/detail'));
const RaProfilesList = lazy(() => import('./_pages/ra-profiles/list'));

const PlatformSettingsDetail = lazy(() => import('./_pages/platform-settings/detail'));

const RoleDetail = lazy(() => import('./_pages/roles/detail'));
const RolesList = lazy(() => import('./_pages/roles/list'));
const RolePermissions = lazy(() => import('./_pages/roles/RolePermissionsForm'));

const TokenProfileDetail = lazy(() => import('./_pages/token-profiles/detail'));
const TokenProfileList = lazy(() => import('./_pages/token-profiles/list'));

const TokenDetail = lazy(() => import('./_pages/tokens/detail'));
const TokenList = lazy(() => import('./_pages/tokens/list'));

const UserProfileDetail = lazy(() => import('./_pages/user-profile/detail'));

const UserDetail = lazy(() => import('./_pages/users/detail'));
const UsersList = lazy(() => import('./_pages/users/list'));

const NotificationsList = lazy(() => import('./_pages/notifications/list'));
const NotificationInstanceDetail = lazy(() => import('./_pages/notifications/notification-instance-details'));
const EventsSettings = lazy(() => import('./_pages/notifications/events-settings'));

const NotificationProfileDetail = lazy(() => import('./_pages/notifications/notification-profiles/detail'));
const NotificationProfilesList = lazy(() => import('./_pages/notifications/notification-profiles/list'));

const ConditionDetails = lazy(() => import('./_pages/conditions/details'));

const ExecutionDetails = lazy(() => import('./_pages/executions/details'));
const ExecutionForm = lazy(() => import('./_pages/executions/form'));

const ActionDetails = lazy(() => import('./_pages/actions/detail'));
const ActionsList = lazy(() => import('./_pages/actions/list'));

const TriggerDetails = lazy(() => import('./_pages/triggers/details'));
const TriggerList = lazy(() => import('./_pages/triggers/list'));

const RuleDetails = lazy(() => import('./_pages/rules/detail'));
const RulesList = lazy(() => import('./_pages/rules/list'));

const SchedulerJobDetail = lazy(() => import('./_pages/scheduler/detail'));
const SchedulerJobsList = lazy(() => import('./_pages/scheduler/list'));

const CustomOIDList = lazy(() => import('components/_pages/custom-oid/list'));
const CustomOIDDetail = lazy(() => import('components/_pages/custom-oid/detail'));

const VaultsList = lazy(() => import('./_pages/vaults/list'));
const VaultDetail = lazy(() => import('./_pages/vaults/detail'));
const VaultProfilesList = lazy(() => import('./_pages/vault-profiles/list'));
const VaultProfileDetail = lazy(() => import('./_pages/vault-profiles/detail'));

const CbomsList = lazy(() => import('./_pages/cboms/list'));
const CbomDetail = lazy(() => import('components/_pages/cboms/detail'));
const CbomVersionsHistory = lazy(() => import('components/_pages/cboms/versions'));

const RouteFallback = () => <Spinner size="xl" />;

export default function AppRouter() {
    const profile = useSelector(selectors.profile);

    const { isProxiesEnabled, isTrustedCertificatesEnabled } = featureFlags;

    const appRoutes = useMemo(
        () => (
            <>
                <Route element={<Layout />}>
                    <Route path="" element={<Navigate to={`/${Resource.Dashboard.toLowerCase()}`} />} />
                    <Route path={`/`} element={<Navigate to={`/${Resource.Dashboard.toLowerCase()}`} />} />

                    <Route
                        path={`/${Resource.Dashboard.toLowerCase()}`}
                        element={<Navigate to={`/${Resource.Dashboard.toLowerCase()}/certificates`} />}
                    />
                    <Route path={`/${Resource.Dashboard.toLowerCase()}/certificates`} element={<CertificatesDashboard />} />
                    <Route path={`/${Resource.Dashboard.toLowerCase()}/secrets`} element={<SecretsDashboard />} />

                    <Route path={`/${Resource.Users.toLowerCase()}`} element={<UsersList />} />
                    <Route path={`/${Resource.Users.toLowerCase()}/list`} element={<Navigate to={`/${Resource.Users.toLowerCase()}`} />} />
                    <Route path={`/${Resource.Users.toLowerCase()}/detail/:id`} element={<UserDetail />} />

                    <Route path={`/${Resource.Roles.toLowerCase()}`} element={<RolesList />} />
                    <Route path={`/${Resource.Roles.toLowerCase()}/list`} element={<Navigate to={`/${Resource.Roles.toLowerCase()}`} />} />
                    <Route path={`/${Resource.Roles.toLowerCase()}/detail/:id`} element={<RoleDetail />} />
                    <Route path={`/${Resource.Roles.toLowerCase()}/permissions/:id`} element={<RolePermissions />} />

                    <Route path={`/${Resource.Certificates.toLowerCase()}`} element={<CertificatesList />} />
                    <Route
                        path={`/${Resource.Certificates.toLowerCase()}/list`}
                        element={<Navigate to={`/${Resource.Certificates.toLowerCase()}`} />}
                    />
                    <Route path={`/${Resource.Certificates.toLowerCase()}/detail/:id`} element={<CertificateDetail />} />
                    <Route path={`/${Resource.Certificates.toLowerCase()}/add`} element={<CertificateEdit />} />

                    <Route path={`/${Resource.Connectors.toLowerCase()}`} element={<ConnectorsList />} />
                    <Route
                        path={`/${Resource.Connectors.toLowerCase()}/list`}
                        element={<Navigate to={`/${Resource.Connectors.toLowerCase()}`} />}
                    />
                    <Route path={`/${Resource.Connectors.toLowerCase()}/detail/:id`} element={<ConnectorDetail />} />

                    {isProxiesEnabled && (
                        <>
                            <Route path={`/${Resource.Proxies.toLowerCase()}`} element={<ProxiesList />} />
                            <Route
                                path={`/${Resource.Proxies.toLowerCase()}/list`}
                                element={<Navigate to={`/${Resource.Proxies.toLowerCase()}`} />}
                            />
                            <Route path={`/${Resource.Proxies.toLowerCase()}/detail/:id`} element={<ProxyDetail />} />
                        </>
                    )}

                    <Route path={`/${Resource.Discoveries.toLowerCase()}`} element={<DiscoveriesList />} />
                    <Route
                        path={`/${Resource.Discoveries.toLowerCase()}/list`}
                        element={<Navigate to={`/${Resource.Discoveries.toLowerCase()}`} />}
                    />
                    <Route path={`/${Resource.Discoveries.toLowerCase()}/detail/:id`} element={<DiscoveryDetail />} />

                    <Route path={`/${Resource.Authorities.toLowerCase()}`} element={<AuthoritiesList />} />
                    <Route
                        path={`/${Resource.Authorities.toLowerCase()}/list`}
                        element={<Navigate to={`/${Resource.Authorities.toLowerCase()}`} />}
                    />
                    <Route path={`/${Resource.Authorities.toLowerCase()}/detail/:id`} element={<AuthorityDetail />} />
                    <Route path={`/${Resource.Authorities.toLowerCase()}/add`} element={<AuthorityForm />} />
                    <Route path={`/${Resource.Authorities.toLowerCase()}/edit/:id`} element={<AuthorityForm />} />

                    <Route path={`/${Resource.RaProfiles.toLowerCase()}`} element={<RaProfilesList />} />
                    <Route
                        path={`/${Resource.RaProfiles.toLowerCase()}/list`}
                        element={<Navigate to={`/${Resource.RaProfiles.toLowerCase()}`} />}
                    />
                    <Route path={`/${Resource.RaProfiles.toLowerCase()}/detail/:authorityId/:id`} element={<RaProfileDetail />} />

                    <Route path={`/${Resource.ApprovalProfiles.toLowerCase()}`} element={<ApprovalProfiles />} />
                    <Route path={`/${Resource.ApprovalProfiles.toLowerCase()}/detail/:id`} element={<ApprovalProfileDetails />} />
                    <Route path={`/${Resource.ApprovalProfiles.toLowerCase()}/detail/:id/:version`} element={<ApprovalProfileDetails />} />

                    <Route path={`/${Resource.Approvals.toLowerCase()}`} element={<ApprovalsList />} />
                    <Route path={`/${Resource.Approvals.toLowerCase()}/detail/:id`} element={<ApprovalDetails />} />

                    <Route path={`/${Resource.ComplianceProfiles.toLowerCase()}`} element={<ComplianceProfilesList />} />
                    <Route
                        path={`/${Resource.ComplianceProfiles.toLowerCase()}/list`}
                        element={<Navigate to={`/${Resource.ComplianceProfiles.toLowerCase()}`} />}
                    />
                    <Route path={`/${Resource.ComplianceProfiles.toLowerCase()}/detail/:id`} element={<ComplianceProfileDetail />} />

                    <Route path={`/${Resource.AcmeProfiles.toLowerCase()}`} element={<AcmeProfilesList />} />
                    <Route
                        path={`/${Resource.AcmeProfiles.toLowerCase()}/list`}
                        element={<Navigate to={`/${Resource.AcmeProfiles.toLowerCase()}`} />}
                    />
                    <Route path={`/${Resource.AcmeProfiles.toLowerCase()}/detail/:id`} element={<AcmeProfileDetail />} />

                    <Route path={`/${Resource.AcmeAccounts.toLowerCase()}`} element={<AcmeAccountsList />} />
                    <Route
                        path={`/${Resource.AcmeAccounts.toLowerCase()}/list`}
                        element={<Navigate to={`/${Resource.AcmeAccounts.toLowerCase()}`} />}
                    />
                    <Route path={`/${Resource.AcmeAccounts.toLowerCase()}/detail/:acmeProfileId/:id`} element={<AcmeAccountDetail />} />

                    <Route path={`/${Resource.ScepProfiles.toLowerCase()}`} element={<ScepProfilesList />} />
                    <Route
                        path={`/${Resource.ScepProfiles.toLowerCase()}/list`}
                        element={<Navigate to={`/${Resource.ScepProfiles.toLowerCase()}`} />}
                    />
                    <Route path={`/${Resource.ScepProfiles.toLowerCase()}/detail/:id`} element={<ScepProfileDetail />} />

                    <Route path={`/${Resource.CmpProfiles.toLowerCase()}`} element={<CmpProfilesList />} />
                    <Route
                        path={`/${Resource.CmpProfiles.toLowerCase()}/list`}
                        element={<Navigate to={`/${Resource.CmpProfiles.toLowerCase()}`} />}
                    />
                    <Route path={`/${Resource.CmpProfiles.toLowerCase()}/detail/:id`} element={<CmpProfileDetails />} />

                    <Route path={`/${Resource.TimeQualityConfigurations.toLowerCase()}`} element={<TimeQualityConfigurationsList />} />
                    <Route
                        path={`/${Resource.TimeQualityConfigurations.toLowerCase()}/list`}
                        element={<Navigate to={`/${Resource.TimeQualityConfigurations.toLowerCase()}`} />}
                    />
                    <Route path={`/${Resource.TimeQualityConfigurations.toLowerCase()}/add`} element={<TimeQualityConfigurationForm />} />
                    <Route
                        path={`/${Resource.TimeQualityConfigurations.toLowerCase()}/edit/:id`}
                        element={<TimeQualityConfigurationForm />}
                    />
                    <Route
                        path={`/${Resource.TimeQualityConfigurations.toLowerCase()}/detail/:id`}
                        element={<TimeQualityConfigurationDetail />}
                    />

                    <Route path={`/${Resource.TspProfiles.toLowerCase()}`} element={<TspProfilesList />} />
                    <Route
                        path={`/${Resource.TspProfiles.toLowerCase()}/list`}
                        element={<Navigate to={`/${Resource.TspProfiles.toLowerCase()}`} />}
                    />
                    <Route path={`/${Resource.TspProfiles.toLowerCase()}/add`} element={<TspProfileForm />} />
                    <Route path={`/${Resource.TspProfiles.toLowerCase()}/edit/:id`} element={<TspProfileForm />} />
                    <Route path={`/${Resource.TspProfiles.toLowerCase()}/detail/:id`} element={<TspProfileDetail />} />

                    <Route path={`/${Resource.Groups.toLowerCase()}`} element={<GroupList />} />
                    <Route
                        path={`/${Resource.Groups.toLowerCase()}/list`}
                        element={<Navigate to={`/${Resource.Groups.toLowerCase()}`} />}
                    />
                    <Route path={`/${Resource.Groups.toLowerCase()}/detail/:id`} element={<GroupDetail />} />

                    <Route path={`/${Resource.Credentials.toLowerCase()}`} element={<CredentialsList />} />
                    <Route
                        path={`/${Resource.Credentials.toLowerCase()}/list`}
                        element={<Navigate to={`/${Resource.Credentials.toLowerCase()}`} />}
                    />
                    <Route path={`/${Resource.Credentials.toLowerCase()}/detail/:id`} element={<CredentialDetail />} />

                    <Route path={`/${Resource.Entities.toLowerCase()}`} element={<EntitiesList />} />
                    <Route
                        path={`/${Resource.Entities.toLowerCase()}/list`}
                        element={<Navigate to={`/${Resource.Entities.toLowerCase()}`} />}
                    />
                    <Route path={`/${Resource.Entities.toLowerCase()}/detail/:id`} element={<EntityDetail />} />

                    <Route path={`/${Resource.Vaults.toLowerCase()}`} element={<VaultsList />} />
                    <Route
                        path={`/${Resource.Vaults.toLowerCase()}/list`}
                        element={<Navigate to={`/${Resource.Vaults.toLowerCase()}`} />}
                    />
                    <Route path={`/${Resource.Vaults.toLowerCase()}/detail/:id`} element={<VaultDetail />} />

                    <Route path={`/${Resource.VaultProfiles.toLowerCase()}`} element={<VaultProfilesList />} />
                    <Route
                        path={`/${Resource.VaultProfiles.toLowerCase()}/list`}
                        element={<Navigate to={`/${Resource.VaultProfiles.toLowerCase()}`} />}
                    />
                    <Route path={`/${Resource.VaultProfiles.toLowerCase()}/detail/:vaultUuid/:id`} element={<VaultProfileDetail />} />

                    <Route path={`/${Resource.Locations.toLowerCase()}`} element={<LocationsList />} />
                    <Route
                        path={`/${Resource.Locations.toLowerCase()}/list`}
                        element={<Navigate to={`/${Resource.Locations.toLowerCase()}`} />}
                    />
                    <Route path={`/${Resource.Locations.toLowerCase()}/detail/:entityId/:id`} element={<LocationDetail />} />

                    <Route path={`/userprofile`} element={<UserProfileDetail />} />

                    <Route path={`/${Resource.AuditLogs.toLowerCase()}`} element={<AuditLogs />} />

                    <Route path={`/customattributes`} element={<CustomAttributesList />} />
                    <Route path={`/customattributes/list`} element={<Navigate to={`/customattributes`} />} />
                    <Route path={`/customattributes/detail/:id`} element={<CustomAttributesDetail />} />

                    <Route path={`/globalmetadata`} element={<GlobalMetadataList />} />
                    <Route path={`/globalmetadata/list`} element={<Navigate to={`/globalmetadata`} />} />
                    <Route path={`/globalmetadata/detail/:id`} element={<GlobalMetadataDetail />} />

                    <Route path={`/authenticationsettings`} element={<AuthenticationSettings />} />
                    <Route path={`/authenticationsettings/detail/:providerName`} element={<OAuth2ProviderDetail />} />

                    <Route path={`/${Resource.Tokens.toLowerCase()}`} element={<TokenList />} />
                    <Route
                        path={`/${Resource.Tokens.toLowerCase()}/list`}
                        element={<Navigate to={`/${Resource.Tokens.toLowerCase()}`} />}
                    />
                    <Route path={`/${Resource.Tokens.toLowerCase()}/detail/:id`} element={<TokenDetail />} />

                    <Route path={`/${Resource.TokenProfiles.toLowerCase()}`} element={<TokenProfileList />} />
                    <Route
                        path={`/${Resource.TokenProfiles.toLowerCase()}/list`}
                        element={<Navigate to={`/${Resource.TokenProfiles.toLowerCase()}`} />}
                    />
                    <Route path={`/${Resource.TokenProfiles.toLowerCase()}/detail/:tokenId/:id`} element={<TokenProfileDetail />} />

                    <Route path={`/${Resource.Keys.toLowerCase()}`} element={<CryptographicKeyList />} />
                    <Route path={`/${Resource.Keys.toLowerCase()}/list`} element={<Navigate to={`/${Resource.Keys.toLowerCase()}`} />} />

                    <Route path={`/${Resource.Keys.toLowerCase()}/detail/:id/:keyItemUuid?`} element={<CryptographicKeyDetail />} />

                    <Route path={`/${Resource.Secrets.toLowerCase()}`} element={<SecretsList />} />
                    <Route
                        path={`/${Resource.Secrets.toLowerCase()}/list`}
                        element={<Navigate to={`/${Resource.Secrets.toLowerCase()}`} />}
                    />
                    <Route path={`/${Resource.Secrets.toLowerCase()}/detail/:id`} element={<SecretDetail />} />

                    <Route path={`/${Resource.Settings.toLowerCase()}`} element={<PlatformSettingsDetail />} />

                    <Route path={`/${Resource.Jobs.toLowerCase()}`} element={<SchedulerJobsList />} />
                    <Route path={`/${Resource.Jobs.toLowerCase()}/list`} element={<Navigate to={`/${Resource.Jobs.toLowerCase()}`} />} />
                    <Route path={`/${Resource.Jobs.toLowerCase()}/detail/:id`} element={<SchedulerJobDetail />} />

                    <Route path={`/notifications`} element={<NotificationsList />} />
                    <Route path={`/events`} element={<EventsSettings />} />
                    <Route path={`/notificationinstances/detail/:id`} element={<NotificationInstanceDetail />} />

                    <Route path={`/notificationprofiles`} element={<NotificationProfilesList />} />
                    <Route path={`/notificationprofiles/detail/:id/:version`} element={<NotificationProfileDetail />} />

                    <Route path={`/loggingsettings`} element={<LoggingSettings />} />

                    <Route path={`/conditions/detail/:id`} element={<ConditionDetails />} />

                    <Route path={`/rules/:tabIndex?`} element={<RulesList />} />
                    <Route path={`/rules/detail/:id`} element={<RuleDetails />} />

                    <Route path={`/executions/add`} element={<ExecutionForm />} />
                    <Route path={`/executions/detail/:id`} element={<ExecutionDetails />} />

                    <Route path={`/actions/:tabIndex?`} element={<ActionsList />} />
                    <Route path={`/actions/detail/:id`} element={<ActionDetails />} />

                    <Route path={`/triggers`} element={<TriggerList />} />
                    <Route path={`/triggers/detail/:id`} element={<TriggerDetails />} />

                    <Route path={`/approvals`} element={<ApprovalsList />} />
                    <Route path={'/custom-oids'} element={<CustomOIDList />} />
                    <Route path={'/custom-oids/detail/:id'} element={<CustomOIDDetail />} />

                    {isTrustedCertificatesEnabled && (
                        <>
                            <Route path={`/${Resource.TrustedCertificates.toLowerCase()}`} element={<TrustedCertificatesList />} />
                            <Route
                                path={`/${Resource.TrustedCertificates.toLowerCase()}/detail/:id`}
                                element={<TrustedCertificateDetail />}
                            />
                        </>
                    )}

                    <Route path={`/${Resource.Cboms.toLowerCase()}`} element={<CbomsList />} />
                    <Route path={`/${Resource.Cboms.toLowerCase()}/detail/:id`} element={<CbomDetail />} />
                    <Route path={`/${Resource.Cboms.toLowerCase()}/detail/:id/versions/:versionId?`} element={<CbomVersionsHistory />} />
                </Route>

                {/*
               Please keep this remarked until migration is finished
               <Route path="*" element={<Navigate to={`/home`/>}/>
               */}
                <Route path="*" element={<h1>404</h1>} />
            </>
        ),
        [isProxiesEnabled, isTrustedCertificatesEnabled],
    );

    return (
        <HashRouter>
            <AppRedirect />

            <Suspense fallback={<RouteFallback />}>
                <Routes>
                    <Route path="/login" element={<Login />} />
                    {profile ? appRoutes : <Route path="*" element={<Spinner size="xl" />} />}
                </Routes>
            </Suspense>
        </HashRouter>
    );
}
