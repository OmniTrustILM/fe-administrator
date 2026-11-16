import { useCallback, useEffect, useMemo, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { Link, useParams } from 'react-router';

import { actions, selectors } from 'ducks/est-profiles';
import { actions as groupsActions, selectors as groupsSelectors } from 'ducks/certificateGroups';
import { getEnumLabel, selectors as enumSelectors } from 'ducks/enums';
import { actions as userActions, selectors as userSelectors } from 'ducks/users';

import AttributeViewer from 'components/Attributes/AttributeViewer';
import CustomAttributeWidget from 'components/Attributes/CustomAttributeWidget';
import Badge from 'components/Badge';
import Breadcrumb from 'components/Breadcrumb';
import CommentPanel from 'components/CommentPanel';
import Container from 'components/Container';
import CopyUrlCell from 'components/CopyUrlCell';
import CustomTable, { type TableDataRow, type TableHeader } from 'components/CustomTable';
import DetailPageSkeleton from 'components/DetailPageSkeleton';
import Dialog from 'components/Dialog';
import StatusBadge from 'components/StatusBadge';
import Widget from 'components/Widget';
import type { WidgetButtonProps } from 'components/WidgetButtons';
import { type NameAndUuidDto, PlatformEnum, Resource } from 'types/openapi';
import { LockWidgetNameEnum } from 'types/user-interface';
import EstProfileForm from '../form';
import { showsBasicCredentialSecrets, showsTrustedCaCertificates } from 'utils/est-profile';
import { useRunOnSuccessfulFinish } from 'utils/common-hooks';
import { createWidgetDetailHeaders, getGroupNames, getOwnerName } from 'utils/widget';

const yesNo = (value: boolean) => (value ? 'Yes' : 'No');

function LinkList({ items, basePath }: Readonly<{ items: NameAndUuidDto[] | undefined; basePath: string }>) {
    if (!items?.length) return <span>None</span>;
    return (
        <span className="flex flex-col">
            {items.map((item) => (
                <Link key={item.uuid} to={`${basePath}/${item.uuid}`}>
                    {item.name}
                </Link>
            ))}
        </span>
    );
}

export default function EstProfileDetail() {
    const dispatch = useDispatch();
    const { id } = useParams();

    const estProfile = useSelector(selectors.estProfile);
    const isFetchingDetail = useSelector(selectors.isFetchingDetail);
    const isDisabling = useSelector(selectors.isDisabling);
    const isEnabling = useSelector(selectors.isEnabling);
    const deleteErrorMessage = useSelector(selectors.deleteErrorMessage);
    const isUpdating = useSelector(selectors.isUpdating);
    const updateEstProfileSucceeded = useSelector(selectors.updateEstProfileSucceeded);
    const users = useSelector(userSelectors.users);
    const groups = useSelector(groupsSelectors.certificateGroups);
    const resourceEnum = useSelector(enumSelectors.platformEnum(PlatformEnum.Resource));
    const policyEnum = useSelector(enumSelectors.platformEnum(PlatformEnum.EstAuthenticationPolicy));

    const [confirmDelete, setConfirmDelete] = useState<boolean>(false);
    const [isEditModalOpen, setIsEditModalOpen] = useState<boolean>(false);

    const isBusy = isFetchingDetail || isDisabling || isEnabling;

    const getFreshEstProfile = useCallback(() => {
        if (!id) return;
        dispatch(actions.getEstProfile({ uuid: id }));
    }, [dispatch, id]);

    useEffect(() => {
        getFreshEstProfile();
    }, [getFreshEstProfile]);

    useEffect(() => {
        dispatch(userActions.list());
        dispatch(groupsActions.listGroups());
    }, [dispatch]);

    useRunOnSuccessfulFinish(isUpdating, updateEstProfileSucceeded, () => {
        setIsEditModalOpen(false);
        getFreshEstProfile();
    });

    const onDeleteConfirmed = useCallback(() => {
        if (!estProfile) return;
        dispatch(actions.deleteEstProfile({ uuid: estProfile.uuid }));
        setConfirmDelete(false);
    }, [estProfile, dispatch]);

    const onForceDelete = useCallback(() => {
        if (!estProfile) return;
        dispatch(actions.clearDeleteErrorMessages());
        dispatch(actions.bulkForceDeleteEstProfiles({ uuids: [estProfile.uuid], redirect: '../estprofiles' }));
    }, [estProfile, dispatch]);

    const buttons: WidgetButtonProps[] = useMemo(
        () => [
            {
                icon: 'pencil',
                disabled: !estProfile,
                tooltip: 'Edit',
                onClick: () => setIsEditModalOpen(true),
            },
            {
                icon: 'trash',
                disabled: !estProfile,
                tooltip: 'Delete',
                onClick: () => setConfirmDelete(true),
            },
            {
                icon: 'check',
                disabled: !estProfile || estProfile.enabled,
                tooltip: 'Enable',
                onClick: () => estProfile && dispatch(actions.enableEstProfile({ uuid: estProfile.uuid })),
            },
            {
                icon: 'times',
                disabled: !estProfile?.enabled,
                tooltip: 'Disable',
                onClick: () => estProfile && dispatch(actions.disableEstProfile({ uuid: estProfile.uuid })),
            },
        ],
        [estProfile, dispatch],
    );

    const tableHeader: TableHeader[] = useMemo(() => createWidgetDetailHeaders(), []);

    const detailData: TableDataRow[] = useMemo(() => {
        if (!estProfile) return [];
        const rows: TableDataRow[] = [
            { id: 'uuid', columns: ['UUID', estProfile.uuid] },
            { id: 'name', columns: ['Name', estProfile.name] },
            { id: 'description', columns: ['Description', estProfile.description || ''] },
            { id: 'status', columns: ['Status', <StatusBadge key="status" enabled={estProfile.enabled} />] },
            {
                id: 'systemDefault',
                columns: [
                    'System Default',
                    estProfile.systemDefault ? (
                        <Badge key="systemDefault" color="info">
                            System default
                        </Badge>
                    ) : (
                        'No'
                    ),
                ],
            },
            { id: 'label', columns: ['Label', estProfile.label || 'N/A'] },
        ];
        if (estProfile.estUrl) {
            rows.push({
                id: 'estUrl',
                columns: [
                    'EST URL',
                    <CopyUrlCell key="estUrl" label="EST URL">
                        {estProfile.estUrl}
                    </CopyUrlCell>,
                ],
            });
        }
        return rows;
    }, [estProfile]);

    const authenticationData: TableDataRow[] = useMemo(() => {
        if (!estProfile) return [];
        const policy = estProfile.authenticationPolicy;
        const rows: TableDataRow[] = [{ id: 'policy', columns: ['Authentication Policy', getEnumLabel(policyEnum, policy)] }];
        if (showsBasicCredentialSecrets(policy)) {
            rows.push({
                id: 'basicCredentialSecrets',
                columns: [
                    'Basic Credential Secrets',
                    <LinkList key="secrets" items={estProfile.basicCredentialSecrets} basePath="../../secrets/detail" />,
                ],
            });
        }
        if (showsTrustedCaCertificates(policy)) {
            rows.push({
                id: 'trustedCaCertificates',
                columns: [
                    'Trusted CA Certificates',
                    <LinkList key="cas" items={estProfile.trustedCaCertificates} basePath="../../certificates/detail" />,
                ],
            });
        }
        return rows;
    }, [estProfile, policyEnum]);

    const reenrollmentData: TableDataRow[] = useMemo(() => {
        if (!estProfile) return [];
        return [
            { id: 'allowRenewal', columns: ['Allow Renewal', yesNo(estProfile.allowRenewal)] },
            { id: 'allowRekey', columns: ['Allow Rekey', yesNo(estProfile.allowRekey)] },
            {
                id: 'renewalThreshold',
                columns: ['Renewal Threshold', estProfile.renewalThreshold ? `${estProfile.renewalThreshold} (days)` : 'Half of validity'],
            },
        ];
    }, [estProfile]);

    const responseTimingData: TableDataRow[] = useMemo(() => {
        if (!estProfile) return [];
        return [
            { id: 'issueWaitTimeout', columns: ['Issue Wait', `${estProfile.issueWaitTimeout} s`] },
            { id: 'retryAfter', columns: ['Retry-After', `${estProfile.retryAfter} s`] },
            { id: 'serverKeyGenerationTimeout', columns: ['Key Generation Wait', `${estProfile.serverKeyGenerationTimeout} s`] },
        ];
    }, [estProfile]);

    const serverKeyGenerationData: TableDataRow[] = useMemo(() => {
        if (!estProfile) return [];
        const rows: TableDataRow[] = [
            { id: 'serverKeyGeneration', columns: ['Server Key Generation', yesNo(estProfile.serverKeyGeneration)] },
            { id: 'keyRecovery', columns: ['Key Recovery', yesNo(estProfile.keyRecovery)] },
        ];
        if (estProfile.keyRecovery) {
            rows.push({
                id: 'keyRecoveryTokenProfile',
                columns: ['Key Recovery Token Profile', estProfile.keyRecoveryTokenProfile?.name ?? 'N/A'],
            });
        }
        return rows;
    }, [estProfile]);

    const raProfileData: TableDataRow[] = useMemo(() => {
        const raProfile = estProfile?.raProfile;
        if (!raProfile) return [];
        return [
            { id: 'uuid', columns: ['UUID', raProfile.uuid] },
            {
                id: 'name',
                columns: [
                    'Name',
                    <Link key="raProfileName" to={`../../raprofiles/detail/${raProfile.authorityInstanceUuid}/${raProfile.uuid}`}>
                        {raProfile.name}
                    </Link>,
                ],
            },
            { id: 'status', columns: ['Status', <StatusBadge key="raStatus" enabled={raProfile.enabled} />] },
        ];
    }, [estProfile]);

    const associationsData: TableDataRow[] = useMemo(() => {
        const associations = estProfile?.certificateAssociations;
        const ownerName = getOwnerName(associations?.ownerUuid, users);
        const groupNames = getGroupNames(associations?.groupUuids, groups);
        const linkedGroups = (associations?.groupUuids ?? []).map((uuid, index) => ({
            uuid,
            name: Array.isArray(groupNames) ? (groupNames[index] ?? 'N/A') : 'N/A',
        }));
        return [
            {
                id: 'owner',
                columns: [
                    'Owner',
                    associations?.ownerUuid ? (
                        <Link key="owner" to={`../../users/detail/${associations.ownerUuid}`}>
                            {ownerName}
                        </Link>
                    ) : (
                        ownerName
                    ),
                ],
            },
            {
                id: 'groups',
                columns: [
                    'Groups',
                    linkedGroups.length ? <LinkList key="groups" items={linkedGroups} basePath="../../groups/detail" /> : 'Unassigned',
                ],
            },
        ];
    }, [estProfile, users, groups]);

    if (isFetchingDetail && !estProfile) {
        return <DetailPageSkeleton layout="simple" buttonsCount={2} />;
    }

    return (
        <div>
            <Breadcrumb
                items={[
                    { label: `${getEnumLabel(resourceEnum, Resource.EstProfiles)} Inventory`, href: '/estprofiles' },
                    { label: estProfile?.name || 'EST Profile Details', href: '' },
                ]}
            />
            <Widget widgetLockName={LockWidgetNameEnum.ESTProfileDetails} busy={isBusy} noBorder>
                <Container>
                    <Container className="md:grid grid-cols-2 items-start">
                        <Widget
                            title="EST Profile Details"
                            widgetButtons={buttons}
                            titleSize="large"
                            refreshAction={getFreshEstProfile}
                            lockSize="large"
                        >
                            <CustomTable headers={tableHeader} data={detailData} />
                        </Widget>
                        <Container>
                            <Widget title="Authentication" titleSize="large">
                                <CustomTable headers={tableHeader} data={authenticationData} />
                            </Widget>
                            <Widget title="Reenrollment" titleSize="large">
                                <CustomTable headers={tableHeader} data={reenrollmentData} />
                            </Widget>
                            <Widget title="Response Timing" titleSize="large">
                                <CustomTable headers={tableHeader} data={responseTimingData} />
                            </Widget>
                        </Container>
                    </Container>
                    <Widget title="Server Key Generation" titleSize="large">
                        <CustomTable headers={tableHeader} data={serverKeyGenerationData} />
                        {!!estProfile?.keyRecoveryKeyAttributes?.length && (
                            <Widget title="Key Recovery Key Attributes" noBorder className="mt-2">
                                <AttributeViewer attributes={estProfile.keyRecoveryKeyAttributes} />
                            </Widget>
                        )}
                    </Widget>
                    {estProfile && (
                        <CustomAttributeWidget
                            resource={Resource.EstProfiles}
                            resourceUuid={estProfile.uuid}
                            attributes={estProfile.customAttributes}
                        />
                    )}
                    <Widget title={raProfileData.length ? 'RA Profile Configuration' : 'Default RA Profile not selected'} titleSize="large">
                        {raProfileData.length > 0 && <CustomTable headers={tableHeader} data={raProfileData} />}
                        {!!estProfile?.issueCertificateAttributes?.length && (
                            <Widget title="List of Attributes to Issue Certificate">
                                <AttributeViewer attributes={estProfile.issueCertificateAttributes} />
                            </Widget>
                        )}
                    </Widget>
                    <Widget title="Default Certificate associations" titleSize="large">
                        <CustomTable headers={tableHeader} data={associationsData} />
                        <Widget title="Certificate Custom Attributes" noBorder className="mt-2" titleSize="large">
                            <AttributeViewer attributes={estProfile?.certificateAssociations?.customAttributes} />
                        </Widget>
                    </Widget>
                    {estProfile && <CommentPanel resource={Resource.EstProfiles} objectUuid={estProfile.uuid} />}
                </Container>
            </Widget>

            <Dialog
                isOpen={confirmDelete}
                caption="Delete EST Profile"
                body="You are about to delete the EST Profile. EST clients will no longer be able to use it."
                toggle={() => setConfirmDelete(false)}
                icon="delete"
                buttons={[
                    { color: 'danger', onClick: onDeleteConfirmed, body: 'Delete' },
                    { color: 'secondary', variant: 'outline', onClick: () => setConfirmDelete(false), body: 'Cancel' },
                ]}
            />
            <Dialog
                isOpen={deleteErrorMessage.length > 0}
                caption="Delete EST Profile"
                body={
                    <>
                        Failed to delete the EST Profile that has dependent objects. Please find the details below:
                        <br />
                        <br />
                        {deleteErrorMessage}
                    </>
                }
                toggle={() => dispatch(actions.clearDeleteErrorMessages())}
                buttons={[
                    { color: 'danger', onClick: onForceDelete, body: 'Force' },
                    { color: 'secondary', variant: 'outline', onClick: () => dispatch(actions.clearDeleteErrorMessages()), body: 'Cancel' },
                ]}
            />
            <Dialog
                isOpen={isEditModalOpen}
                toggle={() => setIsEditModalOpen(false)}
                caption="Edit EST Profile"
                size="xl"
                body={
                    <EstProfileForm
                        estProfileId={estProfile?.uuid}
                        onCancel={() => setIsEditModalOpen(false)}
                        onSuccess={() => setIsEditModalOpen(false)}
                    />
                }
            />
        </div>
    );
}
