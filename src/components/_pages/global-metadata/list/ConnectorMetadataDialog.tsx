import { selectors as enumSelectors, getEnumLabel } from 'ducks/enums';
import { useEffect, useMemo, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { PlatformEnum } from 'types/openapi';
import { actions, selectors } from '../../../../ducks/globalMetadata';
import CustomTable, { type TableDataRow, type TableHeader } from '../../../CustomTable';
import Dialog from '../../../Dialog';
import Spinner from '../../../Spinner';
import Button from 'components/Button';
import Select from 'components/Select';
import { CircleArrowUp } from 'lucide-react';

type Props = Readonly<{
    show: boolean;
    setShow: (value: boolean) => void;
}>;

export default function ConnectorMetadataDialog({ show, setShow }: Props) {
    const dispatch = useDispatch();
    const connectorList = useSelector(selectors.connectorList);
    const connectorMetadata = useSelector(selectors.connectorMetadata);
    const isFetchingConnectorMetadata = useSelector(selectors.isFetchingConnectorMetadata);

    const [connectorUuid, setConnectorUuid] = useState<string | undefined>(undefined);
    const attributeContentTypeEnum = useSelector(enumSelectors.platformEnum(PlatformEnum.AttributeContentType));

    useEffect(() => {
        if (show) {
            dispatch(actions.getConnectorList());
        }
    }, [dispatch, show]);

    useEffect(() => {
        if (connectorList && connectorList.length > 0) {
            setConnectorUuid(connectorList[0].uuid);
        } else {
            setConnectorUuid(undefined);
        }
    }, [dispatch, connectorList]);

    useEffect(() => {
        if (connectorUuid) {
            dispatch(actions.getConnectorMetadata(connectorUuid));
        }
    }, [dispatch, connectorUuid]);

    const connectorMetadataTableHeaders: TableHeader[] = useMemo(
        () => [
            {
                id: 'name',
                content: 'Name',
                sortable: true,
                sort: 'asc',
                width: '20%',
            },
            {
                id: 'contentType',
                content: 'Content Type',
                sortable: true,
                width: '20%',
            },
            {
                id: 'promote',
                content: 'Promote',
                width: '20%',
            },
        ],
        [],
    );

    const connectorMetadataTableData: TableDataRow[] = useMemo(() => {
        if (connectorUuid && connectorMetadata) {
            return connectorMetadata.map((metadata) => ({
                id: metadata.uuid,
                columns: [
                    metadata.name,
                    getEnumLabel(attributeContentTypeEnum, metadata.contentType),
                    <Button
                        key={metadata.uuid}
                        color="primary"
                        onClick={() => dispatch(actions.promoteConnectorMetadata({ uuid: metadata.uuid, connectorUuid: connectorUuid }))}
                        className="!py-2"
                    >
                        <CircleArrowUp size={16} />
                        Promote
                    </Button>,
                ],
            }));
        } else {
            return [];
        }
    }, [connectorMetadata, dispatch, connectorUuid, attributeContentTypeEnum]);

    return (
        <Dialog
            isOpen={show}
            caption={`Promote Metadata`}
            size="lg"
            body={
                <>
                    <div className="mb-4">
                        <Select
                            id="connector"
                            label="Connector"
                            value={connectorUuid || ''}
                            onChange={(value) => setConnectorUuid(value as string)}
                            options={
                                connectorList?.map((connector) => ({
                                    value: connector.uuid,
                                    label: connector.name,
                                })) || []
                            }
                            placeholder="Select Connector"
                        />
                    </div>
                    {connectorMetadataTableData.length > 0 ? (
                        <CustomTable headers={connectorMetadataTableHeaders} data={connectorMetadataTableData} />
                    ) : (
                        <i>No metadata found for this connector.</i>
                    )}
                    <Spinner active={isFetchingConnectorMetadata} />
                </>
            }
            toggle={() => setShow(false)}
            buttons={[{ color: 'secondary', variant: 'outline', onClick: () => setShow(false), body: 'Cancel' }]}
        />
    );
}
