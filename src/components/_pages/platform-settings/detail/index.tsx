import DetailPageSkeleton from 'components/DetailPageSkeleton';
import AppearanceSettings from 'components/_pages/platform-settings/appearance/AppearanceSettings';
import CertificateSettings from 'components/_pages/platform-settings/certificates/CertificateSettings';
import RequestAttributesSettings from 'components/_pages/platform-settings/request-attributes/RequestAttributesSettings';
import UtilsSettings from 'components/_pages/platform-settings/utils/UtilsSettings';
import TabLayout from 'components/Layout/TabLayout';
import Widget from 'components/Widget';
import type { WidgetButtonProps } from 'components/WidgetButtons';

import { actions, selectors } from 'ducks/settings';
import { selectors as authSelectors } from 'ducks/auth';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';

import { LockWidgetNameEnum } from 'types/user-interface';
import { Resource } from 'types/openapi';
import Dialog from 'components/Dialog';
import PlatformSettingsForm from '../form';

export default function PlatformSettingsDetail() {
    const dispatch = useDispatch();

    const platformSettings = useSelector(selectors.platformSettings);
    const profile = useSelector(authSelectors.profile);
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
    }, []);

    const handleSuccessEditModal = useCallback(() => {
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

    /**
     * Approximates the branding-write grant; Core is the real gate.
     *
     * Why not the real grant: Core gates the write on `ResourceAction.UPDATE_BRANDING`, but the user profile carries
     * `allowedListings` only - a per-resource listing grant - so that action is invisible client-side.
     *
     * Consequence: a viewer holding `SETTINGS` + `UPDATE` but not `UPDATE_BRANDING` sees enabled controls and is
     * refused by Core on save, and shown its message, rather than being disabled up front.
     *
     * Tracked in OmniTrustILM/interfaces#920.
     */
    const canUpdateBranding = !!profile?.permissions?.allowedListings?.includes(Resource.Settings);

    // Declared once so the skeleton below cannot advertise a different number of tabs than the layout renders.
    const tabs = [
        {
            title: 'Utils',
            content: <UtilsSettings platformSettings={platformSettings} />,
        },
        {
            title: 'Certificates',
            content: <CertificateSettings platformSettings={platformSettings} />,
        },
        {
            title: 'Request Attributes',
            content: <RequestAttributesSettings />,
        },
        {
            title: 'Appearance',
            content: <AppearanceSettings canUpdate={canUpdateBranding} />,
        },
    ];

    if (isFetchingPlatform && !isEditModalOpen) {
        return <DetailPageSkeleton layout="tabs" tabCount={tabs.length} rowCount={2} showBreadcrumb={false} tabWidgetButtonsCount={1} />;
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
                <TabLayout tabUrlParam="tab" noBorder isLoading={isFetchingPlatform && !isEditModalOpen} tabs={tabs} />
            </Widget>

            <Dialog
                isOpen={isEditModalOpen}
                toggle={handleCloseEditModal}
                caption="Edit Platform Settings"
                size="xl"
                body={<PlatformSettingsForm onCancel={handleCloseEditModal} onSuccess={handleSuccessEditModal} />}
            />
        </div>
    );
}
