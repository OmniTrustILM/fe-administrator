import { useSelector } from 'react-redux';

import Badge from 'components/Badge';
import CustomTable, { type TableDataRow, type TableHeader } from 'components/CustomTable';
import { selectors as enumSelectors, getEnumLabel } from 'ducks/enums';
import type { ConnectorResponseModel } from 'types/connectors';
import { ConnectorVersion, PlatformEnum } from 'types/openapi';

const INTERFACES_HEADERS: TableHeader[] = [
    { id: 'interface', content: 'Interfaces' },
    { id: 'version', content: 'Ver.' },
    { id: 'features', content: 'Features' },
];

const FUNCTION_GROUPS_HEADERS: TableHeader[] = [
    { id: 'functionGroup', content: 'Function Groups' },
    { id: 'kinds', content: 'Kinds' },
];

type Props = Readonly<{
    connector: Pick<ConnectorResponseModel, 'version' | 'interfaces' | 'functionGroups'>;
}>;

export default function ConnectorCapabilitiesMatrix({ connector }: Props) {
    const interfaceEnum = useSelector(enumSelectors.platformEnum(PlatformEnum.ConnectorInterface));
    const featureEnum = useSelector(enumSelectors.platformEnum(PlatformEnum.FeatureFlag));
    const functionGroupEnum = useSelector(enumSelectors.platformEnum(PlatformEnum.FunctionGroupCode));

    if (connector.version === ConnectorVersion.V2) {
        const rows: TableDataRow[] = (connector.interfaces ?? []).map((iface) => ({
            id: iface.uuid,
            columns: [
                <Badge key="code" color="primary">
                    {getEnumLabel(interfaceEnum, iface.code)}
                </Badge>,
                iface.version,
                iface.features?.length ? (
                    <div key="features" className="flex flex-wrap gap-1">
                        {iface.features.map((feature) => (
                            <Badge key={feature} color="secondary">
                                {getEnumLabel(featureEnum, feature)}
                            </Badge>
                        ))}
                    </div>
                ) : (
                    '—'
                ),
            ],
        }));

        return <CustomTable headers={INTERFACES_HEADERS} data={rows} />;
    }

    const rows: TableDataRow[] = (connector.functionGroups ?? []).map((group) => ({
        id: group.uuid,
        columns: [
            <Badge key="code" color="primary">
                {getEnumLabel(functionGroupEnum, group.functionGroupCode ?? group.name)}
            </Badge>,
            group.kinds?.length ? (
                <div key="kinds" className="flex flex-wrap gap-1">
                    {group.kinds.map((kind) => (
                        <Badge key={kind} color="secondary">
                            {kind}
                        </Badge>
                    ))}
                </div>
            ) : (
                '—'
            ),
        ],
    }));

    return <CustomTable headers={FUNCTION_GROUPS_HEADERS} data={rows} />;
}
