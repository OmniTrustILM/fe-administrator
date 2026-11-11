import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { Link } from 'react-router';
import Select from 'components/Select';
import CustomTable, { type TableDataRow, type TableHeader } from 'components/CustomTable';
import Widget from 'components/Widget';
import Container from 'components/Container';
import Dialog from 'components/Dialog';
import Switch from 'components/Switch';
import Asn1Dialog from '../Asn1Dialog/Asn1Dialog';
import CertificateRAProfileDialog from '../CertificateRAProfileDialog';
import { LockWidgetNameEnum } from 'types/user-interface';
import { createWidgetDetailHeaders } from 'utils/widget';
import { dateFormatter } from 'utils/dateUtil';
import { actions, selectors } from 'ducks/certificates';
import { selectors as enumSelectors, getEnumLabel } from 'ducks/enums';
import { actions as certificateGroupActions, selectors as groupSelectors } from 'ducks/certificateGroups';
import { actions as userActions, selectors as userSelectors } from 'ducks/users';
import type { CertificateDetailResponseModel } from 'types/certificate';
import { CertificateState as CertStatus, CertificateSubjectType, type CertificateValidationResultDto, PlatformEnum } from 'types/openapi';
import { registrationStateLabels } from './registrationStateLabels';
import Button from 'components/Button';
import { Trash2 } from 'lucide-react';
import EditIcon from 'components/icons/EditIcon';
import { buildCertificateDetailBaseRows, buildCertificateProtocolRows } from '../certificateTableHelpers';
import PendingActionDialogs from '../PendingActionButtons/PendingActionDialogs';
import type { PendingAction } from '../PendingActionButtons/types';

interface SelectChangeValue {
    value: string | number;
    label: string;
}

type Props = Readonly<{
    certificate: CertificateDetailResponseModel | undefined;
    validationResult: CertificateValidationResultDto | undefined;
    isBusy: boolean;
    getFreshCertificateDetail: () => void;
}>;

export default function CertificateDetailsContent({ certificate, validationResult, isBusy, getFreshCertificateDetail }: Props) {
    const dispatch = useDispatch();

    const groupsList = useSelector(groupSelectors.certificateGroups);
    const users = useSelector(userSelectors.users);
    const certificateKeyUsageEnum = useSelector(enumSelectors.platformEnum(PlatformEnum.CertificateKeyUsage));
    const qcTypeEnum = useSelector(enumSelectors.platformEnum(PlatformEnum.QcType));
    const certificateProtocol = useSelector(enumSelectors.platformEnum(PlatformEnum.CertificateProtocol));
    const isUpdatingTrustedStatus = useSelector(selectors.isUpdatingTrustedStatus);
    const isUpdatingGroup = useSelector(selectors.isUpdatingGroup);
    const isUpdatingOwner = useSelector(selectors.isUpdatingOwner);

    const [updateGroup, setUpdateGroup] = useState(false);
    const [updateOwner, setUpdateOwner] = useState(false);
    const [updateRaProfile, setUpdateRaProfile] = useState(false);
    const [pendingAction, setPendingAction] = useState<PendingAction | null>(null);

    const [groups, setGroups] = useState<SelectChangeValue[]>([]);
    const [ownerUuid, setOwnerUuid] = useState<string>();

    const [userOptions, setUserOptions] = useState<{ label: string; value: string }[]>([]);

    const isCertificateArchived = !!certificate?.archived;

    useEffect(() => {
        setUserOptions(
            users.map((user) => ({
                value: user.uuid,
                label: `${user.firstName ? user.firstName + ' ' : ''}${user.lastName ? user.lastName + ' ' : ''}(${user.username})`,
            })),
        );
    }, [users]);

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

    const onCancelGroupUpdate = useCallback(() => {
        setUpdateGroup(false);
        const certificatePreselectedGroups = certificate?.groups?.map((group) => ({
            value: group.uuid,
            label: group.name,
        }));
        setGroups(certificatePreselectedGroups || []);
    }, [certificate?.groups]);

    const onCancelOwnerUpdate = useCallback(() => {
        setUpdateOwner(false);
        setOwnerUuid(undefined);
    }, []);

    const onCancelRaProfileUpdate = useCallback(() => setUpdateRaProfile(false), []);

    const onUpdateGroup = useCallback(() => {
        if (!certificate || !groups) return;
        dispatch(
            actions.updateGroup({
                uuid: certificate.uuid,
                updateGroupRequest: { groupUuids: groups.map((group) => String(group.value)) },
            }),
        );
        setUpdateGroup(false);
    }, [certificate, dispatch, groups]);

    const onUpdateOwner = useCallback(() => {
        if (!certificate || !ownerUuid || !users) return;
        const user = users.find((u) => u.uuid === ownerUuid);
        if (!user) return;
        dispatch(actions.updateOwner({ uuid: certificate.uuid, user, updateOwnerRequest: { ownerUuid: ownerUuid } }));
        setUpdateOwner(false);
    }, [certificate, dispatch, ownerUuid, users]);

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

    const protocolData: TableDataRow[] = useMemo(
        () => buildCertificateProtocolRows(certificate?.protocolInfo, certificateProtocol, getEnumLabel),
        [certificate?.protocolInfo, certificateProtocol],
    );

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
                                  aria-label="Update Owner"
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
                                  aria-label="Update Group"
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
                                  onClick={() => setUpdateRaProfile(true)}
                                  title="Update RA Profile"
                                  aria-label="Update RA Profile"
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
                    certificate ? (
                        <CertificateRAProfileDialog
                            target={{ kind: 'certificate', certificate }}
                            onCancel={onCancelRaProfileUpdate}
                            onUpdate={onCancelRaProfileUpdate}
                        />
                    ) : null
                }
                icon="shield-check"
                size="md"
                toggle={onCancelRaProfileUpdate}
                buttons={[]}
            />

            <PendingActionDialogs action={pendingAction} onClose={() => setPendingAction(null)} />
        </>
    );
}
