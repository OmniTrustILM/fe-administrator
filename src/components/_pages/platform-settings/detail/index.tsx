import DetailPageSkeleton from 'components/DetailPageSkeleton';
import CertificateSettings from 'components/_pages/platform-settings/certificates/CertificateSettings';
import UtilsSettings from 'components/_pages/platform-settings/utils/UtilsSettings';
import TabLayout from 'components/Layout/TabLayout';
import Widget from 'components/Widget';
import type { WidgetButtonProps } from 'components/WidgetButtons';

import { actions, selectors } from 'ducks/settings';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';

import { LockWidgetNameEnum } from 'types/user-interface';
import Dialog from 'components/Dialog';
import PlatformSettingsForm from '../form';

export default function PlatformSettingsDetail() {
    const dispatch = useDispatch();

    const platformSettings = useSelector(selectors.platformSettings);
    const isFetchingPlatform = useSelector(selectors.isFetchingPlatform);
    const [isEditModalOpen, setIsEditModalOpen] = useState<boolean>(false);

    const getFreshPlatformSettings = useCallback(() => {
        dispatch(actions.getPlatformSettings());
    }, [dispatch]);

    useEffect(() => {
        getFreshPlatformSettings();
    }, [getFreshPlatformSettings]);

    const handleOpenEditModal = useCallback(() => {
        setIsEditModalOpen(true);
    }, []);

    const handleCloseEditModal = useCallback(() => {
        setIsEditModalOpen(false);
        getFreshPlatformSettings();
    }, [getFreshPlatformSettings]);

    const onEditClick = useCallback(() => {
        handleOpenEditModal();
    }, [handleOpenEditModal]);

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
        ],
        [onEditClick],
    );

    if (isFetchingPlatform) {
        return <DetailPageSkeleton layout="tabs" tabCount={2} />;
    }

    return (
        <div>
            <Widget
                title="Platform Settings"
                widgetLockName={LockWidgetNameEnum.PlatformSettings}
                widgetButtons={buttons}
                titleSize="large"
                refreshAction={getFreshPlatformSettings}
            >
                <TabLayout
                    noBorder
                    isLoading={isFetchingPlatform}
                    tabs={[
                        {
                            title: 'Utils',
                            content: <UtilsSettings platformSettings={platformSettings} />,
                        },
                        {
                            title: 'Certificates',
                            content: <CertificateSettings platformSettings={platformSettings} />,
                        },
                    ]}
                />
            </Widget>

            <Dialog
                isOpen={isEditModalOpen}
                toggle={handleCloseEditModal}
                caption="Edit Platform Settings"
                size="xl"
                body={<PlatformSettingsForm onCancel={handleCloseEditModal} onSuccess={handleCloseEditModal} />}
            />
        </div>
    );
}
