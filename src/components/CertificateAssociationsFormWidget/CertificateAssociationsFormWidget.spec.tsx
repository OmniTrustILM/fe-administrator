import { expect, test } from '../../../playwright/ct-test';
import CertificateAssociationsFormWidgetTestWrapper from './CertificateAssociationsFormWidgetTestWrapper';

test.describe('CertificateAssociationsFormWidget', () => {
    test('renders widget labels and custom attributes block', async ({ mount, page }) => {
        await mount(<CertificateAssociationsFormWidgetTestWrapper />);

        await expect(page.getByText('Default Certificate associations')).toBeVisible();
        await expect(page.getByText('Owner')).toBeVisible();
        await expect(page.getByText('Groups')).toBeVisible();
        await expect(page.getByText('Certificate Custom Attributes')).toBeVisible();
        await expect(page.getByTestId('custom-attributes-content')).toBeVisible();
    });

    test('maps users and groups from redux state into select options', async ({ mount, page }) => {
        await mount(
            <CertificateAssociationsFormWidgetTestWrapper
                users={[
                    {
                        uuid: 'user-1',
                        username: 'jsmith',
                        firstName: 'John',
                        lastName: 'Smith',
                    },
                ]}
                groups={[
                    {
                        uuid: 'group-1',
                        name: 'Admins',
                    },
                ]}
            />,
        );

        await expect(page.getByTestId('select-owner-input').locator('option[value="user-1"]')).toHaveCount(1);
        await expect(page.getByTestId('select-groups-input').locator('option[value="group-1"]')).toHaveCount(1);
    });

    test('does not add dynamic options when users and groups are empty', async ({ mount, page }) => {
        await mount(<CertificateAssociationsFormWidgetTestWrapper />);

        await expect(page.getByTestId('select-owner-input').locator('option')).toHaveCount(1);
        await expect(page.getByTestId('select-groups-input').locator('option')).toHaveCount(1);
        await expect(page.getByTestId('select-owner-input').locator('option[value="user-1"]')).toHaveCount(0);
        await expect(page.getByTestId('select-groups-input').locator('option[value="group-1"]')).toHaveCount(0);
    });

    test('updates owner and groups form values on select change', async ({ mount, page }) => {
        await mount(
            <CertificateAssociationsFormWidgetTestWrapper
                initialUserOptions={[
                    {
                        value: 'user-1',
                        label: 'John Smith (jsmith)',
                    },
                ]}
                initialGroupOptions={[
                    {
                        value: 'group-1',
                        label: 'Admins',
                    },
                    {
                        value: 'group-2',
                        label: 'Operators',
                    },
                ]}
            />,
        );

        await page.getByTestId('select-owner-trigger').click();
        await page.getByRole('option', { name: 'John Smith (jsmith)' }).click();
        await expect(page.getByTestId('owner-value')).toHaveText('user-1');

        await page.getByTestId('select-groups-trigger').click();
        await page.getByRole('option', { name: 'Admins' }).click();
        await page.getByRole('option', { name: 'Operators' }).click();
        await expect(page.getByTestId('groups-value')).toContainText('"group-1"');
        await expect(page.getByTestId('groups-value')).toContainText('"group-2"');
    });
});
