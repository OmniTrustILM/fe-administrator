import type { Page } from '@playwright/test';
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
        // The custom list carries no additionalProperties; only the detail says how an extension is encoded.
        oidsByCategory: {
            certificateExtension: [
                { oid: '1.3.6.1.4.1.99999.1', displayName: 'Custom', category: 'certificateExtension' },
                { oid: '1.3.6.1.4.1.99999.2', displayName: 'Custom, unread', category: 'certificateExtension' },
            ],
        },
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
        extensionOidDetailsRequested: { '1.3.6.1.4.1.99999.1': true, '1.3.6.1.4.1.99999.2': true },
        extensionOidDetailsFailed: { '1.3.6.1.4.1.99999.2': 'Failed to load OID entry (503): Service Unavailable.' },
        extensionOidDetails: {
            '1.3.6.1.4.1.99999.1': {
                oid: '1.3.6.1.4.1.99999.1',
                displayName: 'Custom',
                category: 'certificateExtension',
                additionalProperties: { defaultCritical: false, valueEncoding: 'DER', valueSchema: BASIC_CONSTRAINTS_MODULE },
            },
        },
        systemOidsError: false,
        isFetching: false,
        isCreating: false,
        createOidSucceeded: false,
        isUpdating: false,
        updateOidSucceeded: false,
        isDeleting: false,
    },
};

type MountFn = (jsx: any) => Promise<any>;

/** Mounts one attribute mapped onto `extensionOid` and returns the locators every test reads. */
async function mountField(mount: MountFn, page: Page, extensionOid: string, contentType?: string) {
    await mount(
        <AttributeEditorTestWrapper
            id={EDITOR_ID}
            attributeDescriptors={[extensionDescriptor(extensionOid, contentType)]}
            preloadedState={oidsState}
        />,
    );
    return {
        input: page.locator(`[id="${FIELD}"]`),
        hint: page.getByTestId(`${FIELD}-der-value-hint`),
        jerError: page.getByTestId(`${FIELD}-jer-error`),
        detailError: page.getByTestId(`${FIELD}-extension-detail-error`),
    };
}

test.describe('extension value input', () => {
    test('a DER extension with a module offers the JER hint and validates a JER value while typing', async ({ mount, page }) => {
        const { input, hint, jerError } = await mountField(mount, page, '2.5.29.19');

        await expect(hint).toContainText('in JER (X.697)');
        await expect(hint).toContainText('always read as JER');

        // Duplicate keys survive JSON.parse, so this is exactly the case the strict check must catch.
        await input.fill('{"cA":true,"cA":false}');
        await expect(jerError).toContainText('Duplicate key');

        // Every character Core's JerCodec reads as the start of a JER value gets the same check.
        for (const malformed of ['[1,', '"unterminated', '-']) {
            await input.fill('{}');
            await expect(jerError).toHaveCount(0);
            await input.fill(malformed);
            await expect(jerError).toBeVisible();
        }

        await input.fill('{"cA":true,"pathLenConstraint":0}');
        await expect(jerError).toHaveCount(0);
    });

    test('a DER-mapped String attribute still gets a textarea, since a JER value needs room', async ({ mount, page }) => {
        const { hint } = await mountField(mount, page, '2.5.29.19', 'string');

        await expect(page.locator(`textarea[id="${FIELD}"]`)).toBeVisible();
        await expect(hint).toBeVisible();
    });

    test('a value not starting with {, [, " or - is read as base64 DER and never JSON-validated', async ({ mount, page }) => {
        const { input, jerError } = await mountField(mount, page, '2.5.29.19');

        await input.fill('MAMBAf8=');
        await expect(jerError).toHaveCount(0);
    });

    test('a DER extension without a module asks for base64 DER and refuses a JER value', async ({ mount, page }) => {
        const { input, hint, jerError } = await mountField(mount, page, '2.5.29.101');

        await expect(hint).toContainText('base64-encoded DER');
        await expect(hint).toContainText('no ASN.1 module');

        await input.fill('{"cA":true}');
        await expect(jerError).toContainText('no ASN.1 module, so its value must be base64-encoded DER');

        await input.fill('MAMBAf8=');
        await expect(jerError).toHaveCount(0);
    });

    test('a custom extension whose entry could not be read says so, offers a retry and checks nothing', async ({ mount, page }) => {
        const { input, hint, jerError, detailError } = await mountField(mount, page, '1.3.6.1.4.1.99999.2');

        await expect(detailError).toContainText('Failed to load OID entry (503)');
        await expect(detailError).toContainText('1.3.6.1.4.1.99999.2 is not checked here');
        await expect(detailError.getByRole('button', { name: 'Retry' })).toBeVisible();
        await expect(hint).toHaveCount(0);

        await input.fill('{not json at all');
        await expect(jerError).toHaveCount(0);
    });

    test('a custom DER extension takes JER when its detail carries a module', async ({ mount, page }) => {
        const { input, hint, jerError } = await mountField(mount, page, '1.3.6.1.4.1.99999.1');

        await expect(hint).toContainText('in JER (X.697)');
        await input.fill('{"cA":true,"cA":false}');
        await expect(jerError).toContainText('Duplicate key');
    });

    test('an extension with a string encoding gets no DER treatment, since { is literal text there', async ({ mount, page }) => {
        const { input, hint, jerError } = await mountField(mount, page, '2.5.29.100');

        await expect(input).toBeVisible();
        await expect(hint).toHaveCount(0);

        await input.fill('{not json at all');
        await expect(jerError).toHaveCount(0);
    });
});
