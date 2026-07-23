import { expect, test } from '@playwright/experimental-ct-react';
import type { BaseAttributeDto } from 'types/openapi';
import { AttributeSetMergeMode, ValueSourceType } from 'types/openapi';
import RaProfileRequestAttributesWidgetWithStore from './RaProfileRequestAttributesWidgetWithStore';

test('shows the platform-defaults note when the profile has no request attributes', async ({ mount, page }) => {
    await mount(<RaProfileRequestAttributesWidgetWithStore />);
    await expect(page.getByTestId('request-attributes-platform-default-note')).toBeVisible();
});

test('hides the platform-defaults note when the profile has authored request attributes', async ({ mount, page }) => {
    await mount(
        <RaProfileRequestAttributesWidgetWithStore
            certificateRequestAttributes={{
                requestAttributes: [{ uuid: 'attr-1', name: 'commonName' } as BaseAttributeDto],
                mergeMode: AttributeSetMergeMode.StaticOnly,
            }}
        />,
    );
    await expect(page.getByTestId('request-attributes-platform-default-note')).toHaveCount(0);
});

test('still shows the platform-defaults note for a bindings-only profile while bindings are hidden', async ({ mount, page }) => {
    await mount(
        <RaProfileRequestAttributesWidgetWithStore
            certificateRequestAttributes={{
                requestAttributes: [],
                mergeMode: AttributeSetMergeMode.Merge,
                valueSourceBindings: [{ attributeUuid: 'attr-1', attributeName: 'commonName', valueSourceType: ValueSourceType.None }],
            }}
        />,
    );
    await expect(page.getByTestId('request-attributes-platform-default-note')).toBeVisible();
});

test('Save is disabled until the form is edited', async ({ mount, page }) => {
    await mount(<RaProfileRequestAttributesWidgetWithStore />);
    await expect(page.getByRole('button', { name: 'Save' })).toBeDisabled();
});
