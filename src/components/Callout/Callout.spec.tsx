import { test, expect } from '../../../playwright/ct-test';
import Callout from './index';

/** Spelled out rather than imported: a named value import beside the mounted default breaks the whole CT run. */
const SEVERITY_TINTS = {
    warning: ['bg-warning-surface', 'text-warning'],
    danger: ['bg-danger-surface', 'text-danger'],
    success: ['bg-success-surface', 'text-success'],
} as const;

test.describe('Callout', () => {
    test('should render its children', async ({ mount }) => {
        const component = await mount(<Callout severity="warning">Something to know</Callout>);

        await expect(component).toContainText('Something to know');
    });

    for (const severity of ['warning', 'danger', 'success'] as const) {
        test(`should paint the ${severity} tint`, async ({ mount }) => {
            const component = await mount(<Callout severity={severity}>Note</Callout>);

            for (const utility of SEVERITY_TINTS[severity]) {
                await expect(component).toHaveClass(new RegExp(utility));
            }
        });
    }

    test('should keep its own classes when given more', async ({ mount }) => {
        const component = await mount(
            <Callout severity="warning" className="text-xs">
                Note
            </Callout>,
        );

        await expect(component).toHaveClass(/bg-warning-surface/);
        await expect(component).toHaveClass(/text-xs/);
    });

    test('should forward the role it is given', async ({ mount, page }) => {
        await mount(
            <Callout severity="danger" role="alert">
                It failed
            </Callout>,
        );

        await expect(page.getByRole('alert')).toContainText('It failed');
    });

    test('should carry no role of its own', async ({ mount }) => {
        const component = await mount(<Callout severity="success">Done</Callout>);

        await expect(component).not.toHaveAttribute('role');
    });

    test('should forward the test id it is given', async ({ mount, page }) => {
        await mount(
            <Callout severity="warning" dataTestId="my-callout">
                Note
            </Callout>,
        );

        await expect(page.getByTestId('my-callout')).toBeVisible();
    });

    test('should take focus when given a tab index', async ({ mount }) => {
        const component = await mount(
            <Callout severity="warning" tabIndex={-1}>
                Note
            </Callout>,
        );

        await component.focus();

        await expect(component).toBeFocused();
    });
});
