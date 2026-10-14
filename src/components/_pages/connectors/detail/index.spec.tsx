import type { ConnectorResponseModel, HealthModel } from 'types/connectors';
import { AuthType, ConnectorStatus, ConnectorVersion, HealthStatus } from 'types/openapi';
import { expect, test, type Page } from '../../../../../playwright/ct-test';
import ConnectorDetailWithStore from './ConnectorDetailWithStore';

const connector = (version: ConnectorVersion): ConnectorResponseModel => ({
    uuid: 'connector-1',
    name: 'Offline connector',
    version,
    url: 'https://connector.example:8443',
    authType: AuthType.None,
    status: ConnectorStatus.Offline,
    functionGroups: [],
    interfaces: [],
});

const health: HealthModel = {
    status: HealthStatus.Down,
    description: 'Connector is not reachable',
    parts: { database: { status: HealthStatus.Down, description: 'Connection pool exhausted' } },
};

const sidewaysOverflow = (page: Page) => page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);

test.describe('ConnectorDetail', () => {
    // A v2 connector lays its cards out in two columns from 1280px up, so it is narrowed below that, where it has one.
    for (const [version, loadedAt, narrowedTo] of [
        [ConnectorVersion.V1, 1440, 1100],
        [ConnectorVersion.V2, 1200, 900],
    ] as const) {
        test(`a ${version} connector's page does not scroll sideways once its column narrows after load`, async ({ mount, page }) => {
            await page.setViewportSize({ width: loadedAt, height: 900 });
            await mount(<ConnectorDetailWithStore connector={connector(version)} health={health} />);
            await expect(page.getByText('Overall Health')).toBeVisible();
            expect(await sidewaysOverflow(page)).toBe(0);

            await page.setViewportSize({ width: narrowedTo, height: 900 });

            await expect.poll(() => sidewaysOverflow(page)).toBe(0);
        });
    }
});
