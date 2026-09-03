import { test, expect } from '../../../../../playwright/ct-test';
import type { AttributeDescriptorModel } from 'types/attributes';
import { AttributeEditorTestWrapper } from '../AttributeEditorTestWrapper';

const EDITOR_ID = 'extjson';
const FIELD = `__attributes__${EDITOR_ID}__.extValue`;

const extensionDescriptor = (extensionOid: string, contentType = 'text'): AttributeDescriptorModel =>
    ({
        uuid: 'a1',
        name: 'extValue',
        type: 'data',
        contentType,
        content: [],
        properties: { label: 'Extension value', visible: true, required: false, readOnly: false, list: false, multiSelect: false },
        fieldMapping: { objectType: 'x509Certificate', fields: [{ fieldType: 'extension', extensionOid }] },
    }) as unknown as AttributeDescriptorModel;

/** OID registry with one DER-encoded and one string-encoded certificate extension. */
const oidsState = {
    oids: {
        oids: [],
        oidsByCategory: {},
        oidsByCategoryError: {},
        oidsByCategoryLoaded: {},
        systemOids: [
            {
                oid: '2.5.29.19',
                displayName: 'Basic Constraints',
                category: 'certificateExtension',
                additionalProperties: { defaultCritical: false, valueEncoding: 'DER' },
            },
            {
                oid: '2.5.29.100',
                displayName: 'String Extension',
                category: 'certificateExtension',
                additionalProperties: { defaultCritical: false, valueEncoding: 'UTF8String' },
            },
        ],
        systemOidsLoaded: true,
        systemOidsError: false,
        isFetching: false,
        isCreating: false,
        createOidSucceeded: false,
        isUpdating: false,
        updateOidSucceeded: false,
        isDeleting: false,
    },
};

test.describe('extension value JSON input', () => {
    test('a DER-mapped extension attribute offers the JSON-tree hint and validates while typing', async ({ mount, page }) => {
        await mount(
            <AttributeEditorTestWrapper
                id={EDITOR_ID}
                attributeDescriptors={[extensionDescriptor('2.5.29.19')]}
                preloadedState={oidsState}
            />,
        );

        await expect(page.getByTestId(`${FIELD}-json-tree-hint`)).toContainText('ASN.1 JSON tree');

        const input = page.locator(`[id="${FIELD}"]`);
        // Duplicate keys survive JSON.parse, so this is exactly the case the strict check must catch.
        await input.fill('{"sequence":[{"integer":1,"integer":2}]}');
        await expect(page.getByTestId(`${FIELD}-json-tree-error`)).toContainText('Duplicate key');

        await input.fill('{"sequence":[{"boolean":true},{"integer":0}]}');
        await expect(page.getByTestId(`${FIELD}-json-tree-error`)).toHaveCount(0);
    });

    test('a DER-mapped String attribute still gets a textarea — a structural JSON value needs room', async ({ mount, page }) => {
        await mount(
            <AttributeEditorTestWrapper
                id={EDITOR_ID}
                attributeDescriptors={[extensionDescriptor('2.5.29.19', 'string')]}
                preloadedState={oidsState}
            />,
        );

        await expect(page.locator(`textarea[id="${FIELD}"]`)).toBeVisible();
        await expect(page.getByTestId(`${FIELD}-json-tree-hint`)).toBeVisible();
    });

    test('a value not starting with { is read as base64 DER and never JSON-validated', async ({ mount, page }) => {
        await mount(
            <AttributeEditorTestWrapper
                id={EDITOR_ID}
                attributeDescriptors={[extensionDescriptor('2.5.29.19')]}
                preloadedState={oidsState}
            />,
        );

        const input = page.locator(`[id="${FIELD}"]`);
        await input.fill('MAMBAf8=');
        await expect(page.getByTestId(`${FIELD}-json-tree-error`)).toHaveCount(0);
    });

    test('an extension with a string encoding gets no JSON treatment — { is literal text there', async ({ mount, page }) => {
        await mount(
            <AttributeEditorTestWrapper
                id={EDITOR_ID}
                attributeDescriptors={[extensionDescriptor('2.5.29.100')]}
                preloadedState={oidsState}
            />,
        );

        await expect(page.locator(`[id="${FIELD}"]`)).toBeVisible();
        await expect(page.getByTestId(`${FIELD}-json-tree-hint`)).toHaveCount(0);

        const input = page.locator(`[id="${FIELD}"]`);
        await input.fill('{not json at all');
        await expect(page.getByTestId(`${FIELD}-json-tree-error`)).toHaveCount(0);
    });
});
