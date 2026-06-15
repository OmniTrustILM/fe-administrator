import CredentialForm from 'components/_pages/credentials/form';
import type { CustomNode, LegendItem } from 'components/FlowChart';
import type { Edge } from 'reactflow';
import { AttributeContentType } from 'types/openapi';
import type { ModalIcon, ModalSize } from 'components/Dialog';

export enum LockTypeEnum {
    GENERIC,
    NETWORK,
    PERMISSION,
    CLIENT,
    SERVICE_ERROR,
    SERVER_ERROR,
}

export const ErrorCodeTexteMap = {
    ACCESS_DENIED: 'Access Denied',
    ENTITY_NOT_FOUND: 'Not Found',
    ENTITY_NOT_UNIQUE: 'Not Unique',
    INVALID_ACTION: 'Invalid Action',
    INVALID_FORMAT: 'Invalid Format',
    UNAUTHORIZED: 'Unauthorized',
    INTERNAL_SERVER_ERROR: 'Internal Server Error',
    NOT_IMPLEMENTED: 'Not Implemented',
    BAD_REQUEST: 'Bad Request',
    NOT_FOUND: 'Not Found',
};

export const ErrorCodeDetailMap = {
    ACCESS_DENIED: 'Please contact your admin to get access',
};
export enum LockWidgetNameEnum {
    ConnectorAttributes,
    NotificationStore,
    ApprovalProfileDetails,
    AuthenticationProviderDetails,
    AuthenticationSettings,
    ListOfApprovals,
    ListOfApprovalProfiles,
    ListOfCertificates,
    CertificateDetailsWidget,
    CertificateEventHistory,
    CertificationLocations,
    ListOfKeys,
    keyDetails,
    DiscoveriesStore,
    DiscoveryDetails,
    ConnectorStore,
    ConnectorDetails,
    ListOfUsers,
    UserDetails,
    ListOfRoles,
    RoleDetails,
    ListOfRAProfiles,
    RaProfileDetails,
    ListOfTokenProfiles,
    TokenProfileDetails,
    ListOfComplianceProfiles,
    ComplianceProfileDetails,
    RaProfileComplianceDetails,
    CredentialStore,
    CredentialDetails,
    AuthorityStore,
    CertificationAuthorityDetails,
    TokenStore,
    TokenDetails,
    ListOfGroups,
    GroupDetails,
    EntityStore,
    EntityDetails,
    LocationsStore,
    LocationDetails,
    ListOfACMEAccounts,
    ACMEAccountDetails,
    ListOfACMEProfiles,
    ListOfCMPProfiles,
    ACMEProfileDetails,
    CMPProfileDetails,
    ListOfSCEPProfiles,
    SCEPProfileDetails,
    PlatformSettings,
    LoggingSettings,
    ListOfNotificationProfiles,
    NotificationProfileDetails,
    ListOfCustomAttributes,
    CustomAttributeDetails,
    ListOfGlobalMetadata,
    GlobalMetadataDetails,
    AuditLogs,
    ListOfScheduler,
    ListOfSchedulerHistory,
    SchedulerJobDetail,
    ListOfNotifications,
    NotificationsOverview,
    CustomAttributeWidget,
    EventSettings,
    ComplianceProfileAssociations,
    ListOfAvailableRulesAndGroups,
    ListOfCboms,
    CbomDetail,
    CbomVersions,
    ListOfSigningRecords,
    SigningRecordDetail,
    ProxyStore,
    ProxyDetails,
    ListOfSecrets,
    SecretDetailsWidget,
    ListOfVaults,
    ListOfVaultProfiles,
    VaultDetails,
    VaultProfileDetails,
    ListOfTrustedCertificates,
    TrustedCertificateDetails,
    ListOfTimeQualityConfigurations,
    TimeQualityConfigurationDetails,
    ListOfTspProfiles,
    TspProfileDetails,
}

export interface WidgetLockModel {
    widgetName: LockWidgetNameEnum;
    lockTitle: string;
    lockText: string;
    lockDetails?: string;
    lockType: LockTypeEnum;
}

export interface WidgetLockErrorModel {
    lockTitle: string;
    lockText: string;
    lockDetails?: string;
    lockType: LockTypeEnum;
}

export interface GlobalModalModel {
    title?: string;
    size?: ModalSize;
    content: string | React.ReactNode | undefined;
    type?: 'success' | 'error' | 'warning' | 'info' | 'confirm' | 'question';
    isOpen: boolean;
    showCancelButton?: boolean;
    showOkButton?: boolean;
    showCloseButton?: boolean;
    showSubmitButton?: boolean;
    okButtonCallback?: () => void;
    cancelButtonCallback?: () => void;
    icon?: ModalIcon;
}

export interface AddNewAttributeType {
    name: string;
    contentType: AttributeContentType;
    content: React.ReactNode;
}

export interface ReactFlowUI {
    flowChartNodes: CustomNode[];
    flowChartEdges: Edge[];
    flowDirection?: 'TB' | 'BT' | 'LR' | 'RL' | 'STAR';
    legends?: LegendItem[];
    expandedHiddenNodeId?: string;
}

export const AddNewAttributeList: AddNewAttributeType[] = [
    {
        name: 'Credential',
        contentType: AttributeContentType.Credential,
        content: <CredentialForm usesGlobalModal />,
    },
];
