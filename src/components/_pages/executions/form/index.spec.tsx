import type { Locator } from '@playwright/test';

import { expect, test } from '../../../../../playwright/ct-test';
import { ExecutionFormTestWrapper } from './ExecutionFormTestWrapper';

async function enterName(component: Locator, name: string) {
    const input = component.getByTestId('text-input-name');
    await input.click();
    await input.fill(name);
}

async function chooseType(component: Locator, label: string) {
    await component.getByTestId('select-typeSelect-trigger').click();
    await component.page().getByRole('option', { name: label, exact: true }).click();
}

test.describe('ExecutionForm', () => {
    test('offers Renew certificate next to the other types', async ({ mount }) => {
        const component = await mount(<ExecutionFormTestWrapper />);

        await component.getByTestId('select-typeSelect-trigger').click();

        const page = component.page();
        await expect(page.getByRole('option', { name: 'Set field', exact: true })).toBeVisible();
        await expect(page.getByRole('option', { name: 'Send notification', exact: true })).toBeVisible();
        await expect(page.getByRole('option', { name: 'Renew certificate', exact: true })).toBeVisible();
    });

    test('Renew certificate fixes the resource to certificates, hides the item editors and submits no items', async ({ mount }) => {
        const payloads: unknown[] = [];
        const component = await mount(<ExecutionFormTestWrapper onCreateExecution={(payload) => payloads.push(payload)} />);

        await enterName(component, 'renewDue');
        await chooseType(component, 'Renew certificate');

        await expect(component.getByTestId('select-resourceSelect-trigger')).toBeDisabled();
        await expect(component.getByTestId('select-resourceSelect-input')).toHaveValue('certificates');
        await expect(component.getByText('Send notifications to')).not.toBeVisible();

        await component.getByRole('button', { name: 'Create' }).click();

        await expect.poll(() => payloads.length).toBe(1);
        expect(payloads[0]).toEqual({
            executionRequestModel: { items: [], type: 'renewCertificate', name: 'renewDue', description: '', resource: 'certificates' },
        });
    });

    test('Set field still needs items before it can be created', async ({ mount }) => {
        const component = await mount(<ExecutionFormTestWrapper />);

        await enterName(component, 'setSomething');
        await chooseType(component, 'Set field');

        await expect(component.getByRole('button', { name: 'Create' })).toBeDisabled();
    });
});
