import { test, expect } from '../../../../../playwright/ct-test';
import type { Page } from '@playwright/test';
import RaProfileFormCreateWithStore from './RaProfileFormCreateWithStore';

// End-to-end-ish coverage of the create-mode orchestration: authoring request attributes while
// creating an RA profile drives a create → request-attributes PATCH → redirect chain that lives in
// the component. The store is instrumented in RaProfileFormCreateWithStore — captured actions assert
// what was dispatched, and window.__raProfileStore__ lets the test stand in for the (epic-less) create
// outcome. The authority is pre-selected via the form's `authorityId` prop.

type CapturedAction = { type: string; payload?: Record<string, unknown> };

async function capturedActions(page: Page): Promise<CapturedAction[]> {
    return page.evaluate(() => (window as unknown as { __raProfileActions__: CapturedAction[] }).__raProfileActions__ ?? []);
}

async function dispatchToStore(page: Page, action: CapturedAction): Promise<void> {
    await page.evaluate(
        (a) => (window as unknown as { __raProfileStore__: { dispatch: (x: unknown) => void } }).__raProfileStore__.dispatch(a),
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
    await page.getByRole('button', { name: 'Save' }).click();
    await expect(page.getByTestId('request-attribute-authoring-attribute-row')).toHaveCount(1);
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

    test('hides the merge-mode selector and value-source bindings section', async ({ mount, page }) => {
        const component = await mount(<RaProfileFormCreateWithStore />);

        await page.getByRole('tab', { name: 'Request Attributes' }).click();

        // Editor is mounted (authority pre-selected) — so an absent section is a genuine hide, not an unmounted editor.
        await expect(component.getByTestId('request-attribute-authoring-attributes-empty')).toBeVisible();
        await expect(page.getByTestId('request-attribute-authoring-merge-mode')).toHaveCount(0);
        await expect(page.getByTestId('request-attribute-authoring-bindings')).toHaveCount(0);
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
        expect(actions.some((a) => a.type === 'raProfileRequestAttributes/updateRaProfileRequestAttributes')).toBe(false);
    });

    test('authored attributes: create defers redirect and chains the request-attributes PATCH', async ({ mount, page }) => {
        await mount(<RaProfileFormCreateWithStore />);

        await fillName(page, 'ProfileWithAttrs');
        await authorAttribute(page, 'serverFqdn', 'Server FQDN');

        await page.getByTestId('progress-button').click();

        const create = (await capturedActions(page)).find((a) => a.type === 'raprofiles/createRaProfile');
        expect(create?.payload?.deferRedirect).toBe(true);

        // Stand in for the create epic's success: this flips isCreating true -> false, which fires the
        // component's finish-hook that dispatches the request-attributes PATCH using the returned UUID.
        await dispatchToStore(page, {
            type: 'raprofiles/createRaProfileSuccess',
            payload: { uuid: 'created-uuid', authorityInstanceUuid: 'auth-1' },
        });

        await expect
            .poll(async () =>
                (await capturedActions(page)).find((a) => a.type === 'raProfileRequestAttributes/updateRaProfileRequestAttributes'),
            )
            .toBeTruthy();

        const patch = (await capturedActions(page)).find((a) => a.type === 'raProfileRequestAttributes/updateRaProfileRequestAttributes');
        expect(patch?.payload?.raProfileUuid).toBe('created-uuid');
        expect(patch?.payload?.authorityUuid).toBe('auth-1');
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
        expect((await capturedActions(page)).some((a) => a.type === 'raProfileRequestAttributes/updateRaProfileRequestAttributes')).toBe(
            false,
        );
    });
});
