import type { Page } from '@playwright/test';
import { expect, test } from '../../../playwright/ct-test';
import ConditionItemsViewerWithStore from './ConditionItemsViewerWithStore';

const ownerValues = async (page: Page): Promise<unknown> =>
    (JSON.parse((await page.getByTestId('current-filters').textContent()) ?? '[]') as Array<{ value: unknown }>)[0]?.value;

test.describe('ConditionAndSetFieldExecutionItemsViewer', () => {
    test('puts back what a rejected save removed when the condition is read again', async ({ mount, page }) => {
        await mount(<ConditionItemsViewerWithStore />);
        await expect.poll(() => ownerValues(page)).toEqual(['Alice', 'Bob']);

        await page.getByTestId('remove-bob-locally').click();
        await expect.poll(() => ownerValues(page)).toEqual(['Alice']);

        await page.getByTestId('refetch-condition').click();

        await expect(page.getByTestId('current-filters')).toContainText('Bob');
        expect(await ownerValues(page)).toEqual(['Alice', 'Bob']);
    });
});
