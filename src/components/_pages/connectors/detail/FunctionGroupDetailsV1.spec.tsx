import { test, expect } from '../../../../../playwright/ct-test';
import { Provider } from 'react-redux';
import { MemoryRouter } from 'react-router';
import { createMockStore } from 'utils/test-helpers';
import { PlatformEnum } from 'types/openapi';

import FunctionGroupDetailsV1 from './FunctionGroupDetailsV1';

test.describe('FunctionGroupDetailsV1', () => {
    const baseProps = {
        functionGroups: [
            {
                name: 'Authority',
                functionGroupCode: 'authority',
                kinds: ['v2'],
                endPoints: [
                    { name: 'checkHealth', context: '/v1/health', method: 'GET' } as any,
                    { name: 'deleteDiscovery', context: '/v1/discoveryProvider/discover/{uuid}', method: 'POST' } as any,
                ],
            } as any,
        ],
        currentFunctionGroup: {
            name: 'Authority',
            functionGroupCode: 'authority',
            kinds: ['v2'],
            endPoints: [
                { name: 'checkHealth', context: '/v1/health', method: 'GET' } as any,
                { name: 'deleteDiscovery', context: '/v1/discoveryProvider/discover/{uuid}', method: 'POST' } as any,
            ],
        } as any,
        currentFunctionGroupKind: 'v2',
        currentFunctionGroupKindAttributes: [],
        isFetchingDetail: false,
        isReconnecting: false,
        isFetchingAllAttributes: false,
        onFunctionGroupChange: () => {},
        onFunctionGroupKindChange: () => {},
        getFreshConnectorAttributesDesc: () => {},
    };

    test('renders function group select, endpoints, attributes and supported interfaces', async ({ mount, page }) => {
        const preloadedState: Parameters<typeof createMockStore>[0] = {
            enums: {
                platformEnums: {
                    [PlatformEnum.FunctionGroupCode]: {
                        authority: { label: 'Authority' },
                    },
                },
            },
        };

        const store = createMockStore(preloadedState as any);

        const component = await mount(
            <Provider store={store}>
                <MemoryRouter initialEntries={['/']}>
                    <FunctionGroupDetailsV1 {...baseProps} />
                </MemoryRouter>
            </Provider>,
        );

        await expect(component.getByText('Function Group Details')).toBeVisible();
        await expect(component.getByTestId('select-functionGroup-input')).toBeAttached();

        await expect(component.getByText('Endpoints')).toBeVisible();
        await expect(component.getByText('checkHealth')).toBeVisible();
        await expect(component.getByText('/v1/health')).toBeVisible();
        await expect(component.getByText('GET')).toBeVisible();

        await expect(component.getByText('Attributes')).toBeVisible();
        await expect(component.getByText('Supported Interfaces')).toBeVisible();
        await expect(component.getByRole('columnheader', { name: 'Function Group' })).toBeVisible();
    });
});
