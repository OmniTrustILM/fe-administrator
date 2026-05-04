import { useCallback, useEffect, useMemo, useState } from 'react';
import { useRunOnSuccessfulFinish } from 'utils/common-hooks';
import { useDispatch, useSelector } from 'react-redux';
import { Link } from 'react-router';
import Badge from 'components/Badge';

import { actions, selectors } from 'ducks/tokens';

import CustomTable, { type TableDataRow, type TableHeader } from 'components/CustomTable';
import Dialog from 'components/Dialog';
import TokenForm from '../form';
import Widget from 'components/Widget';
import type { WidgetButtonProps } from 'components/WidgetButtons';
import TokenStatusBadge from 'components/_pages/tokens/TokenStatusBadge';
import { LockWidgetNameEnum } from 'types/user-interface';
import TokenActivationDialogBody from '../TokenActivationDialogBody';

function TokenList() {
    const dispatch = useDispatch();

    const checkedRows = useSelector(selectors.checkedRows);
    const tokens = useSelector(selectors.tokens);

    const isFetching = useSelector(selectors.isFetchingList);
    const isDeleting = useSelector(selectors.isDeleting);
    const isUpdating = useSelector(selectors.isUpdating);
    const isBulkDeleting = useSelector(selectors.isBulkDeleting);
    const isCreating = useSelector(selectors.isCreating);
    const createTokenSucceeded = useSelector(selectors.createTokenSucceeded);
    const updateTokenSucceeded = useSelector(selectors.updateTokenSucceeded);

    const isBusy = isFetching || isDeleting || isUpdating || isBulkDeleting;

    const [confirmDelete, setConfirmDelete] = useState(false);
    const [confirmDeactivation, setConfirmDeactivation] = useState<boolean>(false);
    const [activateToken, setActivateToken] = useState<boolean>(false);
    const [isAddModalOpen, setIsAddModalOpen] = useState<boolean>(false);
    const [editingTokenId, setEditingTokenId] = useState<string | undefined>(undefined);

    const getFreshData = useCallback(() => {
        dispatch(actions.setCheckedRows({ checkedRows: [] }));
        dispatch(actions.clearDeleteErrorMessages());
        dispatch(actions.listTokens());
    }, [dispatch]);

    useEffect(() => {
        getFreshData();
    }, [getFreshData]);

    useRunOnSuccessfulFinish(isCreating, createTokenSucceeded, () => {
        setIsAddModalOpen(false);
        getFreshData();
    });
    useRunOnSuccessfulFinish(isUpdating, updateTokenSucceeded, () => {
        setEditingTokenId(undefined);
        getFreshData();
    });

    const handleOpenAddModal = useCallback(() => {
        setIsAddModalOpen(true);
    }, []);

    const handleCloseAddModal = useCallback(() => {
        setIsAddModalOpen(false);
        setEditingTokenId(undefined);
    }, []);

    const onAddClick = useCallback(() => {
        handleOpenAddModal();
    }, [handleOpenAddModal]);

    const setCheckedRows = useCallback(
        (rows: (string | number)[]) => {
            dispatch(actions.setCheckedRows({ checkedRows: rows as string[] }));
        },
        [dispatch],
    );

    const onDeleteConfirmed = useCallback(() => {
        setConfirmDelete(false);
        dispatch(actions.clearDeleteErrorMessages());
        dispatch(actions.bulkDeleteToken({ uuids: checkedRows }));
    }, [dispatch, checkedRows]);

    const onDeactivationConfirmed = useCallback(() => {
        if (!checkedRows) return;
        if (checkedRows.length !== 1) return;

        dispatch(actions.deactivateToken({ uuid: checkedRows[0] }));
        setConfirmDeactivation(false);
    }, [checkedRows, dispatch]);

    const buttons: WidgetButtonProps[] = useMemo(
        () => [
            {
                icon: 'plus',
                disabled: false,
                tooltip: 'Create',
                onClick: handleOpenAddModal,
            },
            {
                icon: 'trash',
                disabled: checkedRows.length === 0,
                tooltip: 'Delete',
                onClick: () => {
                    setConfirmDelete(true);
                },
            },
            {
                icon: 'check',
                disabled: checkedRows.length !== 1,
                tooltip: 'Activate',
                onClick: () => {
                    setActivateToken(true);
                },
            },
            {
                icon: 'times',
                disabled: checkedRows.length !== 1,
                tooltip: 'Deactivate',
                onClick: () => {
                    setConfirmDeactivation(true);
                },
            },
        ],
        [checkedRows, handleOpenAddModal],
    );

    const tokenRowHeader: TableHeader[] = useMemo(
        () => [
            {
                content: 'Name',
                sortable: true,
                sort: 'asc',
                id: 'tokenName',
                width: 'auto',
            },
            {
                content: 'Cryptography Provider',
                align: 'center',
                sortable: true,
                id: 'tokenProvider',
                width: '15%',
            },
            {
                content: 'Kind',
                align: 'center',
                sortable: true,
                id: 'kind',
                width: '15%',
            },
            {
                content: 'Status',
                align: 'center',
                sortable: true,
                id: 'status',
                width: '15%',
            },
            {
                content: 'Token Profiles',
                align: 'center',
                sortable: true,
                id: 'tokenProfiles',
                width: '15%',
            },
        ],
        [],
    );

    const tokenList: TableDataRow[] = useMemo(
        () =>
            tokens.map((token) => ({
                id: token.uuid,

                columns: [
                    <Link to={`./detail/${token.uuid}`}>{token.name}</Link>,

                    token.connectorName ? (
                        <Link to={`../connectors/detail/${token.connectorUuid}`}>{token.connectorName ?? 'Unassigned'}</Link>
                    ) : (
                        (token.connectorName ?? 'Unassigned')
                    ),

                    <Badge color="secondary">{token.kind}</Badge>,

                    <TokenStatusBadge status={token.status} />,

                    <>{token.tokenProfiles}</>,
                ],
            })),
        [tokens],
    );

    return (
        <>
            <Widget
                title="Token Store"
                busy={isBusy && !(isFetching && tokens.length === 0)}
                widgetLockName={LockWidgetNameEnum.TokenStore}
                widgetButtons={buttons}
                titleSize="large"
                refreshAction={getFreshData}
            >
                <CustomTable
                    headers={tokenRowHeader}
                    data={tokenList}
                    onCheckedRowsChanged={setCheckedRows}
                    hasCheckboxes={true}
                    hasPagination={true}
                    canSearch={true}
                    isLoading={isFetching && tokens.length === 0}
                />
            </Widget>

            <Dialog
                isOpen={confirmDelete}
                caption={`Delete ${checkedRows.length > 1 ? 'Tokens' : 'a Token'}`}
                body={`You are about to delete ${checkedRows.length > 1 ? 'Tokens' : 'a Token'}. Is this what you want to do?`}
                toggle={() => setConfirmDelete(false)}
                icon="delete"
                buttons={[
                    { color: 'danger', onClick: onDeleteConfirmed, body: 'Delete' },
                    { color: 'secondary', variant: 'outline', onClick: () => setConfirmDelete(false), body: 'Cancel' },
                ]}
            />

            <Dialog
                isOpen={confirmDeactivation}
                caption="Deactivate Token"
                body="You are about to deactivate Token. If you continue, objects
                  related to the token not work. Is this what you want to do?"
                toggle={() => setConfirmDeactivation(false)}
                buttons={[
                    { color: 'danger', onClick: onDeactivationConfirmed, body: 'Deactivate' },
                    { color: 'secondary', variant: 'outline', onClick: () => setConfirmDeactivation(false), body: 'Cancel' },
                ]}
            />

            <Dialog
                isOpen={activateToken}
                caption="Activate Token"
                body={TokenActivationDialogBody({
                    visible: activateToken,
                    onClose: () => setActivateToken(false),
                    tokenUuid: checkedRows[0],
                })}
                toggle={() => setActivateToken(false)}
                buttons={[]}
            />

            <Dialog
                isOpen={isAddModalOpen || !!editingTokenId}
                toggle={handleCloseAddModal}
                caption={editingTokenId ? 'Edit Token' : 'Create Token'}
                size="xl"
                body={<TokenForm tokenId={editingTokenId} onCancel={handleCloseAddModal} onSuccess={handleCloseAddModal} />}
            />
        </>
    );
}

export default TokenList;
