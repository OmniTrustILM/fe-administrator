import type { Page } from '@playwright/test';
import { Resource, ResourceEvent, TriggerType } from 'types/openapi';
import type { TriggerModel } from 'types/rules';
import { test, expect } from '../../../playwright/ct-test';
import TriggerEditorWidgetWithStore from './TriggerEditorWidgetWithStore';

const openTriggerOptions = async (page: Page) => {
    await page.getByTestId('select-newRowWidgetSelect-trigger').click();
    return page.getByRole('option');
};

test.describe('TriggerEditorWidget', () => {
    test('offers triggers bound to the event and triggers with no event when an event is given', async ({ mount, page }) => {
        await mount(<TriggerEditorWidgetWithStore event={ResourceEvent.CertificateDiscovered} />);

        const options = await openTriggerOptions(page);

        await expect(options.filter({ hasText: 'Event Bound Trigger' })).toHaveCount(1);
        await expect(options.filter({ hasText: 'Unbound Trigger' })).toHaveCount(1);
    });

    test('hides triggers bound to a different event', async ({ mount, page }) => {
        await mount(<TriggerEditorWidgetWithStore event={ResourceEvent.CertificateDiscovered} />);

        const options = await openTriggerOptions(page);

        await expect(options.filter({ hasText: 'Event Bound Trigger' })).toHaveCount(1);
        await expect(options.filter({ hasText: 'Other Event Trigger' })).toHaveCount(0);
    });

    test('hides triggers of another resource', async ({ mount, page }) => {
        const triggers: TriggerModel[] = [
            {
                uuid: 'trigger-no-event',
                name: 'Unbound Trigger',
                resource: Resource.Certificates,
                ignoreTrigger: false,
            },
            {
                uuid: 'trigger-other-resource',
                name: 'Other Resource Trigger',
                resource: Resource.Discoveries,
                ignoreTrigger: false,
                type: TriggerType.Event,
            },
        ];

        await mount(
            <TriggerEditorWidgetWithStore
                resource={Resource.Certificates}
                event={ResourceEvent.CertificateDiscovered}
                triggers={triggers}
            />,
        );

        const options = await openTriggerOptions(page);

        await expect(options.filter({ hasText: 'Unbound Trigger' })).toHaveCount(1);
        await expect(options.filter({ hasText: 'Other Resource Trigger' })).toHaveCount(0);
    });

    test('offers every trigger of the resource when no event is given', async ({ mount, page }) => {
        await mount(<TriggerEditorWidgetWithStore />);

        const options = await openTriggerOptions(page);

        await expect(options.filter({ hasText: 'Event Bound Trigger' })).toHaveCount(1);
        await expect(options.filter({ hasText: 'Unbound Trigger' })).toHaveCount(1);
        await expect(options.filter({ hasText: 'Other Event Trigger' })).toHaveCount(1);
    });

    test('adds a trigger with no event to the selection', async ({ mount, page }) => {
        await mount(<TriggerEditorWidgetWithStore event={ResourceEvent.CertificateDiscovered} />);

        const options = await openTriggerOptions(page);
        await options.filter({ hasText: 'Unbound Trigger' }).click();

        await expect(page.getByTestId('selected-triggers-probe')).toHaveText('trigger-no-event');
        await expect(page.getByRole('cell', { name: 'Unbound Trigger' })).toBeVisible();
    });

    test('drops an added trigger from the options list', async ({ mount, page }) => {
        await mount(
            <TriggerEditorWidgetWithStore event={ResourceEvent.CertificateDiscovered} initialSelectedTriggers={['trigger-no-event']} />,
        );

        const options = await openTriggerOptions(page);

        await expect(options.filter({ hasText: 'Event Bound Trigger' })).toHaveCount(1);
        await expect(options.filter({ hasText: 'Unbound Trigger' })).toHaveCount(0);
    });
});
