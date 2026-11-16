import { Resource, ResourceAction } from 'types/openapi';
import { expect, test } from '../../../../../../playwright/ct-test';
import EventsTableWithStore from './EventsTableWithStore';

const settingsUpdate = { resource: Resource.Settings, actions: [ResourceAction.Update] };
const triggersUpdate = { resource: Resource.Triggers, actions: [ResourceAction.Update] };

test.describe('EventsTable actions by permission', () => {
    test('disables Add in platform mode without trigger update, which saving the settings also needs', async ({ mount, page }) => {
        await mount(<EventsTableWithStore mode="platform" resourceGrants={[settingsUpdate]} />);

        await expect(page.getByTestId('plus-button')).toBeDisabled();
    });

    test('offers Add in platform mode with both settings and trigger update', async ({ mount, page }) => {
        await mount(<EventsTableWithStore mode="platform" resourceGrants={[settingsUpdate, triggersUpdate]} />);

        await expect(page.getByTestId('plus-button')).toBeEnabled();
    });

    test('offers Add in association mode with trigger update alone', async ({ mount, page }) => {
        await mount(<EventsTableWithStore mode="association" resourceGrants={[triggersUpdate]} />);

        await expect(page.getByTestId('plus-button')).toBeEnabled();
    });

    test('disables Add in association mode without trigger update', async ({ mount, page }) => {
        await mount(<EventsTableWithStore mode="association" resourceGrants={[settingsUpdate]} />);

        await expect(page.getByTestId('plus-button')).toBeDisabled();
    });
});
