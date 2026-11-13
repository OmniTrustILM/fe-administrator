import { useCallback, useEffect, useMemo, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { Link } from 'react-router';

import { actions, selectors } from 'ducks/est-profiles';
import { getEnumLabel, selectors as enumSelectors } from 'ducks/enums';

import Badge from 'components/Badge';
import Container from 'components/Container';
import CopyUrlCell from 'components/CopyUrlCell';
import CustomTable, { type TableDataRow, type TableHeader } from 'components/CustomTable';
import Dialog from 'components/Dialog';
import ForceDeleteErrorTable from 'components/ForceDeleteErrorTable';
import StatusBadge from 'components/StatusBadge';
import Widget from 'components/Widget';
import type { WidgetButtonProps } from 'components/WidgetButtons';
import { PlatformEnum } from 'types/openapi';
import { LockWidgetNameEnum } from 'types/user-interface';
import { useRunOnSuccessfulFinish } from 'utils/common-hooks';
import EstProfileForm from '../form';

const estProfilesTableHeader: TableHeader[] = [
    { id: 'name', content: 'Name', sortable: true, sort: 'asc', width: '10%' },
    { id: 'description', content: 'Description', sortable: true, width: '10%' },
    { id: 'raProfileName', content: 'RA Profile Name', sortable: true, width: '10%', align: 'center' },
    { id: 'authenticationPolicy', content: 'Authentication Policy', sortable: true, width: '10%' },
    { id: 'estUrl', content: 'EST URL', sortable: true, width: 'auto' },
    { id: 'status', content: 'Status', align: 'center', sortable: true, width: '7%' },
];

export default function EstProfilesList() {
    const dispatch = useDispatch();

    const checkedRows = useSelector(selectors.checkedRows);
    const estProfiles = useSelector(selectors.estProfiles);
    const bulkDeleteErrorMessages = useSelector(selectors.bulkDeleteErrorMessages);
    const policyEnum = useSelector(enumSelectors.platformEnum(PlatformEnum.EstAuthenticationPolicy));

    const isFetching = useSelector(selectors.isFetchingList);
    const isDeleting = useSelector(selectors.isDeleting);
    const isBulkDeleting = useSelector(selectors.isBulkDeleting);
    const isUpdating = useSelector(selectors.isUpdating);
    const isBulkEnabling = useSelector(selectors.isBulkEnabling);
    const isBulkDisabling = useSelector(selectors.isBulkDisabling);
    const isBulkForceDeleting = useSelector(selectors.isBulkForceDeleting);
    const isCreating = useSelector(selectors.isCreating);
    const createEstProfileSucceeded = useSelector(selectors.createEstProfileSucceeded);
    const updateEstProfileSucceeded = useSelector(selectors.updateEstProfileSucceeded);

    const isBusy = isFetching || isDeleting || isUpdating || isBulkDeleting || isBulkEnabling || isBulkDisabling || isBulkForceDeleting;

    const [confirmDelete, setConfirmDelete] = useState<boolean>(false);
    const [confirmForceDelete, setConfirmForceDelete] = useState<boolean>(false);
    const [isAddModalOpen, setIsAddModalOpen] = useState<boolean>(false);

    const entityName = checkedRows.length > 1 ? 'EST Profiles' : 'an EST Profile';

    const getFreshData = useCallback(() => {
        dispatch(actions.setCheckedRows({ checkedRows: [] }));
        dispatch(actions.listEstProfiles());
    }, [dispatch]);

    useEffect(() => {
        getFreshData();
    }, [getFreshData]);

    useEffect(() => {
        setConfirmForceDelete(bulkDeleteErrorMessages.length > 0);
    }, [bulkDeleteErrorMessages]);

    useRunOnSuccessfulFinish(isCreating, createEstProfileSucceeded, () => {
        setIsAddModalOpen(false);
        getFreshData();
    });
    useRunOnSuccessfulFinish(isUpdating, updateEstProfileSucceeded, getFreshData);

    const onDeleteConfirmed = useCallback(() => {
        dispatch(actions.bulkDeleteEstProfiles({ uuids: checkedRows }));
        setConfirmDelete(false);
    }, [checkedRows, dispatch]);

    const onForceDeleteConfirmed = useCallback(() => {
        dispatch(actions.clearDeleteErrorMessages());
        dispatch(actions.bulkForceDeleteEstProfiles({ uuids: checkedRows }));
    }, [dispatch, checkedRows]);

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
                onClick: () => setIsAddModalOpen(true),
            },
            {
                icon: 'trash',
                disabled: checkedRows.length === 0,
                tooltip: 'Delete',
                onClick: () => setConfirmDelete(true),
            },
            {
                icon: 'check',
                disabled: checkedRows.length === 0,
                tooltip: 'Enable',
                onClick: () => dispatch(actions.bulkEnableEstProfiles({ uuids: checkedRows })),
            },
            {
                icon: 'times',
                disabled: checkedRows.length === 0,
                tooltip: 'Disable',
                onClick: () => dispatch(actions.bulkDisableEstProfiles({ uuids: checkedRows })),
            },
        ],
        [checkedRows, dispatch],
    );

    const estProfilesTableData: TableDataRow[] = useMemo(
        () =>
            estProfiles.map((estProfile) => ({
                id: estProfile.uuid,
                columns: [
                    <span key="name" className="flex items-center gap-2 whitespace-nowrap">
                        <Link to={`./detail/${estProfile.uuid}`}>{estProfile.name}</Link>
                        {estProfile.systemDefault && <Badge color="info">System default</Badge>}
                    </span>,

                    <span key="desc" className="whitespace-nowrap">
                        {estProfile.description || ''}
                    </span>,

                    estProfile.raProfile ? (
                        <Link
                            key="raprofile"
                            to={`../raprofiles/detail/${estProfile.raProfile.authorityInstanceUuid}/${estProfile.raProfile.uuid}`}
                        >
                            {estProfile.raProfile.name}
                        </Link>
                    ) : (
                        'Unassigned'
                    ),

                    getEnumLabel(policyEnum, estProfile.authenticationPolicy),

                    <CopyUrlCell key="estUrl" label="EST URL">
                        {estProfile.estUrl}
                    </CopyUrlCell>,

                    <StatusBadge key="enabled" enabled={estProfile.enabled} />,
                ],
            })),
        [estProfiles, policyEnum],
    );

    return (
        <Container gap={4}>
            <Widget
                dataTestId="est-profiles-list-widget"
                title="List of EST Profiles"
                busy={isBusy && (!isFetching || estProfiles.length > 0)}
                disableRefresh={isBusy}
                widgetLockName={LockWidgetNameEnum.ListOfESTProfiles}
                widgetButtons={buttons}
                titleSize="large"
                refreshAction={getFreshData}
            >
                <CustomTable
                    headers={estProfilesTableHeader}
                    data={estProfilesTableData}
                    onCheckedRowsChanged={setCheckedRows}
                    canSearch={true}
                    hasCheckboxes={true}
                    hasPagination={true}
                    isLoading={isFetching && estProfiles.length === 0}
                />
            </Widget>

            <Dialog
                isOpen={confirmDelete}
                caption={`Delete ${entityName}`}
                body={`You are about to delete ${entityName}. EST clients will no longer be able to use ${
                    checkedRows.length > 1 ? 'them' : 'it'
                }. Is this what you want to do?`}
                toggle={() => setConfirmDelete(false)}
                icon="delete"
                buttons={[
                    { color: 'danger', onClick: onDeleteConfirmed, body: 'Delete' },
                    { color: 'secondary', variant: 'outline', onClick: () => setConfirmDelete(false), body: 'Cancel' },
                ]}
            />

            <Dialog
                isOpen={confirmForceDelete}
                caption={`Force Delete ${entityName}`}
                body={
                    <ForceDeleteErrorTable
                        items={bulkDeleteErrorMessages}
                        entityNameSingular="an EST Profile"
                        entityNamePlural="EST Profiles"
                        itemsCount={checkedRows.length}
                    />
                }
                toggle={() => setConfirmForceDelete(false)}
                buttons={[
                    { color: 'danger', onClick: onForceDeleteConfirmed, body: 'Force delete' },
                    { color: 'secondary', variant: 'outline', onClick: () => dispatch(actions.clearDeleteErrorMessages()), body: 'Cancel' },
                ]}
            />

            <Dialog
                isOpen={isAddModalOpen}
                toggle={() => setIsAddModalOpen(false)}
                caption="Create EST Profile"
                size="xl"
                body={<EstProfileForm onCancel={() => setIsAddModalOpen(false)} onSuccess={() => setIsAddModalOpen(false)} />}
            />
        </Container>
    );
}
