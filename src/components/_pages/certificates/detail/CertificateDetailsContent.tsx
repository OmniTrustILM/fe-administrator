import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { Link } from 'react-router';
import Select from 'components/Select';
import CustomTable, { type TableDataRow, type TableHeader } from 'components/CustomTable';
import Widget from 'components/Widget';
import Container from 'components/Container';
import Dialog from 'components/Dialog';
import Switch from 'components/Switch';
import Badge from 'components/Badge';
import Asn1Dialog from '../Asn1Dialog/Asn1Dialog';
import CertificateRenewDialog from '../CertificateRenewDialog';
import CertificateRekeyDialog from '../CertificateRekeyDialog';
import type { WidgetButtonProps } from 'components/WidgetButtons';
import { LockWidgetNameEnum } from 'types/user-interface';
import { createWidgetDetailHeaders } from 'utils/widget';
import { formatPEM } from 'utils/certificate';
import { useCopyToClipboard } from 'utils/common-hooks';
import { dateFormatter } from 'utils/dateUtil';
import { actions, selectors } from 'ducks/certificates';
import { actions as userInterfaceActions } from 'ducks/user-interface';
import { selectors as enumSelectors, getEnumLabel, getEnumDescription } from 'ducks/enums';
import { EnumValueDescription } from 'components/EnumDescription';
import { actions as certificateGroupActions, selectors as groupSelectors } from 'ducks/certificateGroups';
import { actions as userActions, selectors as userSelectors } from 'ducks/users';
import { actions as raProfileActions, selectors as raProfileSelectors } from 'ducks/ra-profiles';
import type { CertificateDetailResponseModel } from 'types/certificate';
import {
    CertificateRegistrationState,
    CertificateRequestFormat,
    CertificateRevocationReason,
    CertificateState as CertStatus,
    CertificateSubjectType,
    type CertificateValidationResultDto,
    CertificateProtocol,
    PlatformEnum,
} from 'types/openapi';
import CertificateDownloadForm from './CertificateDownloadForm';
import CompleteRegisteredDialog from './CompleteRegisteredDialog';
import Button from 'components/Button';
import { Trash2 } from 'lucide-react';
import EditIcon from 'components/icons/EditIcon';
import { buildCertificateDetailBaseRows } from '../certificateTableHelpers';
import PendingActionDialogs from '../PendingActionButtons/PendingActionDialogs';
import type { PendingAction } from '../PendingActionButtons/types';

interface SelectChangeValue {
    value: string;
    label: string;
}

// There is no platform enum for the pre-registration authorization state — it is not part of the
// backend's enum registry, so it cannot be resolved via useGetStatusText/getEnumLabel. This is a
// plain presentational label map.
const registrationStateLabels: Record<CertificateRegistrationState, string> = {
    [CertificateRegistrationState.Active]: 'Active',
    [CertificateRegistrationState.Expired]: 'Expired',
    [CertificateRegistrationState.Locked]: 'Locked',
    [CertificateRegistrationState.Closed]: 'Closed',
};

type Props = Readonly<{
    certificate: CertificateDetailResponseModel | undefined;
    validationResult: CertificateValidationResultDto | undefined;
    isBusy: boolean;
    getFreshCertificateDetail: () => void;
}>;

export default function CertificateDetailsContent({ certificate, validationResult, isBusy, getFreshCertificateDetail }: Props) {
    const dispatch = useDispatch();
    const copyToClipboard = useCopyToClipboard();

    const groupsList = useSelector(groupSelectors.certificateGroups);
    const raProfiles = useSelector(raProfileSelectors.raProfiles);
    const users = useSelector(userSelectors.users);
    const certificateRevocationReason = useSelector(enumSelectors.platformEnum(PlatformEnum.CertificateRevocationReason));
    const certificateKeyUsageEnum = useSelector(enumSelectors.platformEnum(PlatformEnum.CertificateKeyUsage));
    const qcTypeEnum = useSelector(enumSelectors.platformEnum(PlatformEnum.QcType));
    const certificateProtocol = useSelector(enumSelectors.platformEnum(PlatformEnum.CertificateProtocol));
    const isArchiving = useSelector(selectors.isArchiving);
    const isUpdatingTrustedStatus = useSelector(selectors.isUpdatingTrustedStatus);
    const isUpdatingGroup = useSelector(selectors.isUpdatingGroup);
    const isUpdatingOwner = useSelector(selectors.isUpdatingOwner);
    const isUpdatingRaProfile = useSelector(selectors.isUpdatingRaProfile);

    const [confirmDelete, setConfirmDelete] = useState(false);
    const [renew, setRenew] = useState(false);
    const [rekey, setRekey] = useState(false);
    const [revoke, setRevoke] = useState(false);
    const [complete, setComplete] = useState(false);
    const [updateGroup, setUpdateGroup] = useState(false);
    const [updateOwner, setUpdateOwner] = useState(false);
    const [updateRaProfile, setUpdateRaProfile] = useState(false);
    const [pendingAction, setPendingAction] = useState<PendingAction | null>(null);

    const [groups, setGroups] = useState<SelectChangeValue[]>([]);
    const [ownerUuid, setOwnerUuid] = useState<string>();
    const [raProfile, setRaProfile] = useState<string>();
    const [raProfileAuthorityUuid, setRaProfileAuthorityUuid] = useState<string>();
    const [revokeReason, setRevokeReason] = useState<CertificateRevocationReason>();

    const [certificateRevokeReasonOptions, setCertificateRevokeReasonOptions] = useState<{ label: string; value: string }[]>([]);
    const [userOptions, setUserOptions] = useState<{ label: string; value: string }[]>([]);
    const [raProfileOptions, setRaProfileOptions] = useState<{ label: string; value: string }[]>([]);

    const isCertificateArchived = !!certificate?.archived;

    useEffect(() => {
        if (!certificateRevocationReason) return;
        const options = Object.keys(certificateRevocationReason)
            .map((key) => ({
                value: certificateRevocationReason[key].code,
                label: certificateRevocationReason[key].label,
                description: getEnumDescription(certificateRevocationReason, certificateRevocationReason[key].code),
            }))
            .sort((a, b) => a.label.localeCompare(b.label));
        setCertificateRevokeReasonOptions(options);
    }, [certificateRevocationReason]);

    useEffect(() => {
        setUserOptions(
            users.map((user) => ({
                value: user.uuid,
                label: `${user.firstName ? user.firstName + ' ' : ''}${user.lastName ? user.lastName + ' ' : ''}(${user.username})`,
            })),
        );
    }, [users]);

    useEffect(() => {
        setRaProfileOptions(
            raProfiles.map((profile) => ({ value: profile.uuid + ':#' + profile.authorityInstanceUuid, label: profile.name })),
        );
    }, [raProfiles]);

    useEffect(() => {
        const certificatePreselectedGroups = certificate?.groups?.length
            ? certificate.groups.map((group) => ({
                  value: group.uuid,
                  label: group.name,
              }))
            : [];
        setGroups(certificatePreselectedGroups);
    }, [certificate?.groups]);

    const groupOptions = useMemo(
        () =>
            groupsList.map((group) => ({
                value: group.uuid,
                label: group.name,
            })),
        [groupsList],
    );

    const certificateTitle = useMemo(
        () => (certificate?.state === CertStatus.Requested ? 'CSR Properties' : 'Certificate Properties'),
        [certificate?.state],
    );

    const detailHeaders: TableHeader[] = useMemo(() => createWidgetDetailHeaders(), []);

    const onComplianceCheck = useCallback(() => {
        if (!certificate?.uuid) return;
        dispatch(actions.checkCompliance({ certificateUuids: [certificate.uuid] }));
    }, [dispatch, certificate]);

    const onDownloadClick = useCallback(() => {
        dispatch(
            userInterfaceActions.showGlobalModal({
                content: <CertificateDownloadForm />,
                isOpen: true,
                size: 'md',
                title: 'Download',
                icon: 'download',
            }),
        );
    }, [dispatch]);

    const onDeleteConfirmed = useCallback(() => {
        if (!certificate) return;
        dispatch(actions.deleteCertificate({ uuid: certificate.uuid }));
        setConfirmDelete(false);
    }, [certificate, dispatch]);

    const onRevoke = useCallback(() => {
        if (!certificate) return;
        dispatch(
            actions.revokeCertificate({
                uuid: certificate.uuid,
                revokeRequest: { reason: revokeReason || CertificateRevocationReason.Unspecified, attributes: [] },
                raProfileUuid: certificate.raProfile?.uuid || '',
                authorityUuid: certificate.raProfile?.authorityInstanceUuid || '',
            }),
        );
        setRevoke(false);
    }, [certificate, dispatch, revokeReason]);

    const onRenew = useCallback(
        (data: { fileContent?: string }) => {
            dispatch(
                actions.renewCertificate({
                    uuid: certificate?.uuid || '',
                    renewRequest: {
                        format: CertificateRequestFormat.Pkcs10,
                        request: data.fileContent,
                    },
                    raProfileUuid: certificate?.raProfile?.uuid || '',
                    authorityUuid: certificate?.raProfile?.authorityInstanceUuid || '',
                }),
            );
            setRenew(false);
        },
        [dispatch, certificate],
    );

    const onCancelGroupUpdate = useCallback(() => {
        setUpdateGroup(false);
        const certificatePreselectedGroups = certificate?.groups?.map((group) => ({
            value: group.uuid,
            label: group.name,
        }));
        setGroups(certificatePreselectedGroups || []);
    }, [certificate?.groups]);

    const onCloseCompleteRegistration = useCallback(() => {
        setComplete(false);
        // On failure the dialog stays open without refetching (a refetch would unmount it), so the
        // registration state shown here (failedAttempts / lock) can be stale by the time it closes.
        // Refresh it on dismiss so the detail reflects whatever the backend recorded on the last attempt.
        getFreshCertificateDetail();
    }, [getFreshCertificateDetail]);

    const onCancelOwnerUpdate = useCallback(() => {
        setUpdateOwner(false);
        setOwnerUuid(undefined);
    }, []);

    const onCancelRaProfileUpdate = useCallback(() => {
        setUpdateRaProfile(false);
        setRaProfile(undefined);
        setRaProfileAuthorityUuid(undefined);
    }, []);

    const onUpdateGroup = useCallback(() => {
        if (!certificate || !groups) return;
        dispatch(actions.updateGroup({ uuid: certificate.uuid, updateGroupRequest: { groupUuids: groups.map((group) => group.value) } }));
        setUpdateGroup(false);
    }, [certificate, dispatch, groups]);

    const onUpdateOwner = useCallback(() => {
        if (!certificate || !ownerUuid || !users) return;
        const user = users.find((u) => u.uuid === ownerUuid);
        if (!user) return;
        dispatch(actions.updateOwner({ uuid: certificate.uuid, user, updateOwnerRequest: { ownerUuid: ownerUuid } }));
        setUpdateOwner(false);
    }, [certificate, dispatch, ownerUuid, users]);

    const onUpdateRaProfile = useCallback(() => {
        if (!certificate || !raProfile) return;
        dispatch(
            actions.updateRaProfile({
                uuid: certificate.uuid,
                updateRaProfileRequest: { raProfileUuid: raProfile },
                authorityUuid: raProfileAuthorityUuid || '',
            }),
        );
        setUpdateRaProfile(false);
    }, [certificate, dispatch, raProfile, raProfileAuthorityUuid]);

    const updateRaAndAuthorityState = useCallback((value: string) => {
        setRaProfile(value.split(':#')[0]);
        setRaProfileAuthorityUuid(value.split(':#')[1]);
    }, []);

    const switchCallback = useCallback(
        (checked: boolean) => {
            if (!certificate) return;
            if (isUpdatingTrustedStatus) return;

            dispatch(
                actions.updateCertificateTrustedStatus({
                    uuid: certificate.uuid,
                    updateCertificateTrustedStatusRequest: {
                        trustedCa: checked,
                    },
                }),
            );
        },
        [certificate, isUpdatingTrustedStatus, dispatch],
    );

    const buttons: WidgetButtonProps[] = useMemo(() => {
        // Core rejects completion once the registration authorization is no longer Active (Expired/Locked/
        // Closed) or its issuance window has elapsed, so gate the Complete action on the same conditions.
        const registration = certificate?.registration;
        const registrationInactive = !!registration?.state && registration.state !== CertificateRegistrationState.Active;
        const registrationWindowElapsed = !!registration?.expiresAt && new Date(registration.expiresAt).getTime() < Date.now();
        const completeDisabled =
            !certificate?.raProfile ||
            certificate?.state !== CertStatus.Registered ||
            isCertificateArchived ||
            registrationInactive ||
            registrationWindowElapsed;
        let completeTooltip = 'Complete';
        if (registrationInactive) {
            completeTooltip = `Complete unavailable — registration is ${registrationStateLabels[registration!.state!] ?? registration!.state}`;
        } else if (registrationWindowElapsed) {
            completeTooltip = 'Complete unavailable — the issuance window has elapsed';
        }

        return [
            {
                icon: 'trash',
                disabled: false,
                tooltip: 'Delete',
                onClick: () => setConfirmDelete(true),
            },
            {
                icon: 'cubes',
                disabled: !certificate?.raProfile || certificate?.state !== CertStatus.Requested || isCertificateArchived,
                tooltip: 'Issue',
                onClick: () => {
                    dispatch(
                        actions.issueCertificateNew({
                            certificateUuid: certificate?.uuid ?? '',
                            raProfileUuid: certificate?.raProfile?.uuid ?? '',
                            authorityUuid: certificate?.raProfile?.authorityInstanceUuid ?? '',
                        }),
                    );
                },
            },
            {
                icon: 'retweet',
                disabled: !certificate?.raProfile || certificate?.state !== CertStatus.Issued || isCertificateArchived,
                tooltip: 'Renew',
                onClick: () => setRenew(true),
            },
            {
                icon: 'rekey',
                disabled: !certificate?.raProfile || certificate?.state !== CertStatus.Issued || isCertificateArchived,
                tooltip: 'Rekey',
                onClick: () => setRekey(true),
            },
            {
                icon: 'minus-square',
                disabled: !certificate?.raProfile || certificate?.state !== CertStatus.Issued || isCertificateArchived,
                tooltip: 'Revoke',
                onClick: () => setRevoke(true),
            },
            {
                icon: 'check',
                disabled: completeDisabled,
                tooltip: completeTooltip,
                onClick: () => setComplete(true),
            },
            {
                icon: 'gavel',
                disabled: !certificate?.raProfile || !certificate?.certificateContent || isCertificateArchived,
                tooltip: 'Check Compliance',
                onClick: onComplianceCheck,
            },
            {
                icon: 'download',
                tooltip: 'Download',
                disabled: !certificate?.certificateContent,
                onClick: onDownloadClick,
            },
            {
                icon: 'copy',
                disabled: !certificate?.certificateContent,
                tooltip: 'Copy certificate content',
                onClick: () => {
                    copyToClipboard(
                        formatPEM(certificate?.certificateContent ?? ''),
                        'Certificate content was copied to clipboard',
                        'Failed to copy certificate content to clipboard',
                    );
                },
            },
            {
                icon: 'archive',
                disabled: isCertificateArchived || isArchiving,
                tooltip: 'Archive',
                onClick: () => {
                    dispatch(actions.archiveCertificate({ uuid: certificate?.uuid ?? '' }));
                },
            },
            {
                icon: 'unarchive',
                disabled: !isCertificateArchived || isArchiving,
                tooltip: 'Unarchive',
                onClick: () => {
                    dispatch(actions.unarchiveCertificate({ uuid: certificate?.uuid ?? '' }));
                },
            },
        ];
    }, [certificate, onComplianceCheck, dispatch, onDownloadClick, copyToClipboard, isCertificateArchived, isArchiving]);

    const detailData: TableDataRow[] = useMemo(() => {
        const certDetail = certificate
            ? buildCertificateDetailBaseRows(
                  certificate,
                  validationResult,
                  isCertificateArchived,
                  { certificateKeyUsage: certificateKeyUsageEnum, qcType: qcTypeEnum },
                  dateFormatter,
                  getEnumLabel,
                  setPendingAction,
              )
            : [];

        if (certificate?.state !== CertStatus.Requested) {
            certDetail.push({
                id: 'asn1structure',
                columns: [
                    'ASN.1 Structure',
                    certificate?.certificateContent ? (
                        <Asn1Dialog key="asn1" content={certificate.certificateContent} />
                    ) : (
                        <span key="asn1-na">n/a</span>
                    ),
                ],
            });
        }

        if (certificate?.trustedCa !== undefined) {
            certDetail.unshift({
                id: 'trustedCa',
                columns: [
                    certificate?.subjectType === CertificateSubjectType.SelfSignedEndEntity ? 'Trusted Self-Signed' : 'Trusted CA',
                    <Switch
                        key="trustedCa-switch"
                        id="trustedCa"
                        disabled={isUpdatingTrustedStatus}
                        checked={certificate.trustedCa ?? false}
                        onChange={switchCallback}
                    />,
                ],
            });
        }

        return certDetail;
    }, [certificate, validationResult, isCertificateArchived, certificateKeyUsageEnum, isUpdatingTrustedStatus, switchCallback]);

    const sanData: TableDataRow[] = useMemo(() => {
        const sanList: TableDataRow[] = [];
        for (const [key, value] of Object.entries(certificate?.subjectAlternativeNames || {})) {
            if (value && Array.isArray(value) && value.length > 0) {
                sanList.push({
                    id: key,
                    columns: [key, value.join(', ')],
                });
            }
        }
        return sanList;
    }, [certificate]);

    const protocolHeader: TableHeader[] = useMemo(
        () => [
            {
                id: 'property',
                content: 'Property',
            },
            {
                id: 'value',
                content: 'Value',
            },
        ],
        [],
    );

    const protocolData: TableDataRow[] = useMemo(() => {
        const protocolInfo = certificate?.protocolInfo;
        if (!protocolInfo) return [];

        function getProtocolProfileLink(): string {
            if (!protocolInfo) return '';
            switch (protocolInfo.protocol) {
                case CertificateProtocol.Acme:
                    return `../acmeprofiles/detail/${protocolInfo.protocolProfileUuid}`;
                case CertificateProtocol.Cmp:
                    return `../cmpprofiles/detail/${protocolInfo.protocolProfileUuid}`;
                case CertificateProtocol.Scep:
                    return `../scepprofiles/detail/${protocolInfo.protocolProfileUuid}`;
            }
        }
        const data = [
            {
                id: 'protocol',
                columns: [
                    'Protocol Name',
                    <span key="protocol" className="inline-flex items-center gap-1">
                        <Badge color="secondary">{getEnumLabel(certificateProtocol, protocolInfo.protocol)}</Badge>
                        <EnumValueDescription platformEnum={PlatformEnum.CertificateProtocol} value={protocolInfo.protocol} />
                    </span>,
                ],
            },
            {
                id: 'protocolProfileUuid',
                columns: [
                    'Protocol Profile UUID',
                    <Link key="protocolProfileUuid" to={getProtocolProfileLink()}>
                        {protocolInfo.protocolProfileUuid}
                    </Link>,
                ],
            },
        ];
        if (protocolInfo.protocol === CertificateProtocol.Acme && protocolInfo.additionalProtocolUuid) {
            data.push({
                id: 'additionalProfileUuid',
                columns: [
                    'Protocol Account UUID',
                    <Link
                        key="additionalProfileUuid"
                        to={`../acmeaccounts/detail/${protocolInfo.protocolProfileUuid}/${protocolInfo.additionalProtocolUuid}`}
                    >
                        {protocolInfo.additionalProtocolUuid}
                    </Link>,
                ],
            });
        }
        return data;
    }, [certificate?.protocolInfo, certificateProtocol]);

    const registrationData: TableDataRow[] = useMemo(() => {
        const registration = certificate?.registration;
        if (!registration) return [];

        return [
            {
                id: 'registrationState',
                columns: ['State', registration.state ? (registrationStateLabels[registration.state] ?? registration.state) : 'n/a'],
            },
            {
                id: 'registrationExpiresAt',
                columns: ['Expires', registration.expiresAt ? dateFormatter(registration.expiresAt) : 'n/a'],
            },
            {
                id: 'registrationFailedAttempts',
                columns: ['Failed attempts', registration.failedAttempts ?? 0],
            },
        ];
    }, [certificate?.registration]);

    const propertiesHeaders: TableHeader[] = useMemo(
        () => [
            {
                id: 'attribute',
                content: 'Attribute',
            },
            {
                id: 'value',
                content: 'Value',
            },
            {
                id: 'action',
                content: 'Action',
            },
        ],
        [],
    );

    const propertiesData: TableDataRow[] = useMemo(() => {
        return certificate
            ? [
                  {
                      id: 'uuid',
                      columns: ['UUID', certificate.uuid, ''],
                  },
                  {
                      id: 'owner',
                      columns: [
                          'Owner',
                          certificate?.ownerUuid ? (
                              <Link key="owner-link" to={`../../users/detail/${certificate.ownerUuid}`}>
                                  {certificate.owner ?? 'Unassigned'}
                              </Link>
                          ) : (
                              (certificate.owner ?? 'Unassigned')
                          ),
                          <div key="owner-actions" className="flex">
                              <Button
                                  disabled={isCertificateArchived}
                                  variant="transparent"
                                  color="secondary"
                                  onClick={() => {
                                      setOwnerUuid(undefined);
                                      setUpdateOwner(true);
                                      dispatch(userActions.list());
                                  }}
                                  title="Update Owner"
                              >
                                  <EditIcon size={16} />
                              </Button>

                              <Button
                                  variant="transparent"
                                  title="Remove owner"
                                  disabled={!certificate?.ownerUuid || isCertificateArchived}
                                  onClick={() => {
                                      if (!certificate?.ownerUuid || !certificate?.uuid) return;
                                      dispatch(
                                          actions.deleteOwner({
                                              uuid: certificate.uuid,
                                          }),
                                      );
                                  }}
                              >
                                  <Trash2 size={16} />
                              </Button>
                          </div>,
                      ],
                  },
                  {
                      id: 'groups',
                      columns: [
                          'Groups',
                          certificate?.groups?.length
                              ? certificate?.groups.map((group, i) => (
                                    <React.Fragment key={group.uuid}>
                                        <Link to={`../../groups/detail/${group.uuid}`}>{group.name}</Link>
                                        {certificate?.groups?.length && i !== certificate.groups.length - 1 ? `, ` : ``}
                                    </React.Fragment>
                                ))
                              : 'Unassigned',
                          <div key="groups-actions" className="flex">
                              <Button
                                  disabled={isCertificateArchived}
                                  variant="transparent"
                                  color="secondary"
                                  onClick={() => {
                                      setUpdateGroup(true);
                                      dispatch(certificateGroupActions.listGroups());
                                  }}
                                  title="Update Group"
                              >
                                  <EditIcon size={16} />
                              </Button>
                              <Button
                                  variant="transparent"
                                  title="Remove groups"
                                  disabled={!certificate?.groups?.length || isCertificateArchived}
                                  onClick={() => {
                                      if (!certificate?.uuid) return;
                                      dispatch(
                                          actions.deleteGroups({
                                              uuid: certificate.uuid,
                                          }),
                                      );
                                  }}
                              >
                                  <Trash2 size={16} />
                              </Button>
                          </div>,
                      ],
                  },
                  {
                      id: 'raProfile',
                      columns: [
                          'RA Profile',
                          certificate?.raProfile?.name ? (
                              <Link
                                  key="raProfile-link"
                                  to={`../../raProfiles/detail/${certificate?.raProfile.authorityInstanceUuid}/${certificate?.raProfile.uuid}`}
                              >
                                  {certificate?.raProfile.name}
                              </Link>
                          ) : (
                              'Unassigned'
                          ),
                          <div key="raProfile-actions" className="flex">
                              <Button
                                  disabled={isCertificateArchived}
                                  variant="transparent"
                                  color="secondary"
                                  onClick={() => {
                                      setUpdateRaProfile(true);

                                      const currentRaProfileUuid = certificate?.raProfile?.uuid;
                                      const currentAuthorityUuid = certificate?.raProfile?.authorityInstanceUuid;

                                      setRaProfile(currentRaProfileUuid && currentAuthorityUuid ? currentRaProfileUuid : undefined);
                                      setRaProfileAuthorityUuid(
                                          currentRaProfileUuid && currentAuthorityUuid ? currentAuthorityUuid : undefined,
                                      );

                                      dispatch(raProfileActions.listRaProfiles());
                                  }}
                                  title="Update RA Profile"
                              >
                                  <EditIcon size={16} />
                              </Button>
                              <Button
                                  variant="transparent"
                                  title="Remove RA profile"
                                  disabled={!certificate?.raProfile?.uuid || isCertificateArchived}
                                  onClick={() => {
                                      if (!certificate?.raProfile?.authorityInstanceUuid || !certificate?.uuid) return;
                                      dispatch(
                                          actions.deleteRaProfile({
                                              uuid: certificate.uuid,
                                          }),
                                      );
                                  }}
                              >
                                  <Trash2 size={16} />
                              </Button>
                          </div>,
                      ],
                  },
                  {
                      id: 'type',
                      columns: ['Type', certificate.certificateType || '', ''],
                  },
              ]
            : [];
    }, [certificate, dispatch, isCertificateArchived]);

    return (
        <>
            <Container className="md:grid grid-cols-2 items-start">
                <Widget
                    title={certificateTitle}
                    busy={isBusy}
                    widgetButtons={buttons}
                    titleSize="large"
                    lockSize="large"
                    widgetLockName={LockWidgetNameEnum.CertificateDetailsWidget}
                    refreshAction={getFreshCertificateDetail}
                >
                    <CustomTable hasPagination={false} headers={detailHeaders} data={detailData} />
                </Widget>
                <Container>
                    <Widget title="Subject Alternative Names" busy={isBusy} titleSize="large">
                        <CustomTable headers={detailHeaders} data={sanData} />
                    </Widget>
                    {certificate?.protocolInfo && (
                        <Widget title="Protocol" busy={isBusy} titleSize="large">
                            <CustomTable headers={protocolHeader} data={protocolData} />
                        </Widget>
                    )}
                    {certificate?.registration && (
                        <Widget title="Registration" busy={isBusy} titleSize="large">
                            <CustomTable headers={detailHeaders} data={registrationData} />
                        </Widget>
                    )}
                    <Widget title="Other Properties" busy={isBusy} titleSize="large">
                        <CustomTable headers={propertiesHeaders} data={propertiesData} />
                    </Widget>
                </Container>
            </Container>

            <Dialog
                isOpen={confirmDelete}
                caption="Delete Certificate"
                body="You are about to delete a Certificate. Is this what you want to do?"
                toggle={() => setConfirmDelete(false)}
                icon="delete"
                buttons={[
                    { key: 'cancel', color: 'secondary', variant: 'outline', onClick: () => setConfirmDelete(false), body: 'Cancel' },
                    { key: 'delete', color: 'danger', onClick: onDeleteConfirmed, body: 'Delete' },
                ]}
            />

            <Dialog
                isOpen={renew}
                caption={`Renew Certificate`}
                body={
                    <CertificateRenewDialog
                        onCancel={() => setRenew(false)}
                        onRenew={onRenew}
                        allowWithoutFile={certificate?.privateKeyAvailability || false}
                    />
                }
                toggle={() => setRenew(false)}
                buttons={[]}
                icon="refresh"
                size="xl"
            />

            <Dialog
                isOpen={rekey}
                caption={`Rekey Certificate`}
                body={<CertificateRekeyDialog onCancel={() => setRekey(false)} certificate={certificate} />}
                toggle={() => setRekey(false)}
                buttons={[]}
                icon="shuffle"
                size="xl"
            />

            <Dialog
                isOpen={revoke}
                caption={`Revoke Certificate`}
                body={
                    <Select
                        id="revokeReason"
                        options={certificateRevokeReasonOptions}
                        placeholder={`Select Revocation Reason`}
                        value={revokeReason || ''}
                        onChange={(value) => setRevokeReason(value as CertificateRevocationReason)}
                        label="Revocation Reason"
                        showOptionDescriptionInDropdown
                        showSelectedDescriptionAsHelp
                    />
                }
                toggle={() => setRevoke(false)}
                icon="minus"
                buttons={[
                    { key: 'cancel', color: 'secondary', variant: 'outline', onClick: () => setRevoke(false), body: 'Cancel' },
                    { key: 'revoke', color: 'primary', onClick: onRevoke, body: 'Revoke' },
                ]}
                size="lg"
            />

            <Dialog
                isOpen={complete}
                caption="Complete Certificate Registration"
                body={certificate && <CompleteRegisteredDialog certificate={certificate} onCancel={onCloseCompleteRegistration} />}
                toggle={onCloseCompleteRegistration}
                buttons={[]}
                icon="check"
                size="lg"
            />

            <Dialog
                isOpen={updateGroup}
                caption="Update Groups"
                icon="users"
                size="md"
                body={
                    <Select
                        id="updateGroups"
                        options={groupOptions}
                        placeholder={`Select Groups`}
                        value={groups}
                        onChange={(values) => {
                            setGroups(values || []);
                        }}
                        isMulti
                    />
                }
                toggle={onCancelGroupUpdate}
                buttons={[
                    { key: 'cancel', color: 'primary', variant: 'outline', onClick: onCancelGroupUpdate, body: 'Cancel' },
                    {
                        key: 'update',
                        color: 'primary',
                        onClick: onUpdateGroup,
                        body: 'Update',
                        disabled: isUpdatingGroup || groups.length === 0,
                    },
                ]}
            />

            <Dialog
                isOpen={updateOwner}
                caption="Update Owner"
                body={
                    <Select
                        id="updateOwner"
                        options={userOptions}
                        placeholder={`Select Owner`}
                        value={ownerUuid || ''}
                        onChange={(value) => setOwnerUuid(value as string)}
                    />
                }
                icon="user-check"
                size="md"
                toggle={onCancelOwnerUpdate}
                buttons={[
                    { key: 'cancel', color: 'primary', variant: 'outline', onClick: onCancelOwnerUpdate, body: 'Cancel' },
                    {
                        key: 'update',
                        color: 'primary',
                        onClick: onUpdateOwner,
                        body: 'Update',
                        disabled: ownerUuid === undefined || isUpdatingOwner,
                    },
                ]}
            />

            <Dialog
                isOpen={updateRaProfile}
                caption={`Update RA Profile`}
                body={
                    <Select
                        id="updateRaProfile"
                        options={raProfileOptions}
                        placeholder={`Select RA Profile`}
                        value={raProfile && raProfileAuthorityUuid ? `${raProfile}:#${raProfileAuthorityUuid}` : ''}
                        onChange={(value) => {
                            updateRaAndAuthorityState((value as string) || '');
                        }}
                        label="RA Profile"
                    />
                }
                icon="shield-check"
                size="md"
                toggle={onCancelRaProfileUpdate}
                buttons={[
                    { key: 'cancel', color: 'primary', variant: 'outline', onClick: onCancelRaProfileUpdate, body: 'Cancel' },
                    {
                        key: 'update',
                        color: 'primary',
                        onClick: onUpdateRaProfile,
                        body: 'Update',
                        disabled: raProfile === undefined || isUpdatingRaProfile,
                    },
                ]}
            />

            <PendingActionDialogs action={pendingAction} onClose={() => setPendingAction(null)} />
        </>
    );
}
