import AttributeViewer from 'components/Attributes/AttributeViewer';
import CustomTable, { type TableDataRow, type TableHeader } from 'components/CustomTable';
import DetailPageSkeleton from 'components/DetailPageSkeleton';
import Dialog from 'components/Dialog';
import ProgressButton from 'components/ProgressButton';
import StatusBadge from 'components/StatusBadge';

import Widget from 'components/Widget';
import WidgetButtons, { type WidgetButtonProps } from 'components/WidgetButtons';

import { actions as approvalProfileActions } from 'ducks/approval-profiles';
import { actions as raProfilesActions, selectors as raProfilesSelectors } from 'ducks/ra-profiles';
import { actions as settingsActions, selectors as settingsSelectors } from 'ducks/settings';
import { actions as complianceProfileActions, selectors as complianceProfileSelectors } from 'ducks/compliance-profiles';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { useRunOnSuccessfulFinish } from 'utils/common-hooks';
import { useDispatch, useSelector } from 'react-redux';
import { Link, useParams } from 'react-router';
import RaProfileForm from '../form';
import { Resource } from 'types/openapi';
import CustomAttributeWidget from '../../../Attributes/CustomAttributeWidget';

import { LockWidgetNameEnum } from 'types/user-interface';
import AssociateApprovalProfileDialogBody from '../AssociateApprovalProfileDialogBody';
import AssociateComplianceProfileDialogBody from '../AssociateComplianceProfileDialogBody';
import ProtocolActivationDialogBody, { Protocol } from '../ProtocolActivationDialogBody';
import TabLayout from 'components/Layout/TabLayout';
import CertificateValidationDialogBody from 'components/_pages/ra-profiles/CertificateValidationDialogBody';
import { renderExpiringThresholdLabel, renderValidationFrequencyLabel } from 'utils/certificate-validation';
import EventsTable from 'components/_pages/notifications/events-settings/EventsTable';
import { createWidgetDetailHeaders } from 'utils/widget';
import Breadcrumb from 'components/Breadcrumb';
import Container from 'components/Container';
import Switch from 'components/Switch';

interface DeassociateApprovalProfileDialogState {
    isDialogOpen: boolean;
    associatedApprovalProfileName: string;
    associatedApprovalProfileUuid: string;
}

export default function RaProfileDetail() {
    const dispatch = useDispatch();

    const { id, authorityId } = useParams();

    const raProfile = useSelector(raProfilesSelectors.raProfile);
    const acmeDetails = useSelector(raProfilesSelectors.acmeDetails);
    const scepDetails = useSelector(raProfilesSelectors.scepDetails);
    const cmpDetails = useSelector(raProfilesSelectors.cmpDetails);
    const associatedComplianceProfiles = useSelector(complianceProfileSelectors.associatedComplianceProfiles);
    const associatedApprovalProfiles = useSelector(raProfilesSelectors.associatedApprovalProfiles);
    const isDissociatingApprovalProfile = useSelector(raProfilesSelectors.isDissociatingApprovalProfile);
    const isFetchingApprovalProfiles = useSelector(raProfilesSelectors.isFetchingApprovalProfiles);
    const isFetchingProfile = useSelector(raProfilesSelectors.isFetchingDetail);
    const isFetchingAcmeDetails = useSelector(raProfilesSelectors.isFetchingAcmeDetails);
    const isFetchingScepDetails = useSelector(raProfilesSelectors.isFetchingScepDetails);
    const isFetchingCmpDetails = useSelector(raProfilesSelectors.isFetchingCmpDetails);

    const isDeleting = useSelector(raProfilesSelectors.isDeleting);
    const isEnabling = useSelector(raProfilesSelectors.isEnabling);
    const isDisabling = useSelector(raProfilesSelectors.isDisabling);
    const isUpdating = useSelector(raProfilesSelectors.isUpdating);
    const updateRaProfileSucceeded = useSelector(raProfilesSelectors.updateRaProfileSucceeded);
    const isActivatingAcme = useSelector(raProfilesSelectors.isActivatingAcme);
    const isDeactivatingAcme = useSelector(raProfilesSelectors.isDeactivatingAcme);
    const isActivatingCmp = useSelector(raProfilesSelectors.isActivatingCmp);
    const isDeactivatingCmp = useSelector(raProfilesSelectors.isDeactivatingCmp);
    const isActivatingScep = useSelector(raProfilesSelectors.isActivatingScep);
    const isDeactivatingScep = useSelector(raProfilesSelectors.isDeactivatingScep);
    const isFetchingAssociatedComplianceProfiles = useSelector(complianceProfileSelectors.isFetchingAssociatedComplianceProfiles);

    const platformSettings = useSelector(settingsSelectors.platformSettings);
    const isFetchingPlatform = useSelector(settingsSelectors.isFetchingPlatform);
    const [confirmDelete, setConfirmDelete] = useState<boolean>(false);

    const [activateAcmeDialog, setActivateAcmeDialog] = useState(false);
    const [activateScepDialog, setActivateScepDialog] = useState(false);
    const [activateCmpDialog, setActivateCmpDialog] = useState(false);

    const [confirmDeactivateAcme, setConfirmDeactivateAcme] = useState<boolean>(false);
    const [confirmDeactivateScep, setConfirmDeactivateScep] = useState<boolean>(false);
    const [confirmDeactivateCmp, setConfirmDeactivateCmp] = useState<boolean>(false);

    const [complianceCheck, setComplianceCheck] = useState<boolean>(false);

    const [associateComplianceProfile, setAssociateComplianceProfile] = useState<boolean>(false);

    const [associateApprovalProfileDialog, setAssociateApprovalProfileDialog] = useState<boolean>(false);
    const [confirmDeassociateApprovalProfileDialog, setConfirmDeassociateApprovalProfileDialog] =
        useState<DeassociateApprovalProfileDialogState>();

    const [certificateValidationDialog, setCertificateValidationDialog] = useState<boolean>(false);
    const [isEditModalOpen, setIsEditModalOpen] = useState<boolean>(false);

    const isBusy = useMemo(
        () =>
            isFetchingProfile ||
            isDeleting ||
            isEnabling ||
            isDisabling ||
            isFetchingApprovalProfiles ||
            isDissociatingApprovalProfile ||
            isFetchingPlatform,
        [
            isFetchingProfile,
            isDeleting,
            isEnabling,
            isDisabling,
            isFetchingApprovalProfiles,
            isDissociatingApprovalProfile,
            isFetchingPlatform,
        ],
    );

    const isWorkingWithProtocol = useMemo(
        () =>
            isActivatingAcme ||
            isDeactivatingAcme ||
            isFetchingAcmeDetails ||
            isActivatingScep ||
            isDeactivatingScep ||
            isFetchingScepDetails ||
            isFetchingCmpDetails,
        [
            isActivatingAcme,
            isDeactivatingAcme,
            isFetchingAcmeDetails,
            isActivatingScep,
            isDeactivatingScep,
            isFetchingScepDetails,
            isFetchingCmpDetails,
        ],
    );

    const getFreshRaProfileDetail = useCallback(() => {
        if (!id || !authorityId || authorityId === 'undefined') {
            return;
        }
        if (authorityId === 'unknown') {
            dispatch(raProfilesActions.getRaProfileWithoutAuthority({ uuid: id }));
        } else {
            dispatch(raProfilesActions.getRaProfileDetail({ authorityUuid: authorityId, uuid: id }));
        }
    }, [id, dispatch, authorityId]);

    const getFreshComplianceRaProfileDetail = useCallback(() => {
        if (!id) return;
        dispatch(complianceProfileActions.getAssociatedComplianceProfiles({ resource: Resource.RaProfiles, associationObjectUuid: id }));
    }, [id, dispatch]);

    const getFreshAvailableProtocols = useCallback(() => {
        if (!id || !authorityId) return;
        if (authorityId === 'unknown' || authorityId === 'undefined') return;

        dispatch(raProfilesActions.getAcmeDetails({ authorityUuid: authorityId, uuid: id }));
        dispatch(raProfilesActions.getScepDetails({ authorityUuid: authorityId, uuid: id }));
        dispatch(raProfilesActions.getCmpDetails({ authorityUuid: authorityId, uuid: id }));
    }, [id, dispatch, authorityId]);

    const getFreshAssociatedApprovalProfiles = useCallback(() => {
        if (!id || !authorityId) return;
        if (authorityId === 'unknown' || authorityId === 'undefined') return;

        dispatch(raProfilesActions.getAssociatedApprovalProfiles({ authorityUuid: authorityId, raProfileUuid: id }));
    }, [id, dispatch, authorityId]);

    const getFreshAllApprovalProfiles = useCallback(() => {
        if (authorityId === 'unknown' || authorityId === 'undefined') return;

        dispatch(approvalProfileActions.listApprovalProfiles());
    }, [dispatch, authorityId]);

    useEffect(() => {
        getFreshRaProfileDetail();
        getFreshComplianceRaProfileDetail();
        getFreshAssociatedApprovalProfiles();
    }, [getFreshRaProfileDetail, getFreshComplianceRaProfileDetail, getFreshAssociatedApprovalProfiles]);

    useEffect(() => {
        if (!raProfile) return;

        if (!raProfile?.legacyAuthority) {
            getFreshAvailableProtocols();
        }
    }, [raProfile, getFreshAvailableProtocols]);

    useEffect(() => {
        if (platformSettings) return;

        dispatch(settingsActions.getPlatformSettings());
    }, [dispatch, platformSettings]);

    // use effect to clear the ra profile detail when the component is unmounted
    useEffect(() => {
        return () => {
            dispatch(raProfilesActions.clearRaProfileDetail());
        };
    }, [dispatch]);

    useRunOnSuccessfulFinish(isUpdating, updateRaProfileSucceeded, () => {
        setIsEditModalOpen(false);
        getFreshRaProfileDetail();
    });

    const handleCloseEditModal = useCallback(() => {
        setIsEditModalOpen(false);
    }, []);

    const onEditClick = useCallback(() => {
        if (!raProfile) return;
        setIsEditModalOpen(true);
    }, [raProfile]);

    const onEnableClick = useCallback(() => {
        if (!raProfile) return;
        if (authorityId === 'unknown') {
            dispatch(raProfilesActions.bulkEnableRaProfiles({ uuids: [raProfile.uuid] }));
        } else {
            dispatch(
                raProfilesActions.enableRaProfile({ authorityUuid: raProfile.authorityInstanceUuid ?? 'unknown', uuid: raProfile.uuid }),
            );
        }
    }, [dispatch, raProfile, authorityId]);

    const onDisableClick = useCallback(() => {
        if (!raProfile) return;
        if (authorityId === 'unknown') {
            dispatch(raProfilesActions.bulkDisableRaProfiles({ uuids: [raProfile.uuid] }));
        } else {
            dispatch(
                raProfilesActions.disableRaProfile({ authorityUuid: raProfile.authorityInstanceUuid ?? 'unknown', uuid: raProfile.uuid }),
            );
        }
    }, [dispatch, raProfile, authorityId]);

    const onDeleteConfirmed = useCallback(() => {
        if (!raProfile) return;
        if (authorityId === 'unknown') {
            dispatch(raProfilesActions.deleteRaProfileWithoutAuthority({ uuid: raProfile.uuid, redirect: '../../../raprofiles' }));
        } else {
            dispatch(
                raProfilesActions.deleteRaProfile({
                    authorityUuid: raProfile.authorityInstanceUuid ?? 'unknown',
                    uuid: raProfile.uuid,
                    redirect: '../../../raprofiles',
                }),
            );
        }

        setConfirmDelete(false);
    }, [dispatch, raProfile, authorityId]);

    const onDeactivateAcmeConfirmed = useCallback(() => {
        if (!raProfile) return;
        dispatch(raProfilesActions.deactivateAcme({ authorityUuid: raProfile.authorityInstanceUuid ?? 'unknown', uuid: raProfile.uuid }));
        setConfirmDeactivateAcme(false);
    }, [dispatch, raProfile]);

    const openAcmeActivationDialog = useCallback(() => {
        setActivateAcmeDialog(true);
    }, []);

    const onDeactivateCmpConfirmed = useCallback(() => {
        if (!raProfile) return;
        dispatch(raProfilesActions.deactivateCmp({ authorityUuid: raProfile.authorityInstanceUuid ?? 'unknown', uuid: raProfile.uuid }));
        setConfirmDeactivateCmp(false);
    }, [dispatch, raProfile]);

    const openCmpActivationDialog = useCallback(() => {
        setActivateCmpDialog(true);
    }, []);

    const onDeactivateScepConfirmed = useCallback(() => {
        if (!raProfile) return;
        dispatch(raProfilesActions.deactivateScep({ authorityUuid: raProfile.authorityInstanceUuid ?? 'unknown', uuid: raProfile.uuid }));
        setConfirmDeactivateScep(false);
    }, [dispatch, raProfile]);

    const onDissociateApprovalProfile = useCallback(
        (approvalProfileUuid: string) => {
            if (!raProfile || !authorityId) return;
            dispatch(
                raProfilesActions.disassociateRAProfileFromApprovalProfile({
                    approvalProfileUuid: approvalProfileUuid,
                    authorityUuid: authorityId,
                    raProfileUuid: raProfile.uuid,
                }),
            );
            setConfirmDeassociateApprovalProfileDialog(undefined);
        },
        [raProfile, authorityId, dispatch],
    );

    const openScepActivationDialog = useCallback(() => {
        setActivateScepDialog(true);
    }, []);

    const onComplianceCheck = useCallback(() => {
        setComplianceCheck(false);

        if (!raProfile?.uuid) return;

        dispatch(raProfilesActions.checkCompliance({ resource: Resource.RaProfiles, uuids: [raProfile.uuid] }));
    }, [dispatch, raProfile]);

    const onDissociateComplianceProfile = useCallback(
        (uuid: string) => {
            if (!raProfile) return;

            dispatch(
                complianceProfileActions.dissociateComplianceProfile({
                    uuid: uuid,
                    resource: Resource.RaProfiles,
                    associationObjectUuid: raProfile.uuid,
                }),
            );
        },
        [raProfile, dispatch],
    );

    const buttons: WidgetButtonProps[] = useMemo(
        () => [
            {
                id: 'edit',
                icon: 'pencil',
                disabled: authorityId === 'unknown',
                tooltip: 'Edit',
                onClick: () => {
                    onEditClick();
                },
            },
            {
                id: 'delete',
                icon: 'trash',
                disabled: false,
                tooltip: 'Delete',
                onClick: () => {
                    setConfirmDelete(true);
                },
            },
            {
                id: 'enable',
                icon: 'check',
                disabled: !!raProfile?.enabled,
                tooltip: 'Enable',
                onClick: () => {
                    onEnableClick();
                },
            },
            {
                id: 'disable',
                icon: 'times',
                disabled: !raProfile?.enabled,
                tooltip: 'Disable',
                onClick: () => {
                    onDisableClick();
                },
            },
            {
                id: 'check-compliance',
                icon: 'gavel',
                disabled: !raProfile?.authorityInstanceUuid || false,
                tooltip: 'Check Compliance',
                onClick: () => {
                    setComplianceCheck(true);
                },
            },
        ],
        [raProfile, onEditClick, onDisableClick, onEnableClick, authorityId],
    );

    const complianceProfileButtons: WidgetButtonProps[] = useMemo(
        () => [
            {
                icon: 'plus',
                disabled: false,
                tooltip: 'Associate Compliance Profile',
                onClick: () => {
                    setAssociateComplianceProfile(true);
                },
                id: 'associate-compliance-profile',
            },
        ],
        [],
    );

    const approvalProfilesButtons: WidgetButtonProps[] = useMemo(
        () => [
            {
                id: 'add',
                icon: 'plus',
                disabled: false,
                tooltip: 'Associate Approval Profile',
                onClick: () => {
                    setAssociateApprovalProfileDialog(true);
                    getFreshAllApprovalProfiles();
                },
            },
        ],
        [getFreshAllApprovalProfiles],
    );

    const certificateValidationButtons: WidgetButtonProps[] = useMemo(
        () => [
            {
                id: 'edit',
                icon: 'pencil',
                disabled: false,
                tooltip: 'Edit Validation Settings',
                onClick: () => {
                    setCertificateValidationDialog(true);
                },
            },
        ],
        [],
    );

    const approvalProfilesHeaders: TableHeader[] = useMemo(
        () => [
            {
                id: 'approvalProfileName',
                content: 'Name',
            },
            {
                id: 'description',
                content: 'Description',
            },
            {
                id: 'expiry',
                content: 'Expiry (in hours)',
            },
            {
                id: 'action',
                content: 'Action',
            },
        ],
        [],
    );

    const approvalProfilesData: TableDataRow[] = useMemo(
        () =>
            associatedApprovalProfiles
                ? (associatedApprovalProfiles || []).map((profile) => ({
                      id: profile.uuid,
                      columns: [
                          <Link key="name" to={`../../../approvalprofiles/detail/${profile.uuid}`}>
                              {profile.name}
                          </Link>,

                          profile.description || '',

                          profile?.expiry?.toString() || '',

                          <WidgetButtons
                              key="actions"
                              buttons={[
                                  {
                                      id: 'remove',
                                      icon: 'minus-square',
                                      disabled: false,
                                      tooltip: 'Remove',
                                      onClick: () => {
                                          setConfirmDeassociateApprovalProfileDialog({
                                              associatedApprovalProfileName: profile.name,
                                              associatedApprovalProfileUuid: profile.uuid,
                                              isDialogOpen: true,
                                          });
                                      },
                                  },
                              ]}
                          />,
                      ],
                  }))
                : [],
        [associatedApprovalProfiles],
    );

    const complianceProfileHeaders: TableHeader[] = useMemo(
        () => [
            {
                id: 'complianceProfileName',
                content: 'Name',
            },
            {
                id: 'description',
                content: 'Description',
            },
            {
                id: 'action',
                content: 'Action',
            },
        ],
        [],
    );

    const complianceProfileData: TableDataRow[] = useMemo(
        () =>
            associatedComplianceProfiles
                ? (associatedComplianceProfiles || []).map((profile) => ({
                      id: profile.uuid,
                      columns: [
                          <Link key="name" to={`../../../complianceprofiles/detail/${profile.uuid}`}>
                              {profile.name}
                          </Link>,

                          profile.description || '',

                          <WidgetButtons
                              key="actions"
                              buttons={[
                                  {
                                      id: 'ra' + profile.uuid,
                                      icon: 'minus-square',
                                      disabled: false,
                                      tooltip: 'Remove',
                                      onClick: () => {
                                          onDissociateComplianceProfile(profile.uuid);
                                      },
                                  },
                              ]}
                          />,
                      ],
                  }))
                : [],
        [associatedComplianceProfiles, onDissociateComplianceProfile],
    );

    const detailHeaders: TableHeader[] = useMemo(() => createWidgetDetailHeaders(), []);

    const detailData: TableDataRow[] = useMemo(() => {
        if (!raProfile) return [];

        return [
            {
                id: 'uuid',
                columns: ['UUID', raProfile.uuid],
            },
            {
                id: 'name',
                columns: ['Name', raProfile.name],
            },
            {
                id: 'description',
                columns: ['Description', raProfile.description || ''],
            },
            {
                id: 'enabled',
                columns: ['Enabled', <StatusBadge enabled={raProfile!.enabled} />],
            },
            {
                id: 'authorityUuid',
                columns: ['Authority Instance UUID', raProfile.authorityInstanceUuid ?? ''],
            },
            {
                id: 'authorityName',
                columns: [
                    'Authority Instance Name',
                    raProfile.authorityInstanceUuid ? (
                        <Link to={`../../authorities/detail/${raProfile.authorityInstanceUuid}`}>{raProfile.authorityInstanceName}</Link>
                    ) : (
                        ''
                    ),
                ],
            },
        ];
    }, [raProfile]);

    const protocolProfileHeaders: TableHeader[] = useMemo(
        () => [
            {
                id: 'property',
                content: '',
            },
            {
                id: 'value',
                content: '',
            },
        ],
        [],
    );

    const acmeProfileData: TableDataRow[] = useMemo(
        () =>
            acmeDetails
                ? [
                      {
                          id: 'uuid',
                          columns: ['UUID', acmeDetails.uuid || ''],
                      },
                      {
                          id: 'name',
                          columns: ['Name', acmeDetails.name || ''],
                      },
                      {
                          id: 'Directory URL',
                          columns: ['Directory URL', acmeDetails.directoryUrl || ''],
                      },
                  ]
                : [],
        [acmeDetails],
    );

    const cmpProfileData: TableDataRow[] = useMemo(
        () =>
            cmpDetails
                ? [
                      {
                          id: 'uuid',
                          columns: ['UUID', cmpDetails.uuid || ''],
                      },
                      {
                          id: 'name',
                          columns: ['Name', cmpDetails.name || ''],
                      },
                      {
                          id: 'URL',
                          columns: ['CMP URL', cmpDetails.cmpUrl || ''],
                      },
                  ]
                : [],
        [cmpDetails],
    );

    const scepProfileData: TableDataRow[] = useMemo(
        () =>
            scepDetails
                ? [
                      {
                          id: 'uuid',
                          columns: ['UUID', scepDetails.uuid || ''],
                      },
                      {
                          id: 'name',
                          columns: ['Name', scepDetails.name || ''],
                      },
                      {
                          id: 'URL',
                          columns: ['URL', scepDetails.url || ''],
                      },
                  ]
                : [],
        [scepDetails],
    );

    const availableProtocolsHeaders: TableHeader[] = useMemo(
        () => [
            {
                id: 'name',
                content: 'Protocol name',
                sortable: true,
                width: '10%',
                sort: 'asc',
            },
            {
                id: 'status',
                content: 'Status',
                sortable: true,
                align: 'center',
                width: '10%',
            },
            {
                id: 'actions',
                content: 'Actions',
                align: 'center',
                width: '10%',
            },
        ],
        [],
    );

    const availableProtocolsData: TableDataRow[] = useMemo(
        () => [
            {
                id: 'acme',
                columns: [
                    'ACME',
                    <StatusBadge key="status" enabled={acmeDetails ? acmeDetails.acmeAvailable : false} />,
                    <ProgressButton
                        key="action"
                        type="button"
                        title={acmeDetails?.acmeAvailable ? 'Deactivate' : 'Activate'}
                        inProgressTitle={acmeDetails?.acmeAvailable ? 'Deactivating...' : 'Activating...'}
                        inProgress={isActivatingAcme || isDeactivatingAcme}
                        onClick={() => (acmeDetails?.acmeAvailable ? setConfirmDeactivateAcme(true) : openAcmeActivationDialog())}
                    />,
                ],
                detailColumns: [
                    <></>,
                    <></>,
                    <></>,

                    acmeDetails?.acmeAvailable ? (
                        <>
                            <b>Protocol settings</b>
                            <br />
                            <br />
                            <CustomTable hasHeader={false} headers={protocolProfileHeaders} data={acmeProfileData} />

                            {acmeDetails?.issueCertificateAttributes && acmeDetails.issueCertificateAttributes.length > 0 ? (
                                <>
                                    <b>Settings for certificate issuing</b>
                                    <br />
                                    <br />
                                    <AttributeViewer hasHeader={false} attributes={acmeDetails?.issueCertificateAttributes} />
                                </>
                            ) : (
                                <></>
                            )}

                            {acmeDetails?.revokeCertificateAttributes && acmeDetails.revokeCertificateAttributes.length > 0 ? (
                                <>
                                    <b>Settings for certificate revocation</b>
                                    <br />
                                    <br />
                                    <AttributeViewer hasHeader={false} attributes={acmeDetails?.revokeCertificateAttributes} />
                                </>
                            ) : (
                                <></>
                            )}
                        </>
                    ) : (
                        <>ACME is not active</>
                    ),
                ],
            },
            {
                id: 'scep',
                columns: [
                    'SCEP',
                    <StatusBadge key="status" enabled={scepDetails ? scepDetails.scepAvailable : false} />,
                    <ProgressButton
                        key="action"
                        type="button"
                        title={scepDetails?.scepAvailable ? 'Deactivate' : 'Activate'}
                        inProgressTitle={scepDetails?.scepAvailable ? 'Deactivating...' : 'Activating...'}
                        inProgress={isActivatingScep || isDeactivatingScep}
                        onClick={() => (scepDetails?.scepAvailable ? setConfirmDeactivateScep(true) : openScepActivationDialog())}
                    />,
                ],
                detailColumns: [
                    <></>,
                    <></>,
                    <></>,

                    scepDetails?.scepAvailable ? (
                        <>
                            <b>Protocol settings</b>
                            <br />
                            <br />
                            <CustomTable hasHeader={false} headers={protocolProfileHeaders} data={scepProfileData} />

                            {scepDetails?.issueCertificateAttributes && scepDetails.issueCertificateAttributes.length > 0 ? (
                                <>
                                    <b>Settings for certificate issuing</b>
                                    <br />
                                    <br />
                                    <AttributeViewer hasHeader={false} attributes={scepDetails?.issueCertificateAttributes} />
                                </>
                            ) : (
                                <></>
                            )}
                        </>
                    ) : (
                        <>SCEP is not active</>
                    ),
                ],
            },

            {
                id: 'cmp',
                columns: [
                    'CMP',
                    <StatusBadge key="status" enabled={cmpDetails ? cmpDetails.cmpAvailable : false} />,
                    <ProgressButton
                        key="action"
                        type="button"
                        title={cmpDetails?.cmpAvailable ? 'Deactivate' : 'Activate'}
                        inProgressTitle={cmpDetails?.cmpAvailable ? 'Deactivating...' : 'Activating...'}
                        inProgress={isActivatingCmp || isDeactivatingCmp}
                        onClick={() => (cmpDetails?.cmpAvailable ? setConfirmDeactivateCmp(true) : openCmpActivationDialog())}
                    />,
                ],
                detailColumns: [
                    <></>,
                    <></>,
                    <></>,
                    cmpDetails?.cmpAvailable ? (
                        <>
                            <b>Protocol settings</b>
                            <br />
                            <br />
                            <CustomTable hasHeader={false} headers={protocolProfileHeaders} data={cmpProfileData} />

                            {cmpDetails?.issueCertificateAttributes && cmpDetails.issueCertificateAttributes.length > 0 ? (
                                <>
                                    <b>Settings for certificate issuing</b>
                                    <br />
                                    <br />
                                    <AttributeViewer hasHeader={false} attributes={cmpDetails?.issueCertificateAttributes} />
                                </>
                            ) : (
                                <></>
                            )}

                            {cmpDetails?.revokeCertificateAttributes && cmpDetails.revokeCertificateAttributes.length > 0 ? (
                                <>
                                    <b>Settings for certificate revocation</b>
                                    <br />
                                    <br />
                                    <AttributeViewer hasHeader={false} attributes={cmpDetails?.revokeCertificateAttributes} />
                                </>
                            ) : (
                                <></>
                            )}
                        </>
                    ) : (
                        <>CMP is not active</>
                    ),
                ],
            },
        ],
        [
            acmeDetails,
            scepDetails,
            cmpDetails,
            isActivatingAcme,
            isDeactivatingAcme,
            isActivatingCmp,
            isDeactivatingCmp,
            isActivatingScep,
            isDeactivatingScep,
            protocolProfileHeaders,
            acmeProfileData,
            scepProfileData,
            cmpProfileData,
            openAcmeActivationDialog,
            openScepActivationDialog,
            openCmpActivationDialog,
        ],
    );

    const certificateValidationHeaders: TableHeader[] = useMemo(
        () => [
            {
                id: 'setting',
                content: 'Setting',
                width: '70%',
            },
            {
                id: 'value',
                content: 'Value',
                width: '30%',
            },
        ],
        [],
    );

    const certificateValidationData: TableDataRow[] = useMemo(() => {
        if (!raProfile) return [];
        const raProfileValidationSettings = raProfile.certificateValidationSettings;
        const platformValidationSettings = platformSettings?.certificates?.validation;

        const data = [
            {
                id: 'usePlatformSettings',
                columns: [
                    'Platform Validation Settings Used',
                    <Switch
                        onChange={() => {}}
                        key="usePlatformSettings"
                        checked={raProfileValidationSettings.usePlatformSettings}
                        disabled
                        id="usePlatformSettings"
                    />,
                ],
            },
        ];

        let mappedValidation: {
            enabled?: boolean;
            frequency?: number;
            expiringThreshold?: number;
        } = {
            enabled: false,
        };

        if (raProfileValidationSettings.enabled) {
            mappedValidation = {
                enabled: raProfileValidationSettings.enabled,
                frequency: raProfileValidationSettings.frequency,
                expiringThreshold: raProfileValidationSettings.expiringThreshold,
            };
        }
        if (raProfileValidationSettings.usePlatformSettings) {
            mappedValidation = {
                enabled: platformValidationSettings?.enabled,
                frequency: platformValidationSettings?.frequency,
                expiringThreshold: platformValidationSettings?.expiringThreshold,
            };
        }

        data.push({
            id: 'enabled',
            columns: [
                'Validation Enabled',
                <Switch
                    onChange={() => {}}
                    id="validationEnabled"
                    key="validationEnabled"
                    checked={mappedValidation.enabled || false}
                    disabled
                />,
            ],
        });

        if (mappedValidation.enabled) {
            data.push(
                {
                    id: 'frequency',
                    columns: ['Validation Frequency', renderValidationFrequencyLabel(mappedValidation.frequency)],
                },
                {
                    id: 'expiringThreshold',
                    columns: ['Expiring Threshold', renderExpiringThresholdLabel(mappedValidation.expiringThreshold)],
                },
            );
        }

        return data;
    }, [raProfile, platformSettings]);

    if (isFetchingProfile) {
        return <DetailPageSkeleton layout="tabs" tabCount={5} />;
    }

    return (
        <div>
            <Breadcrumb
                items={[
                    { label: 'RA Profiles', href: '/raprofiles' },
                    { label: raProfile?.name || 'RA Profile Details', href: '' },
                ]}
            />
            <Widget widgetLockName={LockWidgetNameEnum.RaProfileDetails} busy={isBusy} noBorder>
                <TabLayout
                    tabs={[
                        {
                            title: 'Details',
                            content: (
                                <Container className="md:flex-row">
                                    <Widget
                                        title="RA Profile Details"
                                        busy={isFetchingProfile}
                                        widgetButtons={buttons}
                                        titleSize="large"
                                        refreshAction={getFreshRaProfileDetail}
                                        lockSize="large"
                                        className="w-full md:w-1/2"
                                    >
                                        <CustomTable headers={detailHeaders} data={detailData} />
                                    </Widget>
                                    <Container className="w-full md:w-1/2 flex flex-col">
                                        <Widget
                                            title="Compliance Profiles"
                                            busy={isFetchingAssociatedComplianceProfiles}
                                            widgetButtons={complianceProfileButtons}
                                            titleSize="large"
                                            refreshAction={getFreshComplianceRaProfileDetail}
                                            widgetLockName={LockWidgetNameEnum.RaProfileComplianceDetails}
                                            lockSize="large"
                                            dataTestId="compliance-profile-widget"
                                        >
                                            <CustomTable headers={complianceProfileHeaders} data={complianceProfileData} />
                                        </Widget>

                                        <Widget
                                            title="Approval Profiles"
                                            widgetButtons={approvalProfilesButtons}
                                            titleSize="large"
                                            refreshAction={getFreshAssociatedApprovalProfiles}
                                            lockSize="large"
                                            widgetLockName={LockWidgetNameEnum.ListOfApprovalProfiles}
                                        >
                                            <CustomTable headers={approvalProfilesHeaders} data={approvalProfilesData} />
                                        </Widget>
                                    </Container>
                                </Container>
                            ),
                        },
                        {
                            title: 'Protocols',
                            content: !raProfile?.legacyAuthority && (
                                <Widget
                                    title="Available Protocols"
                                    busy={isBusy || isWorkingWithProtocol}
                                    titleSize="large"
                                    refreshAction={getFreshAvailableProtocols}
                                >
                                    <CustomTable hasDetails={true} headers={availableProtocolsHeaders} data={availableProtocolsData} />
                                </Widget>
                            ),
                            disabled: !!raProfile?.legacyAuthority,
                        },
                        {
                            title: 'Attributes',
                            content: (
                                <Container className="md:flex-row">
                                    <Widget title="RA Profile Attributes" titleSize="large" lockSize="large" className="w-full md:w-1/2">
                                        {raProfile?.attributes && raProfile.attributes.length > 0 ? (
                                            <AttributeViewer attributes={raProfile?.attributes} />
                                        ) : (
                                            <></>
                                        )}
                                    </Widget>
                                    {raProfile && (
                                        <CustomAttributeWidget
                                            resource={Resource.RaProfiles}
                                            resourceUuid={raProfile.uuid}
                                            attributes={raProfile.customAttributes}
                                            className="w-full md:w-1/2"
                                        />
                                    )}
                                </Container>
                            ),
                        },
                        {
                            title: 'Validation',
                            content: (
                                <Widget
                                    title="Certificate Validation Details"
                                    widgetButtons={certificateValidationButtons}
                                    titleSize="large"
                                    refreshAction={getFreshRaProfileDetail}
                                    widgetLockName={LockWidgetNameEnum.PlatformSettings}
                                    lockSize="large"
                                >
                                    <CustomTable headers={certificateValidationHeaders} data={certificateValidationData} />
                                </Widget>
                            ),
                        },
                        {
                            title: 'Events',
                            content: raProfile && (
                                <EventsTable
                                    mode="association"
                                    resource={Resource.RaProfiles}
                                    resourceUuid={raProfile.uuid}
                                    widgetLocks={[LockWidgetNameEnum.EventSettings]}
                                />
                            ),
                        },
                    ]}
                />
            </Widget>

            <Dialog
                isOpen={confirmDelete}
                caption="Delete RA Profile"
                body="You are about to delete this RA Profile which may have existing
                  authorizations from clients. If you continue, these authorizations
                  will be deleted as well. Is this what you want to do?"
                toggle={() => setConfirmDelete(false)}
                size="lg"
                icon="delete"
                buttons={[
                    { color: 'secondary', variant: 'outline', onClick: () => setConfirmDelete(false), body: 'Cancel' },
                    { color: 'danger', onClick: onDeleteConfirmed, body: 'Delete' },
                ]}
            />

            <Dialog
                isOpen={associateComplianceProfile}
                caption="Associate Compliance Profile"
                body={AssociateComplianceProfileDialogBody({
                    visible: associateComplianceProfile,
                    onClose: () => setAssociateComplianceProfile(false),
                    raProfile: raProfile,
                    availableComplianceProfileUuids: associatedComplianceProfiles.map((e) => e.uuid),
                })}
                toggle={() => setAssociateComplianceProfile(false)}
                buttons={[]}
                dataTestId="associate-compliance-profile-dialog"
            />

            <Dialog
                isOpen={confirmDeactivateAcme}
                caption="Deactivate ACME"
                body="You are about to deactivate ACME protocol for the RA profile. Is this what you want to do?"
                toggle={() => setConfirmDeactivateAcme(false)}
                buttons={[
                    { color: 'secondary', variant: 'outline', onClick: () => setConfirmDeactivateAcme(false), body: 'Cancel' },
                    { color: 'danger', onClick: onDeactivateAcmeConfirmed, body: 'Yes, deactivate' },
                ]}
            />

            <Dialog
                isOpen={confirmDeactivateCmp}
                caption="Deactivate CMP"
                body="You are about to deactivate CMP protocol for the RA profile. Is this what you want to do?"
                toggle={() => setConfirmDeactivateCmp(false)}
                buttons={[
                    { color: 'secondary', variant: 'outline', onClick: () => setConfirmDeactivateCmp(false), body: 'Cancel' },
                    { color: 'danger', onClick: onDeactivateCmpConfirmed, body: 'Yes, deactivate' },
                ]}
            />

            <Dialog
                isOpen={confirmDeactivateScep}
                caption="Deactivate SCEP"
                body="You are about to deactivate SCEP protocol for the RA profile. Is this what you want to do?"
                toggle={() => setConfirmDeactivateScep(false)}
                buttons={[
                    { color: 'secondary', variant: 'outline', onClick: () => setConfirmDeactivateScep(false), body: 'Cancel' },
                    { color: 'danger', onClick: onDeactivateScepConfirmed, body: 'Yes, deactivate' },
                ]}
            />

            <Dialog
                isOpen={activateAcmeDialog}
                caption="Activate ACME protocol"
                body={ProtocolActivationDialogBody({
                    protocol: Protocol.ACME,
                    visible: activateAcmeDialog,
                    onClose: () => setActivateAcmeDialog(false),
                    raProfileUuid: raProfile?.uuid,
                    authorityInstanceUuid: raProfile?.authorityInstanceUuid,
                })}
                toggle={() => setActivateAcmeDialog(false)}
                buttons={[]}
                size="xl"
            />

            <Dialog
                isOpen={activateCmpDialog}
                caption={`Activate CMP protocol`}
                body={ProtocolActivationDialogBody({
                    protocol: Protocol.CMP,
                    visible: activateCmpDialog,
                    onClose: () => setActivateCmpDialog(false),
                    raProfileUuid: raProfile?.uuid,
                    authorityInstanceUuid: raProfile?.authorityInstanceUuid,
                })}
                toggle={() => setActivateCmpDialog(false)}
                buttons={[]}
                size="xl"
            />

            <Dialog
                isOpen={activateScepDialog}
                caption="Activate SCEP protocol"
                body={ProtocolActivationDialogBody({
                    protocol: Protocol.SCEP,
                    visible: activateScepDialog,
                    onClose: () => setActivateScepDialog(false),
                    raProfileUuid: raProfile?.uuid,
                    authorityInstanceUuid: raProfile?.authorityInstanceUuid,
                })}
                toggle={() => setActivateScepDialog(false)}
                buttons={[]}
                size="xl"
            />

            <Dialog
                isOpen={complianceCheck}
                caption={`Initiate Compliance Check`}
                body={'Initiate the compliance check for the certificates with RA Profile?'}
                toggle={() => setComplianceCheck(false)}
                noBorder
                buttons={[
                    { color: 'primary', variant: 'outline', onClick: () => setComplianceCheck(false), body: 'Cancel' },
                    { color: 'primary', onClick: onComplianceCheck, body: 'Yes' },
                ]}
            />

            <Dialog
                isOpen={associateApprovalProfileDialog}
                caption={`Associate Approval Profile`}
                body={AssociateApprovalProfileDialogBody({
                    visible: associateApprovalProfileDialog,
                    onClose: () => setAssociateApprovalProfileDialog(false),
                    availableApprovalProfileUuids: associatedApprovalProfiles.map((e) => e.uuid),
                    authorityUuid: authorityId,
                    raProfile: raProfile,
                })}
                toggle={() => setAssociateApprovalProfileDialog(false)}
                buttons={[]}
            />

            <Dialog
                isOpen={certificateValidationDialog}
                caption={`Edit Certificate Validation Settings`}
                body={CertificateValidationDialogBody({
                    platformSettings,
                    onClose: () => setCertificateValidationDialog(false),
                    raProfile: raProfile,
                })}
                toggle={() => setCertificateValidationDialog(false)}
                buttons={[]}
                size="md"
            />

            <Dialog
                isOpen={confirmDeassociateApprovalProfileDialog?.isDialogOpen || false}
                caption={`Disassociate Approval Profile`}
                body={
                    <div>
                        <p>
                            You are about to disassociate approval profile{' '}
                            <b>{confirmDeassociateApprovalProfileDialog?.associatedApprovalProfileName}</b> from RA profile{' '}
                            {raProfile?.name}. Is this what you want to do?
                        </p>
                        <p>
                            <b className="text-red-600">Warning:</b> This will remove approval process for all certificate actions on this
                            RA profile.
                        </p>
                    </div>
                }
                toggle={() => setConfirmDeassociateApprovalProfileDialog(undefined)}
                buttons={[
                    {
                        color: 'danger',
                        onClick: () =>
                            confirmDeassociateApprovalProfileDialog
                                ? onDissociateApprovalProfile(confirmDeassociateApprovalProfileDialog?.associatedApprovalProfileUuid)
                                : {},
                        body: 'Yes',
                    },
                    {
                        color: 'secondary',
                        variant: 'outline',
                        onClick: () => setConfirmDeassociateApprovalProfileDialog(undefined),
                        body: 'Cancel',
                    },
                ]}
            />

            <Dialog
                isOpen={isEditModalOpen}
                toggle={handleCloseEditModal}
                caption="Edit RA Profile"
                size="xl"
                body={
                    <RaProfileForm
                        raProfileId={raProfile?.uuid}
                        authorityId={raProfile?.authorityInstanceUuid || authorityId}
                        onCancel={handleCloseEditModal}
                    />
                }
            />
        </div>
    );
}
