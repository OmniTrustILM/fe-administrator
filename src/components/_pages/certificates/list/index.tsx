import Dialog from 'components/Dialog';
import type { PageAction } from 'components/ActionsMenu';
import type { PageHeaderProps } from 'components/PageHeader';

import { actions, selectors } from 'ducks/certificates';
import { EntityType } from 'ducks/filters';
import { selectors as pagingSelectors } from 'ducks/paging';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { useNavigate } from 'react-router';

import { selectors as enumSelectors, getEnumLabel } from 'ducks/enums';

import { EnumColumnDescription } from 'components/EnumDescription';

import type { ApiClients } from '../../../../api';
import { buildTableRows } from 'components/CustomTable/columns';
import PagedList from 'components/PagedList/PagedList';
import { actions as userAction, selectors as userSelectors } from 'ducks/users';
import type { CertificateListResponseModel, SearchRequestModel } from 'types/certificate';
import { LockWidgetNameEnum } from 'types/user-interface';
import { dateFormatter } from 'utils/dateUtil';
import { type CertificateState, PlatformEnum, Resource } from '../../../../types/openapi';
import { getCertificateStatusColor } from 'utils/certificate';
import { buildColumnHeaders } from 'utils/tableColumns';
import CertificateGroupDialog from '../CertificateGroupDialog';
import CertificateImportDialog from '../CertificateImportDialog';
import CertificateOwnerDialog from '../CertificateOwnerDialog';
import CertificateRAProfileDialog from '../CertificateRAProfileDialog';
import Switch from 'components/Switch';
import { CERTIFICATE_COLUMNS, buildCertificateCellRegistry } from '../certificateTableHelpers';
import PendingActionDialogs from '../PendingActionButtons/PendingActionDialogs';
import type { PendingAction } from '../PendingActionButtons/types';

type Props = Readonly<{
    selectCertsOnly?: boolean;
    multiSelect?: boolean;
    onCheckedRowsChanged?: (checkedRows: (string | number)[]) => void;
    hideWidgetButtons?: boolean;
    hideAdditionalButtons?: boolean;
    isLinkDisabled?: boolean;
}>;

export default function CertificateList({
    hideWidgetButtons = false,
    selectCertsOnly = false,
    multiSelect = true,
    onCheckedRowsChanged,
    hideAdditionalButtons = false,
    isLinkDisabled = false,
}: Props) {
    const dispatch = useDispatch();
    const navigate = useNavigate();

    const certificates = useSelector(selectors.certificates);
    const listRefreshToken = useSelector(selectors.listRefreshToken);
    const listBackgroundRefreshToken = useSelector(selectors.listBackgroundRefreshToken);
    const checkedRows = useSelector(pagingSelectors.checkedRows(EntityType.CERTIFICATE));
    const users = useSelector(userSelectors.users);

    const isIssuing = useSelector(selectors.isIssuing);
    const isRevoking = useSelector(selectors.isRevoking);
    const isRenewing = useSelector(selectors.isRenewing);
    const isDeleting = useSelector(selectors.isDeleting);
    const isBulkDeleting = useSelector(selectors.isBulkDeleting);
    const isUpdatingGroup = useSelector(selectors.isUpdatingGroup);
    const isUpdatingRaProfile = useSelector(selectors.isUpdatingRaProfile);
    const isUpdatingOwner = useSelector(selectors.isUpdatingOwner);
    const isBulkUpdatingGroup = useSelector(selectors.isBulkUpdatingGroup);
    const isBulkUpdatingRaProfile = useSelector(selectors.isBulkUpdatingRaProfile);
    const isBulkUpdatingOwner = useSelector(selectors.isBulkUpdatingOwner);
    const isImporting = useSelector(selectors.isImporting);
    const certificateTypeEnum = useSelector(enumSelectors.platformEnum(PlatformEnum.CertificateType));
    const resourceEnum = useSelector(enumSelectors.platformEnum(PlatformEnum.Resource));
    const isIncludeArchived = useSelector(selectors.isIncludeArchived);
    const [upload, setUpload] = useState<boolean>(false);
    const [updateGroup, setUpdateGroup] = useState<boolean>(false);
    const [updateOwner, setUpdateOwner] = useState<boolean>(false);
    const [updateRaProfile, setUpdateRaProfile] = useState<boolean>(false);
    const [appliedFilters, setAppliedFilters] = useState<SearchRequestModel>();
    const [pendingAction, setPendingAction] = useState<PendingAction | null>(null);

    const isBusy =
        isIssuing ||
        isRevoking ||
        isRenewing ||
        isDeleting ||
        isBulkDeleting ||
        isUpdatingGroup ||
        isUpdatingRaProfile ||
        isUpdatingOwner ||
        isBulkUpdatingGroup ||
        isBulkUpdatingRaProfile ||
        isBulkUpdatingOwner;

    useEffect(() => {
        dispatch(actions.clearDeleteErrorMessages());
    }, [dispatch]);

    const getUserList = useCallback(() => {
        dispatch(userAction.list());
    }, [dispatch]);

    useEffect(() => {
        if (onCheckedRowsChanged) {
            onCheckedRowsChanged(checkedRows);
        }
    }, [checkedRows, onCheckedRowsChanged]);

    const onArchiveClick = useCallback(() => {
        dispatch(actions.bulkArchiveCertificate({ uuids: checkedRows, filters: appliedFilters }));
    }, [dispatch, checkedRows, appliedFilters]);

    const onUnarchiveClick = useCallback(() => {
        dispatch(actions.bulkUnarchiveCertificate({ uuids: checkedRows, filters: appliedFilters }));
    }, [dispatch, checkedRows, appliedFilters]);

    const pageHeader = useMemo(() => {
        if (hideWidgetButtons) return undefined;
        const nothingSelected = checkedRows.length === 0;
        const bulk = { disabled: nothingSelected, disabledReason: 'Select one or more certificates' };
        const actionsMenu: PageAction[] = hideAdditionalButtons
            ? []
            : [
                  { id: 'import', label: 'Import certificates and keys', icon: 'upload', onClick: () => setUpload(true) },
                  { id: 'override-groups', label: 'Override groups', icon: 'group', ...bulk, onClick: () => setUpdateGroup(true) },
                  {
                      id: 'override-owner',
                      label: 'Override owner',
                      icon: 'user-check',
                      ...bulk,
                      onClick: () => {
                          getUserList();
                          setUpdateOwner(true);
                      },
                  },
                  {
                      id: 'override-ra-profile',
                      label: 'Override RA profile',
                      icon: 'shield-check',
                      ...bulk,
                      onClick: () => setUpdateRaProfile(true),
                  },
                  {
                      id: 'download-pem',
                      label: 'Download PEM (.pem)',
                      icon: 'download',
                      ...bulk,
                      onClick: () => dispatch(actions.getCertificateContents({ uuids: checkedRows, format: 'pem' })),
                  },
                  {
                      id: 'download-der',
                      label: 'Download DER (.cer)',
                      icon: 'download',
                      ...bulk,
                      onClick: () => dispatch(actions.getCertificateContents({ uuids: checkedRows, format: 'cer' })),
                  },
                  { id: 'archive', label: 'Archive', icon: 'archive', ...bulk, onClick: onArchiveClick },
                  { id: 'unarchive', label: 'Unarchive', icon: 'unarchive', ...bulk, onClick: onUnarchiveClick },
              ];
        const inventoryLabel = `${getEnumLabel(resourceEnum, Resource.Certificates)} Inventory`;
        return {
            breadcrumbs: [{ label: inventoryLabel }],
            primaryAction: hideAdditionalButtons
                ? undefined
                : {
                      id: 'create',
                      label: 'Create',
                      icon: 'plus',
                      onClick: () => void navigate(`/${Resource.Certificates.toLowerCase()}/add`),
                  },
            actions: actionsMenu,
        } satisfies PageHeaderProps;
    }, [
        hideWidgetButtons,
        hideAdditionalButtons,
        checkedRows,
        resourceEnum,
        dispatch,
        getUserList,
        onArchiveClick,
        onUnarchiveClick,
        navigate,
    ]);

    const registry = useMemo(
        () =>
            buildCertificateCellRegistry({
                isLinkDisabled,
                selectCertsOnly,
                dateFormatter,
                certificateTypeEnum,
                getEnumLabel,
                onPendingAction: setPendingAction,
            }),
        [isLinkDisabled, selectCertsOnly, certificateTypeEnum],
    );

    // Beside the heading rather than inside it: a sortable heading is itself a button.
    const headerInfo = useMemo(
        () => ({
            'property:CERTIFICATE_STATE': (
                <EnumColumnDescription
                    platformEnum={PlatformEnum.CertificateState}
                    title="State"
                    colorResolver={(code) => getCertificateStatusColor(code as CertificateState)}
                />
            ),
        }),
        [],
    );

    // Off in the certificate-picker mode the locations page mounts: a dialog that selects certificates
    // is not the inventory. Memoised because the host refetches when the config's parts change.
    const configurableColumns = useMemo(
        () =>
            selectCertsOnly
                ? undefined
                : {
                      resource: Resource.Certificates,
                      standardColumns: CERTIFICATE_COLUMNS,
                      rows: certificates,
                      getRowId: (certificate: CertificateListResponseModel) => certificate.uuid,
                      registry,
                      headerInfo,
                  },
        [selectCertsOnly, certificates, registry, headerInfo],
    );

    // The same platform column set, fixed, so the dialog cannot drift from the inventory.
    const pickerHeaders = useMemo(
        () => (selectCertsOnly ? buildColumnHeaders(CERTIFICATE_COLUMNS, { info: headerInfo }) : undefined),
        [selectCertsOnly, headerInfo],
    );

    const pickerRows = useMemo(
        () =>
            selectCertsOnly
                ? buildTableRows(certificates, CERTIFICATE_COLUMNS, { getRowId: (certificate) => certificate.uuid, registry })
                : undefined,
        [selectCertsOnly, certificates, registry],
    );

    const onListCallback = useCallback(
        (filters: SearchRequestModel) => {
            // A mutation refresh replays this request, so it must carry `includeArchived` as listed.
            const request = { ...filters, includeArchived: isIncludeArchived };
            setAppliedFilters(request);
            return dispatch(actions.listCertificates(request));
        },
        [dispatch, isIncludeArchived],
    );

    return (
        <>
            <PagedList
                hideWidgetButtons={hideWidgetButtons}
                entity={EntityType.CERTIFICATE}
                onListCallback={onListCallback}
                refreshToken={listRefreshToken}
                backgroundRefreshToken={listBackgroundRefreshToken}
                onDeleteCallback={(uuids, filters) => dispatch(actions.bulkDelete({ uuids, filters }))}
                getAvailableFiltersApi={useCallback(
                    (apiClients: ApiClients) => apiClients.certificates.getCertificateSearchableFields(),
                    [],
                )}
                pageHeader={pageHeader}
                configurableColumns={configurableColumns}
                headers={pickerHeaders}
                data={pickerRows}
                isBusy={isBusy}
                title="List of Certificates"
                entityNameSingular="Certificate"
                entityNamePlural="Certificates"
                filterTitle="Certificate Inventory Filter"
                multiSelect={multiSelect}
                pageWidgetLockName={LockWidgetNameEnum.ListOfCertificates}
                addHidden
                extraFilterComponent={
                    <Switch
                        label="Include archived"
                        id="archived-switch"
                        checked={isIncludeArchived}
                        onChange={() => dispatch(actions.setIncludeArchived(!isIncludeArchived))}
                    />
                }
            />

            <Dialog
                isOpen={upload}
                caption="Import certificates and keys"
                body={<CertificateImportDialog onCancel={() => setUpload(false)} onDone={() => setUpload(false)} />}
                toggle={() => {
                    // An import in flight is seen through to its results, so the dialog is not closed under it.
                    if (!isImporting) setUpload(false);
                }}
                buttons={[]}
                size="xl"
                icon="upload"
            />

            <Dialog
                isOpen={updateGroup}
                caption="Override Groups"
                body={
                    <CertificateGroupDialog
                        uuids={checkedRows}
                        onCancel={() => setUpdateGroup(false)}
                        onUpdate={() => setUpdateGroup(false)}
                    />
                }
                toggle={() => setUpdateGroup(false)}
                buttons={[]}
                icon="users"
                size="md"
            />

            <Dialog
                isOpen={updateOwner}
                caption="Override Owner"
                body={
                    <CertificateOwnerDialog
                        users={users}
                        uuids={checkedRows}
                        onCancel={() => setUpdateOwner(false)}
                        onUpdate={() => setUpdateOwner(false)}
                    />
                }
                toggle={() => setUpdateOwner(false)}
                buttons={[]}
                icon="user-check"
                size="md"
            />

            <Dialog
                isOpen={updateRaProfile}
                caption="Override RA Profile"
                body={
                    <CertificateRAProfileDialog
                        target={{ kind: 'selection', uuids: checkedRows.map(String) }}
                        onCancel={() => setUpdateRaProfile(false)}
                        onUpdate={() => setUpdateRaProfile(false)}
                    />
                }
                toggle={() => setUpdateRaProfile(false)}
                buttons={[]}
                size="md"
                icon="shield-check"
            />

            <PendingActionDialogs action={pendingAction} onClose={() => setPendingAction(null)} />
        </>
    );
}
