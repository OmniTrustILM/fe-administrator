import { useCallback, useEffect, useMemo, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { useNavigate, useParams } from 'react-router';

import Breadcrumb from 'components/Breadcrumb';
import Container from 'components/Container';
import Dialog from 'components/Dialog';
import CustomTable, { type TableDataRow, type TableHeader } from 'components/CustomTable';
import Widget from 'components/Widget';
import type { WidgetButtonProps } from 'components/WidgetButtons';
import { actions, selectors } from 'ducks/trusted-certificates';
import { Resource } from 'types/openapi';
import { LockWidgetNameEnum } from 'types/user-interface';
import { useRunOnSuccessfulFinish } from 'utils/common-hooks';
import { formatTrustedCertificateDate, formatTrustedCertificateValue } from 'utils/trusted-certificate';
import { createWidgetDetailHeaders } from 'utils/widget';

export const TrustedCertificateDetail = () => {
    const dispatch = useDispatch();
    const navigate = useNavigate();
    const { id } = useParams();

    const trustedCertificate = useSelector(selectors.trustedCertificate);
    const isFetching = useSelector(selectors.isFetchingDetail);
    const isDeleting = useSelector(selectors.isDeleting);
    const deleteTrustedCertificateSucceeded = useSelector(selectors.deleteTrustedCertificateSucceeded);

    const [confirmDelete, setConfirmDelete] = useState(false);
    const [deleteSubmitted, setDeleteSubmitted] = useState(false);

    const getFreshTrustedCertificateDetails = useCallback(() => {
        if (!id) return;
        dispatch(actions.resetState());
        dispatch(actions.getTrustedCertificate({ uuid: id }));
    }, [dispatch, id]);

    useEffect(() => {
        getFreshTrustedCertificateDetails();
    }, [getFreshTrustedCertificateDetails]);

    useRunOnSuccessfulFinish(isDeleting, deleteTrustedCertificateSucceeded, () => {
        setConfirmDelete(false);

        if (deleteSubmitted && !trustedCertificate) {
            void navigate(`/${Resource.TrustedCertificates.toLowerCase()}`);
        }

        setDeleteSubmitted(false);
    });

    const onDeleteConfirmed = useCallback(() => {
        if (!trustedCertificate) return;

        setDeleteSubmitted(true);
        dispatch(actions.deleteTrustedCertificate({ uuid: trustedCertificate.uuid }));
    }, [dispatch, trustedCertificate]);

    const widgetButtons: WidgetButtonProps[] = useMemo(
        () => [
            {
                icon: 'trash',
                disabled: !trustedCertificate,
                tooltip: 'Delete',
                onClick: () => setConfirmDelete(true),
            },
        ],
        [trustedCertificate],
    );

    const detailHeaders: TableHeader[] = useMemo(() => createWidgetDetailHeaders(), []);

    const detailData: TableDataRow[] = useMemo(
        () =>
            trustedCertificate
                ? [
                      { id: 'uuid', columns: ['UUID', trustedCertificate.uuid] },
                      { id: 'subject', columns: ['Subject DN', formatTrustedCertificateValue(trustedCertificate.subject)] },
                      { id: 'issuer', columns: ['Issuer DN', formatTrustedCertificateValue(trustedCertificate.issuer)] },
                      { id: 'notBefore', columns: ['Valid From', formatTrustedCertificateDate(trustedCertificate.notBefore)] },
                      { id: 'notAfter', columns: ['Expires At', formatTrustedCertificateDate(trustedCertificate.notAfter)] },
                      { id: 'serialNumber', columns: ['Serial Number', formatTrustedCertificateValue(trustedCertificate.serialNumber)] },
                      { id: 'thumbprint', columns: ['Thumbprint', formatTrustedCertificateValue(trustedCertificate.thumbprint)] },
                      { id: 'san', columns: ['Subject Alternative Name(s)', formatTrustedCertificateValue(trustedCertificate.san)] },
                  ]
                : [],
        [trustedCertificate],
    );

    const detailLabel = formatTrustedCertificateValue(trustedCertificate?.subject);

    return (
        <div>
            <Breadcrumb
                items={[
                    { label: 'Settings', href: '/settings' },
                    { label: 'Trusted Certificates', href: `/${Resource.TrustedCertificates.toLowerCase()}` },
                    { label: detailLabel, href: '' },
                ]}
            />
            <Widget widgetLockName={LockWidgetNameEnum.TrustedCertificateDetails} busy={isFetching || isDeleting} noBorder>
                <Container>
                    <Widget
                        title="Trusted Certificate Details"
                        widgetButtons={widgetButtons}
                        titleSize="large"
                        refreshAction={getFreshTrustedCertificateDetails}
                    >
                        <CustomTable headers={detailHeaders} data={detailData} hasPagination={false} />
                    </Widget>
                </Container>
            </Widget>
            <Dialog
                isOpen={confirmDelete}
                caption="Delete Trusted Certificate"
                body="You are about to delete a Trusted Certificate. Is this what you want to do?"
                toggle={() => setConfirmDelete(false)}
                icon="delete"
                buttons={[
                    { color: 'secondary', variant: 'outline', onClick: () => setConfirmDelete(false), body: 'Cancel' },
                    { color: 'danger', onClick: onDeleteConfirmed, body: 'Delete' },
                ]}
            />
        </div>
    );
};
