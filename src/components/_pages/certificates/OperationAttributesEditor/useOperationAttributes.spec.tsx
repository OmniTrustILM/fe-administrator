import type { AttributeDescriptorModel } from 'types/attributes';
import { AttributeContentType, AttributeType } from 'types/openapi';
import { expect, test } from '../../../../../playwright/ct-test';
import UseOperationAttributesHarness from './UseOperationAttributesHarness';

const descriptor = (name: string): AttributeDescriptorModel =>
    ({
        type: AttributeType.Data,
        name,
        uuid: `${name}-uuid`,
        contentType: AttributeContentType.String,
        properties: { label: name, required: false, readOnly: false, visible: true, list: false, multiSelect: false },
    }) as AttributeDescriptorModel;

test.describe('useOperationAttributes', () => {
    test('a callback field of the previous profile is not collected once the profile changes', async ({ mount, page }) => {
        await mount(
            <UseOperationAttributesHarness schema={[descriptor('staticField')]} callbackDescriptor={descriptor('callbackField')} />,
        );

        await page.getByRole('button', { name: 'Add callback field' }).click();
        await page.getByRole('button', { name: 'Collect' }).click();
        await expect(page.getByTestId('collected')).toContainText('callbackField');

        await page.getByRole('button', { name: 'Switch profile' }).click();
        await page.getByRole('button', { name: 'Collect' }).click();
        await expect(page.getByTestId('collected')).toHaveText('[]');
    });
});
