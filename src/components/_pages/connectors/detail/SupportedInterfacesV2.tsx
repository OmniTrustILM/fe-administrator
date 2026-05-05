import Container from 'components/Container';
import CustomTable, { type TableDataRow, type TableHeader } from 'components/CustomTable';
import Widget from 'components/Widget';
import Badge from 'components/Badge';

type Props = Readonly<{
    interfaces?: any[];
    isBusy: boolean;
}>;

export default function SupportedInterfacesV2({ interfaces, isBusy }: Props) {
    const rows: TableDataRow[] = (interfaces || []).map((iface: any) => {
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
                <Badge color="primary">{toTitleCase(String(iface.code))}</Badge>,
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
