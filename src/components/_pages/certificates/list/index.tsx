import type { TableDataRow, TableHeader } from 'components/CustomTable';

import Dialog from 'components/Dialog';
import type { WidgetButtonProps } from 'components/WidgetButtons';

import { actions, selectors } from 'ducks/certificates';
import { EntityType, actions as filterActions, selectors as filterSelectors } from 'ducks/filters';
import { selectors as pagingSelectors } from 'ducks/paging';
import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { useNavigate } from 'react-router';

import { selectors as enumSelectors, getEnumLabel } from 'ducks/enums';

import Dropdown from 'components/Dropdown';

import type { ApiClients } from '../../../../api';
import PagedList from 'components/PagedList/PagedList';
import { actions as userAction, selectors as userSelectors } from 'ducks/users';
import type { SearchRequestModel } from 'types/certificate';
import { LockWidgetNameEnum } from 'types/user-interface';
import { dateFormatter } from 'utils/dateUtil';
import type { AttributeRequestModel } from '../../../../types/attributes';
import { PlatformEnum, Resource } from '../../../../types/openapi';
import CertificateGroupDialog from '../CertificateGroupDialog';
import CertificateOwnerDialog from '../CertificateOwnerDialog';
import CertificateRAProfileDialog from '../CertificateRAProfileDialog';
import CertificateUploadDialog from '../CertificateUploadDialog';
import { ArrowDownToLine } from 'lucide-react';
import Switch from 'components/Switch';
import { buildCertificateRowColumns } from '../certificateTableHelpers';

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
                } catch (error) {}
            }

            setUpload(false);
        },
        [dispatch],
    );

    const downloadDropDown = useMemo(
        () => (
            <Dropdown
                title={<ArrowDownToLine size={16} />}
                btnStyle="transparent"
                // maxWidth={100}
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

    const certificatesRowHeaders: TableHeader[] = useMemo(
        () => [
            {
                content: 'State',
                align: 'center',
                id: 'state',
                width: '5%',
            },
            {
                content: 'Validation',
                align: 'center',
                id: 'validation',
                width: '5%',
            },
            {
                content: 'Compliance',
                align: 'center',
                id: 'compliance',
                width: '5%',
            },
            {
                content: '',
                align: 'center',
                id: 'keyAvailability',
                width: '1%',
            },
            {
                content: 'Common Name',
                id: 'commonName',
                width: '10%',
            },
            {
                content: 'Valid From',
                id: 'validFrom',
                width: '15%',
            },
            {
                content: 'Expires At',
                id: 'expiresAt',
                width: '15%',
            },
            {
                content: 'Groups',
                id: 'group',
                width: '15%',
            },
            {
                content: 'RA Profile',
                id: 'raProfile',
                width: '15%',
            },
            {
                content: 'Owner',
                id: 'owner',
                width: '15%',
            },
            {
                content: 'Serial number',
                id: 'serialNumber',
                width: '15%',
            },
            {
                content: 'Signature Algorithm',
                id: 'signatureAlgorithm',
                width: '15%',
            },
            {
                content: 'Public Key Algorithm',
                id: 'publicKeyAlgorithm',
                width: '15%',
            },
            {
                content: 'Issuer Common Name',
                id: 'issuerCommonName',
                width: '15%',
            },
            {
                content: 'Certificate Type',
                id: 'certificateType',
                width: '15%',
            },
            {
                content: 'Archived',
                id: 'archived',
                width: '15%',
            },
        ],
        [],
    );

    const certificateList: TableDataRow[] = useMemo(
        () =>
            certificates.map((certificate) => ({
                id: certificate.uuid,
                columns: buildCertificateRowColumns(certificate, {
                    isLinkDisabled,
                    selectCertsOnly,
                    currentFilters,
                    dispatch,
                    dateFormatter,
                    certificateTypeEnum,
                    getEnumLabel,
                }),
            })),
        [certificates, selectCertsOnly, isLinkDisabled, certificateTypeEnum, dispatch, currentFilters],
    );

    const onListCallback = useCallback(
        (filters: SearchRequestModel) => {
            setAppliedFilters(filters);
            return dispatch(actions.listCertificates({ ...filters, includeArchived: isIncludeArchived }));
        },
        [dispatch, isIncludeArchived],
    );

    useEffect(() => {
        if (withPreservedFilters && preservedFilters.length > 0 && currentFilters.length === 0) {
            dispatch(filterActions.setCurrentFilters({ entity: EntityType.CERTIFICATE, currentFilters: preservedFilters }));
        }
    }, [preservedFilters, currentFilters.length, dispatch, withPreservedFilters]);

    return (
        <>
            <PagedList
                hideWidgetButtons={hideWidgetButtons}
                entity={EntityType.CERTIFICATE}
                onListCallback={onListCallback}
                onDeleteCallback={(uuids, filters) => dispatch(actions.bulkDelete({ uuids, filters }))}
                getAvailableFiltersApi={useCallback(
                    (apiClients: ApiClients) => apiClients.certificates.getCertificateSearchableFields(),
                    [],
                )}
                additionalButtons={hideAdditionalButtons ? [] : buttons}
                headers={certificatesRowHeaders}
                data={certificateList}
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
                        onCancel={() => setUpdateRaProfile(false)}
                        onUpdate={() => setUpdateRaProfile(false)}
                    />
                }
                toggle={() => setUpdateRaProfile(false)}
                buttons={[]}
                size="md"
                icon="shield-check"
            />
        </>
    );
}
