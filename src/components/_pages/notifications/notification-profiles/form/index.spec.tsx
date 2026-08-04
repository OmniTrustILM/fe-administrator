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

test.describe('NotificationProfileForm - recipient type description', () => {
    const helpField = (page: import('@playwright/test').Page) => page.getByTestId('select-recipientType-selected-description');

    test('no inline help when the selected recipient type has no description', async ({ mount, page }) => {
        // The form defaults to the "None" recipient type, which has no description.
        await mount(<NotificationProfileFormTestWrapper platformEnumsOverride={enumsWithDescription} />);
        await expect(helpField(page)).toHaveCount(0);
    });

    test('dropdown options show the description teaser', async ({ mount, page }) => {
        await mount(<NotificationProfileFormTestWrapper platformEnumsOverride={enumsWithDescription} />);

        await page.getByTestId('select-recipientType-trigger').click();
        await expect(page.getByText(USER_DESCRIPTION)).toBeVisible();
    });

    test('selected value shows its full description as inline help beneath the field', async ({ mount, page }) => {
        await mount(<NotificationProfileFormTestWrapper platformEnumsOverride={enumsWithDescription} />);

        await page.getByTestId('select-recipientType-trigger').click();
        // The option's accessible name now includes the description teaser, so match by substring.
        await page.getByRole('option', { name: 'User' }).click();

        await expect(helpField(page)).toBeVisible();
        await expect(helpField(page)).toHaveText(USER_DESCRIPTION);
    });

    test('inline help disappears when switching to a type without a description', async ({ mount, page }) => {
        await mount(<NotificationProfileFormTestWrapper platformEnumsOverride={enumsWithDescription} />);

        await page.getByTestId('select-recipientType-trigger').click();
        await page.getByRole('option', { name: 'User' }).click();
        await expect(helpField(page)).toBeVisible();

        await page.getByTestId('select-recipientType-trigger').click();
        await page.getByRole('option', { name: 'Owner', exact: true }).click();
        await expect(helpField(page)).toHaveCount(0);
    });
});

test.describe('NotificationProfileForm - Event data categories', () => {
    test('renders all four category checkboxes unchecked with help texts', async ({ mount, page }) => {
        await mount(<NotificationProfileFormTestWrapper />);

        for (const category of ['customAttributes', 'metadata', 'associations', 'objectContent']) {
            await expect(page.locator(`#eventDataCategory-${category}`)).toBeVisible();
            await expect(page.locator(`#eventDataCategory-${category}`)).not.toBeChecked();
        }
        await expect(page.getByText('Custom attributes', { exact: true })).toBeVisible();
        await expect(page.getByText("Include the event object's custom attribute values")).toBeVisible();
        await expect(page.getByText('Include owner, groups, and RA profile references')).toBeVisible();
    });

    test('toggling a category checks and unchecks it', async ({ mount, page }) => {
        await mount(<NotificationProfileFormTestWrapper />);

        const checkbox = page.locator('#eventDataCategory-metadata');
        await checkbox.click();
        await expect(checkbox).toBeChecked();
        await checkbox.click();
        await expect(checkbox).not.toBeChecked();
    });
});
