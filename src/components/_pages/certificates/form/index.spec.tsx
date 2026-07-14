import { test, expect } from '../../../../../playwright/ct-test';
import { testInitialState } from 'ducks/test-reducers';
import { CertificateFormTestWrapper } from './CertificateFormTestWrapper';

test.describe('CertificateForm', () => {
    test('defaults to Issue now: key-source select visible, challenge input absent', async ({ mount, page }) => {
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

    test('switching back to Issue now restores the key-source select and hides the challenge input', async ({ mount, page }) => {
        await mount(<CertificateFormTestWrapper />);

        await page.getByTestId('requestType-register').click();
        await expect(page.getByTestId('authorizationSecret')).toBeVisible();

        await page.getByTestId('requestType-issue').click();

        await expect(page.getByTestId('keySource')).toBeVisible();
        await expect(page.getByTestId('authorizationSecret')).toHaveCount(0);
    });

    test('Issue now mode shows both the Connector Attributes and Custom Attributes tabs', async ({ mount, page }) => {
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
});
