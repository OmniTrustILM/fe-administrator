import { test, expect } from '../../../playwright/ct-test';
import Spinner from './index';

test.describe('Spinner', () => {
    test('should render spinner when active is true', async ({ mount }) => {
        const component = await mount(<Spinner active={true} />);

        await expect(component.getByRole('status', { name: 'loading' })).toBeVisible();
        await expect(component.getByText('Loading...')).toBeVisible();
    });

    test('should not render when active is false', async ({ mount }) => {
        const component = await mount(<Spinner active={false} />);

        await expect(component.getByRole('status', { name: 'loading' })).not.toBeVisible();
        await expect(component.getByText('Loading...')).not.toBeVisible();
    });

    test('should render by default when active prop is not provided', async ({ mount }) => {
        const component = await mount(<Spinner />);

        await expect(component.getByRole('status', { name: 'loading' })).toBeVisible();
    });

    test('should render with different sizes', async ({ mount }) => {
        const smallSpinner = await mount(<Spinner size="sm" />);
        await expect(smallSpinner.getByRole('status', { name: 'loading' })).toBeVisible();
        await smallSpinner.unmount();

        const mediumSpinner = await mount(<Spinner size="md" />);
        await expect(mediumSpinner.getByRole('status', { name: 'loading' })).toBeVisible();
        await mediumSpinner.unmount();

        const largeSpinner = await mount(<Spinner size="lg" />);
        await expect(largeSpinner.getByRole('status', { name: 'loading' })).toBeVisible();
    });

    test('should render with different colors', async ({ mount }) => {
        const primarySpinner = await mount(<Spinner color="primary" />);
        await expect(primarySpinner.getByRole('status', { name: 'loading' })).toBeVisible();
        await primarySpinner.unmount();

        const lightSpinner = await mount(<Spinner color="light" />);
        await expect(lightSpinner.getByRole('status', { name: 'loading' })).toBeVisible();
    });

    test('should have loading aria-label', async ({ mount }) => {
        const component = await mount(<Spinner />);

        const spinner = component.getByRole('status', { name: 'loading' });
        await expect(spinner).toHaveAttribute('aria-label', 'loading');
        // role="status" is now the implicit role of the semantic <output> element.
        await expect(spinner).toHaveJSProperty('tagName', 'OUTPUT');
    });

    test('should have sr-only loading text', async ({ mount }) => {
        const component = await mount(<Spinner />);

        await expect(component.getByText('Loading...')).toBeVisible();
    });

    test('should use custom data-testid when provided', async ({ mount }) => {
        const component = await mount(<Spinner dataTestId="custom-spinner-id" />);

        const spinner = component.getByRole('status', { name: 'loading' });
        await expect(spinner).toBeVisible();
        await expect(spinner).toHaveAttribute('data-testid', 'custom-spinner-id');

        await expect(component.locator('[data-testid="spinner"]')).toHaveCount(0);
    });
});
