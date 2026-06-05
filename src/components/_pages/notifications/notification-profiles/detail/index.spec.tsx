import { test, expect } from 'playwright/ct-test';
import { RecipientType } from 'types/openapi';
import {
    RECIPIENT_TYPE_USER_DESCRIPTION as USER_DESCRIPTION,
    defaultNotificationProfileDetail as baseProfile,
    recipientTypeEnumWithUserDescription as enumsWithDescription,
} from '../notificationProfileTestFixtures';
import { NotificationProfileDetailTestWrapper } from './NotificationProfileDetailTestWrapper';

test.describe('NotificationProfileDetail - recipient type description tooltip', () => {
    test('shows info icon and tooltip when the recipient type has a description', async ({ mount, page }) => {
        await mount(
            <NotificationProfileDetailTestWrapper
                notificationProfile={{ ...baseProfile, recipientType: RecipientType.User }}
                platformEnumsOverride={enumsWithDescription}
            />,
        );

        const infoIcon = page.getByTestId('recipientType-info');
        await expect(infoIcon).toBeVisible();

        await infoIcon.hover();
        await expect(page.getByText(USER_DESCRIPTION)).toBeVisible();
    });

    test('does not show info icon when the recipient type has no description', async ({ mount, page }) => {
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
