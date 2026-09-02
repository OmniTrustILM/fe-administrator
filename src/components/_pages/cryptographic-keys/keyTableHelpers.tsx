import { Link } from 'react-router';
import Badge from 'components/Badge';
import type { CellRegistry } from 'components/CustomTable/columns';
import MultiValueCell from 'components/CustomTable/columns/MultiValueCell';
import type { CryptographicKeyResponseModel } from 'types/cryptographic-keys';
import type { EnumItemModel } from 'types/enums';
import { FilterFieldSource, FilterFieldType } from 'types/openapi';
import type { ColumnDefinition } from 'types/tableColumns';
import type { ListCellValue } from 'utils/attributes/listCellValues';
import KeyStateCircle from './KeyStateCircle';
import KeyStatusCircle from './KeyStatusCircle';

type PlatformEnumMap = { [key: string]: EnumItemModel } | undefined;

export interface BuildKeyRowColumnsOpts {
    keyTypeEnum: PlatformEnumMap;
    keyUsageEnum: PlatformEnumMap;
    getEnumLabel: (enumMap: PlatformEnumMap, key: string) => string;
    dateFormatter: (date: string | Date) => string;
}

/**
 * The platform default column set for the cryptographic keys inventory.
 *
 * Three of these are not in the filter-field catalogue today — `CKI_ENABLED`, `CKI_CREATED` and
 * `CK_ASSOCIATIONS` have no `FilterField` entry — so they are shown by the default set but cannot
 * be picked, renamed or sorted until the catalogue carries them. They keep their natural
 * identifiers here so that adding the fields is the only change needed.
 */
export const KEY_COLUMNS: ColumnDefinition[] = [
    {
        fieldSource: FilterFieldSource.Property,
        fieldIdentifier: 'CKI_ENABLED',
        catalogueLabel: 'Status',
        type: FilterFieldType.Boolean,
        align: 'center',
    },
    {
        fieldSource: FilterFieldSource.Property,
        fieldIdentifier: 'CKI_STATE',
        catalogueLabel: 'State',
        type: FilterFieldType.List,
        align: 'center',
    },
    { fieldSource: FilterFieldSource.Property, fieldIdentifier: 'CKI_NAME', catalogueLabel: 'Name', type: FilterFieldType.String },
    { fieldSource: FilterFieldSource.Property, fieldIdentifier: 'CKI_TYPE', catalogueLabel: 'Type', type: FilterFieldType.List },
    {
        fieldSource: FilterFieldSource.Property,
        fieldIdentifier: 'CKI_CRYPTOGRAPHIC_ALGORITHM',
        catalogueLabel: 'Algorithm',
        type: FilterFieldType.List,
        align: 'center',
    },
    { fieldSource: FilterFieldSource.Property, fieldIdentifier: 'CKI_LENGTH', catalogueLabel: 'Size', type: FilterFieldType.Number },
    {
        fieldSource: FilterFieldSource.Property,
        fieldIdentifier: 'CKI_FORMAT',
        catalogueLabel: 'Format',
        type: FilterFieldType.List,
        align: 'center',
    },
    {
        fieldSource: FilterFieldSource.Property,
        fieldIdentifier: 'CKI_CREATED',
        catalogueLabel: 'Creation Date',
        type: FilterFieldType.Datetime,
        align: 'center',
    },
    {
        fieldSource: FilterFieldSource.Property,
        fieldIdentifier: 'CK_GROUP',
        catalogueLabel: 'Group',
        type: FilterFieldType.List,
        align: 'center',
    },
    {
        fieldSource: FilterFieldSource.Property,
        fieldIdentifier: 'CK_OWNER',
        catalogueLabel: 'Owner',
        type: FilterFieldType.List,
        align: 'center',
    },
    {
        fieldSource: FilterFieldSource.Property,
        fieldIdentifier: 'CK_TOKEN_PROFILE',
        catalogueLabel: 'Token Profile',
        type: FilterFieldType.List,
        align: 'center',
    },
    {
        fieldSource: FilterFieldSource.Property,
        fieldIdentifier: 'CK_TOKEN_INSTANCE',
        catalogueLabel: 'Token Instance',
        type: FilterFieldType.List,
        align: 'center',
    },
    {
        fieldSource: FilterFieldSource.Property,
        fieldIdentifier: 'CK_ASSOCIATIONS',
        catalogueLabel: 'Associations',
        type: FilterFieldType.Number,
        align: 'center',
    },
];

function buildGroupValues(item: CryptographicKeyResponseModel): ListCellValue[] {
    return (item.groups ?? []).map((group) => ({ label: group.name, link: { resource: 'groups', uuid: group.uuid } }));
}

/**
 * Cell renderers for the key property columns that are rich today. Anything not registered here
 * falls through to the attribute renderer, which is how a custom or metadata column renders without
 * this file knowing about it.
 */
export function buildKeyCellRegistry({
    keyTypeEnum,
    keyUsageEnum,
    getEnumLabel,
    dateFormatter,
}: BuildKeyRowColumnsOpts): CellRegistry<CryptographicKeyResponseModel> {
    return {
        'property:CKI_ENABLED': (item) => <KeyStatusCircle status={item.enabled} />,
        'property:CKI_STATE': (item) => <KeyStateCircle state={item.state} />,
        'property:CKI_NAME': (item) => (
            <span className="whitespace-nowrap">
                <Link to={`./detail/${item.keyWrapperUuid}/${item.uuid}`}>{item.name}</Link>
            </span>
        ),
        'property:CKI_TYPE': (item) => (item.type ? <Badge color="secondary">{getEnumLabel(keyTypeEnum, item.type)}</Badge> : null),
        'property:CKI_CRYPTOGRAPHIC_ALGORITHM': (item) => item.keyAlgorithm,
        // An unset size or format resolves to the shared empty state.
        'property:CKI_LENGTH': (item) => item.length?.toString(),
        'property:CKI_FORMAT': (item) => item.format,
        'property:CKI_CREATED': (item) =>
            item.creationTime ? <span className="whitespace-nowrap">{dateFormatter(item.creationTime)}</span> : null,
        'property:CK_GROUP': (item) => {
            const groups = buildGroupValues(item);
            return groups.length > 0 ? <MultiValueCell values={groups} dataTestId="cell-key-groups" /> : null;
        },
        'property:CK_OWNER': (item) => {
            if (!item.owner) return null;
            return item.ownerUuid ? <Link to={`../users/detail/${item.ownerUuid}`}>{item.owner}</Link> : item.owner;
        },
        'property:CK_TOKEN_PROFILE': (item) =>
            item.tokenProfileName ? (
                <Link to={`../tokenprofiles/detail/${item.tokenInstanceUuid}/${item.tokenProfileUuid}`}>{item.tokenProfileName}</Link>
            ) : null,
        'property:CK_TOKEN_INSTANCE': (item) =>
            item.tokenInstanceName ? <Link to={`../tokens/detail/${item.tokenInstanceUuid}`}>{item.tokenInstanceName}</Link> : null,
        'property:CK_ASSOCIATIONS': (item) => item.associations?.toString(),
        // Beyond the default set: catalogued and renderable, so the picker offers it. Multi-valued, so
        // it reads like the groups column rather than as a joined string.
        'property:CKI_USAGE': (item) => {
            const usages = (item.usage ?? []).map((usage) => ({ label: getEnumLabel(keyUsageEnum, usage) }));
            return usages.length > 0 ? <MultiValueCell values={usages} dataTestId="cell-key-usage" /> : null;
        },
    };
}
