import type { Page } from '@playwright/test';
import { test, expect } from '../../../../playwright/ct-test';
import type { RaProfileCertificateRequestAttributesDto } from 'types/openapi';
import { AttributeSetMergeMode, ValueSourceType } from 'types/openapi';
import { RaProfileRequestAttributesWidgetTestWrapper } from './RaProfileRequestAttributesWidgetTestWrapper';

/** Author a minimal valid attribute through the dialog; SAN/dNSName needs no OID options wired in. */
async function authorSanAttribute(page: Page) {
    await page.getByTestId('request-attribute-authoring-attribute-add').click();
    await page.locator('#ra-attr-name').click();
    await page.locator('#ra-attr-name').fill('commonName');
    await page.locator('#ra-attr-label').click();
    await page.locator('#ra-attr-label').fill('Common Name');
    await page.getByTestId('select-ra-attr-mapping-trigger').click();
    await page.getByRole('option', { name: 'Subject Alternative Name' }).click();
    await page.getByTestId('select-ra-attr-general-name-type-trigger').click();
    await page.getByRole('option', { name: 'dNSName' }).click();
    await page.getByRole('dialog').getByRole('button', { name: 'Save', exact: true }).click();
}

const authoredSet = {
    requestAttributes: [
        {
            uuid: 'u1',
            name: 'cn',
            type: 'data',
            contentType: 'string',
            version: 3,
            properties: { label: 'Common Name', visible: true, required: true, readOnly: false, list: false, multiSelect: false },
        },
    ],
} as unknown as RaProfileCertificateRequestAttributesDto;

test.describe('RaProfileRequestAttributesWidget', () => {
    test('with no authored set, the note links to platform settings and previews the resolved set', async ({ mount, page }) => {
        await mount(
            <RaProfileRequestAttributesWidgetTestWrapper
                preloadedState={{
                    certificates: {
                        csrAttributeDescriptors: [
                            {
                                uuid: 'r1',
                                name: 'cn',
                                type: 'data',
                                contentType: 'string',
                                content: [],
                                properties: {
                                    label: 'Common Name',
                                    visible: true,
                                    required: true,
                                    readOnly: false,
                                    list: false,
                                    multiSelect: false,
                                },
                                fieldMapping: { objectType: 'x509Certificate', fields: [{ fieldType: 'keyUsage' }] },
                            },
                        ],
                    } as never,
                }}
            />,
        );

        const note = page.getByTestId('request-attributes-platform-default-note');
        await expect(note).toBeVisible();
        await expect(note.getByRole('link', { name: 'platform settings' })).toHaveAttribute('href', '/settings?tab=request-attributes');
        await expect(page.getByTestId('resolved-set-row')).toHaveCount(1);
        await expect(page.getByTestId('resolved-set-row')).toContainText('Common Name');
        await expect(page.getByTestId('resolved-set-row').getByTestId('request-attribute-mapping-badge')).toContainText('Key Usage');
    });

    test('with an authored set, the platform-default note and preview stay hidden', async ({ mount, page }) => {
        await mount(<RaProfileRequestAttributesWidgetTestWrapper certificateRequestAttributes={authoredSet} />);

        await expect(page.getByTestId('ra-profile-request-attributes-widget')).toBeVisible();
        await expect(page.getByTestId('request-attributes-platform-default-note')).toHaveCount(0);
        await expect(page.getByTestId('resolved-set-preview')).toHaveCount(0);
    });

    test('still shows the platform-defaults note for a bindings-only profile while bindings are hidden', async ({ mount, page }) => {
        await mount(
            <RaProfileRequestAttributesWidgetTestWrapper
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
        await mount(<RaProfileRequestAttributesWidgetTestWrapper />);
        await expect(page.getByTestId('ra-profile-request-attributes-widget')).toBeVisible();
        await expect(page.getByRole('button', { name: 'Save', exact: true })).toHaveCount(0);
    });

    test('saving in the dialog adds the request attribute to the list immediately', async ({ mount, page }) => {
        await mount(<RaProfileRequestAttributesWidgetTestWrapper />);

        await expect(page.getByTestId('request-attribute-authoring-attribute-row')).toHaveCount(0);
        await authorSanAttribute(page);

        await expect(page.getByTestId('request-attribute-authoring-attribute-row')).toHaveCount(1);
    });

    test('a rejected save rolls the list back and keeps the draft open in the dialog', async ({ mount, page }) => {
        await mount(<RaProfileRequestAttributesWidgetTestWrapper />);

        await authorSanAttribute(page);

        // Optimistically listed while the save is in flight; the dialog stays open awaiting the result.
        await expect(page.getByTestId('request-attribute-authoring-attribute-row')).toHaveCount(1);

        // The modal overlay blocks pointer events, so drive the store stand-in directly.
        await page.getByTestId('simulate-rejection').dispatchEvent('click');

        // Nothing was persisted, so the list rolls back — but the draft stays in the dialog with the
        // error, ready to be corrected and re-saved.
        await expect(page.getByTestId('request-attribute-authoring-attribute-save-error')).toContainText('Attribute definition is invalid');
        await expect(page.locator('#ra-attr-name')).toHaveValue('commonName');
        await expect(page.getByTestId('request-attribute-authoring-attribute-row')).toHaveCount(0);

        await page.getByRole('dialog').getByRole('button', { name: 'Cancel', exact: true }).click();
        await expect(page.getByTestId('request-attributes-platform-default-note')).toBeVisible();
        await expect(page.getByTestId('request-attributes-update-error')).toContainText('Attribute definition is invalid');
    });
});
