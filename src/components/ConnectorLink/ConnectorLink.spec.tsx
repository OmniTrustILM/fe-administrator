import { MemoryRouter } from 'react-router';
import { test, expect } from '../../../playwright/ct-test';
import ConnectorLink from './index';

function renderConnectorLink(props: { uuid?: string; name?: string; fallback?: string }) {
    return (
        <MemoryRouter>
            <ConnectorLink {...props} />
        </MemoryRouter>
    );
}

test.describe('ConnectorLink', () => {
    test('links to the connector detail when the uuid is known', async ({ mount, page }) => {
        await mount(renderConnectorLink({ uuid: 'conn-1', name: 'Common-Credential-Connector' }));

        await expect(page.getByRole('link', { name: 'Common-Credential-Connector' })).toHaveAttribute('href', '/connectors/detail/conn-1');
    });

    test('renders the name as plain text when the uuid is missing', async ({ mount, page }) => {
        await mount(renderConnectorLink({ uuid: undefined, name: 'Common-Credential-Connector', fallback: 'Unassigned' }));

        await expect(page.getByText('Common-Credential-Connector')).toBeVisible();
        await expect(page.locator('a')).toHaveCount(0);
    });

    test('falls back to the provided label when there is no name', async ({ mount, page }) => {
        await mount(renderConnectorLink({ uuid: undefined, name: undefined, fallback: 'Unassigned' }));

        await expect(page.getByText('Unassigned')).toBeVisible();
        await expect(page.locator('a')).toHaveCount(0);
    });

    test('renders nothing readable when there is neither a name nor a fallback', async ({ mount, page }) => {
        await mount(renderConnectorLink({ uuid: undefined, name: undefined }));

        await expect(page.locator('a')).toHaveCount(0);
        await expect(page.locator('body')).toHaveText('');
    });
});
