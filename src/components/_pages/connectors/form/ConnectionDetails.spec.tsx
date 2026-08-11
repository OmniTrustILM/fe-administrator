import { test, expect } from '../../../../../playwright/ct-test';
import { withProviders } from 'utils/test-helpers';

import ConnectionDetailsV1 from './ConnectionDetailsV1';
import ConnectionDetailsV2 from './ConnectionDetailsV2';

test.describe('ConnectionDetailsV1', () => {
    test('renders URL, status and function groups when connectionDetails are present', async ({ mount }) => {
        const connectionDetails = [
            {
                version: 'v1',
                connectorUuid: '1234',
                functionGroups: [
                    {
                        name: 'Credential Provider',
                        kinds: ['Discovery Provider'],
                        endPoints: [
                            {
                                name: 'checkHealth',
                                context: '/v1/health',
                                method: 'GET',
                            },
                        ],
                    },
                ],
            },
        ] as any;

        const component = await mount(
            withProviders(<ConnectionDetailsV1 url="https://connector-service" connectionDetails={connectionDetails} />),
        );

        await expect(component.getByText('URL')).toBeVisible();
        await expect(component.getByText('https://connector-service')).toBeVisible();

        await expect(component.getByText('Connector Status')).toBeVisible();
        await expect(component.getByText('Connected')).toBeVisible();

        await expect(component.getByText('Connector Functionality Description')).toBeVisible();
        await expect(component.getByText('checkHealth')).toBeVisible();
        await expect(component.getByText('/v1/health')).toBeVisible();
        await expect(component.getByText('GET')).toBeVisible();
    });

    test('does not render functionality widget when connectionDetails are empty', async ({ mount }) => {
        const connectionDetails = [
            {
                version: 'v1',
                connectorUuid: '1234',
                functionGroups: [],
            },
        ] as any;

        const component = await mount(
            withProviders(<ConnectionDetailsV1 url="https://connector-service" connectionDetails={connectionDetails} />),
        );

        await expect(component.getByText('URL')).toBeVisible();
        await expect(component.getByText('Connector Status')).toBeVisible();

        await expect(component.getByText('Connector Functionality Description')).toHaveCount(0);
    });
});

test.describe('ConnectionDetailsV2', () => {
    test('renders connector info and interfaces for v2 connect info', async ({ mount, page }) => {
        const connectInfo = [
            {
                version: 'v2',
                connectorUuid: '1234',
                connector: {
                    id: 'czertainly.ejbca.connector',
                    name: 'ejbca-connector',
                    version: '1.16',
                    description: 'EJBCA Connector for ILM',
                    metadata: {
                        Author: 'OmniTrust',
                        License: 'MIT',
                    },
                },
                interfaces: [
                    {
                        code: 'authority',
                        version: 'v2',
                        features: ['ejbca', 'stateless'],
                    },
                    {
                        code: 'discovery',
                        version: 'v1',
                        features: ['async'],
                    },
                ],
            },
        ];

        await mount(withProviders(<ConnectionDetailsV2 connectInfo={connectInfo} />));

        await expect(page.getByText('Name')).toBeVisible();
        await expect(page.getByText('ejbca-connector')).toBeVisible();

        await expect(page.getByText('ID')).toBeVisible();
        await expect(page.getByText('czertainly.ejbca.connector')).toBeVisible();

        await expect(page.getByText('Version')).toBeVisible();
        await expect(page.getByText('1.16')).toBeVisible();

        await expect(page.getByText('Metadata')).toBeVisible();
        await expect(page.getByText('Author:OmniTrust License:MIT')).toBeVisible();

        await expect(page.getByRole('columnheader', { name: 'Interfaces' })).toBeVisible();
        await expect(page.getByText('Authority')).toBeVisible();
        await expect(page.getByText('Discovery').first()).toBeVisible();

        await expect(page.getByText('Ejbca', { exact: true })).toBeVisible();
        await expect(page.getByText('Stateless')).toBeVisible();
        await expect(page.getByText('Async')).toBeVisible();
    });

    test('shows placeholder message when there is no v2 connect info', async ({ mount, page }) => {
        const v1ConnectInfo = [
            {
                version: 'v1',
                connectorUuid: '1234',
                errorMessage: undefined,
                functionGroups: [],
            },
        ];

        await mount(withProviders(<ConnectionDetailsV2 connectInfo={v1ConnectInfo} />));

        await expect(page.getByText('No v2 connection details available.')).toBeVisible();
    });
});
