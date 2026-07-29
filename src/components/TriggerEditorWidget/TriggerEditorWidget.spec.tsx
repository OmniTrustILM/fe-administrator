import { ResourceEvent } from 'types/openapi';
import { test, expect } from '../../../playwright/ct-test';
import TriggerEditorWidgetWithStore from './TriggerEditorWidgetWithStore';

const optionsList = (page: import('@playwright/test').Page) => page.getByTestId('select-newRowWidgetSelect-input').locator('option');

test.describe('TriggerEditorWidget', () => {
    test('offers triggers bound to the event and triggers with no event when an event is given', async ({ mount, page }) => {
        await mount(<TriggerEditorWidgetWithStore event={ResourceEvent.CertificateDiscovered} />);

        await expect(optionsList(page).filter({ hasText: 'Event Bound Trigger' })).toHaveCount(1);
        await expect(optionsList(page).filter({ hasText: 'Unbound Trigger' })).toHaveCount(1);
    });

    test('hides triggers bound to a different event', async ({ mount, page }) => {
        await mount(<TriggerEditorWidgetWithStore event={ResourceEvent.CertificateDiscovered} />);

        await expect(optionsList(page).filter({ hasText: 'Other Event Trigger' })).toHaveCount(0);
    });

    test('offers every trigger of the resource when no event is given', async ({ mount, page }) => {
        await mount(<TriggerEditorWidgetWithStore />);

        await expect(optionsList(page).filter({ hasText: 'Event Bound Trigger' })).toHaveCount(1);
        await expect(optionsList(page).filter({ hasText: 'Unbound Trigger' })).toHaveCount(1);
        await expect(optionsList(page).filter({ hasText: 'Other Event Trigger' })).toHaveCount(1);
    });

    test('adds a trigger with no event to the selection', async ({ mount, page }) => {
        await mount(<TriggerEditorWidgetWithStore event={ResourceEvent.CertificateDiscovered} />);

        await page.getByTestId('select-newRowWidgetSelect-trigger').click();
        await page.getByRole('option', { name: 'Unbound Trigger' }).click();

        await expect(page.getByTestId('selected-triggers-probe')).toHaveText('trigger-no-event');
        await expect(page.getByRole('cell', { name: 'Unbound Trigger' })).toBeVisible();
    });

    test('drops an added trigger from the options list', async ({ mount, page }) => {
        await mount(
            <TriggerEditorWidgetWithStore event={ResourceEvent.CertificateDiscovered} initialSelectedTriggers={['trigger-no-event']} />,
        );

        await expect(optionsList(page).filter({ hasText: 'Unbound Trigger' })).toHaveCount(0);
        await expect(optionsList(page).filter({ hasText: 'Event Bound Trigger' })).toHaveCount(1);
    });
});
