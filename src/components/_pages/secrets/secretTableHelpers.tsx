import { Fragment } from 'react';
import { Link } from 'react-router';
import Badge from 'components/Badge';
import type { CellRegistry } from 'components/CustomTable/columns';
import CertificateStatus from 'components/_pages/certificates/CertificateStatus';
import type { EnumItemModel } from 'types/enums';
import { ComplianceStatus, FilterFieldSource, FilterFieldType, Resource, type SecretDto, type VaultProfileDto } from 'types/openapi';
import type { ColumnDefinition } from 'types/tableColumns';
import SecretStateBadge from './SecretStateBadge';

type PlatformEnumMap = { [key: string]: EnumItemModel } | undefined;

export interface BuildSecretCellsOpts {
    secretTypeEnum: PlatformEnumMap;
    secretStateEnum: PlatformEnumMap;
    getEnumLabel: (enumMap: PlatformEnumMap, key: string) => string;
    vaultProfiles: VaultProfileDto[];
}

/**
 * The platform default column set for the secrets inventory.
 *
 * `SECRET_VERSION` is not in the filter-field catalogue, so it is display-only — shown here, not sortable, and dropped
 * on write by `toStorableColumns`. It keeps a natural identifier, so cataloguing it in Core and removing its
 * `displayOnly` flag is all a change needs.
 */
export const SECRET_COLUMNS: ColumnDefinition[] = [
    { fieldSource: FilterFieldSource.Property, fieldIdentifier: 'SECRET_NAME', catalogueLabel: 'Name', type: FilterFieldType.String },
    { fieldSource: FilterFieldSource.Property, fieldIdentifier: 'SECRET_TYPE', catalogueLabel: 'Type', type: FilterFieldType.List },
    {
        fieldSource: FilterFieldSource.Property,
        fieldIdentifier: 'SECRET_STATE',
        catalogueLabel: 'State',
        type: FilterFieldType.List,
        align: 'center',
    },
    {
        fieldSource: FilterFieldSource.Property,
        fieldIdentifier: 'SECRET_COMPLIANCE_STATUS',
        catalogueLabel: 'Compliance Status',
        label: 'Compliance',
        type: FilterFieldType.List,
        align: 'center',
    },
    {
        fieldSource: FilterFieldSource.Property,
        fieldIdentifier: 'SECRET_SOURCE_VAULT_PROFILE',
        catalogueLabel: 'Source Vault Profile',
        label: 'Vault Profile',
        type: FilterFieldType.List,
    },
    {
        fieldSource: FilterFieldSource.Property,
        fieldIdentifier: 'SECRET_VERSION',
        catalogueLabel: 'Version',
        align: 'center',
        displayOnly: true,
    },
    { fieldSource: FilterFieldSource.Property, fieldIdentifier: 'SECRET_OWNER', catalogueLabel: 'Owner', type: FilterFieldType.List },
    { fieldSource: FilterFieldSource.Property, fieldIdentifier: 'SECRET_GROUP_NAME', catalogueLabel: 'Groups', type: FilterFieldType.List },
    {
        fieldSource: FilterFieldSource.Property,
        fieldIdentifier: 'SECRET_ENABLED',
        catalogueLabel: 'Enabled',
        label: 'Status',
        type: FilterFieldType.Boolean,
        align: 'center',
    },
];

/**
 * `SECRET_SYNC_VAULT_PROFILE` is catalogued but absent from `SecretDto`, so no renderer is registered and the picker
 * does not offer it.
 */
export function buildSecretCellRegistry({
    secretTypeEnum,
    secretStateEnum,
    getEnumLabel,
    vaultProfiles,
}: BuildSecretCellsOpts): CellRegistry<SecretDto> {
    return {
        'property:SECRET_NAME': (secret) => (
            <span className="whitespace-nowrap">
                <Link to={`./detail/${secret.uuid}`}>{secret.name}</Link>
            </span>
        ),
        'property:SECRET_TYPE': (secret) => getEnumLabel(secretTypeEnum, secret.type),
        'property:SECRET_STATE': (secret) => (
            <SecretStateBadge state={secret.state}>{getEnumLabel(secretStateEnum, secret.state)}</SecretStateBadge>
        ),
        'property:SECRET_COMPLIANCE_STATUS': (secret) => (
            <CertificateStatus status={secret.complianceStatus || ComplianceStatus.Na} asIcon={true} />
        ),
        'property:SECRET_SOURCE_VAULT_PROFILE': (secret) => {
            if (!secret.sourceVaultProfile) return null;
            // The link needs the vault instance the profile belongs to, which the listing does not carry.
            const vaultUuid = vaultProfiles.find((profile) => profile.uuid === secret.sourceVaultProfile?.uuid)?.vaultInstance?.uuid;
            return vaultUuid ? (
                <Link to={`/${Resource.VaultProfiles.toLowerCase()}/detail/${vaultUuid}/${secret.sourceVaultProfile.uuid}`}>
                    {secret.sourceVaultProfile.name}
                </Link>
            ) : (
                secret.sourceVaultProfile.name
            );
        },
        'property:SECRET_VERSION': (secret) => secret.version?.toString(),
        'property:SECRET_OWNER': (secret) =>
            secret.owner ? <Link to={`../users/detail/${secret.owner.uuid}`}>{secret.owner.name}</Link> : 'Unassigned',
        'property:SECRET_GROUP_NAME': (secret) =>
            secret.groups && secret.groups.length > 0
                ? secret.groups.map((group, index) => (
                      <Fragment key={group.uuid}>
                          <Link to={`../groups/detail/${group.uuid}`}>{group.name}</Link>
                          {index !== (secret.groups?.length ?? 0) - 1 ? ', ' : ''}
                      </Fragment>
                  ))
                : 'Unassigned',
        'property:SECRET_ENABLED': (secret) => (
            <Badge color={secret.enabled ? 'success' : 'danger'}>{secret.enabled ? 'Enabled' : 'Disabled'}</Badge>
        ),
    };
}
