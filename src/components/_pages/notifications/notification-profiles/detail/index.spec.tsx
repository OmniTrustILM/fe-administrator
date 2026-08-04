import { test, expect } from 'playwright/ct-test';
import { NotificationDataCategory, RecipientType } from 'types/openapi';
import {
    RECIPIENT_TYPE_USER_DESCRIPTION as USER_DESCRIPTION,
    defaultNotificationProfileDetail as baseProfile,
    recipientTypeEnumWithUserDescription as enumsWithDescription,
} from '../notificationProfileTestFixtures';
import { NotificationProfileDetailTestWrapper } from './NotificationProfileDetailTestWrapper';

test.describe('NotificationProfileDetail - recipient type description toggletip', () => {
    test('shows info button and toggletip opens on click when the recipient type has a description', async ({ mount, page }) => {
        await mount(
            <NotificationProfileDetailTestWrapper
                notificationProfile={{ ...baseProfile, recipientType: RecipientType.User }}
                platformEnumsOverride={enumsWithDescription}
            />,
        );

        const infoButton = page.getByTestId('recipientType-info');
        await expect(infoButton).toBeVisible();
        await expect(page.getByText(USER_DESCRIPTION)).toHaveCount(0);

        await infoButton.click();
        await expect(page.getByText(USER_DESCRIPTION)).toBeVisible();

        await page.keyboard.press('Escape');
        await expect(page.getByText(USER_DESCRIPTION)).toHaveCount(0);
    });

    test('does not show info button when the recipient type has no description', async ({ mount, page }) => {
        await mount(
            <NotificationProfileDetailTestWrapper
                notificationProfile={{ ...baseProfile, recipientType: RecipientType.Owner }}
                platformEnumsOverride={enumsWithDescription}
            />,
        );

        await expect(page.getByText('Recipient Type')).toBeVisible();
        await expect(page.getByTestId('recipientType-info')).toHaveCount(0);
    });
});

test.describe('NotificationProfileDetail - event data categories', () => {
    test('enabled categories render as tags', async ({ mount, page }) => {
        await mount(
            <NotificationProfileDetailTestWrapper
                notificationProfile={{
                    ...baseProfile,
                    eventDataCategories: [NotificationDataCategory.CustomAttributes, NotificationDataCategory.Metadata],
                }}
            />,
        );

        const tags = page.getByTestId('eventDataCategories-tags');
        await expect(tags).toBeVisible();
        await expect(tags.getByText('Custom attributes', { exact: true })).toBeVisible();
        await expect(tags.getByText('Metadata', { exact: true })).toBeVisible();
    });

    test('a profile without categories shows None', async ({ mount, page }) => {
        await mount(<NotificationProfileDetailTestWrapper />);

        await expect(page.getByText('Event Data', { exact: true })).toBeVisible();
        await expect(page.getByText('None', { exact: true })).toBeVisible();
    });
});
