import Container from 'components/Container';
import CustomTable, { type TableDataRow, type TableHeader } from 'components/CustomTable';
import Widget from 'components/Widget';
import Badge from 'components/Badge';
import type { ConnectorInterfaceDto } from 'types/openapi';

type Props = Readonly<{
    interfaces?: ConnectorInterfaceDto[];
    isBusy: boolean;
}>;

export default function SupportedInterfacesV2({ interfaces, isBusy }: Props) {
    const rows: TableDataRow[] = (interfaces || []).map((iface) => {
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

        return {
            id: `${iface.code}-${iface.version}`,
            columns: [
                <Badge key="code" color="primary">
                    {toTitleCase(String(iface.code))}
                </Badge>,
                iface.version,
                iface.features?.length ? (
                    <div key={iface.code} className="flex flex-wrap gap-2">
                        {iface.features.map((feature) => (
                            <Badge key={feature} color="secondary">
                                {formatFeatureLabel(feature)}
                            </Badge>
                        ))}
                    </div>
                ) : (
                    '—'
                ),
            ],
        };
    });

    const headers: TableHeader[] = [
        { id: 'interface', content: 'Interfaces' },
        { id: 'version', content: 'Ver.' },
        { id: 'features', content: 'Features' },
    ];

    return (
        <Container marginTop>
            <Widget title="Supported Interfaces" busy={isBusy} titleSize="large">
                <CustomTable headers={headers} data={rows} />
            </Widget>
        </Container>
    );
}
