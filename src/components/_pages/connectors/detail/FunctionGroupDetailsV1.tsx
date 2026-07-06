import { useMemo } from 'react';

import Select from 'components/Select';
import { EnumColumnDescription } from 'components/EnumDescription';
import Container from 'components/Container';
import CustomTable, { type TableDataRow, type TableHeader } from 'components/CustomTable';
import Widget from 'components/Widget';
import AttributeDescriptorViewer from 'components/Attributes/AttributeDescriptorViewer';
import { LockWidgetNameEnum } from 'types/user-interface';
import type { AttributeDescriptorModel } from 'types/attributes';
import type { FunctionGroupModel } from 'types/connectors';
import { useSelector } from 'react-redux';
import { selectors as enumSelectors, getEnumLabel } from 'ducks/enums';
import { PlatformEnum } from 'types/openapi';
import { attributeFieldNameTransform } from 'utils/attributes/attributes';

type Props = Readonly<{
    functionGroups: FunctionGroupModel[];
    currentFunctionGroup?: FunctionGroupModel;
    currentFunctionGroupKind?: string;
    currentFunctionGroupKindAttributes?: AttributeDescriptorModel[];
    isFetchingDetail: boolean;
    isReconnecting: boolean;
    isFetchingAllAttributes: boolean;
    onFunctionGroupChange: (value: string) => void;
    onFunctionGroupKindChange: (value: string) => void;
    getFreshConnectorAttributesDesc: () => void;
}>;

export default function FunctionGroupDetailsV1({
    functionGroups,
    currentFunctionGroup,
    currentFunctionGroupKind,
    currentFunctionGroupKindAttributes,
    isFetchingDetail,
    isReconnecting,
    isFetchingAllAttributes,
    onFunctionGroupChange,
    onFunctionGroupKindChange,
    getFreshConnectorAttributesDesc,
}: Props) {
    const functionGroupCodeEnum = useSelector(enumSelectors.platformEnum(PlatformEnum.FunctionGroupCode));

    const functionGroupSelectData = useMemo(
        () =>
            functionGroups.map((group) => ({
                label: attributeFieldNameTransform[group?.name || ''] || group?.name,
                value: group.functionGroupCode,
            })),
        [functionGroups],
    );

    const functionGroupKinds =
        currentFunctionGroup?.kinds?.map((kind) => ({
            label: kind,
            value: kind,
        })) || [];

    const endPointsHeaders: TableHeader[] = useMemo(
        () => [
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
        ],
        [],
    );

    const endPointsData: TableDataRow[] = useMemo(
        () =>
            (currentFunctionGroup?.endPoints || []).map((endPoint, index) => ({
                id: `${endPoint.name}-${endPoint.context}-${endPoint.method}-${index}`,
                columns: [endPoint.name, endPoint.context, endPoint.method],
            })),
        [currentFunctionGroup],
    );

    const functionalityHeaders: TableHeader[] = useMemo(
        () => [
            {
                id: 'functionGroup',
                content: (
                    <span className="inline-flex items-center gap-1">
                        Function Group
                        <EnumColumnDescription platformEnum={PlatformEnum.FunctionGroupCode} title="Function Group" />
                    </span>
                ),
            },
            {
                id: 'kind',
                content: 'Kind',
            },
        ],
        [],
    );

    const functionalityData: TableDataRow[] = useMemo(
        () =>
            functionGroups.map((functionGroup) => ({
                id: functionGroup.name,
                columns: [
                    getEnumLabel(functionGroupCodeEnum, functionGroup.functionGroupCode ?? functionGroup.name),
                    <>
                        {functionGroup.kinds?.map((kind) => (
                            <div key={kind}>{kind}</div>
                        ))}
                    </>,
                ],
            })),
        [functionGroups, functionGroupCodeEnum],
    );
    return (
        <Container marginTop data-testid="function-group-details-v1">
            <Widget title="Function Group Details" busy={isFetchingDetail || isReconnecting} titleSize="large">
                <Select
                    id="functionGroup"
                    options={functionGroupSelectData}
                    value={currentFunctionGroup?.functionGroupCode || ''}
                    onChange={(value) => onFunctionGroupChange((value as string) || '')}
                />
                <Container marginTop>
                    <Widget title="Endpoints" titleSize="large">
                        <CustomTable headers={endPointsHeaders} data={endPointsData} />
                    </Widget>
                    <Widget
                        title="Attributes"
                        busy={isFetchingAllAttributes}
                        titleSize="large"
                        refreshAction={getFreshConnectorAttributesDesc}
                        widgetLockName={LockWidgetNameEnum.ConnectorAttributes}
                        lockSize="large"
                    >
                        <Select
                            id="functionGroupKind"
                            options={functionGroupKinds}
                            value={currentFunctionGroupKind || ''}
                            placeholder={currentFunctionGroup?.kinds[0]}
                            onChange={(value) => onFunctionGroupKindChange((value as string) || '')}
                        />
                        <AttributeDescriptorViewer attributeDescriptors={currentFunctionGroupKindAttributes || []} />
                    </Widget>
                    <Widget title="Supported Interfaces" busy={isFetchingDetail || isReconnecting} titleSize="large">
                        <CustomTable headers={functionalityHeaders} data={functionalityData} />
                    </Widget>
                </Container>
            </Widget>
        </Container>
    );
}
