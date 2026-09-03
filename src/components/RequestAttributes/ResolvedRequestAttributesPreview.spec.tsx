import { test, expect } from '../../../playwright/ct-test';
import { withProviders } from 'utils/test-helpers';
import type { AttributeDescriptorModel } from 'types/attributes';
import ResolvedRequestAttributesPreview from './ResolvedRequestAttributesPreview';

const dataAttribute = (over: {
    uuid: string;
    name: string;
    label: string;
    required?: boolean;
    fields?: unknown[];
}): AttributeDescriptorModel =>
    ({
        uuid: over.uuid,
        name: over.name,
        type: 'data',
        contentType: 'string',
        content: [],
        properties: {
            label: over.label,
            visible: true,
            required: over.required ?? false,
            readOnly: false,
            list: false,
            multiSelect: false,
        },
        fieldMapping: over.fields ? { objectType: 'x509Certificate', fields: over.fields } : undefined,
    }) as unknown as AttributeDescriptorModel;

test.describe('ResolvedRequestAttributesPreview', () => {
    test('shows the loading note while the resolved set fetch is in flight', async ({ mount, page }) => {
        await mount(withProviders(<ResolvedRequestAttributesPreview descriptors={[]} isFetching />));
        await expect(page.getByTestId('resolved-set-loading')).toBeVisible();
    });

    test('says so when the resolved set is empty', async ({ mount, page }) => {
        await mount(withProviders(<ResolvedRequestAttributesPreview descriptors={[]} isFetching={false} />));
        await expect(page.getByTestId('resolved-set-empty')).toBeVisible();
    });

    test('renders one row per resolved attribute with label, required marker and mapping badge', async ({ mount }) => {
        const descriptors = [
            dataAttribute({ uuid: 'u1', name: 'cn', label: 'Common Name', required: true, fields: [{ fieldType: 'rdn', rdn: 'CN' }] }),
            dataAttribute({ uuid: 'u2', name: 'keyUsage', label: 'Key Usage', fields: [{ fieldType: 'keyUsage' }] }),
        ];
        const component = await mount(withProviders(<ResolvedRequestAttributesPreview descriptors={descriptors} isFetching={false} />));

        const rows = component.getByTestId('resolved-set-row');
        await expect(rows).toHaveCount(2);
        await expect(rows.nth(0)).toContainText('Common Name');
        await expect(rows.nth(0)).toContainText('required');
        await expect(rows.nth(1)).toContainText('Key Usage');
        await expect(rows.nth(1)).not.toContainText('required');
        // The new structured target renders through the same badge as every other mapping.
        await expect(rows.nth(1).getByTestId('request-attribute-mapping-badge')).toContainText('Key Usage');
    });
});
