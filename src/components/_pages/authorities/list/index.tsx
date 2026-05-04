import { useCallback, useEffect, useMemo, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { Link, useNavigate } from 'react-router';
import Container from 'components/Container';

import { actions, selectors } from 'ducks/authorities';

import CustomTable, { type TableDataRow, type TableHeader } from 'components/CustomTable';
import ForceDeleteErrorTable from 'components/ForceDeleteErrorTable';
import Dialog from 'components/Dialog';
import Widget from 'components/Widget';
import type { WidgetButtonProps } from 'components/WidgetButtons';
import { LockWidgetNameEnum } from 'types/user-interface';
import Badge from 'components/Badge';

function AuthorityList() {
    const dispatch = useDispatch();
    const navigate = useNavigate();

    const checkedRows = useSelector(selectors.checkedRows);
    const authorities = useSelector(selectors.authorities);

    const bulkDeleteErrorMessages = useSelector(selectors.bulkDeleteErrorMessages);

    const isFetching = useSelector(selectors.isFetchingList);
    const isDeleting = useSelector(selectors.isDeleting);
    const isUpdating = useSelector(selectors.isUpdating);
    const isBulkDeleting = useSelector(selectors.isBulkDeleting);
    const isBulkForceDeleting = useSelector(selectors.isBulkForceDeleting);

    const isBusy = isFetching || isDeleting || isUpdating || isBulkDeleting || isBulkForceDeleting;

    const [confirmDelete, setConfirmDelete] = useState(false);
    const [confirmForceDelete, setConfirmForceDelete] = useState<boolean>(false);

    const getFreshData = useCallback(() => {
        dispatch(actions.setCheckedRows({ checkedRows: [] }));
        dispatch(actions.clearDeleteErrorMessages());
        dispatch(actions.listAuthorities());
    }, [dispatch]);

    useEffect(() => {
        getFreshData();
    }, [getFreshData]);

    useEffect(() => {
        setConfirmForceDelete(bulkDeleteErrorMessages.length > 0);
    }, [bulkDeleteErrorMessages]);

    const onAddClick = useCallback(() => {
        navigate('./add');
    }, [navigate]);

    const setCheckedRows = useCallback(
        (rows: (string | number)[]) => {
            dispatch(actions.setCheckedRows({ checkedRows: rows as string[] }));
        },
        [dispatch],
    );

    const onDeleteConfirmed = useCallback(() => {
        setConfirmDelete(false);
        dispatch(actions.clearDeleteErrorMessages());
        dispatch(actions.bulkDeleteAuthority({ uuids: checkedRows }));
    }, [dispatch, checkedRows]);

    const onForceDeleteConfirmed = useCallback(() => {
        dispatch(actions.clearDeleteErrorMessages());
        dispatch(actions.bulkForceDeleteAuthority({ uuids: checkedRows }));
    }, [dispatch, checkedRows]);

    const buttons: WidgetButtonProps[] = useMemo(
        () => [
            {
                icon: 'plus',
                disabled: false,
                tooltip: 'Create',
                onClick: onAddClick,
            },
            {
                icon: 'trash',
                disabled: checkedRows.length === 0,
                tooltip: 'Delete',
                onClick: () => {
                    setConfirmDelete(true);
                },
            },
        ],
        [checkedRows, onAddClick],
    );

    const authoritiesRowHeaders: TableHeader[] = useMemo(
        () => [
            {
                content: 'Name',
                sortable: true,
                sort: 'asc',
                id: 'authorityName',
                width: '60%',
            },
            {
                content: 'Authority Provider',
                align: 'center',
                sortable: true,
                id: 'auhtorityProvider',
                width: '20%',
            },
            {
                content: 'Kinds',
                align: 'center',
                sortable: true,
                id: 'kinds',
                width: '20%',
            },
        ],
        [],
    );

    const authorityList: TableDataRow[] = useMemo(
        () =>
            authorities.map((authority) => ({
                id: authority.uuid,

                columns: [
                    <Link to={`./detail/${authority.uuid}`}>{authority.name}</Link>,

                    authority.connectorName ? (
                        <Link to={`../connectors/detail/${authority.connectorUuid}`}>{authority.connectorName ?? 'Unassigned'}</Link>
                    ) : (
                        (authority.connectorName ?? 'Unassigned')
                    ),

                    <Badge color="primary">{authority.kind}</Badge>,
                ],
            })),
        [authorities],
    );

    const forceDeleteBody = (
        <ForceDeleteErrorTable
            items={bulkDeleteErrorMessages}
            entityNameSingular="an Authority"
            entityNamePlural="Authorities"
            itemsCount={checkedRows.length}
        />
    );

    return (
        <Container data-testid="authority-list">
            <Widget
                title="Authority Store"
                busy={isBusy && !(isFetching && authorities.length === 0)}
                widgetLockName={LockWidgetNameEnum.AuthorityStore}
                widgetButtons={buttons}
                titleSize="large"
                refreshAction={getFreshData}
                dataTestId="authority-list-widget"
            >
                <CustomTable
                    headers={authoritiesRowHeaders}
                    data={authorityList}
                    onCheckedRowsChanged={setCheckedRows}
                    hasCheckboxes={true}
                    hasPagination={true}
                    canSearch={true}
                    isLoading={isFetching && authorities.length === 0}
                />
            </Widget>

            <Dialog
                isOpen={confirmDelete}
                caption={`Delete ${checkedRows.length > 1 ? 'Authorities' : 'an Authority'}`}
                body={`You are about to delete ${checkedRows.length > 1 ? 'Authorities' : 'an Authority'}. Is this what you want to do?`}
                toggle={() => setConfirmDelete(false)}
                icon="delete"
                buttons={[
                    { color: 'danger', onClick: onDeleteConfirmed, body: 'Delete' },
                    { color: 'secondary', variant: 'outline', onClick: () => setConfirmDelete(false), body: 'Cancel' },
                ]}
            />

            <Dialog
                isOpen={confirmForceDelete}
                caption={`Force Delete ${checkedRows.length > 1 ? 'Authorities' : 'an Authority'}`}
                body={forceDeleteBody}
                toggle={() => setConfirmForceDelete(false)}
                buttons={[
                    { color: 'danger', onClick: onForceDeleteConfirmed, body: 'Force delete' },
                    { color: 'secondary', variant: 'outline', onClick: () => dispatch(actions.clearDeleteErrorMessages()), body: 'Cancel' },
                ]}
            />
        </Container>
    );
}

export default AuthorityList;
