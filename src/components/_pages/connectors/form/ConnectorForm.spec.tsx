import type { Page } from '@playwright/test';
import { test, expect } from '../../../../../playwright/ct-test';
import { ConnectorInterface, ConnectorVersion, FeatureFlag, FunctionGroupCode } from 'types/openapi';
import type { ConnectInfoDto } from 'types/openapi';

import ConnectorFormWithStore from './ConnectorFormWithStore';

const CONNECTOR_URL = 'https://connector-service';

const v1OnlyConnectInfo = [
    {
        version: ConnectorVersion.V1,
        functionGroups: [
            {
                uuid: '1234',
                name: 'credentialProvider',
                functionGroupCode: FunctionGroupCode.CredentialProvider,
                kinds: ['SoftKeyStore'],
                endPoints: [],
            },
        ],
    },
] satisfies ConnectInfoDto[];

const v2OnlyConnectInfo = [
    {
        version: ConnectorVersion.V2,
        connector: {
            id: 'com.otilm.ejbca.connector',
            name: 'ejbca-connector',
            version: '1.16',
        },
        interfaces: [{ code: ConnectorInterface.Authority, version: '1', features: [FeatureFlag.Stateless] }],
    },
] satisfies ConnectInfoDto[];

async function fillUrl(page: Page) {
    const url = page.locator('#url');
    await url.click();
    await url.fill(CONNECTOR_URL);
    await expect(url).toHaveValue(CONNECTOR_URL);
}

async function fillName(page: Page) {
    const name = page.locator('#name');
    await name.click();
    await name.fill('ejbca-connector');
    await expect(name).toHaveValue('ejbca-connector');
}

test.describe('ConnectorForm URL validation', () => {
    test('accepts a connector URL that carries a base path', async ({ mount, page }) => {
        await mount(<ConnectorFormWithStore />);

        const url = page.locator('#url');
        await url.click();
        await url.fill('http://demo-web.3key.company:7070/api');
        await url.blur();

        await expect(page.getByText('Value must be a valid url')).toBeHidden();
        await expect(page.getByRole('button', { name: 'Connect' })).toBeEnabled();
    });
});

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
        await fillName(page);

        await expect(page.getByTestId('progress-button')).toBeEnabled();
    });

    test('Save toggles off when switching from the reachable v2 tab to the unreachable v1 tab', async ({ mount, page }) => {
        await mount(<ConnectorFormWithStore connectInfo={v2OnlyConnectInfo} />);

        await fillUrl(page);
        await expect(page.getByRole('tab', { name: 'v2' })).toHaveAttribute('data-state', 'active');
        await fillName(page);

        await expect(page.getByTestId('progress-button')).toBeEnabled();

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
        ] satisfies ConnectInfoDto[];

        await mount(<ConnectorFormWithStore connectInfo={connectInfo} />);

        await fillUrl(page);

        await expect(page.getByTestId('connector-version-error')).toContainText('Connection refused');
        await expect(page.getByTestId('progress-button')).toBeDisabled();
    });
});
