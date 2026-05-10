import type { TableHeader } from 'components/CustomTable';
import { auditLogsTypeMapping } from './mapping';
import { getEnumLabel } from 'ducks/enums';
import { Link } from 'react-router';
import Button from 'components/Button';
import type { EnumItemDto } from 'types/enums';
import type { AuditLogDto } from 'types/openapi';
import { dateFormatter } from 'utils/dateUtil';
import { ArrowRightCircle, Info } from 'lucide-react';

/** Shared small renderer used by both actor/resource to avoid duplicate blocks */
const renderTypeWithOptionalNav = (
    typeLabel: string,
    opts: {
        name?: string;
        uuid?: string;
        path?: string; // full relative path to details, if navigable
        navigate?: (path: string) => void;
        buttonTitle?: string;
    } = {},
) => {
    const { name, uuid, path, navigate, buttonTitle } = opts;

    let additional: React.ReactNode | string = '';

    if (path && uuid) {
        if (name) {
            additional = <Link to={path}> {name}</Link>;
        } else {
            additional = (
                <Button title={buttonTitle ?? 'Go to details'} variant="transparent" onClick={() => navigate?.(path)}>
                    {' '}
                    <ArrowRightCircle size={16} />
                </Button>
            );
        }
    } else if (name && !uuid) {
        additional = <span style={{ marginLeft: '5px' }}>{name}</span>;
    }

    return (
        <span style={{ whiteSpace: 'nowrap' }}>
            {typeLabel}
            {additional}
        </span>
    );
};

/** Helper to render the list of (affiliated) resource objects without duplication */
const renderObjectList = (
    source: AuditLogDto['resource'] | AuditLogDto['affiliatedResource'],
    onLinkClick: () => void,
    keyPrefix: string,
) =>
    source?.objects?.map((object, index) => {
        const mappingType = source?.type ? auditLogsTypeMapping[source.type] : undefined;

        const element =
            object.uuid && mappingType ? (
                <Link onClick={onLinkClick} key={`${object.uuid}-${keyPrefix}-link`} to={`../${mappingType}/detail/${object.uuid}`}>
                    {object.name ?? object.uuid ?? ''}
                </Link>
            ) : (
                <span key={`${object.uuid}-${keyPrefix}-span`}>
                    {object.name ?? ''} {object.uuid ? `(${object.uuid})` : ''}
                </span>
            );

        return (
            <span key={`${object.uuid}-${keyPrefix}-wrapper`}>
                {index > 0 && ', '}
                {element}
            </span>
        );
    });

export const createAuditLogDetailData = (
    auditLog: AuditLogDto,
    resourceEnum: {
        [key: string]: EnumItemDto;
    },
    onLinkClick: () => void,
) => {
    return [
        {
            property: 'Timestamp',
            propertyValue: auditLog.timestamp,
        },
        {
            property: 'Logged at',
            propertyValue: auditLog.loggedAt,
        },
        {
            property: 'Resource',
            propertyValue: getEnumLabel(resourceEnum, auditLog.resource.type),
        },
        {
            property: 'Resource objects',
            propertyValue: renderObjectList(auditLog.resource, onLinkClick, 'resource'),
        },
        {
            property: 'Affiliated resource objects',
            propertyValue: renderObjectList(auditLog.affiliatedResource, onLinkClick, 'affiliated'),
        },
        {
            property: 'Affiliated resource',
            propertyValue: auditLog.affiliatedResource ? getEnumLabel(resourceEnum, auditLog.affiliatedResource.type) : '',
        },
        {
            property: 'Request method',
            propertyValue: auditLog.source?.method ?? '',
        },
        {
            property: 'Request path',
            propertyValue: auditLog.source?.path ?? '',
        },
        {
            property: 'Request IP address',
            propertyValue: auditLog.source?.ipAddress ?? '',
        },
        {
            property: 'Message',
            propertyValue: auditLog.message ?? '',
        },
        {
            property: 'Operation data',
            propertyValue: JSON.stringify(auditLog.operationData, null, 3),
        },
        {
            property: 'Additional data',
            propertyValue: JSON.stringify(auditLog.additionalData, null, 3),
        },
    ];
};

const renderActor = (actor: AuditLogDto['actor'], actorEnum: Record<string, EnumItemDto>, navigate: (path: string) => void) => {
    const typeLabel = getEnumLabel(actorEnum, actor.type);
    const path = actor.uuid ? `../users/detail/${actor.uuid}` : undefined;

    return renderTypeWithOptionalNav(typeLabel, {
        name: actor.name,
        uuid: actor.uuid,
        path,
        navigate,
    });
};

const renderResource = (
    resource: AuditLogDto['resource'] | AuditLogDto['affiliatedResource'],
    resourceEnum: Record<string, EnumItemDto>,
    navigate: (path: string) => void,
) => {
    if (!resource) return <span style={{ whiteSpace: 'nowrap' }} />;

    const typeLabel = getEnumLabel(resourceEnum, resource.type);
    const obj = resource.objects?.[0];

    const mappingType = obj?.uuid ? auditLogsTypeMapping[resource.type] : undefined;
    const path = mappingType && obj?.uuid ? `../${mappingType}/detail/${obj.uuid}` : undefined;

    return renderTypeWithOptionalNav(typeLabel, {
        name: obj?.name,
        uuid: obj?.uuid,
        path,
        navigate,
        buttonTitle: 'Go to details',
    });
};

type EnumMap = { [key: string]: EnumItemDto };

type AuditLogEnums = {
    resource: EnumMap;
    module: EnumMap;
    actor: EnumMap;
    authMethod: EnumMap;
    operation: EnumMap;
    operationResult: EnumMap;
};

export const createAuditLogsList = (
    auditLogs: AuditLogDto[],
    enums: AuditLogEnums,
    navigate: (path: string) => void,
    onInfoClick: (log: AuditLogDto) => void,
) => {
    const {
        resource: resourceEnum,
        module: moduleEnum,
        actor: actorEnum,
        authMethod: authMethodEnum,
        operation: operationEnum,
        operationResult: operationResultEnum,
    } = enums;
    if (auditLogs.length === 0) {
        return [];
    }
    return auditLogs.map((log) => ({
        id: log.id,
        columns: [
            '' + log.id,
            <span key={`${log.id}-timestamp`} style={{ whiteSpace: 'nowrap' }}>
                {dateFormatter(log.timestamp)}
            </span>,
            getEnumLabel(moduleEnum, log.module),
            renderActor(log.actor, actorEnum, navigate),
            getEnumLabel(authMethodEnum, log.actor.authMethod),
            renderResource(log.resource, resourceEnum, navigate),
            renderResource(log.affiliatedResource, resourceEnum, navigate),
            getEnumLabel(operationEnum, log.operation),
            getEnumLabel(operationResultEnum, log.operationResult),
            <Button key={`${log.id}-info-button`} variant="transparent" title="Detail" onClick={() => onInfoClick(log)} className="!p-1">
                <Info size={14} />
            </Button>,
        ],
    }));
};

/** Small helper to avoid duplicated object literals */
const hdr = (content: string, id: string, width?: string, align: 'left' | 'center' | 'right' = 'left'): TableHeader => ({
    content,
    id,
    width,
    align,
});

export const auditLogsRowHeaders: TableHeader[] = [
    hdr('Id', 'id', '5%'),
    hdr('Timestamp', 'timestamp', '5%'),
    hdr('Module', 'module', '5%'),
    hdr('Actor', 'actor', '10%'),
    hdr('Auth method', 'authMethod', '5%'),
    hdr('Resource', 'resource', '10%'),
    hdr('Affiliated resource', 'affiliatedResource', '10%'),
    hdr('Operation', 'operation', '5%', 'center'),
    hdr('Operation result', 'operationResult', '5%', 'center'),
    hdr('', 'moreInfo', '2%'),
];

export const auditLogsDetailRowHeaders: TableHeader[] = [hdr('Property', 'property', '25%'), hdr('Value', 'value')];
