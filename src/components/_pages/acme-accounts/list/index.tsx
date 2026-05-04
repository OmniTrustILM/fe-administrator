import { useCallback, useEffect, useMemo, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { Link } from 'react-router';

import { actions, selectors } from 'ducks/acme-accounts';

import CustomTable, { type TableDataRow, type TableHeader } from 'components/CustomTable';
import Dialog from 'components/Dialog';
import StatusBadge from 'components/StatusBadge';
import Widget from 'components/Widget';
import type { WidgetButtonProps } from 'components/WidgetButtons';

import { LockWidgetNameEnum } from 'types/user-interface';
import { acmeAccountStatus } from '../acmeAccountStatus';
import Badge from 'components/Badge';

export default function AcmeAccountList() {
    const dispatch = useDispatch();

    const checkedRows = useSelector(selectors.checkedRows);
    const acmeAccounts = useSelector(selectors.accounts);

    const isFetching = useSelector(selectors.isFetchingList);
    const isRevoking = useSelector(selectors.isRevoking);
    const isBulkDeleting = useSelector(selectors.isBulkRevoking);
    const isBulkEnabling = useSelector(selectors.isBulkEnabling);
    const isBulkDisabling = useSelector(selectors.isBulkDisabling);

    const isBusy = isFetching || isRevoking || isBulkDeleting || isBulkEnabling || isBulkDisabling;

    const [confirmRevoke, setConfirmRevoke] = useState<boolean>(false);

    const getFreshData = useCallback(() => {
        dispatch(actions.setCheckedRows({ checkedRows: [] }));
        dispatch(actions.listAcmeAccounts());
    }, [dispatch]);

    useEffect(() => {
        getFreshData();
    }, [getFreshData]);

    const onEnableClick = useCallback(() => {
        dispatch(actions.bulkEnableAcmeAccounts({ uuids: checkedRows }));
    }, [checkedRows, dispatch]);

    const onDisableClick = useCallback(() => {
        dispatch(actions.bulkDisableAcmeAccounts({ uuids: checkedRows }));
    }, [checkedRows, dispatch]);

    const onRevokeConfirmed = useCallback(() => {
        dispatch(actions.bulkRevokeAcmeAccounts({ uuids: checkedRows }));
        setConfirmRevoke(false);
    }, [checkedRows, dispatch]);

    const setCheckedRows = useCallback(
        (rows: (string | number)[]) => {
            dispatch(actions.setCheckedRows({ checkedRows: rows as string[] }));
        },
        [dispatch],
    );

    const buttons: WidgetButtonProps[] = useMemo(
        () => [
            {
                icon: 'cross-circle',
                disabled: checkedRows.length === 0,
                tooltip: 'Revoke',
                onClick: () => {
                    setConfirmRevoke(true);
                },
            },
            {
                icon: 'check',
                disabled: checkedRows.length === 0,
                tooltip: 'Enable',
                onClick: () => {
                    onEnableClick();
                },
            },
            {
                icon: 'times',
                disabled: checkedRows.length === 0,
                tooltip: 'Disable',
                onClick: () => {
                    onDisableClick();
                },
            },
        ],
        [checkedRows, onEnableClick, onDisableClick],
    );

    const acmeAccountsTableHeader: TableHeader[] = useMemo(
        () => [
            {
                id: 'accountId',
                content: 'Account Id',
                width: 'auto',
            },
            {
                id: 'ACME Profile Name',
                content: 'ACME Profile Name',
                sortable: true,
                sort: 'asc',
                width: '20%',
                align: 'center',
            },
            {
                id: 'RA Profile Name',
                content: 'RA Profile Name',
                align: 'center',
                sortable: true,
                width: '20%',
            },
            {
                id: 'internalState',
                content: 'Internal State',
                sortable: true,
                width: '10%',
                align: 'center',
            },
            {
                id: 'accountStatus',
                content: 'Account Status',
                sortable: true,
                width: '10%',
                align: 'center',
            },
            {
                id: 'totalOrders',
                content: 'Total Orders',
                sortable: true,
                sortType: 'numeric',
                width: '10%',
                align: 'center',
            },
        ],
        [],
    );

    const acmeAccountsTableData: TableDataRow[] = useMemo(
        () =>
            acmeAccounts.map((acmeAccount) => {
                const accountStatus = acmeAccountStatus(acmeAccount.status);

                return {
                    id: acmeAccount.uuid,

                    columns: [
                        <Link to={`./detail/${acmeAccount.acmeProfileUuid}/${acmeAccount.uuid}`}>{acmeAccount.accountId}</Link>,

                        acmeAccount.acmeProfileName ? (
                            <Link to={`../acmeprofiles/detail/${acmeAccount.acmeProfileUuid}`}>
                                {acmeAccount.acmeProfileName ?? 'Unassigned'}
                            </Link>
                        ) : (
                            (acmeAccount.acmeProfileName ?? 'Unassigned')
                        ),

                        acmeAccount.raProfile ? (
                            <Link
                                to={`../raprofiles/detail/${acmeAccount?.raProfile.authorityInstanceUuid}/${acmeAccount?.raProfile.uuid}`}
                            >
                                {acmeAccount.raProfile.name ?? 'Unassigned'}
                            </Link>
                        ) : (
                            (acmeAccount.raProfile ?? 'Unassigned')
                        ),

                        <StatusBadge enabled={acmeAccount.enabled} />,

                        <Badge color={accountStatus[1]}>{accountStatus[0]}</Badge>,

                        acmeAccount.totalOrders.toString(),
                    ],
                };
            }),
        [acmeAccounts],
    );

    return (
        <>
            <Widget
                title="List of ACME Accounts"
                busy={isBusy && !(isFetching && acmeAccounts.length === 0)}
                widgetLockName={LockWidgetNameEnum.ListOfACMEAccounts}
                widgetButtons={buttons}
                titleSize="large"
                refreshAction={getFreshData}
            >
                <CustomTable
                    headers={acmeAccountsTableHeader}
                    data={acmeAccountsTableData}
                    onCheckedRowsChanged={setCheckedRows}
                    canSearch={true}
                    hasCheckboxes={true}
                    hasPagination={true}
                    isLoading={isFetching && acmeAccounts.length === 0}
                />
            </Widget>

            <Dialog
                isOpen={confirmRevoke}
                caption={`Revoke ${checkedRows.length > 1 ? 'ACME Accounts' : 'an ACME Account'}`}
                body={`You are about to revoke ${
                    checkedRows.length > 1 ? 'ACME Accounts' : 'an ACME Account'
                }. Is this what you want to do?`}
                toggle={() => setConfirmRevoke(false)}
                buttons={[
                    { color: 'danger', onClick: onRevokeConfirmed, body: 'Yes, revoke' },
                    { color: 'secondary', variant: 'outline', onClick: () => setConfirmRevoke(false), body: 'Cancel' },
                ]}
            />
        </>
    );
}
