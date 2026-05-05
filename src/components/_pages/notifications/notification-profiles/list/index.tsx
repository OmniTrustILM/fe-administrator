import BooleanBadge from 'components/BooleanBadge/BooleanBadge';
import type { TableDataRow, TableHeader } from 'components/CustomTable';
import PagedList from 'components/PagedList/PagedList';
import Dialog from 'components/Dialog';
import NotificationProfileForm from '../form';
import { getEnumLabel, selectors as enumSelectors } from 'ducks/enums';
import { actions, selectors } from 'ducks/notification-profiles';
import { useCallback, useMemo, useState } from 'react';
import { useRunOnSuccessfulFinish } from 'utils/common-hooks';

import { useDispatch, useSelector } from 'react-redux';
import { Link } from 'react-router';
import Badge from 'components/Badge';
import type { WidgetButtonProps } from 'components/WidgetButtons';
import { EntityType } from 'ducks/filters';
import type { SearchRequestModel } from 'types/certificate';
import { PlatformEnum } from 'types/openapi';
import { LockWidgetNameEnum } from 'types/user-interface';

const NotificationProfilesList = () => {
    const dispatch = useDispatch();

    const notificationProfiles = useSelector(selectors.notificationProfiles);
    const isCreating = useSelector(selectors.isCreating);
    const createNotificationProfileSucceeded = useSelector(selectors.createNotificationProfileSucceeded);
    const isUpdating = useSelector(selectors.isUpdating);
    const updateNotificationProfileSucceeded = useSelector(selectors.updateNotificationProfileSucceeded);

    const recipientTypeEnum = useSelector(enumSelectors.platformEnum(PlatformEnum.RecipientType));

    const [isAddModalOpen, setIsAddModalOpen] = useState<boolean>(false);
    const [editingNotificationProfileId, setEditingNotificationProfileId] = useState<string | undefined>(undefined);
    const [editingVersion, setEditingVersion] = useState<string | undefined>(undefined);

    const onListCallback = useCallback(
        (pagination: SearchRequestModel) => dispatch(actions.listNotificationProfiles(pagination)),
        [dispatch],
    );

    useRunOnSuccessfulFinish(isCreating, createNotificationProfileSucceeded, () => {
        setIsAddModalOpen(false);
        onListCallback({ itemsPerPage: 10, pageNumber: 1, filters: [] });
    });
    useRunOnSuccessfulFinish(isUpdating, updateNotificationProfileSucceeded, () => {
        setEditingNotificationProfileId(undefined);
        setEditingVersion(undefined);
        onListCallback({ itemsPerPage: 10, pageNumber: 1, filters: [] });
    });

    const handleOpenAddModal = useCallback(() => {
        setIsAddModalOpen(true);
    }, []);

    const handleCloseAddModal = useCallback(() => {
        setIsAddModalOpen(false);
        setEditingNotificationProfileId(undefined);
        setEditingVersion(undefined);
    }, []);

    const additionalButtons: WidgetButtonProps[] = useMemo(
        () => [
            {
                icon: 'plus',
                disabled: false,
                tooltip: 'Create',
                onClick: handleOpenAddModal,
            },
        ],
        [handleOpenAddModal],
    );

    const headers: TableHeader[] = useMemo(
        () => [
            {
                id: 'profileName',
                content: 'Name',
                sortable: true,
            },
            {
                id: 'description',
                content: 'Description',
            },
            {
                id: 'recipientType',
                content: 'Recipient Type',
                sortable: true,
                align: 'center',
            },
            {
                id: 'internalNotification',
                content: 'Internal Notification',
                sortable: true,
                align: 'center',
            },
            {
                id: 'version',
                content: 'Version',
                align: 'right',
            },
        ],
        [],
    );

    const dataRows: TableDataRow[] = useMemo(
        () =>
            notificationProfiles
                ? notificationProfiles.map((profile) => ({
                      id: profile.uuid,
                      columns: [
                          <Link key="name" to={`./detail/${profile.uuid}/${profile.version}`}>
                              {profile.name}
                          </Link>,
                          profile.description ?? '',
                          <Badge key="recipientType" className="secondary">
                              {getEnumLabel(recipientTypeEnum, profile.recipientType)}
                          </Badge>,
                          <BooleanBadge key="internalNotification" value={profile.internalNotification} />,
                          profile.version.toString(),
                      ],
                  }))
                : [],
        [notificationProfiles, recipientTypeEnum],
    );

    return (
        <>
            <PagedList
                entity={EntityType.NOTIFICATION_PROFILES}
                onListCallback={onListCallback}
                headers={headers}
                data={dataRows}
                title="List of Notification Profiles"
                entityNameSingular="a Notification Profile"
                entityNamePlural="Notification Profiles"
                pageWidgetLockName={LockWidgetNameEnum.ListOfNotificationProfiles}
                addHidden
                additionalButtons={additionalButtons}
                hasCheckboxes={false}
            />

            <Dialog
                isOpen={isAddModalOpen || !!editingNotificationProfileId}
                toggle={handleCloseAddModal}
                caption={editingNotificationProfileId ? 'Edit Notification Profile' : 'Create Notification Profile'}
                size="xl"
                body={
                    <NotificationProfileForm
                        notificationProfileId={editingNotificationProfileId}
                        version={editingVersion}
                        onCancel={handleCloseAddModal}
                    />
                }
            />
        </>
    );
};

export default NotificationProfilesList;
