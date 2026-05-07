import { test, expect } from '../../../../playwright/ct-test';
import HostnameListInput from './index';

test.describe('HostnameListInput', () => {
    test('should render input with placeholder and Add button', async ({ mount }) => {
        const component = await mount(<HostnameListInput values={[]} onValuesChange={() => {}} placeholder="Type hostname or IP" />);

        const input = component.locator('input[type="text"]');
        await expect(input).toBeVisible();
        await expect(input).toHaveAttribute('placeholder', 'Type hostname or IP');
        await expect(component.getByRole('button', { name: 'Add' })).toBeVisible();
    });

    test('should add value via Enter and clear input', async ({ mount }) => {
        let values: string[] = [];
        const component = await mount(<HostnameListInput values={values} onValuesChange={(v) => (values = v)} />);

        const input = component.locator('input[type="text"]');
        await input.fill('pool.ntp.org');
        await input.press('Enter');

        expect(values).toEqual(['pool.ntp.org']);
        await expect(input).toHaveValue('');
    });

    test('should add value via Add button click', async ({ mount }) => {
        let values: string[] = [];
        const component = await mount(<HostnameListInput values={values} onValuesChange={(v) => (values = v)} />);

        await component.locator('input[type="text"]').fill('time.google.com');
        await component.getByRole('button', { name: 'Add' }).click();

        expect(values).toEqual(['time.google.com']);
    });

    test('should trim whitespace before adding', async ({ mount }) => {
        let values: string[] = [];
        const component = await mount(<HostnameListInput values={values} onValuesChange={(v) => (values = v)} />);

        await component.locator('input[type="text"]').fill('  ntp  ');
        await component.locator('input[type="text"]').press('Enter');

        expect(values).toEqual(['ntp']);
    });

    test('should not add empty or whitespace-only value', async ({ mount }) => {
        let values: string[] = [];
        const component = await mount(<HostnameListInput values={values} onValuesChange={(v) => (values = v)} />);

        const input = component.locator('input[type="text"]');
        await input.fill('   ');
        await input.press('Enter');

        expect(values).toEqual([]);
    });

    test('should disable Add button when input is empty', async ({ mount }) => {
        const component = await mount(<HostnameListInput values={[]} onValuesChange={() => {}} />);
        const addButton = component.getByRole('button', { name: 'Add' });
        await expect(addButton).toBeDisabled();

        await component.locator('input[type="text"]').fill('ntp');
        await expect(addButton).toBeEnabled();
    });

    test('should show duplicate error and not add', async ({ mount }) => {
        let values = ['ntp'];
        const component = await mount(<HostnameListInput values={values} onValuesChange={(v) => (values = v)} />);

        const input = component.locator('input[type="text"]');
        await input.fill('ntp');
        await input.press('Enter');

        await expect(component.getByText('Value already added')).toBeVisible();
        expect(values).toEqual(['ntp']);
    });

    test('should clear error when user edits draft', async ({ mount }) => {
        const component = await mount(<HostnameListInput values={['ntp']} onValuesChange={() => {}} />);

        const input = component.locator('input[type="text"]');
        await input.fill('ntp');
        await input.press('Enter');
        await expect(component.getByText('Value already added')).toBeVisible();

        await input.fill('other');
        await expect(component.getByText('Value already added')).toBeHidden();
    });

    test('should render existing values as removable tags', async ({ mount }) => {
        const component = await mount(<HostnameListInput values={['pool.ntp.org', 'time.google.com']} onValuesChange={() => {}} />);

        await expect(component.getByText('pool.ntp.org')).toBeVisible();
        await expect(component.getByText('time.google.com')).toBeVisible();
        await expect(component.getByRole('button', { name: 'Remove pool.ntp.org' })).toBeVisible();
        await expect(component.getByRole('button', { name: 'Remove time.google.com' })).toBeVisible();
    });

    test('should remove a tag when its X is clicked', async ({ mount }) => {
        let values = ['pool.ntp.org', 'time.google.com'];
        const component = await mount(<HostnameListInput values={values} onValuesChange={(v) => (values = v)} />);

        await component.getByRole('button', { name: 'Remove pool.ntp.org' }).click();
        expect(values).toEqual(['time.google.com']);
    });

    test('should not render tag list when there are no values', async ({ mount }) => {
        const component = await mount(<HostnameListInput id="ntpServers" values={[]} onValuesChange={() => {}} />);
        await expect(component.getByTestId('hostname-list-tags-ntpServers')).toHaveCount(0);
    });
});
