import { expect, test } from '@playwright/experimental-ct-react';
import { AttributeSetMergeMode, ValueSourceType } from 'types/openapi';
import RaProfileRequestAttributesWidgetWithStore from './RaProfileRequestAttributesWidgetWithStore';

test('shows the platform-defaults note when the profile has no request attributes', async ({ mount, page }) => {
    await mount(<RaProfileRequestAttributesWidgetWithStore />);
    await expect(page.getByTestId('request-attributes-platform-default-note')).toBeVisible();
});

test('hides the platform-defaults note when the profile has request-attribute config', async ({ mount, page }) => {
    await mount(
        <RaProfileRequestAttributesWidgetWithStore
            certificateRequestAttributes={{
                requestAttributes: [],
                mergeMode: AttributeSetMergeMode.Merge,
                valueSourceBindings: [{ attributeUuid: 'attr-1', attributeName: 'commonName', valueSourceType: ValueSourceType.None }],
            }}
        />,
    );
    await expect(page.getByTestId('request-attributes-platform-default-note')).toHaveCount(0);
});

test('Save is disabled until the form is edited', async ({ mount, page }) => {
    await mount(<RaProfileRequestAttributesWidgetWithStore />);
    await expect(page.getByRole('button', { name: 'Save' })).toBeDisabled();
});
