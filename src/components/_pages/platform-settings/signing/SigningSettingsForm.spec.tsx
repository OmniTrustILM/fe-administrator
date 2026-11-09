import type { Page } from '@playwright/test';
import { test, expect } from '../../../../../playwright/ct-test';
import { SigningSettingsFormTestWrapper } from './SigningSettingsFormTestWrapper';

const storedLimit = (maxItemsPerRequest?: number) => ({
    settings: {
        platformSettings: { signing: { maxItemsPerRequest } },
        isFetchingPlatform: false,
        isUpdatingPlatform: false,
    },
});

const enterLimit = async (page: Page, value: string) => {
    const field = page.locator('#maxItemsPerRequest');
    // The field is focused first. TextInput guards against autofill with a readonly attribute that focus removes.
    await field.click();
    await field.fill(value);
    await field.blur();
};

const save = (page: Page) => page.getByRole('button', { name: 'Save' }).click();

test.describe('SigningSettings', () => {
    test('shows the stored limit with its unit', async ({ mount, page }) => {
        await mount(<SigningSettingsFormTestWrapper preloadedState={storedLimit(250)} withReadOnlyView />);

        await expect(page.getByRole('row', { name: /Max Items per Request/ })).toContainText('250 items');
    });

    test('shows the platform default while no limit is stored', async ({ mount, page }) => {
        await mount(<SigningSettingsFormTestWrapper preloadedState={storedLimit()} withReadOnlyView />);

        await expect(page.getByRole('row', { name: /Max Items per Request/ })).toContainText('platform default (100 items)');
    });
});

test.describe('SigningSettingsForm', () => {
    test('seeds the field with the stored limit', async ({ mount, page }) => {
        await mount(<SigningSettingsFormTestWrapper preloadedState={storedLimit(250)} />);

        await expect(page.locator('#maxItemsPerRequest')).toHaveValue('250');
    });

    for (const [value, message] of [
        ['0', 'Value must be at least 1'],
        ['1001', 'Value must not exceed 1000'],
    ]) {
        test(`refuses ${value} before sending it`, async ({ mount, page }) => {
            await mount(<SigningSettingsFormTestWrapper preloadedState={storedLimit(250)} />);

            await enterLimit(page, value);

            await expect(page.getByText(message)).toBeVisible();
            await expect(page.getByRole('button', { name: 'Save' })).toBeDisabled();
        });
    }

    test('sends the limit as a number', async ({ mount, page }) => {
        await mount(<SigningSettingsFormTestWrapper preloadedState={storedLimit(250)} />);

        await enterLimit(page, '500');
        await save(page);

        await expect(page.getByTestId('update-platform-settings')).toHaveText('[{"signing":{"maxItemsPerRequest":500}}]');
    });

    test('sends the section without a limit when the field is emptied', async ({ mount, page }) => {
        await mount(<SigningSettingsFormTestWrapper preloadedState={storedLimit(250)} />);

        await enterLimit(page, '');
        await save(page);

        await expect(page.getByTestId('update-platform-settings')).toHaveText('[{"signing":{}}]');
    });

    test('closes once the update is saved', async ({ mount, page }) => {
        let closed = false;
        await mount(
            <SigningSettingsFormTestWrapper
                preloadedState={storedLimit(250)}
                onSuccess={() => {
                    closed = true;
                }}
            />,
        );

        await enterLimit(page, '500');
        await save(page);
        await page.getByTestId('simulate-update-success').click();

        await expect.poll(() => closed).toBe(true);
    });

    test("shows Core's refusal on the field and stays open", async ({ mount, page }) => {
        let closed = false;
        const coreRefusal = 'must not exceed 200';
        await mount(
            <SigningSettingsFormTestWrapper
                preloadedState={storedLimit(250)}
                fieldErrors={{ 'signing.maxItemsPerRequest': coreRefusal }}
                onSuccess={() => {
                    closed = true;
                }}
            />,
        );

        await enterLimit(page, '500');
        await save(page);
        await page.getByTestId('simulate-update-refusal').click();

        await expect(page.getByText(coreRefusal)).toBeVisible();
        expect(closed).toBe(false);
    });

    test("shows Core's refusal of a value saved with Enter before the field was left", async ({ mount, page }) => {
        const coreRefusal = 'must not exceed 200';
        await mount(
            <SigningSettingsFormTestWrapper
                preloadedState={storedLimit(250)}
                fieldErrors={{ 'signing.maxItemsPerRequest': coreRefusal }}
            />,
        );

        const field = page.locator('#maxItemsPerRequest');
        await field.click();
        await field.fill('500');
        await field.press('Enter');
        await expect(page.getByTestId('update-platform-settings')).toHaveText('[{"signing":{"maxItemsPerRequest":500}}]');
        await page.getByTestId('simulate-update-refusal').click();

        await expect(field).toBeFocused();
        await expect(page.getByText(coreRefusal)).toBeVisible();
    });

    test('stays open when the update fails', async ({ mount, page }) => {
        let closed = false;
        await mount(
            <SigningSettingsFormTestWrapper
                preloadedState={storedLimit(250)}
                onSuccess={() => {
                    closed = true;
                }}
            />,
        );

        await enterLimit(page, '500');
        await save(page);
        await page.getByTestId('simulate-update-failure').click();

        await expect(page.getByRole('button', { name: 'Save' })).toBeEnabled();
        expect(closed).toBe(false);
    });
});
