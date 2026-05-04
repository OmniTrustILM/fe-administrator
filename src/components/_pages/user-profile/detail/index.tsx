import DetailPageSkeleton from 'components/DetailPageSkeleton';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';

import { actions, selectors } from 'ducks/auth';

import CustomTable, { type TableDataRow, type TableHeader } from 'components/CustomTable';
import Dialog from 'components/Dialog';
import Widget from 'components/Widget';
import type { WidgetButtonProps } from 'components/WidgetButtons';
import { createWidgetDetailHeaders } from 'utils/widget';
import UserProfileForm from '../form';

export default function UserProfileDetail() {
    const dispatch = useDispatch();

    const profile = useSelector(selectors.profile);
    const isFetchingDetail = useSelector(selectors.isFetchingProfile);
    const isUpdatingProfile = useSelector(selectors.isUpdatingProfile);

    const [isEditModalOpen, setIsEditModalOpen] = useState(false);

    useEffect(() => {
        dispatch(actions.getProfile());
    }, [dispatch]);

    const wasUpdating = useRef(isUpdatingProfile);

    useEffect(() => {
        if (wasUpdating.current && !isUpdatingProfile) {
            setIsEditModalOpen(false);
            dispatch(actions.getProfile());
        }
        wasUpdating.current = isUpdatingProfile;
    }, [isUpdatingProfile, dispatch]);

    const handleOpenEditModal = useCallback(() => {
        setIsEditModalOpen(true);
    }, []);

    const handleCloseEditModal = useCallback(() => {
        setIsEditModalOpen(false);
    }, []);

    const buttons: WidgetButtonProps[] = useMemo(
        () => [
            {
                icon: 'pencil',
                disabled: profile?.systemUser || false,
                tooltip: 'Edit',
                onClick: handleOpenEditModal,
            },
        ],
        [profile, handleOpenEditModal],
    );

    const detailHeaders: TableHeader[] = useMemo(() => createWidgetDetailHeaders(), []);

    const detailData: TableDataRow[] = useMemo(
        () =>
            !profile
                ? []
                : [
                      {
                          id: 'username',
                          columns: ['Username', profile.username],
                      },
                      {
                          id: 'description',
                          columns: ['Description', profile.description || ''],
                      },
                      {
                          id: 'firstName',
                          columns: ['First name', profile.firstName || ''],
                      },
                      {
                          id: 'lastName',
                          columns: ['Last name', profile.lastName || ''],
                      },
                      {
                          id: 'email',
                          columns: ['Email', profile.email || ''],
                      },
                  ],
        [profile],
    );

    if (isFetchingDetail) {
        return <DetailPageSkeleton layout="simple" buttonsCount={1} />;
    }

    return (
        <>
            <Widget title="User Details" busy={isFetchingDetail} widgetButtons={buttons} titleSize="large">
                <CustomTable headers={detailHeaders} data={detailData} />
            </Widget>

            <Dialog
                isOpen={isEditModalOpen}
                toggle={handleCloseEditModal}
                caption="Edit User Profile"
                size="xl"
                body={<UserProfileForm onCancel={handleCloseEditModal} onSuccess={handleCloseEditModal} />}
                noBorder
            />
        </>
    );
}
