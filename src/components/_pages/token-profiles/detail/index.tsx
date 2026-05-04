import DetailPageSkeleton from 'components/DetailPageSkeleton';
import AttributeViewer from 'components/Attributes/AttributeViewer';
import CustomTable, { type TableDataRow, type TableHeader } from 'components/CustomTable';
import Dialog from 'components/Dialog';
import StatusBadge from 'components/StatusBadge';
import TokenStatusBadge from 'components/_pages/tokens/TokenStatusBadge';

import Widget from 'components/Widget';
import type { WidgetButtonProps } from 'components/WidgetButtons';

import { actions as tokenProfilesActions, selectors as tokenProfilesSelectors } from 'ducks/token-profiles';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { useRunOnSuccessfulFinish } from 'utils/common-hooks';
import { useDispatch, useSelector } from 'react-redux';
import { Link, useParams } from 'react-router';
import TokenProfileForm from '../form';
import KeyUsageSelect from '../../cryptographic-keys/KeyUsageSelect';
import { selectors as enumSelectors, getEnumLabel } from 'ducks/enums';
import Label from 'components/Label';
import Badge from 'components/Badge';
import { type KeyUsage, PlatformEnum, Resource } from 'types/openapi';
import { LockWidgetNameEnum } from 'types/user-interface';
import CustomAttributeWidget from '../../../Attributes/CustomAttributeWidget';
import { createWidgetDetailHeaders } from 'utils/widget';
import Breadcrumb from 'components/Breadcrumb';
import Container from 'components/Container';

export default function TokenProfileDetail() {
    const dispatch = useDispatch();

    const { id, tokenId } = useParams();

    const tokenProfile = useSelector(tokenProfilesSelectors.tokenProfile);

    const isFetchingProfile = useSelector(tokenProfilesSelectors.isFetchingDetail);
    const isUpdatingKeyUsage = useSelector(tokenProfilesSelectors.isUpdatingKeyUsage);
    const isUpdating = useSelector(tokenProfilesSelectors.isUpdating);
    const updateTokenProfileSucceeded = useSelector(tokenProfilesSelectors.updateTokenProfileSucceeded);

    const isDeleting = useSelector(tokenProfilesSelectors.isDeleting);
    const isEnabling = useSelector(tokenProfilesSelectors.isEnabling);
    const isDisabling = useSelector(tokenProfilesSelectors.isDisabling);

    const [confirmDelete, setConfirmDelete] = useState<boolean>(false);
    const [isEditModalOpen, setIsEditModalOpen] = useState<boolean>(false);

    const [keyUsageUpdate, setKeyUsageUpdate] = useState<boolean>(false);

    const keyUsageEnum = useSelector(enumSelectors.platformEnum(PlatformEnum.KeyUsage));
    const [keyUsages, setKeyUsages] = useState<KeyUsage[]>([]);
    const resourceEnum = useSelector(enumSelectors.platformEnum(PlatformEnum.Resource));
    const isBusy = useMemo(
        () => isFetchingProfile || isDeleting || isEnabling || isDisabling || isUpdatingKeyUsage,
        [isFetchingProfile, isDeleting, isEnabling, isDisabling, isUpdatingKeyUsage],
    );

    const getFreshTokenProfileDetails = useCallback(() => {
        if (!id || !tokenId) return;
        dispatch(tokenProfilesActions.getTokenProfileDetail({ tokenInstanceUuid: tokenId, uuid: id }));
    }, [id, dispatch, tokenId]);

    useEffect(() => {
        getFreshTokenProfileDetails();
    }, [getFreshTokenProfileDetails, id, tokenId]);

    useRunOnSuccessfulFinish(isUpdating, updateTokenProfileSucceeded, () => {
        setIsEditModalOpen(false);
        getFreshTokenProfileDetails();
    });

    const handleCloseEditModal = useCallback(() => {
        setIsEditModalOpen(false);
    }, []);

    const onEditClick = useCallback(() => {
        if (!tokenProfile) return;
        setIsEditModalOpen(true);
    }, [tokenProfile]);

    const onEnableClick = useCallback(() => {
        if (!tokenProfile) return;
        dispatch(tokenProfilesActions.enableTokenProfile({ tokenInstanceUuid: tokenProfile.tokenInstanceUuid, uuid: tokenProfile.uuid }));
    }, [dispatch, tokenProfile]);

    const onDisableClick = useCallback(() => {
        if (!tokenProfile) return;
        dispatch(tokenProfilesActions.disableTokenProfile({ tokenInstanceUuid: tokenProfile.tokenInstanceUuid, uuid: tokenProfile.uuid }));
    }, [dispatch, tokenProfile]);

    const onDeleteConfirmed = useCallback(() => {
        if (!tokenProfile) return;
        dispatch(
            tokenProfilesActions.deleteTokenProfile({
                tokenInstanceUuid: tokenProfile.tokenInstanceUuid || 'unknown',
                uuid: tokenProfile.uuid,
                redirect: '../../../tokenprofiles',
            }),
        );
        setConfirmDelete(false);
    }, [dispatch, tokenProfile]);

    const existingUsages = () => {
        if (!tokenProfile) return [];
        return tokenProfile?.usages.map((usage) => {
            return { value: usage, label: usage.charAt(0).toUpperCase() + usage.slice(1).toLowerCase() };
        });
    };

    const buttons: WidgetButtonProps[] = useMemo(
        () => [
            {
                icon: 'pencil',
                disabled: false,
                tooltip: 'Edit',
                onClick: () => {
                    onEditClick();
                },
            },
            {
                icon: 'trash',
                disabled: false,
                tooltip: 'Delete',
                onClick: () => {
                    setConfirmDelete(true);
                },
            },
            {
                icon: 'check',
                disabled: !tokenProfile?.tokenInstanceUuid || tokenProfile?.enabled || false,
                tooltip: 'Enable',
                onClick: () => {
                    onEnableClick();
                },
            },
            {
                icon: 'times',
                disabled: !tokenProfile?.tokenInstanceUuid || !(tokenProfile?.enabled || false),
                tooltip: 'Disable',
                onClick: () => {
                    onDisableClick();
                },
            },
            {
                icon: 'key',
                disabled: !tokenProfile?.tokenInstanceUuid || false,
                tooltip: 'Update Key Usages',
                onClick: () => {
                    setKeyUsageUpdate(true);
                },
            },
        ],
        [tokenProfile, onEditClick, onDisableClick, onEnableClick],
    );

    const detailHeaders: TableHeader[] = useMemo(() => createWidgetDetailHeaders(), []);

    const detailData: TableDataRow[] = useMemo(
        () =>
            !tokenProfile
                ? []
                : [
                      {
                          id: 'uuid',
                          columns: ['UUID', tokenProfile.uuid],
                      },
                      {
                          id: 'name',
                          columns: ['Name', tokenProfile.name],
                      },
                      {
                          id: 'description',
                          columns: ['Description', tokenProfile.description || ''],
                      },
                      {
                          id: 'enabled',
                          columns: ['Enabled', <StatusBadge enabled={tokenProfile!.enabled} />],
                      },
                      {
                          id: 'tokenUuid',
                          columns: ['Token Instance UUID', tokenProfile.tokenInstanceUuid],
                      },
                      {
                          id: 'tokenName',
                          columns: [
                              'Token Instance Name',
                              tokenProfile.tokenInstanceUuid ? (
                                  <Link to={`../../tokens/detail/${tokenProfile.tokenInstanceUuid}`}>{tokenProfile.tokenInstanceName}</Link>
                              ) : (
                                  ''
                              ),
                          ],
                      },
                      {
                          id: 'tokenStatus',
                          columns: ['Token Instance Status', <TokenStatusBadge status={tokenProfile.tokenInstanceStatus} />],
                      },
                      {
                          id: 'Key Usages',
                          columns: [
                              'Key Usages',
                              tokenProfile.usages.map((usage) => (
                                  <Badge key={usage} color="secondary" className="mr-xs">
                                      {usage}
                                  </Badge>
                              )),
                          ],
                      },
                  ],
        [tokenProfile],
    );

    const onUpdateKeyUsageConfirmed = useCallback(() => {
        dispatch(
            tokenProfilesActions.updateKeyUsage({
                tokenInstanceUuid: tokenProfile?.tokenInstanceUuid || 'unknown',

                uuid: tokenProfile?.uuid || 'unknown',

                usage: { usage: keyUsages },
            }),
        );

        setKeyUsageUpdate(false);
    }, [dispatch, tokenProfile, keyUsages]);

    if (isFetchingProfile) {
        return <DetailPageSkeleton layout="simple" buttonsCount={4} />;
    }

    return (
        <div>
            <Breadcrumb
                items={[
                    { label: 'Token Profiles', href: '/tokenprofiles' },
                    { label: tokenProfile?.name || 'Token Profile Details', href: '' },
                ]}
            />
            <Widget widgetLockName={LockWidgetNameEnum.TokenProfileDetails} busy={isBusy} noBorder>
                <Container className="md:flex-row">
                    <Widget
                        title="Token Profile Details"
                        widgetButtons={buttons}
                        titleSize="large"
                        refreshAction={getFreshTokenProfileDetails}
                        lockSize="large"
                        className="w-full md:w-1/2"
                    >
                        <CustomTable headers={detailHeaders} data={detailData} />
                    </Widget>
                    <Container className="w-full md:w-1/2 flex flex-col">
                        <Widget title="Attributes" titleSize="large">
                            <Label>Token Profile Attributes</Label>
                            <AttributeViewer attributes={tokenProfile?.attributes} />
                        </Widget>

                        {tokenProfile && (
                            <CustomAttributeWidget
                                resource={Resource.TokenProfiles}
                                resourceUuid={tokenProfile.uuid}
                                attributes={tokenProfile.customAttributes}
                            />
                        )}
                    </Container>
                </Container>
            </Widget>
            <Dialog
                isOpen={confirmDelete}
                caption="Delete Token Profile"
                body="You are about to delete Token Profile. Is this what you want to do?"
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
                isOpen={isEditModalOpen}
                toggle={handleCloseEditModal}
                caption="Edit Token Profile"
                size="xl"
                body={
                    <TokenProfileForm
                        tokenProfileId={tokenProfile?.uuid}
                        tokenId={tokenProfile?.tokenInstanceUuid || tokenId}
                        onCancel={handleCloseEditModal}
                    />
                }
            />
        </div>
    );
}
