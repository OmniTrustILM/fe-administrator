import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { useRunOnSuccessfulFinish } from 'utils/common-hooks';
import { useDispatch, useSelector } from 'react-redux';
import { Link } from 'react-router';
import TokenProfileForm from '../form';
import Badge from 'components/Badge';

import { actions, selectors } from 'ducks/token-profiles';

import CustomTable, { type TableDataRow, type TableHeader } from 'components/CustomTable';
import Dialog from 'components/Dialog';
import StatusBadge from 'components/StatusBadge';
import Widget from 'components/Widget';
import type { WidgetButtonProps } from 'components/WidgetButtons';
import TokenStatusBadge from 'components/_pages/tokens/TokenStatusBadge';
import { selectors as enumSelectors, getEnumLabel } from 'ducks/enums';
import KeyUsageSelect from '../../cryptographic-keys/KeyUsageSelect';
import { type KeyUsage, PlatformEnum } from 'types/openapi';
import type { TokenProfileResponseModel } from 'types/token-profiles';
import { LockWidgetNameEnum } from 'types/user-interface';

function TokenProfileList() {
    const dispatch = useDispatch();

    const checkedRows = useSelector(selectors.checkedRows);
    const tokenProfiles = useSelector(selectors.tokenProfiles);

    const isFetching = useSelector(selectors.isFetchingList);
    const isDeleting = useSelector(selectors.isDeleting);
    const isBulkDeleting = useSelector(selectors.isBulkDeleting);
    const isUpdating = useSelector(selectors.isUpdating);
    const isCreating = useSelector(selectors.isCreating);
    const createTokenProfileSucceeded = useSelector(selectors.createTokenProfileSucceeded);
    const updateTokenProfileSucceeded = useSelector(selectors.updateTokenProfileSucceeded);
    const isEnabling = useSelector(selectors.isEnabling);
    const isBulkEnabling = useSelector(selectors.isBulkEnabling);
    const isBulkDisabling = useSelector(selectors.isBulkDisabling);
    const isBulkUpdatingKeyUsage = useSelector(selectors.isBulkUpdatingKeyUsage);
    const keyUsageEnum = useSelector(enumSelectors.platformEnum(PlatformEnum.KeyUsage));

    const isBusy =
        isFetching ||
        isDeleting ||
        isUpdating ||
        isBulkDeleting ||
        isEnabling ||
        isBulkEnabling ||
        isBulkDisabling ||
        isBulkUpdatingKeyUsage;

    const [confirmDelete, setConfirmDelete] = useState<boolean>(false);
    const [keyUsageUpdate, setKeyUsageUpdate] = useState<boolean>(false);
    const [keyUsages, setKeyUsages] = useState<KeyUsage[]>([]);
    const [isAddModalOpen, setIsAddModalOpen] = useState<boolean>(false);
    const [editingTokenProfileId, setEditingTokenProfileId] = useState<string | undefined>(undefined);
    const [editingTokenId, setEditingTokenId] = useState<string | undefined>(undefined);

    const getFreshData = useCallback(() => {
        dispatch(actions.setCheckedRows({ checkedRows: [] }));
        dispatch(actions.listTokenProfiles({}));
    }, [dispatch]);

    useEffect(() => {
        getFreshData();
    }, [getFreshData]);

    useRunOnSuccessfulFinish(isCreating, createTokenProfileSucceeded, () => {
        setIsAddModalOpen(false);
        setEditingTokenId(undefined);
        getFreshData();
    });
    useRunOnSuccessfulFinish(isUpdating, updateTokenProfileSucceeded, () => {
        setEditingTokenProfileId(undefined);
        setEditingTokenId(undefined);
        getFreshData();
    });

    const handleOpenAddModal = useCallback(() => {
        setIsAddModalOpen(true);
    }, []);

    const handleCloseAddModal = useCallback(() => {
        setIsAddModalOpen(false);
        setEditingTokenProfileId(undefined);
        setEditingTokenId(undefined);
    }, []);

    const onAddClick = useCallback(() => {
        handleOpenAddModal();
    }, [handleOpenAddModal]);

    const onEnableClick = useCallback(() => {
        dispatch(actions.bulkEnableTokenProfiles({ uuids: checkedRows }));
    }, [checkedRows, dispatch]);

    const onDisableClick = useCallback(() => {
        dispatch(actions.bulkDisableTokenProfiles({ uuids: checkedRows }));
    }, [checkedRows, dispatch]);

    const onDeleteConfirmed = useCallback(() => {
        dispatch(actions.bulkDeleteTokenProfiles({ uuids: checkedRows }));
        setConfirmDelete(false);
    }, [checkedRows, dispatch]);

    const onUpdateKeyUsageConfirmed = useCallback(() => {
        dispatch(actions.bulkUpdateKeyUsage({ usage: { usage: keyUsages, uuids: checkedRows } }));
        setKeyUsageUpdate(false);
    }, [checkedRows, dispatch, keyUsages]);

    const setCheckedRows = useCallback(
        (rows: (string | number)[]) => {
            dispatch(actions.setCheckedRows({ checkedRows: rows as string[] }));
        },
        [dispatch],
    );

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
            {
                icon: 'key',
                disabled: checkedRows.length === 0,
                tooltip: 'Update Key Usage',
                onClick: () => {
                    setKeyUsageUpdate(true);
                },
            },
        ],
        [checkedRows, handleOpenAddModal, onEnableClick, onDisableClick, setKeyUsageUpdate],
    );

    const tokenProfilesTableHeaders: TableHeader[] = useMemo(
        () => [
            {
                id: 'name',
                content: 'Name',
                sortable: true,
                sort: 'asc',
                width: '15%',
            },
            {
                id: 'description',
                content: 'Description',
                sortable: true,
            },
            {
                id: 'usages',
                align: 'center',
                content: 'Usages',
            },
            {
                id: 'token',
                align: 'center',
                content: 'Token',
                sortable: true,
                width: '15%',
            },
            {
                id: 'tokenStatus',
                align: 'center',
                content: 'Token Status',
                sortable: true,
                width: '15%',
            },
            {
                id: 'status',
                align: 'center',
                content: 'Status',
                sortable: true,
                width: '7%',
            },
        ],
        [],
    );

    const getTokenProfileUsages = (tokenProfile: TokenProfileResponseModel) => {
        return tokenProfile.usages.map((keyUsage, i) => {
            return (
                <React.Fragment key={keyUsage + i}>
                    &nbsp;
                    <Badge color="secondary" key={keyUsage}>
                        {keyUsage}
                    </Badge>
                </React.Fragment>
            );
        });
    };

    const profilesTableData: TableDataRow[] = useMemo(
        () =>
            tokenProfiles.map((tokenProfile) => ({
                id: tokenProfile.uuid,

                columns: [
                    <span style={{ whiteSpace: 'nowrap' }}>
                        <Link to={`./detail/${tokenProfile.tokenInstanceUuid || 'unknown'}/${tokenProfile.uuid}`}>{tokenProfile.name}</Link>
                    </span>,

                    <span style={{ whiteSpace: 'nowrap' }}>{tokenProfile.description || ''}</span>,

                    <>{getTokenProfileUsages(tokenProfile)}</>,

                    tokenProfile.tokenInstanceName ? (
                        <Link to={`../tokens/detail/${tokenProfile.tokenInstanceUuid}`}>
                            {tokenProfile.tokenInstanceName ?? 'Unassigned'}
                        </Link>
                    ) : (
                        (tokenProfile.tokenInstanceName ?? 'Unassigned')
                    ),

                    <TokenStatusBadge status={tokenProfile.tokenInstanceStatus} />,

                    <StatusBadge enabled={tokenProfile.enabled} />,
                ],
            })),
        [tokenProfiles],
    );

    return (
        <>
            <Widget
                title="List of Token Profiles"
                busy={isBusy && !(isFetching && tokenProfiles.length === 0)}
                widgetLockName={LockWidgetNameEnum.ListOfTokenProfiles}
                widgetButtons={buttons}
                titleSize="large"
                refreshAction={getFreshData}
            >
                <CustomTable
                    headers={tokenProfilesTableHeaders}
                    data={profilesTableData}
                    onCheckedRowsChanged={setCheckedRows}
                    canSearch={true}
                    hasCheckboxes={true}
                    hasPagination={true}
                    isLoading={isFetching && tokenProfiles.length === 0}
                />
            </Widget>

            <Dialog
                isOpen={confirmDelete}
                caption={`Delete Token ${checkedRows.length > 1 ? 'Profiles' : 'Profile'}`}
                body={`You are about to delete ${
                    checkedRows.length > 1 ? 'Token Profiles' : 'a Token Profile'
                }. Is this what you want to do?`}
                toggle={() => setConfirmDelete(false)}
                icon="delete"
                buttons={[
                    { color: 'secondary', variant: 'outline', onClick: () => setConfirmDelete(false), body: 'Cancel' },
                    { color: 'danger', onClick: onDeleteConfirmed, body: 'Delete' },
                ]}
            />

            <Dialog
                isOpen={keyUsageUpdate}
                caption="Update Key Usage"
                body={<KeyUsageSelect value={keyUsages} onChange={setKeyUsages} keyUsageEnum={keyUsageEnum} />}
                toggle={() => setKeyUsageUpdate(false)}
                size="md"
                buttons={[
                    { color: 'secondary', variant: 'outline', onClick: () => setKeyUsageUpdate(false), body: 'Cancel' },
                    { color: 'primary', onClick: onUpdateKeyUsageConfirmed, body: 'Update' },
                ]}
            />

            <Dialog
                isOpen={isAddModalOpen || !!editingTokenProfileId}
                toggle={handleCloseAddModal}
                caption={editingTokenProfileId ? 'Edit Token Profile' : 'Create Token Profile'}
                size="xl"
                body={<TokenProfileForm tokenProfileId={editingTokenProfileId} tokenId={editingTokenId} onCancel={handleCloseAddModal} />}
            />
        </>
    );
}

export default TokenProfileList;
