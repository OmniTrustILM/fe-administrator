import { useCallback, useMemo } from 'react';

import CustomTable, { type TableDataRow, type TableHeader } from 'components/CustomTable';
import Widget from 'components/Widget';
import Badge from 'components/Badge';

import { ConnectorStatus, ConnectorVersion } from 'types/openapi';
import { attributeFieldNameTransform } from 'utils/attributes/attributes';

import InventoryStatusBadge from '../ConnectorStatus';

type EndpointInfo = {
    name?: string;
    context?: string;
    method?: string;
};

type FunctionGroupInfo = {
    name?: string;
    endPoints?: EndpointInfo[];
};

type ConnectionDetailV1Info = {
    version?: ConnectorVersion | string;
    functionGroups?: FunctionGroupInfo[];
};

type Props = Readonly<{
    url?: string;
    connectionDetails?: ConnectionDetailV1Info[];
    errorMessage?: string;
}>;

const connectionDetailsHeaders: TableHeader[] = [
    {
        id: 'property',
        content: 'Property',
    },
    {
        id: 'value',
        content: 'Value',
    },
];

const endPointsHeaders: TableHeader[] = [
    {
        id: 'name',
        sortable: true,
        sort: 'asc',
        content: 'Name',
    },
    {
        id: 'context',
        sortable: true,
        content: 'Context',
    },
    {
        id: 'method',
        sortable: true,
        content: 'Method',
    },
];

export default function ConnectionDetailsV1({ url, connectionDetails, errorMessage }: Props) {
    const v1Info = useMemo(
        () => (connectionDetails || []).find((info) => info?.version === ConnectorVersion.V1 || info?.version === 'v1'),
        [connectionDetails],
    );

    const functionGroups = useMemo<FunctionGroupInfo[]>(() => v1Info?.functionGroups || [], [v1Info]);

    const getEndPointInfo = useCallback((endpoints: EndpointInfo[] | undefined): TableDataRow[] => {
        return (endpoints || []).map((endpoint) => ({
            id: endpoint.name ?? '',
            columns: [endpoint.name, endpoint.context, endpoint.method],
        }));
    }, []);

    const connectionDetailsData: TableDataRow[] = useMemo(
        () => [
            {
                id: 'url',
                columns: ['URL', url],
            },
            {
                id: 'status',
                columns: [
                    'Connector Status',
                    <InventoryStatusBadge
                        key="status"
                        status={functionGroups.length > 0 ? ConnectorStatus.Connected : ConnectorStatus.Failed}
                    />,
                ],
            },
            {
                id: 'functionGroups',
                columns: [
                    'Function Group(s)',
                    <div key="functionGroups" className="flex flex-wrap gap-2">
                        {functionGroups.map((functionGroup) => (
                            <Badge key={functionGroup.name} color="primary">
                                {attributeFieldNameTransform[functionGroup?.name || ''] || functionGroup?.name}
                            </Badge>
                        ))}
                    </div>,
                ],
            },
        ],
        [url, functionGroups],
    );

    const hasConnectionDetails = functionGroups.length > 0;

    return (
        <div data-testid="connection-details-v1">
            <CustomTable headers={connectionDetailsHeaders} data={connectionDetailsData} />

            {hasConnectionDetails && (
                <Widget title="Connector Functionality Description" titleSize="large" noBorder>
                    {functionGroups.map((functionGroup) => (
                        <Widget
                            key={functionGroup.name}
                            title={attributeFieldNameTransform[functionGroup?.name || ''] || functionGroup?.name}
                            titleSize="large"
                        >
                            <CustomTable headers={endPointsHeaders} data={getEndPointInfo(functionGroup?.endPoints)} />
                        </Widget>
                    ))}
                </Widget>
            )}

            {errorMessage && (
                <p className="mt-2 text-sm text-red-600" data-testid="connector-version-error">
                    {errorMessage}
                </p>
            )}
        </div>
    );
}
