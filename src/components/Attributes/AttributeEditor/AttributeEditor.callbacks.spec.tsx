import { test, expect } from '../../../../playwright/ct-test';
import { AttributeEditorCallbackHarness } from './AttributeEditorCallbackHarness';
import type { DataAttributeModel, GroupAttributeModel, AttributeDescriptorModel } from 'types/attributes';
import { AttributeContentType, AttributeType } from 'types/openapi';

const ID = 'cb';

function data(name: string, overrides: Partial<DataAttributeModel> = {}): DataAttributeModel {
    return {
        type: AttributeType.Data,
        name,
        uuid: `uuid-${name}`,
        contentType: AttributeContentType.String,
        properties: { label: name, required: false, readOnly: false, visible: true, list: false, multiSelect: false },
        ...overrides,
    } as DataAttributeModel;
}

/** A Data descriptor whose NG callback depends on the named attributes. */
function ng(name: string, dependsOn: string[], overrides: Partial<DataAttributeModel> = {}): DataAttributeModel {
    return data(name, { attributeCallback: { mappings: [], dependsOn } as any, ...overrides });
}

/** A Data descriptor with a legacy mapping callback. */
function legacy(name: string, from: string): DataAttributeModel {
    return data(name, {
        attributeCallback: { callbackContext: 'core/cb', callbackMethod: 'GET', mappings: [{ from, to: 'p', targets: [] }] } as any,
    });
}

test.describe('AttributeEditor NG dependsOn callbacks', () => {
    test('fires when all named attrs get values, and re-fires on change (AC-1)', async ({ mount, page }) => {
        const descriptors: AttributeDescriptorModel[] = [data('a'), ng('dep', ['a'])];
        const c = await mount(
            <AttributeEditorCallbackHarness
                id={ID}
                attributeDescriptors={descriptors}
                connectorUuid="conn-1"
                functionGroupCode="authorityProvider"
                kind="k"
                actions={[
                    { label: 'setA1', sets: [{ name: 'a', value: { label: 'A1', value: { data: 'a1' } } }] },
                    { label: 'setA2', sets: [{ name: 'a', value: { label: 'A2', value: { data: 'a2' } } }] },
                ]}
            />,
        );
        await c.getByTestId('set-setA1').click();
        await expect(page.getByTestId('callback')).toHaveCount(1, { timeout: 4000 });
        await expect(page.getByTestId('callback').first()).toHaveAttribute('data-callback-id', `__attributes__${ID}__.dep`);

        // release the in-flight gate, then change the dependency -> re-fire
        await c.getByTestId('resolve-all').click();
        await c.getByTestId('set-setA2').click();
        await expect(page.getByTestId('callback')).toHaveCount(2, { timeout: 4000 });
    });

    test('payload carries only dependsOn-named raw content (AC-2)', async ({ mount, page }) => {
        const descriptors: AttributeDescriptorModel[] = [data('a'), data('other'), ng('dep', ['a'])];
        const c = await mount(
            <AttributeEditorCallbackHarness
                id={ID}
                attributeDescriptors={descriptors}
                connectorUuid="conn-1"
                functionGroupCode="authorityProvider"
                kind="k"
                actions={[
                    {
                        label: 'fill',
                        sets: [
                            { name: 'a', value: { label: 'A', value: { reference: 'r', data: 'a-val' } } },
                            { name: 'other', value: { label: 'O', value: { data: 'secret-other' } } },
                        ],
                    },
                ]}
            />,
        );
        await c.getByTestId('set-fill').click();
        await expect(page.getByTestId('callback')).toHaveCount(1, { timeout: 4000 });
        const payloadText = await page.getByTestId('callback').first().textContent();
        expect(payloadText).toContain('a-val');
        expect(payloadText).not.toContain('secret-other');
        expect(payloadText).not.toContain('pathVariable');
    });

    test('dependsOn:[] fires once on mount (AC-1 mount path)', async ({ mount, page }) => {
        const descriptors: AttributeDescriptorModel[] = [ng('dep', [])];
        await mount(
            <AttributeEditorCallbackHarness
                id={ID}
                attributeDescriptors={descriptors}
                connectorUuid="conn-1"
                functionGroupCode="authorityProvider"
                kind="k"
            />,
        );
        await expect(page.getByTestId('callback')).toHaveCount(1, { timeout: 4000 });
        // give the debounce a beat to confirm it does not fire a second time
        await page.waitForTimeout(900);
        await expect(page.getByTestId('callback')).toHaveCount(1);
    });

    test('cleared dependency does not fire and resets the dependent (AC-1)', async ({ mount, page }) => {
        const descriptors: AttributeDescriptorModel[] = [data('a'), ng('dep', ['a'])];
        const c = await mount(
            <AttributeEditorCallbackHarness
                id={ID}
                attributeDescriptors={descriptors}
                connectorUuid="conn-1"
                functionGroupCode="authorityProvider"
                kind="k"
                watchField="dep"
                actions={[
                    { label: 'setA', sets: [{ name: 'a', value: { label: 'A', value: { data: 'a1' } } }] },
                    // Give the dependent its own content (as a prior callback result would).
                    { label: 'setDep', sets: [{ name: 'dep', value: { label: 'D', value: { data: 'dep-value' } } }] },
                    { label: 'clearA', sets: [{ name: 'a', value: '' }] },
                ]}
            />,
        );
        await c.getByTestId('set-setA').click();
        await expect(page.getByTestId('callback')).toHaveCount(1, { timeout: 4000 });
        await c.getByTestId('resolve-all').click();

        // Populate the dependent's content, then confirm it is held.
        await c.getByTestId('set-setDep').click();
        await expect(page.getByTestId('watched')).toHaveAttribute('data-empty', 'false', { timeout: 4000 });

        await c.getByTestId('set-clearA').click();
        // (a) No new callback fires on a cleared dependency.
        await page.waitForTimeout(900);
        await expect(page.getByTestId('callback')).toHaveCount(1);
        // (b) The dependent's own content is reset locally (load-bearing: fails if the
        // setValue('<dep>', undefined) reset line is removed from production).
        await expect(page.getByTestId('watched')).toHaveAttribute('data-empty', 'true');
    });

    test('cascade: callback A drives B (B dependsOn:[A]) is NOT suppressed by isRunningCb (AC-7)', async ({ mount, page }) => {
        // a is a plain input; b depends on a (control B). When a callback is in flight on
        // control "depA" (b's own id), the OLD whole-gate bypass would have dropped B's fire
        // if any callback were running. With per-callbackId gating, B fires.
        const descriptors: AttributeDescriptorModel[] = [
            data('a'),
            ng('depA', ['a']), // control A's NG callback, keyed __..depA
            ng('depB', ['a']), // control B's NG callback, keyed __..depB
        ];
        const c = await mount(
            <AttributeEditorCallbackHarness
                id={ID}
                attributeDescriptors={descriptors}
                connectorUuid="conn-1"
                functionGroupCode="authorityProvider"
                kind="k"
                actions={[{ label: 'setA', sets: [{ name: 'a', value: { label: 'A', value: { data: 'a1' } } }] }]}
            />,
        );
        await c.getByTestId('set-setA').click();
        // Both depA and depB must fire from the single change to 'a' — neither suppresses the other.
        await expect(page.getByTestId('callback')).toHaveCount(2, { timeout: 4000 });
        const ids = await page.getByTestId('callback').evaluateAll((nodes) => nodes.map((n) => n.getAttribute('data-callback-id')));
        expect(ids).toContain(`__attributes__${ID}__.depA`);
        expect(ids).toContain(`__attributes__${ID}__.depB`);
    });

    test('both-present tiebreak: descriptor with mappings AND dependsOn dispatches NG only (AC-3 tiebreak)', async ({ mount, page }) => {
        const both = data('dep', {
            attributeCallback: {
                callbackContext: 'core/legacy',
                callbackMethod: 'GET',
                mappings: [{ from: 'a', to: 'p', targets: [] }],
                dependsOn: ['a'],
            } as any,
        });
        const descriptors: AttributeDescriptorModel[] = [data('a'), both];
        const c = await mount(
            <AttributeEditorCallbackHarness
                id={ID}
                attributeDescriptors={descriptors}
                connectorUuid="conn-1"
                functionGroupCode="authorityProvider"
                kind="k"
                actions={[{ label: 'setA', sets: [{ name: 'a', value: { label: 'A', value: { data: 'a1' } } }] }]}
            />,
        );
        await c.getByTestId('set-setA').click();
        // Exactly one dispatch (NG), never two; payload carries attributes, not maps.
        await expect(page.getByTestId('callback')).toHaveCount(1, { timeout: 4000 });
        const payloadText = await page.getByTestId('callback').first().textContent();
        expect(payloadText).toContain('"attributes"');
        expect(payloadText).not.toContain('pathVariable');
    });

    test('legacy mapping callback still fires via the old path (AC-3 regression)', async ({ mount, page }) => {
        const descriptors: AttributeDescriptorModel[] = [data('a'), legacy('dep', 'a')];
        const c = await mount(
            <AttributeEditorCallbackHarness
                id={ID}
                attributeDescriptors={descriptors}
                connectorUuid="conn-1"
                functionGroupCode="authorityProvider"
                kind="k"
                actions={[{ label: 'setA', sets: [{ name: 'a', value: { label: 'A', value: { data: 'a1' } } }] }]}
            />,
        );
        await c.getByTestId('set-setA').click();
        await expect(page.getByTestId('callback')).toHaveCount(1, { timeout: 4000 });
        const payloadText = await page.getByTestId('callback').first().textContent();
        // legacy path builds the map-shaped DTO, not the NG attributes array.
        expect(payloadText).toContain('pathVariable');
        expect(payloadText).not.toContain('"attributes"');
    });

    test('runtime-injected GROUP child with already-satisfied dependsOn fires once on injection (AC-7 initial)', async ({
        mount,
        page,
    }) => {
        // 'a' has a value from mount; the dependent NG descriptor is injected via
        // groupAttributesCallbackAttributes (a runtime-injected GROUP child).
        const injected = ng('depGroup', ['a']);
        const descriptors: AttributeDescriptorModel[] = [data('a')];
        await mount(
            <AttributeEditorCallbackHarness
                id={ID}
                attributeDescriptors={descriptors}
                groupAttributesCallbackAttributes={[injected as unknown as GroupAttributeModel]}
                connectorUuid="conn-1"
                functionGroupCode="authorityProvider"
                kind="k"
                initialValues={{ a: { label: 'A', value: { data: 'a1' } } }}
            />,
        );
        await expect(page.getByTestId('callback')).toHaveCount(1, { timeout: 4000 });
        await expect(page.getByTestId('callback').first()).toHaveAttribute('data-callback-id', `__attributes__${ID}__.depGroup`);
    });
});
