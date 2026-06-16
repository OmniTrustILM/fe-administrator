import { useCallback, useEffect, useMemo, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { Link, useNavigate, useParams } from 'react-router';

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
import { useRunOnSuccessfulFinish } from 'utils/common-hooks';
import { dateFormatter } from 'utils/dateUtil';
import { createWidgetDetailHeaders } from 'utils/widget';

export default function SigningRecordDetail() {
    const dispatch = useDispatch();
    const navigate = useNavigate();
    const { id = '' } = useParams();

    const detail = useSelector(selectors.selectSigningRecordDetail);
    const detailError = useSelector(selectors.selectSigningRecordDetailError);
    const detailErrorStatusCode = useSelector(selectors.selectSigningRecordDetailErrorStatusCode);
    const isFetching = useSelector(selectors.selectIsFetchingDetail);
    const isDeleting = useSelector(selectors.selectIsDeleting);
    const deletedSigningRecordUuids = useSelector(selectors.selectDeletedSigningRecordUuids);

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
    }, [dispatch, id]);

    // Navigate back to the list only once the delete has succeeded (the epic surfaces an error alert on failure).
    useRunOnSuccessfulFinish(isDeleting, !!id && deletedSigningRecordUuids.includes(id), () => {
        navigate(`/${Resource.SigningRecords.toLowerCase()}`);
    });

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
                                <Container>
                                    <Widget
                                        title="Signing Record Details"
                                        widgetButtons={headerButtons}
                                        titleSize="large"
                                        refreshAction={getFreshData}
                                        lockSize="large"
                                        className="w-full"
                                    >
                                        <CustomTable headers={detailHeaders} data={generalData} />
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
