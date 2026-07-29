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

test('renders no widget-level Save button', async ({ mount, page }) => {
    await mount(<RaProfileRequestAttributesWidgetWithStore />);
    await expect(page.getByRole('button', { name: 'Save' })).toHaveCount(0);
});

test('saving in the dialog adds the request attribute to the list immediately', async ({ mount, page }) => {
    await mount(<RaProfileRequestAttributesWidgetWithStore />);

    await expect(page.getByTestId('request-attribute-authoring-attribute-row')).toHaveCount(0);

    await page.getByTestId('request-attribute-authoring-attribute-add').click();
    await page.locator('#ra-attr-name').click();
    await page.locator('#ra-attr-name').fill('commonName');
    await page.locator('#ra-attr-label').click();
    await page.locator('#ra-attr-label').fill('Common Name');
    // A definition must carry a mapping target; SAN/dNSName needs no OID options wired into the store.
    await page.getByTestId('select-ra-attr-mapping-trigger').click();
    await page.getByRole('option', { name: 'Subject Alternative Name' }).click();
    await page.getByTestId('select-ra-attr-general-name-type-trigger').click();
    await page.getByRole('option', { name: 'dNSName' }).click();
    await page.getByRole('dialog').getByRole('button', { name: 'Save' }).click();

    await expect(page.getByTestId('request-attribute-authoring-attribute-row')).toHaveCount(1);
    await expect(page.getByRole('button', { name: 'Save' })).toHaveCount(0);
});

test('a rejected save rolls the list back to the persisted set instead of leaving the attribute behind', async ({ mount, page }) => {
    await mount(<RaProfileRequestAttributesWidgetWithStore />);

    await page.getByTestId('request-attribute-authoring-attribute-add').click();
    await page.locator('#ra-attr-name').click();
    await page.locator('#ra-attr-name').fill('commonName');
    await page.locator('#ra-attr-label').click();
    await page.locator('#ra-attr-label').fill('Common Name');
    await page.getByTestId('select-ra-attr-mapping-trigger').click();
    await page.getByRole('option', { name: 'Subject Alternative Name' }).click();
    await page.getByTestId('select-ra-attr-general-name-type-trigger').click();
    await page.getByRole('option', { name: 'dNSName' }).click();
    await page.getByRole('dialog').getByRole('button', { name: 'Save' }).click();

    // Optimistically listed while the save is in flight...
    await expect(page.getByTestId('request-attribute-authoring-attribute-row')).toHaveCount(1);

    await page.getByTestId('simulate-rejection').click();

    // ...and gone again once the backend rejects it: nothing was persisted, so nothing may be listed.
    await expect(page.getByTestId('request-attribute-authoring-attribute-row')).toHaveCount(0);
    await expect(page.getByTestId('request-attributes-platform-default-note')).toBeVisible();
    await expect(page.getByTestId('request-attributes-update-error')).toContainText('Attribute definition is invalid');
});
