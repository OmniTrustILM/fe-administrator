import Dialog from 'components/Dialog';
import type { WidgetButtonProps } from 'components/WidgetButtons';

import { actions, selectors } from 'ducks/certificates';
import { EntityType, actions as filterActions, selectors as filterSelectors } from 'ducks/filters';
import { selectors as pagingSelectors } from 'ducks/paging';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { useNavigate } from 'react-router';

import { selectors as enumSelectors, getEnumLabel } from 'ducks/enums';

import Dropdown from 'components/Dropdown';
import { EnumColumnDescription } from 'components/EnumDescription';

import type { ApiClients } from '../../../../api';
import { buildTableRows } from 'components/CustomTable/columns';
import PagedList from 'components/PagedList/PagedList';
import { actions as userAction, selectors as userSelectors } from 'ducks/users';
import type { CertificateListResponseModel, SearchRequestModel } from 'types/certificate';
import { LockWidgetNameEnum } from 'types/user-interface';
import { preservedFilterRestore } from 'utils/preservedFilters';
import { dateFormatter } from 'utils/dateUtil';
import type { AttributeRequestModel } from '../../../../types/attributes';
import { type CertificateState, PlatformEnum, Resource } from '../../../../types/openapi';
import { getCertificateStatusColor } from 'utils/certificate';
import { buildColumnHeaders } from 'utils/tableColumns';
import CertificateGroupDialog from '../CertificateGroupDialog';
import CertificateOwnerDialog from '../CertificateOwnerDialog';
import CertificateRAProfileDialog from '../CertificateRAProfileDialog';
import CertificateUploadDialog from '../CertificateUploadDialog';
import { ArrowDownToLine } from 'lucide-react';
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
    withPreservedFilters?: boolean;
}>;

export default function CertificateList({
    hideWidgetButtons = false,
    selectCertsOnly = false,
    multiSelect = true,
    onCheckedRowsChanged,
    hideAdditionalButtons = false,
    isLinkDisabled = false,
    withPreservedFilters = true,
}: Props) {
    const dispatch = useDispatch();
    const navigate = useNavigate();

    const certificates = useSelector(selectors.certificates);
    // Bumped by the duck on each mutation that needs the listing re-read; see `refreshToken`.

    const listRefreshToken = useSelector(selectors.listRefreshToken);
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
    const isUploading = useSelector(selectors.isUploading);
    const certificateTypeEnum = useSelector(enumSelectors.platformEnum(PlatformEnum.CertificateType));
    const isIncludeArchived = useSelector(selectors.isIncludeArchived);
    const currentFilters = useSelector(filterSelectors.currentFilters(EntityType.CERTIFICATE));
    const preservedFilters = useSelector(filterSelectors.preservedFilters(EntityType.CERTIFICATE));
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
        isBulkUpdatingOwner ||
        isUploading;

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

    const onUploadClick = useCallback(
        (data: { fileContent: string; customAttributes?: Array<AttributeRequestModel> }) => {
            if (data.fileContent) {
                try {
                    dispatch(actions.uploadCertificate({ certificate: data.fileContent, customAttributes: data.customAttributes ?? [] }));
                } catch {}
            }

            setUpload(false);
        },
        [dispatch],
    );

    const downloadDropDown = useMemo(
        () => (
            <Dropdown
                title={<ArrowDownToLine size={16} aria-hidden="true" />}
                ariaLabel="Download certificates"
                btnStyle="transparent"
                disabled={checkedRows.length === 0}
                items={[
                    {
                        title: 'Download PEM (.pem)',
                        onClick: () => {
                            dispatch(actions.getCertificateContents({ uuids: checkedRows, format: 'pem' }));
                        },
                    },
                    {
                        title: 'Download DER (.cer)',
                        onClick: () => {
                            dispatch(actions.getCertificateContents({ uuids: checkedRows, format: 'cer' }));
                        },
                    },
                ]}
            />
        ),
        [dispatch, checkedRows],
    );

    const onArchiveClick = useCallback(() => {
        dispatch(actions.bulkArchiveCertificate({ uuids: checkedRows, filters: appliedFilters }));
    }, [dispatch, checkedRows, appliedFilters]);

    const onUnarchiveClick = useCallback(() => {
        dispatch(actions.bulkUnarchiveCertificate({ uuids: checkedRows, filters: appliedFilters }));
    }, [dispatch, checkedRows, appliedFilters]);

    const buttons: WidgetButtonProps[] = useMemo(
        () =>
            selectCertsOnly
                ? []
                : [
                      {
                          icon: 'plus',
                          disabled: false,
                          tooltip: 'Add Certificate',
                          onClick: (event) => {
                              event.preventDefault();
                              navigate(`/${Resource.Certificates.toLowerCase()}/add`);
                          },
                          id: 'add-certificate',
                      },
                      {
                          icon: 'upload',
                          disabled: false,
                          tooltip: 'Upload Certificate',
                          onClick: () => {
                              setUpload(true);
                          },
                      },
                      {
                          icon: 'group',
                          disabled: checkedRows.length === 0,
                          tooltip: 'Override Groups',
                          onClick: () => {
                              setUpdateGroup(true);
                          },
                      },
                      {
                          icon: 'user-check',
                          disabled: checkedRows.length === 0,
                          tooltip: 'Override Owner',
                          onClick: () => {
                              getUserList();
                              setUpdateOwner(true);
                          },
                      },
                      {
                          icon: 'shield-check',
                          disabled: checkedRows.length === 0,
                          tooltip: 'Override RA Profile',
                          onClick: () => {
                              setUpdateRaProfile(true);
                          },
                      },
                      {
                          icon: 'download',
                          disabled: checkedRows.length === 0,
                          tooltip: 'Download',
                          custom: downloadDropDown,
                          onClick: () => {},
                      },
                      {
                          icon: 'archive',
                          disabled: checkedRows.length === 0,
                          tooltip: 'Archive',
                          onClick: onArchiveClick,
                      },
                      {
                          icon: 'unarchive',
                          disabled: checkedRows.length === 0,
                          tooltip: 'Unarchive',
                          onClick: onUnarchiveClick,
                      },
                  ],
        [checkedRows.length, downloadDropDown, selectCertsOnly, getUserList, onArchiveClick, onUnarchiveClick, navigate],
    );

    const registry = useMemo(
        () =>
            buildCertificateCellRegistry({
                isLinkDisabled,
                selectCertsOnly,
                currentFilters,
                dispatch,
                dateFormatter,
                certificateTypeEnum,
                getEnumLabel,
                onPendingAction: setPendingAction,
            }),
        [isLinkDisabled, selectCertsOnly, currentFilters, dispatch, certificateTypeEnum],
    );

    // The State legend rides beside the heading rather than inside it: a sortable heading is itself a
    // button, and a toggletip nested in one would be a control inside a control.
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

    /*
     * Off in the certificate-picker mode the locations page mounts: a dialog that selects certificates
     * is not the inventory, and the user's own saved inventory views have no business shaping a picker.
     * Memoised because the host takes the config apart and refetches when its parts change.
     */
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
                      resourceLabel: 'Certificates',
                  },
        [selectCertsOnly, certificates, registry, headerInfo],
    );

    // The picker mode renders the same platform column set, fixed: one source of truth for both paths,
    // so the dialog cannot drift from the inventory it is picking out of.
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
            // The stored request is what a mutation replays to refresh the page, so it has to be the request that
            // was listed - archived rows included - and not the filters before the flag was added.
            const request = { ...filters, includeArchived: isIncludeArchived };
            setAppliedFilters(request);
            return dispatch(actions.listCertificates(request));
        },
        [dispatch, isIncludeArchived],
    );

    /*
     * Preserved filters are a deep-link restore, so they apply on arrival and never again. The rule for
     * "never again" is `preservedFilterRestore`: a restore that finds the filters already in place is
     * finished rather than pending, or it fires later against a tab switch that deliberately cleared them.
     */
    const hasRestoredPreservedFilters = useRef(false);
    useEffect(() => {
        if (hasRestoredPreservedFilters.current) return;

        const decision = preservedFilterRestore({
            withPreservedFilters,
            preservedCount: preservedFilters.length,
            currentCount: currentFilters.length,
        });

        if (decision === 'inapplicable') return;

        hasRestoredPreservedFilters.current = true;

        if (decision === 'restore') {
            dispatch(filterActions.setCurrentFilters({ entity: EntityType.CERTIFICATE, currentFilters: preservedFilters }));
        }
    }, [preservedFilters, currentFilters.length, dispatch, withPreservedFilters]);

    return (
        <>
            <PagedList
                hideWidgetButtons={hideWidgetButtons}
                entity={EntityType.CERTIFICATE}
                onListCallback={onListCallback}
                refreshToken={listRefreshToken}
                onDeleteCallback={(uuids, filters) => dispatch(actions.bulkDelete({ uuids, filters }))}
                getAvailableFiltersApi={useCallback(
                    (apiClients: ApiClients) => apiClients.certificates.getCertificateSearchableFields(),
                    [],
                )}
                additionalButtons={hideAdditionalButtons ? [] : buttons}
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
                caption={`Upload Certificate`}
                body={<CertificateUploadDialog onCancel={() => setUpload(false)} onUpload={(data) => onUploadClick(data)} />}
                toggle={() => setUpload(false)}
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
                        uuids={checkedRows}
                        listRequest={appliedFilters}
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
