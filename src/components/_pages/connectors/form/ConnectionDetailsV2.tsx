import { useMemo } from 'react';

import CustomTable, { type TableDataRow, type TableHeader } from 'components/CustomTable';
import Badge from 'components/Badge';

type Props = Readonly<{
    connectInfo?: any[];
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

const v2InterfacesHeaders: TableHeader[] = [
    {
        id: 'interface',
        content: 'Interfaces',
    },
    {
        id: 'version',
        content: 'Ver.',
    },
    {
        id: 'features',
        content: 'Features',
    },
];

export default function ConnectionDetailsV2({ connectInfo, errorMessage }: Props) {
    const v2ConnectInfo = useMemo(
        () => (connectInfo || []).filter((info: any) => Array.isArray(info.interfaces) || info.connector),
        [connectInfo],
    );

    const v2PrimaryInfo = v2ConnectInfo[0];
    const v2Connector = v2PrimaryInfo?.connector;

    const v2ConnectionDetailsData: TableDataRow[] = useMemo(() => {
        if (!v2Connector) return [];

        const metadata = v2Connector.metadata as Record<string, unknown> | undefined;
        const metadataString = metadata
            ? Object.entries(metadata)
                  .map(([key, value]) => `${key}:${String(value)}`)
                  .join(' ')
            : '';

        const rows: TableDataRow[] = [
            {
                id: 'name',
                columns: ['Name', v2Connector.name],
            },
            {
                id: 'id',
                columns: ['ID', v2Connector.id],
            },
            {
                id: 'version',
                columns: ['Version', v2Connector.version],
            },
        ];

        if (v2Connector.description) {
            rows.push({
                id: 'description',
                columns: ['Description', v2Connector.description],
            });
        }

        if (metadataString) {
            rows.push({
                id: 'metadata',
                columns: ['Metadata', metadataString],
            });
        }

        return rows;
    }, [v2Connector]);

    const v2InterfacesData: TableDataRow[] = useMemo(() => {
        if (!v2PrimaryInfo || !Array.isArray(v2PrimaryInfo.interfaces)) return [];

        const toTitleCase = (value: string) => value.charAt(0).toUpperCase() + value.slice(1);

        const formatFeatureLabel = (feature: string) => {
            switch (feature) {
                case 'stateless':
                    return 'Stateless';
                case 'openMetrics':
                    return 'OpenMetrics';
                case 'secretVersioning':
                    return 'Secret Versioning';
                case 'secretRotation':
                    return 'Secret Rotation';
                default:
                    return toTitleCase(feature);
            }
        };

        return v2PrimaryInfo.interfaces.map((iface: any) => ({
            id: `${iface.code}-${iface.version}`,
            columns: [
                toTitleCase(String(iface.code)),
                iface.version,
                iface.features?.length ? (
                    <div key={iface.code} className="flex flex-wrap gap-2">
                        {iface.features.map((feature: string) => (
                            <Badge key={feature} color="secondary">
                                {formatFeatureLabel(feature)}
                            </Badge>
                        ))}
                    </div>
                ) : (
                    '—'
                ),
            ],
        }));
    }, [v2PrimaryInfo]);

    if (!v2Connector && (!v2PrimaryInfo || !Array.isArray(v2PrimaryInfo?.interfaces))) {
        return <div className="text-sm text-gray-500">No v2 connection details available.</div>;
    }

    return (
        <>
            {v2ConnectionDetailsData.length > 0 && <CustomTable headers={connectionDetailsHeaders} data={v2ConnectionDetailsData} />}

            {v2InterfacesData.length > 0 && (
                <div className="mt-6 space-y-2">
                    <div className="text-sm font-medium">Interfaces</div>
                    <CustomTable headers={v2InterfacesHeaders} data={v2InterfacesData} />
                </div>
            )}

            {errorMessage && (
                <p className="mt-2 text-sm text-red-600" data-testid="connector-version-error">
                    {errorMessage}
                </p>
            )}
        </>
    );
}
