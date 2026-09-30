import type { Page } from '@playwright/test';
import { CertificateRegistrationState } from 'types/openapi';
import { expect, test } from '../../../../../playwright/ct-test';
import { CertificateDetailsContentTestWrapper } from './CertificateDetailsContentTestWrapper';

type RecordedAction = { type: string; payload?: Record<string, any> };

const dispatched = async (page: Page): Promise<RecordedAction[]> =>
    JSON.parse((await page.getByTestId('dispatched').textContent()) ?? '[]');

const lastOfType = async (page: Page, type: string) => (await dispatched(page)).findLast((a) => a.type === type);

// The simulate buttons sit behind the open modal, so their clicks are dispatched straight at them.
const simulate = (page: Page, testId: string) => page.getByTestId(testId).dispatchEvent('click');

const submitRenewal = async (page: Page, challenge: string) => {
    await page.locator('#renewAuthorizationSecret').fill(challenge);
    await page.getByTestId('renewSubmit').click();
};

// Opens the renew dialog and has Core refuse one challenge.
const failRenewal = async (page: Page) => {
    await page.getByTestId('retweet-button').click();
    await submitRenewal(page, 'wrong-challenge');
    await simulate(page, 'simulate-renew-failure');
};

const dismissExpectingRefetches = async (page: Page, submitTestId: string, refetches: number) => {
    await page.getByRole('button', { name: 'Cancel' }).click();

    await expect(page.getByTestId(submitTestId)).toHaveCount(0);
    await expect(page.getByTestId('refetches')).toHaveText(String(refetches));
};

test.describe('CertificateDetailsContent — renew and rekey dialogs', () => {
    test('a challenged renewal carries authorizationSecret and keeps the dialog open until confirmed', async ({ mount, page }) => {
        await mount(<CertificateDetailsContentTestWrapper registrationState={CertificateRegistrationState.Active} />);

        await page.getByTestId('retweet-button').click();
        await submitRenewal(page, 'holder-challenge');

        await expect.poll(() => lastOfType(page, 'certificates/renewCertificate')).toBeTruthy();
        expect((await lastOfType(page, 'certificates/renewCertificate'))?.payload).toMatchObject({
            uuid: 'source-uuid',
            authorityUuid: 'authority-uuid',
            raProfileUuid: 'ra-profile-uuid',
            renewRequest: { authorizationSecret: 'holder-challenge' },
        });
        await expect(page.getByTestId('renewSubmit')).toBeVisible();
    });

    test('dismissing the renew dialog after a failure refetches the certificate', async ({ mount, page }) => {
        await mount(<CertificateDetailsContentTestWrapper registrationState={CertificateRegistrationState.Active} />);

        await failRenewal(page);
        await expect(page.getByTestId('renewDialogError')).toBeVisible();

        await dismissExpectingRefetches(page, 'renewSubmit', 1);
    });

    test('dismissing after a failure still refetches once the Register switch has cleared the error', async ({ mount, page }) => {
        await mount(<CertificateDetailsContentTestWrapper registrationState={CertificateRegistrationState.Active} />);

        await failRenewal(page);
        await page.getByText('Register instead of renewing now').click();
        await expect(page.getByTestId('renewDialogError')).toHaveCount(0);

        await dismissExpectingRefetches(page, 'renewSubmit', 1);
    });

    test('a confirmed renewal after a failed one closes without refetching the certificate it left', async ({ mount, page }) => {
        await mount(<CertificateDetailsContentTestWrapper registrationState={CertificateRegistrationState.Active} />);

        await failRenewal(page);
        await submitRenewal(page, 'holder-challenge');
        await simulate(page, 'simulate-renew-success');

        await expect(page.getByTestId('renewSubmit')).toHaveCount(0);
        await expect(page.getByTestId('refetches')).toHaveText('0');
    });

    test('the renew dialog cannot be dismissed while a renewal is in flight', async ({ mount, page }) => {
        await mount(<CertificateDetailsContentTestWrapper />);

        await page.getByTestId('retweet-button').click();
        await page.getByTestId('renewSubmit').click();
        await expect.poll(() => lastOfType(page, 'certificates/renewCertificate')).toBeTruthy();
        await page.keyboard.press('Escape');

        await expect(page.getByTestId('renewSubmit')).toBeVisible();
    });

    test('dismissing the renew dialog without a failure does not refetch', async ({ mount, page }) => {
        await mount(<CertificateDetailsContentTestWrapper />);

        await page.getByTestId('retweet-button').click();

        await dismissExpectingRefetches(page, 'renewSubmit', 0);
    });

    test('the Register switch stages a successor of this certificate with inline errors', async ({ mount, page }) => {
        await mount(<CertificateDetailsContentTestWrapper />);

        await page.getByTestId('retweet-button').click();
        await page.getByText('Register instead of renewing now').click();
        await page.getByTestId('renewSubmit').click();

        await expect.poll(() => lastOfType(page, 'certificates/registerCertificate')).toBeTruthy();
        expect((await lastOfType(page, 'certificates/registerCertificate'))?.payload).toMatchObject({
            authorityUuid: 'authority-uuid',
            raProfileUuid: 'ra-profile-uuid',
            inlineErrors: true,
            registerRequest: { sourceCertificateUuid: 'source-uuid', subjectDn: 'CN=app.example' },
        });
    });

    test('dismissing the rekey dialog after a failure refetches the certificate', async ({ mount, page }) => {
        await mount(<CertificateDetailsContentTestWrapper />);

        await page.getByTestId('rekey-button').click();
        await expect(page.getByTestId('progress-button')).toBeVisible();
        await simulate(page, 'simulate-rekey-failure');
        await expect(page.getByTestId('rekeyDialogError')).toBeVisible();

        await dismissExpectingRefetches(page, 'progress-button', 1);
    });
});
