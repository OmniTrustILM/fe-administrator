import { test, expect } from '../../../../../playwright/ct-test';
import type { Page } from '@playwright/test';
import { testInitialState } from 'ducks/test-reducers';
import RaProfileFormCreateWithStore from './RaProfileFormCreateWithStore';

// End-to-end-ish coverage of the create-mode orchestration: authoring request attributes while
// creating an RA profile drives a create → request-attributes PATCH → redirect chain that lives in
// the component. The store is instrumented in RaProfileFormCreateWithStore — captured actions assert
// what was dispatched, and window.__raProfileStore__ lets the test stand in for the (epic-less) create
// outcome. The authority is pre-selected via the form's `authorityId` prop.

// An authority connector's own RA-profile attributes: a read-only info box plus a required field.
const connectorDescriptors = [
    {
        uuid: 'info-uuid',
        name: 'info_raProfileGuidance',
        type: 'info',
        contentType: 'text',
        content: [{ data: 'Choosing a certificate template' }],
        properties: { label: 'Template guidance', visible: true, required: false, readOnly: true, list: false, multiSelect: false },
    },
    {
        uuid: 'template-uuid',
        name: 'raprofile_template_name',
        type: 'data',
        contentType: 'string',
        properties: { label: 'Certificate template', visible: true, required: true, readOnly: false, list: false, multiSelect: false },
    },
];

type CapturedAction = { type: string; payload?: Record<string, unknown> };

async function capturedActions(page: Page): Promise<CapturedAction[]> {
    return page.evaluate(() => (globalThis as unknown as { __raProfileActions__: CapturedAction[] }).__raProfileActions__ ?? []);
}

async function dispatchToStore(page: Page, action: CapturedAction): Promise<void> {
    await page.evaluate(
        (a) => (globalThis as unknown as { __raProfileStore__: { dispatch: (x: unknown) => void } }).__raProfileStore__.dispatch(a),
        action,
    );
}

async function fillName(page: Page, value: string): Promise<void> {
    // TextInput is readonly until focused (anti-autofill), so click before fill.
    await page.locator('#name').click();
    await page.locator('#name').fill(value);
}

async function authorAttribute(page: Page, name: string, label: string): Promise<void> {
    await page.getByRole('tab', { name: 'Request Attributes' }).click();
    await page.getByTestId('request-attribute-authoring-attribute-add').click();
    await page.locator('#ra-attr-name').click();
    await page.locator('#ra-attr-name').fill(name);
    await page.locator('#ra-attr-label').click();
    await page.locator('#ra-attr-label').fill(label);
    // A definition must carry a mapping target; SAN/dNSName needs no OID options wired into the store.
    await page.getByTestId('select-ra-attr-mapping-trigger').click();
    await page.getByRole('option', { name: 'Subject Alternative Name' }).click();
    await page.getByTestId('select-ra-attr-general-name-type-trigger').click();
    await page.getByRole('option', { name: 'dNSName' }).click();
    await page.getByRole('button', { name: 'Save' }).click();
    await expect(page.getByTestId('request-attribute-authoring-attribute-row')).toHaveCount(1);
}

const PATCH_ACTION = 'raProfileRequestAttributes/updateRaProfileRequestAttributes';

async function authorMergeWithBinding(page: Page, attributeName: string): Promise<void> {
    await page.getByRole('tab', { name: 'Request Attributes' }).click();
    await page.getByTestId('request-attribute-authoring-merge-merge').click();
    await page.getByTestId('request-attribute-authoring-binding-add').click();
    await page.locator('#ra-binding-name').click();
    await page.locator('#ra-binding-name').fill(attributeName);
    await page.getByRole('button', { name: 'Save' }).click();
    await expect(page.getByTestId('request-attribute-authoring-binding-row')).toHaveCount(1);
}

/** Submits the form, stands in for the create epic's success and returns the follow-up request-attributes PATCH. */
async function createAndAwaitPatch(page: Page): Promise<CapturedAction | undefined> {
    await page.getByTestId('progress-button').click();

    const create = (await capturedActions(page)).find((a) => a.type === 'raprofiles/createRaProfile');
    expect(create?.payload?.deferRedirect).toBe(true);

    // Flipping isCreating true -> false fires the component's finish-hook, which dispatches the
    // request-attributes PATCH using the returned UUID.
    await dispatchToStore(page, {
        type: 'raprofiles/createRaProfileSuccess',
        payload: { uuid: 'created-uuid', authorityInstanceUuid: 'auth-1' },
    });
    await expect.poll(async () => (await capturedActions(page)).some((a) => a.type === PATCH_ACTION)).toBe(true);

    return (await capturedActions(page)).find((a) => a.type === PATCH_ACTION);
}

test.describe('RaProfileForm (create mode) request-attributes chain', () => {
    test('renders the request-attributes editor in create mode with a pre-selected authority', async ({ mount, page }) => {
        const component = await mount(<RaProfileFormCreateWithStore />);

        await page.getByRole('tab', { name: 'Request Attributes' }).click();

        // Authority pre-selected → no "select an authority" hint, editor enabled for authoring.
        await expect(component.getByText('Select an authority to configure request attributes.')).toHaveCount(0);
        await expect(component.getByTestId('request-attribute-authoring-attributes-empty')).toBeVisible();
        await expect(component.getByTestId('request-attribute-authoring-attribute-add')).toBeEnabled();
    });

    test('shows the merge-mode selector, defaulting to Static only, and the value-source bindings section', async ({ mount, page }) => {
        const component = await mount(<RaProfileFormCreateWithStore />);

        await page.getByRole('tab', { name: 'Request Attributes' }).click();

        await expect(component.getByTestId('request-attribute-authoring-attributes-empty')).toBeVisible();
        const mergeMode = page.getByTestId('request-attribute-authoring-merge-mode');
        await expect(mergeMode).toBeVisible();
        await expect(mergeMode.getByRole('radio', { name: /Static only/ })).toBeChecked();
        await expect(page.getByTestId('request-attribute-authoring-bindings-empty')).toBeVisible();
    });

    test('a chosen merge mode and value-source binding count as authored and ride the follow-up PATCH', async ({ mount, page }) => {
        await mount(<RaProfileFormCreateWithStore />);

        await fillName(page, 'ProfileWithBinding');
        await authorMergeWithBinding(page, 'datacenter');

        const patch = await createAndAwaitPatch(page);
        expect(patch?.payload?.data).toMatchObject({
            mergeMode: 'merge',
            valueSourceBindings: [{ attributeName: 'datacenter', valueSourceType: 'none' }],
        });
    });

    test('attribute tabs are disabled until an authority is selected', async ({ mount, page }) => {
        await mount(<RaProfileFormCreateWithStore authorityId="" />);

        await expect(page.getByRole('tab', { name: 'Connector Attributes' })).toBeDisabled();
        await expect(page.getByRole('tab', { name: 'Custom Attributes' })).toBeDisabled();
        await expect(page.getByRole('tab', { name: 'Request Attributes' })).toBeDisabled();
    });

    test('empty request-attributes tab: create dispatches with no defer and no follow-up PATCH', async ({ mount, page }) => {
        await mount(<RaProfileFormCreateWithStore />);

        await fillName(page, 'ProfileNoAttrs');
        await expect(page.getByTestId('progress-button')).toBeEnabled();
        await page.getByTestId('progress-button').click();

        const actions = await capturedActions(page);
        const create = actions.find((a) => a.type === 'raprofiles/createRaProfile');
        expect(create).toBeTruthy();
        expect(create?.payload?.deferRedirect).toBe(false);
        // No authored attributes → the chain must not fire the request-attributes PATCH.
        expect(actions.some((a) => a.type === PATCH_ACTION)).toBe(false);
    });

    test('authored attributes: create defers redirect and chains the request-attributes PATCH', async ({ mount, page }) => {
        await mount(<RaProfileFormCreateWithStore />);

        await fillName(page, 'ProfileWithAttrs');
        await authorAttribute(page, 'serverFqdn', 'Server FQDN');

        const patch = await createAndAwaitPatch(page);
        expect(patch?.payload?.raProfileUuid).toBe('created-uuid');
        expect(patch?.payload?.authorityUuid).toBe('auth-1');
    });

    // A connector that supplies its own RA-profile attributes (an info guidance box plus a required
    // field) is the shape the create modal actually runs in. Covers the whole chain in that shape:
    // authoring only a merge mode and a binding must still submit, and a rejected follow-up PATCH must
    // still release the modal rather than leave it open with the profile already created.
    test('with connector attributes present, a merge-mode-only set still creates and settles on a rejected PATCH', async ({
        mount,
        page,
    }) => {
        await mount(
            <RaProfileFormCreateWithStore
                preloadedState={{
                    authorities: { ...testInitialState.authorities, raProfileAttributeDescriptors: connectorDescriptors } as never,
                }}
            />,
        );

        await fillName(page, 'ProfileWithConnectorAttrs');

        await page.getByRole('tab', { name: 'Connector Attributes' }).click();
        const template = page.getByTestId('text-input-__attributes__ra-profile__.raprofile_template_name');
        await expect(template).toBeVisible({ timeout: 15000 });
        await template.click();
        await template.fill('Roman');

        await authorMergeWithBinding(page, 'info_raProfileGuidance');

        await expect(page.getByTestId('progress-button')).toBeEnabled();
        await createAndAwaitPatch(page);

        // Core rejecting the set must not strand the modal: the chain redirects on the PATCH's own finish.
        await dispatchToStore(page, {
            type: 'raProfileRequestAttributes/updateRaProfileRequestAttributesFailure',
            payload: { error: 'rejected by core' },
        });
        await expect.poll(async () => (await capturedActions(page)).some((a) => a.type === 'appRedirect/redirect')).toBe(true);
    });

    test('create failure releases the lock so the user can retry from the open form', async ({ mount, page }) => {
        await mount(<RaProfileFormCreateWithStore />);

        await fillName(page, 'ProfileFails');
        await authorAttribute(page, 'serverFqdn', 'Server FQDN');

        await page.getByTestId('progress-button').click();
        // The create lock is engaged while the chain is in flight.
        await expect(page.getByTestId('progress-button')).toBeDisabled();

        // Stand in for the create epic's failure: the finish-hook must release the lock.
        await dispatchToStore(page, { type: 'raprofiles/createRaProfileFailure', payload: { error: 'boom' } });

        await expect(page.getByTestId('progress-button')).toBeEnabled();
        // Failed create → the request-attributes PATCH must never have fired.
        expect((await capturedActions(page)).some((a) => a.type === PATCH_ACTION)).toBe(false);
    });
});

const UPDATE_PROFILE_ACTION = 'raprofiles/updateRaProfile';

const editModeState = {
    authorities: { ...testInitialState.authorities, authorities: [{ uuid: 'auth-1', name: 'Authority One' }] },
    raprofiles: {
        ...testInitialState.raprofiles,
        raProfile: {
            uuid: 'profile-1',
            name: 'BoundProfile',
            description: '',
            enabled: true,
            authorityInstanceUuid: 'auth-1',
            attributes: [],
            customAttributes: [],
            certificateRequestAttributes: {
                requestAttributes: [],
                mergeMode: 'merge',
                valueSourceBindings: [{ attributeName: 'datacenter', valueSourceType: 'none' }],
            },
        },
    },
};

async function changeMergeModeAndSave(page: Page): Promise<void> {
    await page.getByRole('tab', { name: 'Request Attributes' }).click();
    await page.getByTestId('request-attribute-authoring-merge-staticOnly').click();
    await expect(page.getByTestId('progress-button')).toBeEnabled();
    await page.getByTestId('progress-button').click();
    await expect.poll(async () => (await capturedActions(page)).some((a) => a.type === PATCH_ACTION)).toBe(true);
}

test.describe('RaProfileForm (edit mode) save chain', () => {
    test('saves the request attributes first and the profile only after Core accepts them', async ({ mount, page }) => {
        await mount(<RaProfileFormCreateWithStore raProfileId="profile-1" preloadedState={editModeState} />);

        await changeMergeModeAndSave(page);

        const patch = (await capturedActions(page)).find((a) => a.type === PATCH_ACTION);
        expect(patch?.payload?.raProfileUuid).toBe('profile-1');
        expect(patch?.payload?.data).toMatchObject({
            mergeMode: 'staticOnly',
            valueSourceBindings: [{ attributeName: 'datacenter', valueSourceType: 'none' }],
        });
        expect((await capturedActions(page)).some((a) => a.type === UPDATE_PROFILE_ACTION)).toBe(false);

        await dispatchToStore(page, { type: 'raProfileRequestAttributes/updateRaProfileRequestAttributesSuccess', payload: {} });

        await expect.poll(async () => (await capturedActions(page)).some((a) => a.type === UPDATE_PROFILE_ACTION)).toBe(true);
        const update = (await capturedActions(page)).find((a) => a.type === UPDATE_PROFILE_ACTION);
        expect(update?.payload?.profileUuid).toBe('profile-1');
    });

    test('a rejected PATCH withholds the profile save and leaves the form open for a retry', async ({ mount, page }) => {
        await mount(<RaProfileFormCreateWithStore raProfileId="profile-1" preloadedState={editModeState} />);

        await changeMergeModeAndSave(page);
        await dispatchToStore(page, {
            type: 'raProfileRequestAttributes/updateRaProfileRequestAttributesFailure',
            payload: { error: 'rejected by core' },
        });

        await expect(page.getByTestId('progress-button')).toBeEnabled();
        expect((await capturedActions(page)).some((a) => a.type === UPDATE_PROFILE_ACTION)).toBe(false);
    });
});
