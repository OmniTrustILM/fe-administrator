import type { Page } from '@playwright/test';
import { test, expect } from '../../../../../playwright/ct-test';
import { ConnectorVersion } from 'types/openapi';
import type { ConnectInfoDto } from 'types/openapi';

import ConnectorFormWithStore from './ConnectorFormWithStore';

const v1OnlyConnectInfo = [
    {
        version: ConnectorVersion.V1,
        functionGroups: [
            {
                uuid: '1234',
                name: 'credentialProvider',
                functionGroupCode: 'credentialProvider',
                kinds: ['SoftKeyStore'],
                endPoints: [],
            },
        ],
    },
] as unknown as ConnectInfoDto[];

const v2OnlyConnectInfo = [
    {
        version: ConnectorVersion.V2,
        connector: {
            id: 'com.otilm.ejbca.connector',
            name: 'ejbca-connector',
            version: '1.16',
        },
        interfaces: [{ code: 'certificate', version: 1, features: ['stateless'] }],
    },
] as unknown as ConnectInfoDto[];

async function fillUrl(page: Page) {
    const url = page.locator('#url');
    await url.click();
    await url.fill('https://connector-service');
}

test.describe('ConnectorForm submit button availability per version tab', () => {
    test('Save is disabled on the v2 tab when only a v1 connector is reachable', async ({ mount, page }) => {
        await mount(<ConnectorFormWithStore connectInfo={v1OnlyConnectInfo} />);

        await fillUrl(page);

        await expect(page.getByRole('tab', { name: 'v2' })).toHaveAttribute('data-state', 'active');
        await expect(page.getByText('No v2 connection details available.')).toBeVisible();

        await expect(page.getByTestId('progress-button')).toBeDisabled();
    });

    test('Save is enabled once the v1 tab with the reachable connector is selected', async ({ mount, page }) => {
        await mount(<ConnectorFormWithStore connectInfo={v1OnlyConnectInfo} />);

        await fillUrl(page);
        await page.getByRole('tab', { name: 'v1' }).click();

        await expect(page.locator('#name')).toBeVisible();
        await expect(page.getByTestId('progress-button')).toBeEnabled();
    });

    test('Save is disabled on the v1 tab when only a v2 connector is reachable', async ({ mount, page }) => {
        await mount(<ConnectorFormWithStore connectInfo={v2OnlyConnectInfo} />);

        await fillUrl(page);
        await page.getByRole('tab', { name: 'v1' }).click();

        await expect(page.getByTestId('progress-button')).toBeDisabled();
    });

    test('Save is disabled on a version tab that reports a connection error', async ({ mount, page }) => {
        const connectInfo = [
            ...v1OnlyConnectInfo,
            {
                version: ConnectorVersion.V2,
                errorMessage: 'Connection refused',
                interfaces: [],
            },
        ] as unknown as ConnectInfoDto[];

        await mount(<ConnectorFormWithStore connectInfo={connectInfo} />);

        await fillUrl(page);

        await expect(page.getByTestId('connector-version-error')).toContainText('Connection refused');
        await expect(page.getByTestId('progress-button')).toBeDisabled();
    });
});
