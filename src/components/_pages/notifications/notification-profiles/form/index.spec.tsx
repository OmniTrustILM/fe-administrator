import { test, expect } from 'playwright/ct-test';
import {
    RECIPIENT_TYPE_USER_DESCRIPTION as USER_DESCRIPTION,
    recipientTypeEnumWithUserDescription as enumsWithDescription,
} from '../notificationProfileTestFixtures';
import { NotificationProfileFormTestWrapper } from './NotificationProfileFormTestWrapper';

test.describe('NotificationProfileForm - Object recipient type', () => {
    test('Object option appears in the Recipient Type dropdown', async ({ mount, page }) => {
        await mount(<NotificationProfileFormTestWrapper />);
        await page.getByTestId('select-recipientType-trigger').click();
        await expect(page.getByRole('option', { name: 'Object', exact: true })).toBeVisible();
    });

    test('selecting Object hides Recipients field', async ({ mount, page }) => {
        await mount(<NotificationProfileFormTestWrapper />);

        // Pick User first to make sure Recipients shows up
        await page.getByTestId('select-recipientType-trigger').click();
        await page.getByRole('option', { name: 'User', exact: true }).click();
        await expect(page.getByText('Notification Recipients')).toBeVisible();

        // Switch to Object — recipients should disappear
        await page.getByTestId('select-recipientType-trigger').click();
        await page.getByRole('option', { name: 'Object', exact: true }).click();
        await expect(page.getByText('Notification Recipients')).not.toBeVisible();
    });

    test('selecting Object disables internal notifications switch', async ({ mount, page }) => {
        await mount(<NotificationProfileFormTestWrapper />);

        await page.getByTestId('select-recipientType-trigger').click();
        await page.getByRole('option', { name: 'Object', exact: true }).click();

        const switchEl = page.locator('#internalNotification');
        await expect(switchEl).toBeDisabled();
    });

    test('Object resets internal notifications to off', async ({ mount, page }) => {
        await mount(<NotificationProfileFormTestWrapper />);

        // Enable internal notifications via the visually hidden checkbox (sr-only).
        await page.getByTestId('select-recipientType-trigger').click();
        await page.getByRole('option', { name: 'User', exact: true }).click();
        const switchEl = page.locator('#internalNotification');
        await switchEl.check({ force: true });
        await expect(switchEl).toBeChecked();

        // Switch to Object — must be off and disabled
        await page.getByTestId('select-recipientType-trigger').click();
        await page.getByRole('option', { name: 'Object', exact: true }).click();
        await expect(switchEl).not.toBeChecked();
        await expect(switchEl).toBeDisabled();
    });
});

test.describe('NotificationProfileForm - recipient type description tooltip', () => {
    test('no info icon when the selected recipient type has no description', async ({ mount, page }) => {
        await mount(<NotificationProfileFormTestWrapper platformEnumsOverride={enumsWithDescription} />);
        // The form defaults to the "None" recipient type, which has no description.
        await expect(page.getByTestId('recipientType-info')).toHaveCount(0);
    });

    test('info icon appears and tooltip shows the description when the type has one', async ({ mount, page }) => {
        await mount(<NotificationProfileFormTestWrapper platformEnumsOverride={enumsWithDescription} />);

        await page.getByTestId('select-recipientType-trigger').click();
        await page.getByRole('option', { name: 'User', exact: true }).click();

        const infoIcon = page.getByTestId('recipientType-info');
        await expect(infoIcon).toBeVisible();

        await infoIcon.hover();
        await expect(page.getByText(USER_DESCRIPTION)).toBeVisible();
    });

    test('info icon disappears when switching to a type without a description', async ({ mount, page }) => {
        await mount(<NotificationProfileFormTestWrapper platformEnumsOverride={enumsWithDescription} />);

        // User has a description → icon shown.
        await page.getByTestId('select-recipientType-trigger').click();
        await page.getByRole('option', { name: 'User', exact: true }).click();
        await expect(page.getByTestId('recipientType-info')).toBeVisible();

        // Owner has no description → icon hidden.
        await page.getByTestId('select-recipientType-trigger').click();
        await page.getByRole('option', { name: 'Owner', exact: true }).click();
        await expect(page.getByTestId('recipientType-info')).toHaveCount(0);
    });
});
