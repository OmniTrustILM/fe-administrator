import { test, expect } from '../../../../playwright/ct-test';
import SecretStateBadge from './SecretStateBadge';
import { SecretState } from 'types/openapi';

test.describe('SecretStateBadge', () => {
    test('renders Active state', async ({ mount }) => {
        const component = await mount(
            <div>
                <SecretStateBadge state={SecretState.Active}>Active</SecretStateBadge>
            </div>,
        );

        await expect(component.getByText('Active')).toBeVisible();
    });

    test('renders Inactive state', async ({ mount }) => {
        const component = await mount(
            <div>
                <SecretStateBadge state={SecretState.Inactive}>Inactive</SecretStateBadge>
            </div>,
        );

        await expect(component.getByText('Inactive')).toBeVisible();
    });

    test('renders Revoked state', async ({ mount }) => {
        const component = await mount(
            <div>
                <SecretStateBadge state={SecretState.Revoked}>Revoked</SecretStateBadge>
            </div>,
        );

        await expect(component.getByText('Revoked')).toBeVisible();
    });

    test('renders Expired state with gray border and dark text', async ({ mount }) => {
        const component = await mount(
            <div>
                <SecretStateBadge state={SecretState.Expired}>Expired</SecretStateBadge>
            </div>,
        );

        const badge = component.getByText('Expired');
        await expect(badge).toBeVisible();
        await expect(badge).toHaveClass(/border-outline/);
        await expect(badge).toHaveClass(/text-content/);
    });
});
