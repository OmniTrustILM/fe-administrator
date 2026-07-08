import { test, expect } from '../../../../../playwright/ct-test';
import { withProviders } from 'utils/test-helpers';

import ConnectorCapabilitiesMatrix from './ConnectorCapabilitiesMatrix';

test.describe('ConnectorCapabilitiesMatrix', () => {
    test('v2: renders interfaces, versions and features', async ({ mount, page }) => {
        const connector = {
            version: 'v2',
            functionGroups: [],
            interfaces: [
                { uuid: '1', code: 'authority', version: 'v2', features: ['stateless'] },
                { uuid: '2', code: 'discovery', version: 'v1', features: [] },
            ],
        };

        await mount(withProviders(<ConnectorCapabilitiesMatrix connector={connector as any} />));

        await expect(page.getByRole('columnheader', { name: 'Interfaces' })).toBeVisible();
        await expect(page.getByRole('columnheader', { name: 'Ver.' })).toBeVisible();
        await expect(page.getByRole('columnheader', { name: 'Features' })).toBeVisible();

        await expect(page.getByText('authority', { exact: true })).toBeVisible();
        await expect(page.getByText('discovery', { exact: true })).toBeVisible();
        await expect(page.getByText('stateless', { exact: true })).toBeVisible();
        // interface without features shows an em dash
        await expect(page.getByText('—')).toBeVisible();
    });

    test('v1: renders function groups and kinds', async ({ mount, page }) => {
        const connector = {
            version: 'v1',
            functionGroups: [
                { uuid: '1', name: 'authorityProvider', functionGroupCode: 'authorityProvider', kinds: ['EJBCA', 'ADCS'], endPoints: [] },
            ],
            interfaces: [],
        };

        await mount(withProviders(<ConnectorCapabilitiesMatrix connector={connector as any} />));

        await expect(page.getByRole('columnheader', { name: 'Function Groups' })).toBeVisible();
        await expect(page.getByRole('columnheader', { name: 'Kinds' })).toBeVisible();

        await expect(page.getByText('authorityProvider', { exact: true })).toBeVisible();
        await expect(page.getByText('EJBCA', { exact: true })).toBeVisible();
        await expect(page.getByText('ADCS', { exact: true })).toBeVisible();
    });
});
