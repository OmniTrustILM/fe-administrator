import { Resource, ResourceAction } from 'types/openapi';
import { expect, test } from '../../../../../playwright/ct-test';
import RaProfileDetailWithStore from './RaProfileDetailWithStore';

test.describe('RaProfileDetail actions by permission', () => {
    const mayCheckCompliance = [{ resource: Resource.ComplianceProfiles, actions: [ResourceAction.CheckCompliance] }];
    const changing = ['edit-button', 'delete-button', 'disable-button', 'check-compliance-button'];

    test('disables changing actions a read-only user lacks', async ({ mount, page }) => {
        await mount(<RaProfileDetailWithStore allowedActions={[ResourceAction.Detail]} />);

        for (const testId of changing) {
            await expect(page.getByTestId(testId)).toBeDisabled();
        }
        await page.getByRole('tab', { name: 'Protocols' }).click();
        await expect(page.getByRole('button', { name: 'Activate' }).first()).toBeDisabled();
    });

    test('offers the actions granted on this RA profile alone, without a resource grant', async ({ mount, page }) => {
        await mount(<RaProfileDetailWithStore allowedActions={[ResourceAction.Detail, ResourceAction.Update, ResourceAction.Enable]} />);

        await expect(page.getByTestId('edit-button')).toBeEnabled();
        await expect(page.getByTestId('disable-button')).toBeEnabled();
        await expect(page.getByTestId('delete-button')).toBeDisabled();
        await page.getByRole('tab', { name: 'Protocols' }).click();
        await expect(page.getByRole('button', { name: 'Activate' }).first()).toBeEnabled();
    });

    test('offers every action to a fully privileged user as before', async ({ mount, page }) => {
        await mount(<RaProfileDetailWithStore resourceGrants={mayCheckCompliance} />);

        for (const testId of changing) {
            await expect(page.getByTestId(testId)).toBeEnabled();
        }
    });

    test('offers Check Compliance on the compliance profile grant, which the compliance check endpoint checks', async ({ mount, page }) => {
        await mount(<RaProfileDetailWithStore allowedActions={[ResourceAction.Detail]} resourceGrants={mayCheckCompliance} />);

        await expect(page.getByTestId('check-compliance-button')).toBeEnabled();
    });

    test('disables Check Compliance without the compliance profile grant, even when the RA profile answer allows it', async ({
        mount,
        page,
    }) => {
        await mount(<RaProfileDetailWithStore allowedActions={[ResourceAction.Detail, ResourceAction.CheckCompliance]} />);

        await expect(page.getByTestId('check-compliance-button')).toBeDisabled();
    });

    test('offers the actions addressed by authority on a profile under one', async ({ mount, page }) => {
        await mount(<RaProfileDetailWithStore objectAccess={[Resource.ApprovalProfiles]} />);

        await expect(page.getByTestId('add-button')).toBeEnabled();
        await page.getByRole('tab', { name: 'Validation' }).click();
        const edit = page.getByTestId('edit-button');
        await expect(edit).toHaveCount(3);
        for (let index = 0; index < 3; index++) await expect(edit.nth(index)).toBeEnabled();
    });

    test('disables the actions addressed by authority on a profile without one, whatever the user may update', async ({ mount, page }) => {
        await mount(<RaProfileDetailWithStore withoutAuthority objectAccess={[Resource.ApprovalProfiles]} />);

        await expect(page.getByTestId('edit-button')).toBeDisabled();
        await expect(page.getByTestId('add-button')).toBeDisabled();
        await page.getByRole('tab', { name: 'Protocols' }).click();
        const activate = page.getByRole('button', { name: 'Activate' });
        await expect(activate).toHaveCount(4);
        for (let index = 0; index < 4; index++) await expect(activate.nth(index)).toBeDisabled();
        await page.getByRole('tab', { name: 'Validation' }).click();
        const edit = page.getByTestId('edit-button');
        await expect(edit).toHaveCount(3);
        for (let index = 0; index < 3; index++) await expect(edit.nth(index)).toBeDisabled();
    });

    test('keeps the settings editors of a reattached profile opened under its old unknown route', async ({ mount, page }) => {
        await mount(<RaProfileDetailWithStore authoritySegment="unknown" objectAccess={[Resource.ApprovalProfiles]} />);

        await expect(page.getByTestId('add-button')).toBeDisabled();
        await page.getByRole('tab', { name: 'Validation' }).click();
        const edit = page.getByTestId('edit-button');
        await expect(edit).toHaveCount(3);
        for (let index = 0; index < 3; index++) await expect(edit.nth(index)).toBeEnabled();
        await page.getByRole('tab', { name: 'Protocols' }).click();
        const activate = page.getByRole('button', { name: 'Activate' });
        await expect(activate).toHaveCount(4);
        for (let index = 0; index < 4; index++) await expect(activate.nth(index)).toBeDisabled();
    });

    test('disables the actions addressed by the route authority under an undefined segment', async ({ mount, page }) => {
        await mount(<RaProfileDetailWithStore authoritySegment="undefined" objectAccess={[Resource.ApprovalProfiles]} />);

        await expect(page.getByTestId('edit-button')).toBeDisabled();
        await expect(page.getByTestId('add-button')).toBeDisabled();
    });

    test('disables editing the renewal settings of an RA profile without an authority', async ({ mount, page }) => {
        await mount(<RaProfileDetailWithStore withoutAuthority />);
        await page.getByRole('tab', { name: 'Validation' }).click();

        await expect(page.getByTestId('renewal-settings-widget').getByTestId('edit-button')).toBeDisabled();
    });

    test('shows automatic renewal and its maximum attempts in the renewal widget', async ({ mount, page }) => {
        await mount(<RaProfileDetailWithStore />);
        await page.getByRole('tab', { name: 'Validation' }).click();

        const widget = page.getByTestId('renewal-settings-widget');
        await expect(widget.getByText('Automatic Renewal Enabled')).toBeVisible();
        await expect(widget.locator('#autoRenewalEnabled')).toBeChecked();
        await expect(widget.getByText('Maximum Renewal Attempts')).toBeVisible();
        await expect(widget.getByText('7', { exact: true })).toBeVisible();
    });

    test('clicking a renewal dialog switch label toggles it and leaves the read-only widget switch alone', async ({ mount, page }) => {
        await mount(<RaProfileDetailWithStore />);
        await page.getByRole('tab', { name: 'Validation' }).click();
        await page.getByTestId('renewal-settings-widget').getByTestId('edit-button').click();

        const dialogSwitch = page.locator('#renewal-dialog-autoRenewalEnabled');
        await expect(dialogSwitch).toBeChecked();
        await page.getByText('Enable Automatic Renewal').click();

        await expect(dialogSwitch).not.toBeChecked();
        await expect(page.getByTestId('renewal-settings-widget').locator('#autoRenewalEnabled')).toBeChecked();
    });
});
