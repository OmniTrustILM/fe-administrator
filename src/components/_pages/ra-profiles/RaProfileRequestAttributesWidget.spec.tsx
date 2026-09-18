import type { Page } from '@playwright/test';
import { test, expect } from '../../../../playwright/ct-test';
import type { RaProfileCertificateRequestAttributesDto } from 'types/openapi';
import { AttributeSetMergeMode, ValueSourceType } from 'types/openapi';
import { RaProfileRequestAttributesWidgetTestWrapper } from './RaProfileRequestAttributesWidgetTestWrapper';

type CapturedAction = { type: string; payload?: Record<string, unknown> };

async function updatePatches(page: Page): Promise<CapturedAction[]> {
    return page.evaluate(() =>
        ((globalThis as unknown as { __raProfileWidgetActions__: CapturedAction[] }).__raProfileWidgetActions__ ?? []).filter(
            (a) => a.type === 'raProfileRequestAttributes/updateRaProfileRequestAttributes',
        ),
    );
}

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

/** A profile that combines the connector set with a binding onto one of its attributes. */
const mergedSet: RaProfileCertificateRequestAttributesDto = {
    requestAttributes: [],
    mergeMode: AttributeSetMergeMode.Merge,
    valueSourceBindings: [{ attributeUuid: 'attr-1', attributeName: 'commonName', valueSourceType: ValueSourceType.None }],
};

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

    test('absent connector: an empty resolved set is reported as empty, not as an error', async ({ mount, page }) => {
        await mount(<RaProfileRequestAttributesWidgetTestWrapper />);

        await expect(page.getByTestId('request-attributes-platform-default-note')).toBeVisible();
        await expect(page.getByTestId('resolved-set-empty')).toBeVisible();
        await expect(page.getByTestId('resolved-set-error')).toHaveCount(0);
        await expect(page.getByTestId('request-attributes-update-error')).toHaveCount(0);
    });

    test('static only: a profile without a merge mode seeds Static only and no bindings', async ({ mount, page }) => {
        await mount(<RaProfileRequestAttributesWidgetTestWrapper certificateRequestAttributes={authoredSet} />);

        const mergeMode = page.getByTestId('request-attribute-authoring-merge-mode');
        await expect(mergeMode).toBeVisible();
        await expect(mergeMode.getByRole('radio', { name: /Static only/ })).toBeChecked();
        await expect(page.getByTestId('request-attribute-authoring-bindings-empty')).toBeVisible();
    });

    test('connector-provided: a merged profile seeds its merge mode and binding rows and counts as authored', async ({ mount, page }) => {
        await mount(<RaProfileRequestAttributesWidgetTestWrapper certificateRequestAttributes={mergedSet} />);

        const mergeMode = page.getByTestId('request-attribute-authoring-merge-mode');
        await expect(mergeMode.getByRole('radio', { name: /^Merge/ })).toBeChecked();
        await expect(page.getByTestId('request-attribute-authoring-binding-row')).toHaveCount(1);
        await expect(page.getByTestId('request-attribute-authoring-binding-row')).toContainText('commonName');
        await expect(page.getByTestId('request-attributes-platform-default-note')).toHaveCount(0);
    });

    test('changing the merge mode saves immediately and round-trips the existing bindings', async ({ mount, page }) => {
        await mount(<RaProfileRequestAttributesWidgetTestWrapper certificateRequestAttributes={mergedSet} />);

        await page.getByTestId('request-attribute-authoring-merge-connectorOnly').click();

        await expect.poll(() => updatePatches(page)).toHaveLength(1);
        const [patch] = await updatePatches(page);
        expect(patch.payload).toMatchObject({
            authorityUuid: 'auth-1',
            raProfileUuid: 'ra-1',
            data: {
                mergeMode: 'connectorOnly',
                valueSourceBindings: [{ attributeUuid: 'attr-1', attributeName: 'commonName', valueSourceType: 'none' }],
            },
        });
    });

    test('removing the last binding sends an explicit empty list so Core clears it rather than keeps it', async ({ mount, page }) => {
        await mount(<RaProfileRequestAttributesWidgetTestWrapper certificateRequestAttributes={mergedSet} />);

        await page.getByTestId('request-attribute-authoring-binding-remove').click();

        await expect.poll(() => updatePatches(page)).toHaveLength(1);
        const [patch] = await updatePatches(page);
        expect(patch.payload).toMatchObject({ data: { mergeMode: 'merge', valueSourceBindings: [] } });
    });

    test('clears the previous connector descriptors before fetching the current authority set', async ({ mount, page }) => {
        await mount(<RaProfileRequestAttributesWidgetTestWrapper />);

        await expect(page.getByTestId('ra-profile-request-attributes-widget')).toBeVisible();
        const types = await page.evaluate(() =>
            ((globalThis as unknown as { __raProfileWidgetActions__: CapturedAction[] }).__raProfileWidgetActions__ ?? []).map(
                (a) => a.type,
            ),
        );
        const clearIndex = types.indexOf('authorities/clearRAProfilesAttributesDescriptors');
        const fetchIndex = types.indexOf('authorities/getRAProfilesAttributesDescriptors');
        expect(clearIndex).toBeGreaterThanOrEqual(0);
        expect(fetchIndex).toBeGreaterThan(clearIndex);
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
