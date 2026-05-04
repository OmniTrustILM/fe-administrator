import { useCallback, useEffect, useMemo, useState } from 'react';
import { useRunOnSuccessfulFinish } from 'utils/common-hooks';
import { useDispatch, useSelector } from 'react-redux';
import { Link } from 'react-router';
import Container from 'components/Container';

import { actions, selectors } from 'ducks/compliance-profiles';

import CustomTable, { type TableDataRow, type TableHeader } from 'components/CustomTable';
import ForceDeleteErrorTable from 'components/ForceDeleteErrorTable';
import Dialog from 'components/Dialog';
import ComplianceProfileForm from '../form';
import Widget from 'components/Widget';
import type { WidgetButtonProps } from 'components/WidgetButtons';
import { LockWidgetNameEnum } from 'types/user-interface';
import Badge from 'components/Badge';

export default function AdministratorsList() {
    const dispatch = useDispatch();

    const checkedRows = useSelector(selectors.checkedRows);
    const complianceProfiles = useSelector(selectors.complianceProfiles);

    const bulkDeleteErrorMessages = useSelector(selectors.bulkDeleteErrorMessages);

    const isFetching = useSelector(selectors.isFetchingList);
    const isDeleting = useSelector(selectors.isDeleting);
    const isBulkDeleting = useSelector(selectors.isBulkDeleting);
    const isBulkForceDeleting = useSelector(selectors.isBulkForceDeleting);
    const isCreating = useSelector(selectors.isCreating);
    const createComplianceProfileSucceeded = useSelector(selectors.createComplianceProfileSucceeded);

    const isBusy = isFetching || isDeleting || isBulkDeleting || isBulkForceDeleting;

    const [confirmDelete, setConfirmDelete] = useState<boolean>(false);
    const [confirmForceDelete, setConfirmForceDelete] = useState<boolean>(false);
    const [isAddModalOpen, setIsAddModalOpen] = useState<boolean>(false);

    const [complianceCheck, setComplianceCheck] = useState<boolean>(false);

    const getFreshData = useCallback(() => {
        dispatch(actions.setCheckedRows({ checkedRows: [] }));
        dispatch(actions.getListComplianceProfiles());
    }, [dispatch]);

    useEffect(() => {
        getFreshData();
    }, [getFreshData]);

    useEffect(() => {
        setConfirmForceDelete(bulkDeleteErrorMessages.length > 0);
    }, [bulkDeleteErrorMessages]);

    useRunOnSuccessfulFinish(isCreating, createComplianceProfileSucceeded, () => {
        setIsAddModalOpen(false);
        getFreshData();
    });

    const handleOpenAddModal = useCallback(() => {
        setIsAddModalOpen(true);
    }, []);

    const handleCloseAddModal = useCallback(() => {
        setIsAddModalOpen(false);
    }, []);

    const onDeleteConfirmed = useCallback(() => {
        dispatch(actions.bulkDeleteComplianceProfiles({ uuids: checkedRows }));
        setConfirmDelete(false);
    }, [checkedRows, dispatch]);

    const onComplianceCheckConfirmed = useCallback(() => {
        dispatch(actions.checkComplianceForProfiles({ requestBody: checkedRows }));
        setComplianceCheck(false);
    }, [checkedRows, dispatch]);

    const setCheckedRows = useCallback(
        (rows: (string | number)[]) => {
            dispatch(actions.setCheckedRows({ checkedRows: rows as string[] }));
        },
        [dispatch],
    );

    const onForceDeleteConfirmed = useCallback(() => {
        dispatch(actions.clearDeleteErrorMessages());
        dispatch(actions.bulkForceDeleteComplianceProfiles({ uuids: checkedRows }));
    }, [dispatch, checkedRows]);

    const buttons: WidgetButtonProps[] = useMemo(
        () => [
            {
                icon: 'plus',
                disabled: false,
                tooltip: 'Create',
                onClick: handleOpenAddModal,
                id: 'create-compliance-profile',
            },
            {
                icon: 'gavel',
                disabled: checkedRows.length === 0,
                tooltip: 'Check Compliance',
                onClick: () => {
                    setComplianceCheck(true);
                },
                id: 'check-compliance',
            },
            {
                icon: 'trash',
                disabled: checkedRows.length === 0,
                tooltip: 'Delete',
                onClick: () => {
                    setConfirmDelete(true);
                },
                id: 'delete-compliance-profile',
            },
        ],
        [checkedRows, handleOpenAddModal],
    );

    const forceDeleteBody = (
        <ForceDeleteErrorTable
            items={bulkDeleteErrorMessages}
            entityNameSingular="a Compliance Profile"
            entityNamePlural="Compliance Profiles"
            itemsCount={checkedRows.length}
        />
    );

    const complianceProfilesTableHeader: TableHeader[] = useMemo(
        () => [
            {
                id: 'name',
                content: 'Name',
                sortable: true,
                sort: 'asc',
            },
            {
                id: 'description',
                content: 'Description',
            },
            {
                id: 'providerTotalRules',
                content: 'Provider Total Rules',
            },
            {
                id: 'providerTotalGroups',
                content: 'Provider Total Groups',
            },
            {
                id: 'internalTotalRules',
                content: 'Internal Total Rules',
            },
            {
                id: 'associations',
                content: 'Associations',
            },
        ],
        [],
    );

    const complianceProfilesTableData: TableDataRow[] = useMemo(
        () =>
            complianceProfiles.map((complianceProfile) => ({
                id: complianceProfile.uuid,

                columns: [
                    <Link key={complianceProfile.uuid} to={`./detail/${complianceProfile.uuid}`}>
                        {complianceProfile.name}
                    </Link>,
                    complianceProfile.description || '',
                    <Badge key={complianceProfile.uuid} color="secondary">
                        {complianceProfile.providerRulesCount.toString()}
                    </Badge>,
                    <Badge key={complianceProfile.uuid} color="secondary">
                        {complianceProfile.providerGroupsCount.toString()}
                    </Badge>,
                    <Badge key={complianceProfile.uuid} color="secondary">
                        {complianceProfile.internalRulesCount.toString()}
                    </Badge>,
                    <Badge key={complianceProfile.uuid} color="secondary">
                        {complianceProfile.associations.toString()}
                    </Badge>,
                ],
            })),
        [complianceProfiles],
    );

    return (
        <Container>
            <Widget
                title="List of Compliance Profiles"
                busy={isBusy && !(isFetching && complianceProfiles.length === 0)}
                widgetLockName={LockWidgetNameEnum.ListOfComplianceProfiles}
                widgetButtons={buttons}
                titleSize="large"
                refreshAction={getFreshData}
                dataTestId="compliance-profile-list"
            >
                <CustomTable
                    headers={complianceProfilesTableHeader}
                    data={complianceProfilesTableData}
                    onCheckedRowsChanged={setCheckedRows}
                    canSearch={true}
                    hasCheckboxes={true}
                    hasPagination={true}
                    isLoading={isFetching && complianceProfiles.length === 0}
                />
            </Widget>

            <Dialog
                isOpen={confirmDelete}
                caption={`Delete ${checkedRows.length > 1 ? 'Compliance Profiles' : 'a Compliance Profile'}`}
                body={`You are about to delete ${
                    checkedRows.length > 1 ? 'Compliance Profiles' : 'a Compliance Profile'
                } which may have associated RA
                   Profile(s). Is this what you want to do?`}
                toggle={() => setConfirmDelete(false)}
                icon="delete"
                buttons={[
                    { color: 'secondary', variant: 'outline', onClick: () => setConfirmDelete(false), body: 'Cancel' },
                    { color: 'danger', onClick: onDeleteConfirmed, body: 'Delete' },
                ]}
                dataTestId="delete-compliance-profile-dialog"
            />

            <Dialog
                isOpen={confirmForceDelete}
                caption={`Force Delete ${checkedRows.length > 1 ? 'Compliance Profiles' : 'a Compliance Profile'}`}
                body={forceDeleteBody}
                toggle={() => setConfirmForceDelete(false)}
                buttons={[
                    { color: 'secondary', variant: 'outline', onClick: () => dispatch(actions.clearDeleteErrorMessages()), body: 'Cancel' },
                    { color: 'danger', onClick: onForceDeleteConfirmed, body: 'Force delete' },
                ]}
                dataTestId="force-delete-compliance-profile-dialog"
                size="xl"
            />

            <Dialog
                isOpen={complianceCheck}
                caption={`Initiate Compliance Check`}
                body={'Initiate the compliance check for the selected Compliance Profile(s)?'}
                toggle={() => setComplianceCheck(false)}
                noBorder
                buttons={[
                    { color: 'primary', variant: 'outline', onClick: () => setComplianceCheck(false), body: 'Cancel' },
                    { color: 'primary', onClick: onComplianceCheckConfirmed, body: 'Yes' },
                ]}
                dataTestId="compliance-check-dialog"
            />

            <Dialog
                isOpen={isAddModalOpen}
                toggle={handleCloseAddModal}
                caption="Create Compliance Profile"
                size="xl"
                body={<ComplianceProfileForm onCancel={handleCloseAddModal} />}
            />
        </Container>
    );
}
