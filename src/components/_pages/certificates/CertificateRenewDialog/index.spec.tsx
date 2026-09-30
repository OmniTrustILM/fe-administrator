import type { Page } from '@playwright/test';
import { testInitialState } from 'ducks/test-reducers';
import type { AttributeDescriptorModel } from 'types/attributes';
import type { CertificateRegistrationRequestModel } from 'types/certificate';
import { AttributeContentType, AttributeType, CertificateRegistrationState } from 'types/openapi';
import { expect, test } from '../../../../../playwright/ct-test';
import { CertificateRenewDialogTestWrapper } from './CertificateRenewDialogTestWrapper';

const registerDescriptor: AttributeDescriptorModel = {
    type: AttributeType.Data,
    name: 'registerField',
    uuid: 'register-data-uuid-1',
    contentType: AttributeContentType.String,
    properties: { label: 'Register Field', required: false, readOnly: false, visible: true, list: false, multiSelect: false },
} as AttributeDescriptorModel;

const withRegisterSchema = {
    certificates: { ...testInitialState.certificates, registerAttributes: { 'ra-profile-uuid': [registerDescriptor] } },
};

const dispatchedTypes = async (page: Page): Promise<string[]> =>
    JSON.parse((await page.getByTestId('dispatched').textContent()) ?? '[]').map((action: { type: string }) => action.type);

const renewDescriptor: AttributeDescriptorModel = {
    type: AttributeType.Data,
    name: 'renewField',
    uuid: 'renew-data-uuid-1',
    contentType: AttributeContentType.String,
    properties: { label: 'Renew Field', required: false, readOnly: false, visible: true, list: false, multiSelect: false },
} as AttributeDescriptorModel;

const withRenewSchema = { certificates: { ...testInitialState.certificates, renewAttributes: [renewDescriptor] } };

test.describe('CertificateRenewDialog', () => {
    test('asks for the renew schema of the certificate RA profile', async ({ mount, page }) => {
        await mount(<CertificateRenewDialogTestWrapper />);

        const request = {
            type: 'certificates/getRenewAttributes',
            payload: { raProfileUuid: 'ra-profile-uuid', authorityUuid: 'authority-uuid' },
        };
        const dispatched = async () => JSON.parse((await page.getByTestId('dispatched').textContent()) ?? '[]');
        await expect.poll(dispatched).toContainEqual(request);
        expect(await dispatched()).toContainEqual(request);
    });

    test('an empty schema shows no attribute section and renews with no attributes', async ({ mount, page }) => {
        await mount(<CertificateRenewDialogTestWrapper />);

        await expect(page.getByText('Renew Attributes')).toHaveCount(0);
        await page.getByTestId('renewSubmit').click();

        await expect(page.getByTestId('renew-payload')).not.toBeEmpty();
        const payload = JSON.parse((await page.getByTestId('renew-payload').textContent()) ?? '{}');
        expect(payload.attributes).toEqual([]);
        expect(payload.fileContent).toBeUndefined();
    });

    test('renders the renew schema and sends the entered values with the renewal', async ({ mount, page }) => {
        await mount(<CertificateRenewDialogTestWrapper preloadedState={withRenewSchema} />);

        await expect(page.getByText('Renew Attributes')).toBeVisible();
        const field = page.getByTestId('text-input-__attributes__renew__.renewField');
        await field.click();
        await field.fill('renew-value');
        await page.getByTestId('renewSubmit').click();

        await expect(page.getByTestId('renew-payload')).not.toBeEmpty();
        const payload = JSON.parse((await page.getByTestId('renew-payload').textContent()) ?? '{}');
        expect(payload.attributes).toHaveLength(1);
        expect(payload.attributes[0]).toMatchObject({ name: 'renewField', uuid: 'renew-data-uuid-1', content: [{ data: 'renew-value' }] });
    });

    test('a certificate without an RA profile asks for no schema', async ({ mount, page }) => {
        await mount(
            <CertificateRenewDialogTestWrapper certificate={{ uuid: 'certificate-uuid', privateKeyAvailability: true } as never} />,
        );

        await expect(page.getByTestId('renewSubmit')).toBeVisible();
        const dispatched = JSON.parse((await page.getByTestId('dispatched').textContent()) ?? '[]');
        expect(dispatched.filter((a: { type: string }) => a.type === 'certificates/getRenewAttributes')).toEqual([]);
    });
});

const switchToRegister = async (page: Page) => {
    await page.getByText('Register instead of renewing now').click();
};

test.describe('CertificateRenewDialog — challenge', () => {
    test('a certificate without a registration renews with no challenge input', async ({ mount, page }) => {
        const renewals: unknown[] = [];
        await mount(<CertificateRenewDialogTestWrapper onRenew={(data) => renewals.push(data)} />);

        await expect(page.locator('#renewAuthorizationSecret')).toHaveCount(0);
        await page.getByTestId('renewSubmit').click();

        await expect.poll(() => renewals).toHaveLength(1);
        expect(renewals[0]).toEqual({ fileContent: undefined, authorizationSecret: undefined, attributes: [] });
    });

    test('a Closed registration asks for no challenge', async ({ mount, page }) => {
        await mount(<CertificateRenewDialogTestWrapper registrationState={CertificateRegistrationState.Closed} />);

        await expect(page.locator('#renewAuthorizationSecret')).toHaveCount(0);
        await expect(page.getByTestId('renewSubmit')).toBeEnabled();
    });

    test('an Active registration requires the challenge and sends it as authorizationSecret', async ({ mount, page }) => {
        const renewals: unknown[] = [];
        await mount(
            <CertificateRenewDialogTestWrapper
                registrationState={CertificateRegistrationState.Active}
                onRenew={(data) => renewals.push(data)}
            />,
        );

        const challenge = page.locator('#renewAuthorizationSecret');
        await expect(challenge).toHaveAttribute('type', 'password');
        await expect(page.getByTestId('label-renewAuthorizationSecret').locator('.text-danger')).toBeVisible();
        await expect(page.getByTestId('renewSubmit')).toBeDisabled();

        // No format rule on the verify path: whatever the holder types goes to Core.
        await challenge.fill('short');
        await page.getByTestId('renewSubmit').click();

        await expect.poll(() => renewals).toHaveLength(1);
        expect(renewals[0]).toEqual({ fileContent: undefined, authorizationSecret: 'short', attributes: [] });
    });

    test('a failed renewal keeps the dialog open with the Core message inline', async ({ mount, page }) => {
        await mount(<CertificateRenewDialogTestWrapper registrationState={CertificateRegistrationState.Active} />);

        await page.locator('#renewAuthorizationSecret').fill('wrong-secret');
        await page.getByTestId('renewSubmit').click();
        await page.getByTestId('simulate-renew-failure').click();

        await expect(page.getByTestId('renewDialogError')).toContainText('The certificate registration challenge is invalid.');
        await expect(page.getByTestId('dialog-closed')).toHaveCount(0);
        await expect(page.getByTestId('renewSubmit')).toBeEnabled();
    });

    test('keeps each line of a multi-line Core message on its own line', async ({ mount, page }) => {
        await mount(<CertificateRenewDialogTestWrapper />);

        await page.getByTestId('renewSubmit').click();
        await page.getByTestId('simulate-renew-failure').click();

        await expect(page.getByTestId('renewDialogError').locator('li')).toHaveCSS('white-space', 'pre-line');
    });

    test('cannot be cancelled or switched while a renewal is in flight, and shows progress', async ({ mount, page }) => {
        await mount(<CertificateRenewDialogTestWrapper />);

        await page.getByTestId('renewSubmit').click();

        await expect(page.getByTestId('renewSubmit')).toHaveText('Renewing…');
        await expect(page.getByRole('button', { name: 'Cancel' })).toBeDisabled();
        await expect(page.getByTestId('switch-registerSuccessor-input')).toBeDisabled();
    });

    test('a CSR uploaded before switching to Register is not sent after switching back', async ({ mount, page }) => {
        const renewals: { fileContent?: string }[] = [];
        await mount(<CertificateRenewDialogTestWrapper onRenew={(data) => renewals.push(data)} />);

        await page.getByText('Upload new CSR ?').click();
        await page.locator('textarea').fill('csr-content');
        await switchToRegister(page);
        await switchToRegister(page);
        await page.getByTestId('renewSubmit').click();

        await expect.poll(() => renewals).toHaveLength(1);
        expect(renewals[0].fileContent).toBeUndefined();
    });

    test('a CSR is not sent once the upload switch is turned back off', async ({ mount, page }) => {
        const renewals: { fileContent?: string }[] = [];
        await mount(<CertificateRenewDialogTestWrapper onRenew={(data) => renewals.push(data)} />);

        await page.getByText('Upload new CSR ?').click();
        await page.locator('textarea').fill('csr-content');
        await page.getByText('Upload new CSR ?').click();
        await page.getByTestId('renewSubmit').click();

        await expect.poll(() => renewals).toHaveLength(1);
        expect(renewals[0].fileContent).toBeUndefined();
    });

    test('a confirmed renewal closes the dialog', async ({ mount, page }) => {
        await mount(<CertificateRenewDialogTestWrapper />);

        await page.getByTestId('renewSubmit').click();
        await page.getByTestId('simulate-renew-success').click();

        await expect(page.getByTestId('dialog-closed')).toBeAttached();
    });

    test('clears a stale error when it opens', async ({ mount, page }) => {
        await mount(
            <CertificateRenewDialogTestWrapper
                preloadedState={{ certificates: { ...testInitialState.certificates, renewErrorMessage: 'stale' } }}
            />,
        );

        await expect(page.getByTestId('renewDialogError')).toHaveCount(0);
        await expect.poll(() => dispatchedTypes(page)).toContain('certificates/clearRenewErrors');
    });
});

test.describe('CertificateRenewDialog — Register switch', () => {
    test('hides the CSR upload and previews the CSR attributes of the source', async ({ mount, page }) => {
        await mount(<CertificateRenewDialogTestWrapper />);

        await expect(page.getByTestId('switch-uploadCsr')).toBeVisible();
        await switchToRegister(page);

        await expect(page.getByTestId('switch-uploadCsr')).toHaveCount(0);
        await expect(page.getByTestId('successorIdentity')).toContainText('Common Name');
        await expect(page.getByTestId('successorIdentity')).toContainText('app.example');
        await expect(page.getByTestId('renewSubmit')).toHaveText('Register');
    });

    test('falls back to the subject DN and SANs for a source without CSR attributes', async ({ mount, page }) => {
        await mount(<CertificateRenewDialogTestWrapper identity="flat" />);
        await switchToRegister(page);

        await expect(page.getByTestId('successorIdentity')).toContainText('CN=app.example,O=Example');
        await expect(page.getByTestId('successorIdentity')).toContainText('DNS:app.example');
    });

    test('stages a successor with the replayed identity, the source and the register attributes', async ({ mount, page }) => {
        const registrations: CertificateRegistrationRequestModel[] = [];
        await mount(
            <CertificateRenewDialogTestWrapper preloadedState={withRegisterSchema} onRegister={(request) => registrations.push(request)} />,
        );
        await switchToRegister(page);

        const field = page.getByTestId('text-input-__attributes__register_attributes__.registerField');
        await field.click();
        await field.fill('register-value');
        await page.getByTestId('renewSubmit').click();

        await expect.poll(() => registrations).toHaveLength(1);
        expect(registrations[0]).toMatchObject({
            sourceCertificateUuid: 'source-uuid',
            csrAttributes: [{ uuid: 'cn-uuid', name: 'commonName', content: [{ data: 'app.example' }] }],
            attributes: [{ name: 'registerField', uuid: 'register-data-uuid-1', content: [{ data: 'register-value' }] }],
            // Replayed like Core's own renew does, so a required certificate custom attribute is satisfied.
            customAttributes: [{ uuid: 'custom-uuid', name: 'department', content: [{ data: 'operations' }] }],
        });
        expect(registrations[0].subjectDn).toBeUndefined();
        expect(registrations[0].subjectAltName).toBeUndefined();
        expect(registrations[0].authorizationSecret).toBeUndefined();
        expect(registrations[0].expiresAt).toBeUndefined();
    });

    test('sends the flat identity, and no csrAttributes, for a source without CSR attributes', async ({ mount, page }) => {
        const registrations: CertificateRegistrationRequestModel[] = [];
        await mount(<CertificateRenewDialogTestWrapper identity="flat" onRegister={(request) => registrations.push(request)} />);
        await switchToRegister(page);
        await page.getByTestId('renewSubmit').click();

        await expect.poll(() => registrations).toHaveLength(1);
        expect(registrations[0]).toMatchObject({ subjectDn: 'CN=app.example,O=Example', subjectAltName: 'DNS:app.example' });
        expect(registrations[0].csrAttributes).toBeUndefined();
    });

    test('Register stays disabled when part of the source identity cannot be replayed', async ({ mount, page }) => {
        await mount(
            <CertificateRenewDialogTestWrapper
                certificate={
                    {
                        uuid: 'source-uuid',
                        subjectDn: 'CN=app.example',
                        subjectAlternativeNames: { dNSName: ['app.example'], x400Address: ['x400-address'] },
                        state: 'issued',
                        privateKeyAvailability: true,
                        raProfile: { uuid: 'ra-profile-uuid', name: 'Test RA Profile', authorityInstanceUuid: 'authority-uuid' },
                    } as never
                }
            />,
        );
        await switchToRegister(page);

        await expect(page.getByTestId('successorIdentityNotReplayable')).toContainText('x400Address');
        await expect(page.getByTestId('renewSubmit')).toBeDisabled();
    });

    test('an Active source requires a challenge for the successor', async ({ mount, page }) => {
        await mount(<CertificateRenewDialogTestWrapper registrationState={CertificateRegistrationState.Active} />);
        await switchToRegister(page);

        // The source's own challenge is a renew input; staging asks only for the successor's.
        await expect(page.locator('#renewAuthorizationSecret')).toHaveCount(0);
        await expect(page.getByTestId('label-successorAuthorizationSecret').locator('.text-danger')).toBeVisible();
        await expect(page.getByTestId('renewSubmit')).toBeDisabled();

        await page.locator('#successorAuthorizationSecret').fill('successor-challenge');
        await expect(page.getByTestId('renewSubmit')).toBeEnabled();
    });

    test('an Active source sends the successor its own challenge', async ({ mount, page }) => {
        const registrations: CertificateRegistrationRequestModel[] = [];
        await mount(
            <CertificateRenewDialogTestWrapper
                registrationState={CertificateRegistrationState.Active}
                onRegister={(request) => registrations.push(request)}
            />,
        );
        await switchToRegister(page);

        await page.locator('#successorAuthorizationSecret').fill('successor-challenge');
        await page.getByTestId('renewSubmit').click();

        await expect.poll(() => registrations).toHaveLength(1);
        expect(registrations[0]).toMatchObject({ sourceCertificateUuid: 'source-uuid', authorizationSecret: 'successor-challenge' });
    });

    test('switching back to renew clears the registration error and restores the CSR section', async ({ mount, page }) => {
        await mount(<CertificateRenewDialogTestWrapper />);
        await switchToRegister(page);
        await page.getByTestId('renewSubmit').click();
        await page.getByTestId('simulate-register-failure').click();
        await expect(page.getByTestId('renewDialogError')).toBeVisible();

        await switchToRegister(page);

        await expect(page.getByTestId('renewDialogError')).toHaveCount(0);
        await expect(page.getByTestId('switch-uploadCsr')).toBeVisible();
        await expect(page.getByTestId('renewSubmit')).toHaveText('Renew');
    });

    test('cannot be cancelled while a registration is in flight, and shows progress', async ({ mount, page }) => {
        await mount(<CertificateRenewDialogTestWrapper />);
        await switchToRegister(page);

        await page.getByTestId('renewSubmit').click();

        await expect(page.getByTestId('renewSubmit')).toHaveText('Registering…');
        await expect(page.getByRole('button', { name: 'Cancel' })).toBeDisabled();
    });

    test('the successor challenge follows the registration format', async ({ mount, page }) => {
        await mount(<CertificateRenewDialogTestWrapper />);
        await switchToRegister(page);

        await page.locator('#successorAuthorizationSecret').fill('too-short');
        await page.locator('#successorAuthorizationSecret').blur();

        await expect(page.getByText('Challenge must be 12–255 printable ASCII characters')).toBeVisible();
        await expect(page.getByTestId('renewSubmit')).toBeDisabled();
    });

    test('the issuance window stays disabled until the successor has a challenge, and is sent with it', async ({ mount, page }) => {
        const registrations: CertificateRegistrationRequestModel[] = [];
        await mount(<CertificateRenewDialogTestWrapper onRegister={(request) => registrations.push(request)} />);
        await switchToRegister(page);

        const window = page.locator('#successorExpiresAt');
        await expect(window).toBeDisabled();

        await page.locator('#successorAuthorizationSecret').fill('successor-challenge');
        await expect(window).toBeEnabled();
        // A date from next month satisfies the future-date rule whatever today is.
        await window.dispatchEvent('click');
        await page.getByRole('button', { name: 'Next' }).click();
        await page.getByRole('button', { name: '15', exact: true }).click();
        await expect(window).not.toHaveValue('');
        await page.getByTestId('renewSubmit').click();

        await expect.poll(() => registrations).toHaveLength(1);
        expect(registrations[0].authorizationSecret).toBe('successor-challenge');
        expect(new Date(registrations[0].expiresAt ?? '').getTime()).toBeGreaterThan(Date.now());
    });

    test('a failed registration keeps the dialog open with the Core message inline', async ({ mount, page }) => {
        await mount(<CertificateRenewDialogTestWrapper />);
        await switchToRegister(page);

        await page.getByTestId('renewSubmit').click();
        await page.getByTestId('simulate-register-failure').click();

        await expect(page.getByTestId('renewDialogError')).toContainText('Cannot register a successor of an archived certificate.');
        await expect(page.getByTestId('dialog-closed')).toHaveCount(0);
    });

    test('a confirmed registration closes the dialog', async ({ mount, page }) => {
        await mount(<CertificateRenewDialogTestWrapper />);
        await switchToRegister(page);

        await page.getByTestId('renewSubmit').click();
        await page.getByTestId('simulate-register-success').click();

        await expect(page.getByTestId('dialog-closed')).toBeAttached();
    });
});
