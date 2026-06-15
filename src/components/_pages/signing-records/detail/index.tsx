import { Buffer } from 'buffer';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { Link, useNavigate, useParams } from 'react-router';
import { Download } from 'lucide-react';

import Breadcrumb from 'components/Breadcrumb';
import Button from 'components/Button';
import Container from 'components/Container';
import CustomTable, { type TableDataRow, type TableHeader } from 'components/CustomTable';
import Dialog from 'components/Dialog';
import JsonViewer from 'components/JsonViewer';
import TabLayout from 'components/Layout/TabLayout';
import Widget from 'components/Widget';
import type { WidgetButtonProps } from 'components/WidgetButtons';

import { actions, selectors } from 'ducks/signing-records';
import { Resource } from 'types/openapi';
import { LockWidgetNameEnum } from 'types/user-interface';
import { dateFormatter } from 'utils/dateUtil';
import { createWidgetDetailHeaders } from 'utils/widget';

type Artifact = {
    id: string;
    label: string;
    value: string | undefined;
    fileName: string;
    mimeType: string;
};

function downloadBase64(base64: string, fileName: string, mimeType: string) {
    const bytes = new Uint8Array(Buffer.from(base64, 'base64'));
    const blob = new Blob([bytes], { type: mimeType });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement('a');
    anchor.href = url;
    anchor.download = fileName;
    document.body.appendChild(anchor);
    anchor.click();
    anchor.remove();
    URL.revokeObjectURL(url);
}

export default function SigningRecordDetail() {
    const dispatch = useDispatch();
    const navigate = useNavigate();
    const { id = '' } = useParams();

    const detail = useSelector(selectors.selectSigningRecordDetail);
    const detailError = useSelector(selectors.selectSigningRecordDetailError);
    const detailErrorStatusCode = useSelector(selectors.selectSigningRecordDetailErrorStatusCode);
    const isFetching = useSelector(selectors.selectIsFetchingDetail);
    const isDeleting = useSelector(selectors.selectIsDeleting);

    const [confirmDelete, setConfirmDelete] = useState(false);

    const isBusy = isFetching || isDeleting;

    const getFreshData = useCallback(() => {
        if (!id) return;
        dispatch(actions.getSigningRecord({ uuid: id }));
    }, [dispatch, id]);

    useEffect(() => {
        getFreshData();
    }, [getFreshData]);

    const onDeleteConfirmed = useCallback(() => {
        if (!id) return;
        dispatch(actions.deleteSigningRecord({ uuid: id }));
        setConfirmDelete(false);
        navigate(`/${Resource.SigningRecords.toLowerCase()}`);
    }, [dispatch, id, navigate]);

    const headerButtons: WidgetButtonProps[] = useMemo(
        () => [
            {
                id: 'delete',
                icon: 'trash',
                disabled: false,
                tooltip: 'Delete',
                onClick: () => setConfirmDelete(true),
            },
        ],
        [],
    );

    const detailHeaders: TableHeader[] = useMemo(() => createWidgetDetailHeaders(), []);

    const artifacts: Artifact[] = useMemo(
        () => [
            {
                id: 'signatureValue',
                label: 'Signature Value',
                value: detail?.signatureValue,
                fileName: `${detail?.name ?? id}-signature.bin`,
                mimeType: 'application/octet-stream',
            },
            {
                id: 'signedDocument',
                label: 'Signed Document',
                value: detail?.signedDocument,
                fileName: `${detail?.name ?? id}-signed-document.p7s`,
                mimeType: 'application/pkcs7-mime',
            },
            {
                id: 'dtbs',
                label: 'Data To Be Signed (DTBS)',
                value: detail?.dtbs,
                fileName: `${detail?.name ?? id}-dtbs.bin`,
                mimeType: 'application/octet-stream',
            },
        ],
        [detail, id],
    );

    const generalData: TableDataRow[] = useMemo(
        () =>
            !detail
                ? []
                : [
                      { id: 'uuid', columns: ['UUID', detail.uuid] },
                      { id: 'name', columns: ['Name', detail.name] },
                      {
                          id: 'signingProfile',
                          columns: [
                              'Signing Profile',
                              detail.signingProfile ? (
                                  <Link key="value" to={`/${Resource.SigningProfiles.toLowerCase()}/detail/${detail.signingProfile.uuid}`}>
                                      {detail.signingProfile.name} (v{detail.signingProfile.version})
                                  </Link>
                              ) : (
                                  '-'
                              ),
                          ],
                      },
                      { id: 'signingTime', columns: ['Signing Time', detail.signingTime ? dateFormatter(detail.signingTime) : '-'] },
                      { id: 'requestedBy', columns: ['Requested By', detail.requestedBy?.name ?? '-'] },
                      { id: 'createdAt', columns: ['Created At', detail.createdAt ? dateFormatter(detail.createdAt) : '-'] },
                      {
                          id: 'signedDocumentRetrievedAt',
                          columns: [
                              'Signed Document Retrieved At',
                              detail.signedDocumentRetrievedAt ? dateFormatter(detail.signedDocumentRetrievedAt) : '-',
                          ],
                      },
                  ],
        [detail],
    );

    const artifactsData: TableDataRow[] = useMemo(
        () =>
            artifacts.map((artifact) => ({
                id: artifact.id,
                columns: [
                    artifact.label,
                    artifact.value ? (
                        <Button
                            key="value"
                            variant="transparent"
                            color="secondary"
                            type="button"
                            title={`Download ${artifact.label}`}
                            className="!p-1"
                            onClick={() => downloadBase64(artifact.value as string, artifact.fileName, artifact.mimeType)}
                        >
                            <Download size={16} aria-hidden="true" />
                            <span className="ml-1 text-sm">{artifact.fileName}</span>
                        </Button>
                    ) : (
                        <span key="value" className="text-gray-400 text-sm">
                            Not available
                        </span>
                    ),
                ],
            })),
        [artifacts],
    );

    const isMissing = detailErrorStatusCode === 404;
    const hasDetailRequestFailed = detailErrorStatusCode !== undefined || Boolean(detailError);

    if (!isFetching && !detail && hasDetailRequestFailed) {
        return (
            <div>
                <Breadcrumb
                    items={[
                        { label: 'Signing Records', href: `/${Resource.SigningRecords.toLowerCase()}` },
                        { label: 'Signing Record Detail', href: '' },
                    ]}
                />

                <Container>
                    <Widget titleSize="large">
                        <div className="py-8 px-4">
                            <p className="text-base font-medium">
                                {isMissing ? 'This Signing Record no longer exists.' : 'Unable to load Signing Record detail.'}
                            </p>
                            <p className="mt-2 text-sm text-base-content/80">{detailError ?? 'Please try again later.'}</p>
                            <div className="mt-4">
                                <Button
                                    type="button"
                                    variant="solid"
                                    color="primary"
                                    onClick={() => navigate(`/${Resource.SigningRecords.toLowerCase()}`)}
                                >
                                    Back to Signing Records
                                </Button>
                            </div>
                        </div>
                    </Widget>
                </Container>
            </div>
        );
    }

    return (
        <div>
            <Breadcrumb
                items={[
                    { label: 'Signing Records', href: `/${Resource.SigningRecords.toLowerCase()}` },
                    { label: detail ? detail.name : 'Signing Record Detail', href: '' },
                ]}
            />

            <Widget widgetLockName={LockWidgetNameEnum.SigningRecordDetail} busy={isBusy} noBorder>
                <TabLayout
                    tabs={[
                        {
                            title: 'Details',
                            content: (
                                <Container className="md:flex-row">
                                    <Widget
                                        title="Signing Record Details"
                                        widgetButtons={headerButtons}
                                        titleSize="large"
                                        refreshAction={getFreshData}
                                        lockSize="large"
                                        className="w-full md:w-1/2"
                                    >
                                        <CustomTable headers={detailHeaders} data={generalData} />
                                    </Widget>

                                    <Widget title="Signed Artifacts" titleSize="large" className="w-full md:w-1/2">
                                        <CustomTable headers={detailHeaders} data={artifactsData} />
                                    </Widget>
                                </Container>
                            ),
                        },
                        {
                            title: 'Request Metadata',
                            content: (
                                <Widget title="Request Metadata" titleSize="large">
                                    {detail?.requestMetadataJson ? (
                                        <JsonViewer value={detail.requestMetadataJson} height={600} />
                                    ) : (
                                        <p className="text-gray-400 text-sm">No request metadata available.</p>
                                    )}
                                </Widget>
                            ),
                        },
                    ]}
                />
            </Widget>

            <Dialog
                isOpen={confirmDelete}
                caption="Delete Signing Record"
                body="You are about to delete this Signing Record. Is this what you want to do?"
                toggle={() => setConfirmDelete(false)}
                icon="delete"
                buttons={[
                    { color: 'danger', onClick: onDeleteConfirmed, body: 'Delete' },
                    { color: 'secondary', variant: 'outline', onClick: () => setConfirmDelete(false), body: 'Cancel' },
                ]}
            />
        </div>
    );
}
