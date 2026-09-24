import { expect, test } from '../../../playwright/ct-test';
import ComplianceErrorsPanel from './ComplianceErrorsPanel';

test.describe('ComplianceErrorsPanel', () => {
    test('renders the default title and one line per error', async ({ mount }) => {
        const component = await mount(
            <ComplianceErrorsPanel messages={['Subject CN: required attribute missing', 'SAN dNSName: value not permitted "*.x"']} />,
        );

        await expect(component.getByText('Compliance errors')).toBeVisible();
        await expect(component.getByRole('listitem')).toHaveCount(2);
        await expect(component.getByText('Subject CN: required attribute missing')).toBeVisible();
        await expect(component.getByText('SAN dNSName: value not permitted "*.x"')).toBeVisible();
    });

    test('renders a custom title', async ({ mount }) => {
        const component = await mount(<ComplianceErrorsPanel messages={['e1']} title="CSR validation failed" />);

        await expect(component.getByText('CSR validation failed')).toBeVisible();
    });

    test('deduplicates repeated messages', async ({ mount }) => {
        const component = await mount(<ComplianceErrorsPanel messages={['same message', 'same message', 'other']} />);

        await expect(component.getByRole('listitem')).toHaveCount(2);
    });

    test('renders nothing for an empty list', async ({ mount, page }) => {
        await mount(<ComplianceErrorsPanel messages={[]} />);

        await expect(page.getByTestId('compliance-errors-panel')).toHaveCount(0);
    });

    test('an error is an assertive alert in the danger colours', async ({ mount }) => {
        const component = await mount(<ComplianceErrorsPanel messages={['e1']} />);

        await expect(component).toHaveAttribute('role', 'alert');
        await expect(component).toHaveClass(/bg-danger-surface/);
    });

    test('a warning is a polite status in the warning colours, with its own default title', async ({ mount }) => {
        const component = await mount(<ComplianceErrorsPanel messages={['w1']} severity="warning" />);

        await expect(component).toHaveAttribute('role', 'status');
        await expect(component).toHaveClass(/bg-warning-surface/);
        await expect(component).not.toHaveClass(/danger/);
        await expect(component.getByText('Compliance warnings')).toBeVisible();
    });

    test('renders a description above the list', async ({ mount }) => {
        const component = await mount(
            <ComplianceErrorsPanel messages={['w1']} severity="warning" description="The request was accepted." />,
        );

        await expect(component.getByText('The request was accepted.')).toBeVisible();
    });

    test('renders nothing for an empty warning list', async ({ mount, page }) => {
        await mount(<ComplianceErrorsPanel messages={[]} severity="warning" />);

        await expect(page.getByTestId('compliance-errors-panel')).toHaveCount(0);
    });
});
