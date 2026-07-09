import { expect, test } from '../../../playwright/ct-test';
import ComplianceErrorsPanel from './ComplianceErrorsPanel';

test.describe('ComplianceErrorsPanel', () => {
    test('renders the default title and one line per error', async ({ mount }) => {
        const component = await mount(
            <ComplianceErrorsPanel errors={['Subject CN — required attribute missing', 'SAN dNSName — value not permitted: "*.x"']} />,
        );

        await expect(component.getByText('Compliance errors')).toBeVisible();
        await expect(component.getByRole('listitem')).toHaveCount(2);
        await expect(component.getByText('Subject CN — required attribute missing')).toBeVisible();
        await expect(component.getByText('SAN dNSName — value not permitted: "*.x"')).toBeVisible();
    });

    test('renders a custom title', async ({ mount }) => {
        const component = await mount(<ComplianceErrorsPanel errors={['e1']} title="CSR validation failed" />);

        await expect(component.getByText('CSR validation failed')).toBeVisible();
    });

    test('deduplicates repeated messages', async ({ mount }) => {
        const component = await mount(<ComplianceErrorsPanel errors={['same message', 'same message', 'other']} />);

        await expect(component.getByRole('listitem')).toHaveCount(2);
    });

    test('renders nothing for an empty list', async ({ mount, page }) => {
        await mount(<ComplianceErrorsPanel errors={[]} />);

        await expect(page.getByTestId('compliance-errors-panel')).toHaveCount(0);
    });
});
