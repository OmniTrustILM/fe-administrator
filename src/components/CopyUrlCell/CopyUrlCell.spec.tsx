import { test, expect } from '../../../playwright/ct-test';
import { createMockStore, withProviders } from 'utils/test-helpers';
import CopyUrlCell from './';

const URL = 'https://ilm.otilm.com/api/v1/protocols/tsp/tsp-profile-1/sign';

test.describe('CopyUrlCell', () => {
    test('renders the url and a copy button when a url is provided', async ({ mount }) => {
        const component = await mount(withProviders(<CopyUrlCell label="Signing URL">{URL}</CopyUrlCell>, { store: createMockStore() }));

        await expect(component.getByText(URL, { exact: true })).toBeVisible();
        await expect(component.getByRole('button')).toBeVisible();
    });

    test('renders nothing when url is empty', async ({ mount }) => {
        const component = await mount(withProviders(<CopyUrlCell label="Signing URL">{''}</CopyUrlCell>, { store: createMockStore() }));

        await expect(component.getByRole('button')).toHaveCount(0);
    });

    test('renders nothing when url is undefined', async ({ mount }) => {
        const component = await mount(withProviders(<CopyUrlCell label="Signing URL" />, { store: createMockStore() }));

        await expect(component.getByRole('button')).toHaveCount(0);
    });

    test('exposes the label in the copy button tooltip', async ({ mount, page }) => {
        const component = await mount(withProviders(<CopyUrlCell label="Signing URL">{URL}</CopyUrlCell>, { store: createMockStore() }));

        await component.getByRole('button').hover();

        // The tooltip content is rendered in a body portal, so query the page rather than the component root.
        await expect(page.getByText('Copy Signing URL', { exact: true })).toBeVisible();
    });

    test('copies the url to the clipboard when the copy button is clicked', async ({ mount, page }) => {
        // Override clipboard.writeText so the assertion works across all browsers without clipboard permissions.
        await page.evaluate(() => {
            (globalThis as unknown as { __copied: string[] }).__copied = [];
            navigator.clipboard.writeText = (text: string) => {
                (globalThis as unknown as { __copied: string[] }).__copied.push(text);
                return Promise.resolve();
            };
        });

        const component = await mount(withProviders(<CopyUrlCell label="Signing URL">{URL}</CopyUrlCell>, { store: createMockStore() }));

        await component.getByRole('button').click();

        const copied = await page.evaluate(() => (globalThis as unknown as { __copied: string[] }).__copied);
        expect(copied).toEqual([URL]);
    });
});
