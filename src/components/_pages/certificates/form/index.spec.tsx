import { test, expect } from '../../../../../playwright/ct-test';
import { testInitialState } from 'ducks/test-reducers';
import type { AttributeDescriptorModel } from 'types/attributes';
import { AttributeContentType, AttributeType } from 'types/openapi';
import { CertificateFormTestWrapper } from './CertificateFormTestWrapper';

const csrDataDescriptor: AttributeDescriptorModel = {
    type: AttributeType.Data,
    name: 'dataField',
    uuid: 'csr-data-uuid-1',
    contentType: AttributeContentType.String,
    properties: { label: 'Data Field', required: false, readOnly: false, visible: true, list: false, multiSelect: false },
} as AttributeDescriptorModel;

// A selectable RA Profile: raProfileOptions filters to profiles that carry an authorityInstanceUuid.
const selectableRaProfile = {
    uuid: 'ra-1',
    name: 'RA One',
    authorityInstanceUuid: 'auth-1',
    enabled: true,
} as any;

test.describe('CertificateForm', () => {
    test('request mode radio is labelled "Request now"', async ({ mount, page }) => {
        await mount(<CertificateFormTestWrapper />);

        await expect(page.getByTestId('requestType-issue')).toHaveText('Request now');
    });

    test('defaults to Request mode: key-source select visible, challenge input absent', async ({ mount, page }) => {
        await mount(<CertificateFormTestWrapper />);

        await expect(page.getByTestId('keySource')).toBeVisible();
        await expect(page.getByTestId('authorizationSecret')).toHaveCount(0);
    });

    test('switching to Pre-register hides key-source select and shows the challenge input', async ({ mount, page }) => {
        await mount(<CertificateFormTestWrapper />);

        await page.getByTestId('requestType-register').click();

        await expect(page.getByTestId('keySource')).toHaveCount(0);
        await expect(page.getByTestId('authorizationSecret')).toBeVisible();
    });

    test('Challenge input is masked (write-only) and required in Pre-register mode', async ({ mount, page }) => {
        await mount(<CertificateFormTestWrapper />);

        await page.getByTestId('requestType-register').click();

        const challengeInput = page.getByTestId('authorizationSecret');
        await expect(challengeInput).toHaveAttribute('type', 'password');

        // Required indicator (red star) is rendered next to the Challenge label in register mode.
        await expect(page.getByTestId('label-authorizationSecret')).toContainText('Challenge');
        await expect(page.getByTestId('label-authorizationSecret').locator('.text-red-500')).toBeVisible();
    });

    test('switching back to Request mode restores the key-source select and hides the challenge input', async ({ mount, page }) => {
        await mount(<CertificateFormTestWrapper />);

        await page.getByTestId('requestType-register').click();
        await expect(page.getByTestId('authorizationSecret')).toBeVisible();

        await page.getByTestId('requestType-issue').click();

        await expect(page.getByTestId('keySource')).toBeVisible();
        await expect(page.getByTestId('authorizationSecret')).toHaveCount(0);
    });

    test('Request mode shows both the Connector Attributes and Custom Attributes tabs', async ({ mount, page }) => {
        await mount(<CertificateFormTestWrapper />);

        await expect(page.getByRole('tab', { name: 'Connector Attributes' })).toBeVisible();
        await expect(page.getByRole('tab', { name: 'Custom Attributes' })).toBeVisible();
    });

    test('Pre-register mode hides the Connector Attributes tab (its input is discarded on submit) but keeps Custom Attributes', async ({
        mount,
        page,
    }) => {
        await mount(<CertificateFormTestWrapper />);

        await page.getByTestId('requestType-register').click();

        await expect(page.getByRole('tab', { name: 'Connector Attributes' })).toHaveCount(0);
        await expect(page.getByRole('tab', { name: 'Custom Attributes' })).toBeVisible();
    });

    test('an in-flight registration disables Cancel and puts Create in its progress state (no duplicate submit)', async ({
        mount,
        page,
    }) => {
        // Register and issue are separate non-idempotent flows; while either is in flight the form must
        // disable its controls. Here the register flag is set, which the issue flag alone would have missed.
        await mount(
            <CertificateFormTestWrapper
                preloadedState={{
                    certificates: { ...testInitialState.certificates, isRegistering: true },
                }}
            />,
        );

        await expect(page.getByRole('button', { name: 'Cancel' })).toBeDisabled();
        const createButton = page.getByRole('button', { name: 'Creating' });
        await expect(createButton).toBeVisible();
        await expect(createButton).toBeDisabled();
    });

    test('Request Attributes tab shows the hint (no fields) when no RA Profile is selected', async ({ mount, page }) => {
        await mount(<CertificateFormTestWrapper />);

        await page.getByTestId('requestType-register').click();

        await expect(page.getByRole('tab', { name: 'Request Attributes' })).toBeVisible();
        const hint = page.getByTestId('csrAttributes-hint');
        await expect(hint).toBeVisible();
        await expect(hint).toContainText('Select an RA Profile to see its request attributes.');
        await expect(page.getByTestId('text-input-__attributes__csrAttributes__.dataField')).toHaveCount(0);
    });

    test('Request Attributes tab renders the resolved descriptors as fields (hint gone) when present', async ({ mount, page }) => {
        await mount(
            <CertificateFormTestWrapper
                preloadedState={{
                    certificates: { ...testInitialState.certificates, csrAttributeDescriptors: [csrDataDescriptor] },
                }}
            />,
        );

        await page.getByTestId('requestType-register').click();

        await expect(page.getByTestId('text-input-__attributes__csrAttributes__.dataField')).toBeVisible({ timeout: 15000 });
        await expect(page.getByTestId('csrAttributes-hint')).toHaveCount(0);
    });

    test('Request Attributes tab shows a loading affordance (not the select-a-profile hint) while descriptors are being fetched', async ({
        mount,
        page,
    }) => {
        await mount(
            <CertificateFormTestWrapper
                preloadedState={{
                    certificates: { ...testInitialState.certificates, isFetchingCsrAttributes: true },
                }}
            />,
        );

        await page.getByTestId('requestType-register').click();

        // While the per-profile fetch is in flight the misleading "Select an RA Profile" hint must not show.
        await expect(page.getByTestId('csrAttributes-loading')).toBeVisible();
        await expect(page.getByTestId('csrAttributes-hint')).toHaveCount(0);
        await expect(page.getByTestId('text-input-__attributes__csrAttributes__.dataField')).toHaveCount(0);
    });

    test('selecting an RA Profile that resolves to no attributes shows the empty message, not the select-a-profile hint', async ({
        mount,
        page,
    }) => {
        await mount(
            <CertificateFormTestWrapper
                preloadedState={{
                    raprofiles: { ...testInitialState.raprofiles, raProfiles: [selectableRaProfile] },
                }}
            />,
        );

        await page.getByTestId('requestType-register').click();

        // Before selection: the hint prompting for a profile.
        await expect(page.getByTestId('csrAttributes-hint')).toBeVisible();

        // Select the RA Profile — drives onRaProfileChange and the RHF-watched selection.
        await page.getByTestId('select-raProfile-trigger').click();
        await page.getByRole('option', { name: 'RA One' }).click();

        // A profile is now selected but resolves to zero attributes: the message must distinguish this
        // from "no profile selected" rather than keep telling the user to pick a profile.
        await expect(page.getByTestId('csrAttributes-empty')).toBeVisible();
        await expect(page.getByTestId('csrAttributes-empty')).toContainText('This RA Profile has no request attributes.');
        await expect(page.getByTestId('csrAttributes-hint')).toHaveCount(0);
    });
});
