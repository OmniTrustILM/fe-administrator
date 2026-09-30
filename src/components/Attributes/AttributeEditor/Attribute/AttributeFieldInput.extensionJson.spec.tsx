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

const BASIC_CONSTRAINTS_MODULE = `BasicConstraints DEFINITIONS IMPLICIT TAGS ::= BEGIN
BasicConstraints ::= SEQUENCE {
    cA                 BOOLEAN DEFAULT FALSE,
    pathLenConstraint  INTEGER (0..MAX) OPTIONAL }
END`;

/** OID registry with a DER extension described by a module, a DER extension without one, and a string-encoded extension. */
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
                additionalProperties: { defaultCritical: false, valueEncoding: 'DER', valueSchema: BASIC_CONSTRAINTS_MODULE },
            },
            {
                oid: '2.5.29.101',
                displayName: 'Undescribed Extension',
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

test.describe('extension value input', () => {
    test('a DER extension with a module offers the JER hint and validates a JER value while typing', async ({ mount, page }) => {
        await mount(
            <AttributeEditorTestWrapper
                id={EDITOR_ID}
                attributeDescriptors={[extensionDescriptor('2.5.29.19')]}
                preloadedState={oidsState}
            />,
        );

        await expect(page.getByTestId(`${FIELD}-der-value-hint`)).toContainText('is read as JER (X.697)');
        await expect(page.getByTestId(`${FIELD}-der-value-hint`)).toContainText('anything else as base64-encoded DER');

        const input = page.locator(`[id="${FIELD}"]`);
        // Duplicate keys survive JSON.parse, so this is exactly the case the strict check must catch.
        await input.fill('{"cA":true,"cA":false}');
        await expect(page.getByTestId(`${FIELD}-jer-error`)).toContainText('Duplicate key');

        // Every character Core's JerCodec reads as the start of a JER value gets the same check.
        for (const malformed of ['[1,', '"unterminated', '-']) {
            await input.fill('{}');
            await expect(page.getByTestId(`${FIELD}-jer-error`)).toHaveCount(0);
            await input.fill(malformed);
            await expect(page.getByTestId(`${FIELD}-jer-error`)).toBeVisible();
        }

        await input.fill('{"cA":true,"pathLenConstraint":0}');
        await expect(page.getByTestId(`${FIELD}-jer-error`)).toHaveCount(0);
    });

    test('a DER-mapped String attribute still gets a textarea, since a JER value needs room', async ({ mount, page }) => {
        await mount(
            <AttributeEditorTestWrapper
                id={EDITOR_ID}
                attributeDescriptors={[extensionDescriptor('2.5.29.19', 'string')]}
                preloadedState={oidsState}
            />,
        );

        await expect(page.locator(`textarea[id="${FIELD}"]`)).toBeVisible();
        await expect(page.getByTestId(`${FIELD}-der-value-hint`)).toBeVisible();
    });

    test('a value not starting with {, [, " or - is read as base64 DER and never JSON-validated', async ({ mount, page }) => {
        await mount(
            <AttributeEditorTestWrapper
                id={EDITOR_ID}
                attributeDescriptors={[extensionDescriptor('2.5.29.19')]}
                preloadedState={oidsState}
            />,
        );

        const input = page.locator(`[id="${FIELD}"]`);
        await input.fill('MAMBAf8=');
        await expect(page.getByTestId(`${FIELD}-jer-error`)).toHaveCount(0);
    });

    test('a DER extension without a module asks for base64 DER and offers no JER treatment', async ({ mount, page }) => {
        await mount(
            <AttributeEditorTestWrapper
                id={EDITOR_ID}
                attributeDescriptors={[extensionDescriptor('2.5.29.101')]}
                preloadedState={oidsState}
            />,
        );

        await expect(page.getByTestId(`${FIELD}-der-value-hint`)).toContainText('base64-encoded DER');
        await expect(page.getByTestId(`${FIELD}-der-value-hint`)).toContainText('no ASN.1 module');

        const input = page.locator(`[id="${FIELD}"]`);
        await input.fill('{not json at all');
        await expect(page.getByTestId(`${FIELD}-jer-error`)).toHaveCount(0);
    });

    test('an extension with a string encoding gets no DER treatment, since { is literal text there', async ({ mount, page }) => {
        await mount(
            <AttributeEditorTestWrapper
                id={EDITOR_ID}
                attributeDescriptors={[extensionDescriptor('2.5.29.100')]}
                preloadedState={oidsState}
            />,
        );

        await expect(page.locator(`[id="${FIELD}"]`)).toBeVisible();
        await expect(page.getByTestId(`${FIELD}-der-value-hint`)).toHaveCount(0);

        const input = page.locator(`[id="${FIELD}"]`);
        await input.fill('{not json at all');
        await expect(page.getByTestId(`${FIELD}-jer-error`)).toHaveCount(0);
    });
});
