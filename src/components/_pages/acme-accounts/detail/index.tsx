import { useCallback, useEffect, useMemo, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { Link, useParams } from 'react-router';

import { actions, selectors } from 'ducks/acme-accounts';

import CustomTable, { type TableDataRow, type TableHeader } from 'components/CustomTable';
import Dialog from 'components/Dialog';
import StatusBadge from 'components/StatusBadge';
import StatusCircle from 'components/StatusCircle';
import Widget from 'components/Widget';
import type { WidgetButtonProps } from 'components/WidgetButtons';

import { AccountStatus, PlatformEnum, Resource } from 'types/openapi';
import { LockWidgetNameEnum } from 'types/user-interface';
import { acmeAccountStatus } from '../acmeAccountStatus';
import { createWidgetDetailHeaders } from 'utils/widget';
import { selectors as enumSelectors, getEnumLabel } from 'ducks/enums';
import Badge from 'components/Badge';
import Container from 'components/Container';
import Breadcrumb from 'components/Breadcrumb';
import DetailPageSkeleton from 'components/DetailPageSkeleton';

export default function AcmeAccountDetail() {
    const dispatch = useDispatch();

    const { id, acmeProfileId } = useParams();

    const acmeAccount = useSelector(selectors.account);
    const isFetchingDetail = useSelector(selectors.isFetchingDetail);
    const isDisabling = useSelector(selectors.isDisabling);
    const isEnabling = useSelector(selectors.isEnabling);
    const isRevoking = useSelector(selectors.isRevoking);
    const resourceEnum = useSelector(enumSelectors.platformEnum(PlatformEnum.Resource));

    const [confirmRevoke, setConfirmRevoke] = useState<boolean>(false);

    const getFreshAcmeAccount = useCallback(() => {
        if (!id || !acmeProfileId) return;

        dispatch(actions.getAcmeAccount({ acmeProfileUuid: acmeProfileId, uuid: id }));
    }, [id, dispatch, acmeProfileId]);

    useEffect(() => {
        getFreshAcmeAccount();
    }, [id, getFreshAcmeAccount]);

    const onEnableClick = useCallback(() => {
        if (!acmeAccount || !acmeProfileId) return;

        dispatch(actions.enableAcmeAccount({ acmeProfileUuid: acmeProfileId, uuid: acmeAccount.uuid }));
    }, [acmeAccount, acmeProfileId, dispatch]);

    const onDisableClick = useCallback(() => {
        if (!acmeAccount || !acmeProfileId) return;

        dispatch(actions.disableAcmeAccount({ acmeProfileUuid: acmeProfileId, uuid: acmeAccount.uuid }));
    }, [acmeAccount, acmeProfileId, dispatch]);

    const onRevokeConfirmed = useCallback(() => {
        if (!acmeAccount || !acmeProfileId) return;
        dispatch(actions.revokeAcmeAccount({ acmeProfileUuid: acmeProfileId, uuid: acmeAccount.uuid }));
        setConfirmRevoke(false);
    }, [acmeAccount, acmeProfileId, dispatch]);

    const buttons: WidgetButtonProps[] = useMemo(
        () => [
            {
                icon: 'cross-circle',
                disabled: acmeAccount ? acmeAccount.status !== AccountStatus.Valid : true,
                tooltip: 'Revoke',
                onClick: () => {
                    setConfirmRevoke(true);
                },
            },
            {
                icon: 'check',
                disabled: acmeAccount ? acmeAccount.enabled || acmeAccount.status !== AccountStatus.Valid : true,
                tooltip: 'Enable',
                onClick: () => {
                    onEnableClick();
                },
            },
            {
                icon: 'times',
                disabled: acmeAccount ? !acmeAccount.enabled : true,
                tooltip: 'Disable',
                onClick: () => {
                    onDisableClick();
                },
            },
        ],
        [acmeAccount, onEnableClick, onDisableClick],
    );

    const detailHeaders: TableHeader[] = useMemo(() => createWidgetDetailHeaders(), []);

    const detailData: TableDataRow[] = useMemo(() => {
        if (!acmeAccount) return [];

        const accountStatus = acmeAccountStatus(acmeAccount.status);

        return [
            {
                id: 'uuid',
                columns: ['UUID', acmeAccount.uuid],
            },
            {
                id: 'accountId',
                columns: ['Account Id', acmeAccount.accountId],
            },
            {
                id: 'raProfileName',
                columns: [
                    'RA Profile Name',
                    acmeAccount.raProfile ? (
                        <Link
                            to={`../../../raprofiles/detail/${acmeAccount?.raProfile.authorityInstanceUuid}/${acmeAccount?.raProfile.uuid}`}
                        >
                            {acmeAccount?.raProfile.name ?? 'Unassigned'}
                        </Link>
                    ) : (
                        ''
                    ),
                ],
            },
            {
                id: 'acmeProfileName',
                columns: [
                    'ACME Profile Name',
                    acmeAccount.acmeProfileUuid ? (
                        <Link to={`../../../acmeprofiles/detail/${acmeAccount.acmeProfileUuid}`}>{acmeAccount.acmeProfileName}</Link>
                    ) : (
                        ''
                    ),
                ],
            },
            {
                id: 'internalState',
                columns: ['Internal State', <StatusBadge enabled={acmeAccount.enabled} />],
            },
            {
                id: 'accountStatus',
                columns: ['Account Status', <Badge color={accountStatus[1]}>{accountStatus[0]}</Badge>],
            },
            {
                id: 'Terms of Service Agreed',
                columns: ['Terms of Service Agreed', <StatusCircle status={acmeAccount.termsOfServiceAgreed} />],
            },
            {
                id: 'contacts',
                columns: [
                    'Contacts',
                    <>
                        {acmeAccount?.contact?.map((contact) => (
                            <div key={contact}>{contact}</div>
                        ))}
                    </>,
                ],
            },
        ];
    }, [acmeAccount]);

    const orderHeaders: TableHeader[] = useMemo(
        () => [
            {
                id: 'orders',
                content: 'Orders',
            },
            {
                id: 'count',
                content: 'Count',
            },
        ],
        [],
    );

    const orderData: TableDataRow[] = useMemo(
        () =>
            !acmeAccount
                ? []
                : [
                      {
                          id: 'Successful orders',
                          columns: ['Successful orders', acmeAccount.successfulOrders.toString()],
                      },
                      {
                          id: 'Valid orders',
                          columns: ['Valid orders', acmeAccount.validOrders.toString()],
                      },
                      {
                          id: 'Pending orders',
                          columns: ['Pending orders', acmeAccount.pendingOrders.toString()],
                      },
                      {
                          id: 'Failed orders',
                          columns: ['Failed orders', acmeAccount.failedOrders.toString()],
                      },
                      {
                          id: 'Processing orders',
                          columns: ['Processing orders', acmeAccount.processingOrders.toString()],
                      },
                  ],
        [acmeAccount],
    );

    if (isFetchingDetail) {
        return <DetailPageSkeleton layout="simple" buttonsCount={3} />;
    }

    return (
        <div>
            <Breadcrumb
                items={[
                    { label: `${getEnumLabel(resourceEnum, Resource.AcmeAccounts)} Inventory`, href: '/acmeaccounts' },
                    { label: acmeAccount?.accountId || 'ACME Account Details', href: '' },
                ]}
            />
            <Widget
                widgetLockName={LockWidgetNameEnum.ACMEAccountDetails}
                busy={isFetchingDetail || isEnabling || isDisabling || isRevoking}
                noBorder
            >
                <Container>
                    <Widget title="ACME Account Details" widgetButtons={buttons} titleSize="large" refreshAction={getFreshAcmeAccount}>
                        <CustomTable headers={detailHeaders} data={detailData} />
                    </Widget>

                    <Widget title="Order Summary" titleSize="large">
                        <CustomTable headers={orderHeaders} data={orderData} />
                    </Widget>
                </Container>
            </Widget>

            <Dialog
                isOpen={confirmRevoke}
                caption="Revoke ACME Account"
                body="You are about to revoke an ACME Account. Is this what you want to do?"
                toggle={() => setConfirmRevoke(false)}
                buttons={[
                    { color: 'danger', onClick: onRevokeConfirmed, body: 'Yes, revoke' },
                    { color: 'secondary', variant: 'outline', onClick: () => setConfirmRevoke(false), body: 'Cancel' },
                ]}
            />
        </div>
    );
}
