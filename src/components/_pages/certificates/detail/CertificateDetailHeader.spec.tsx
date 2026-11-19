import type { Page } from '@playwright/test';
import { CertificateRegistrationState, CertificateState, ResourceAction } from 'types/openapi';
import { expect, test } from '../../../../../playwright/ct-test';
import { CertificateDetailHeaderTestWrapper } from './CertificateDetailHeaderTestWrapper';

type RecordedAction = { type: string; payload?: Record<string, any> };

const dispatched = async (page: Page): Promise<RecordedAction[]> =>
    JSON.parse((await page.getByTestId('dispatched').textContent()) ?? '[]');

const lastOfType = async (page: Page, type: string) => (await dispatched(page)).findLast((a) => a.type === type);

// The simulate buttons sit behind the open modal, so their clicks are dispatched straight at them.
const simulate = (page: Page, testId: string) => page.getByTestId(testId).dispatchEvent('click');

const chooseAction = async (page: Page, label: string) => {
    await page.getByRole('button', { name: 'More actions' }).click();
    await page.getByRole('menuitem', { name: label }).click();
};

const submitRenewal = async (page: Page, challenge: string) => {
    await page.locator('#renewAuthorizationSecret').fill(challenge);
    await page.getByTestId('renewSubmit').click();
};

// Opens the renew dialog and has Core refuse one challenge.
const failRenewal = async (page: Page) => {
    await chooseAction(page, 'Renew');
    await submitRenewal(page, 'wrong-challenge');
    await simulate(page, 'simulate-renew-failure');
};

const dismissExpectingRefetches = async (page: Page, submitTestId: string, refetches: number) => {
    await page.getByRole('button', { name: 'Cancel' }).click();

    await expect(page.getByTestId(submitTestId)).toHaveCount(0);
    await expect(page.getByTestId('refetches')).toHaveText(String(refetches));
};

test.describe('CertificateDetailHeader — actions', () => {
    test('puts Download first, explains disabled actions and separates the destructive ones', async ({ mount, page }) => {
        await mount(<CertificateDetailHeaderTestWrapper />);

        const download = page.getByTestId('page-header-actions').getByRole('button', { name: 'Download' });
        await expect(download).toBeDisabled();

        await page.getByRole('button', { name: 'More actions' }).click();
        const items = page.getByRole('menuitem');
        await expect(items.last()).toContainText('Delete');
        await expect(items.nth(-2)).toContainText('Revoke');
        await expect(items.last()).toHaveClass(/text-danger/);
        await expect(page.getByRole('separator')).toHaveCount(1);

        const issue = page.getByRole('menuitem', { name: 'Issue', exact: true });
        await expect(issue).toHaveAttribute('aria-disabled', 'true');
        await expect(issue).toHaveAccessibleDescription('Only for requested certificates');
        await expect(page.getByRole('menuitem', { name: 'Copy certificate content', exact: true })).toHaveAccessibleDescription(
            'The certificate has no content',
        );
        await expect(page.getByRole('menuitem', { name: 'Renew', exact: true })).not.toHaveAttribute('aria-disabled', 'true');
    });
});

test.describe('CertificateDetailHeader — renew and rekey dialogs', () => {
    test('a challenged renewal carries authorizationSecret and keeps the dialog open until confirmed', async ({ mount, page }) => {
        await mount(<CertificateDetailHeaderTestWrapper registrationState={CertificateRegistrationState.Active} />);

        await chooseAction(page, 'Renew');
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
        await mount(<CertificateDetailHeaderTestWrapper registrationState={CertificateRegistrationState.Active} />);

        await failRenewal(page);
        await expect(page.getByTestId('renewDialogError')).toBeVisible();

        await dismissExpectingRefetches(page, 'renewSubmit', 1);
    });

    test('dismissing after a failure still refetches once the Register switch has cleared the error', async ({ mount, page }) => {
        await mount(<CertificateDetailHeaderTestWrapper registrationState={CertificateRegistrationState.Active} />);

        await failRenewal(page);
        await page.getByText('Register instead of renewing now').click();
        await expect(page.getByTestId('renewDialogError')).toHaveCount(0);

        await dismissExpectingRefetches(page, 'renewSubmit', 1);
    });

    test('a confirmed renewal after a failed one closes without refetching the certificate it left', async ({ mount, page }) => {
        await mount(<CertificateDetailHeaderTestWrapper registrationState={CertificateRegistrationState.Active} />);

        await failRenewal(page);
        await submitRenewal(page, 'holder-challenge');
        await simulate(page, 'simulate-renew-success');

        await expect(page.getByTestId('renewSubmit')).toHaveCount(0);
        await expect(page.getByTestId('refetches')).toHaveText('0');
    });

    test('the renew dialog cannot be dismissed while a renewal is in flight', async ({ mount, page }) => {
        await mount(<CertificateDetailHeaderTestWrapper />);

        await chooseAction(page, 'Renew');
        await page.getByTestId('renewSubmit').click();
        await expect.poll(() => lastOfType(page, 'certificates/renewCertificate')).toBeTruthy();
        await page.keyboard.press('Escape');

        await expect(page.getByTestId('renewSubmit')).toBeVisible();
    });

    test('dismissing the renew dialog without a failure does not refetch', async ({ mount, page }) => {
        await mount(<CertificateDetailHeaderTestWrapper />);

        await chooseAction(page, 'Renew');

        await dismissExpectingRefetches(page, 'renewSubmit', 0);
    });

    test('the Register switch stages a successor of this certificate with inline errors', async ({ mount, page }) => {
        await mount(<CertificateDetailHeaderTestWrapper />);

        await chooseAction(page, 'Renew');
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
        await mount(<CertificateDetailHeaderTestWrapper />);

        await chooseAction(page, 'Rekey');
        await expect(page.getByTestId('progress-button')).toBeVisible();
        await simulate(page, 'simulate-rekey-failure');
        await expect(page.getByTestId('rekeyDialogError')).toBeVisible();

        await dismissExpectingRefetches(page, 'progress-button', 1);
    });
});

test.describe('CertificateDetailHeader — operations by permission', () => {
    const readOnly = [ResourceAction.List, ResourceAction.Detail];
    const owned = [
        ResourceAction.Detail,
        ResourceAction.Update,
        ResourceAction.Delete,
        ResourceAction.Renew,
        ResourceAction.Revoke,
        ResourceAction.Archive,
    ];
    const gated = ['Renew', 'Rekey', 'Archive', 'Revoke', 'Delete'];

    const menuItem = (page: Page, label: string) => page.getByRole('menuitem', { name: label, exact: true });

    test('disables operations a read-only user lacks and names the missing permission', async ({ mount, page }) => {
        await mount(<CertificateDetailHeaderTestWrapper allowedActions={readOnly} />);
        await page.getByRole('button', { name: 'More actions' }).click();

        for (const label of gated) {
            await expect(menuItem(page, label)).toHaveAttribute('aria-disabled', 'true');
        }
        await expect(menuItem(page, 'Revoke')).toHaveAccessibleDescription('You need the revoke permission on Certificates.');
        await expect(menuItem(page, 'Delete')).toHaveAccessibleDescription('You need the delete permission on Certificates.');
    });

    test('names the missing permission over the certificate state when both block an operation', async ({ mount, page }) => {
        await mount(<CertificateDetailHeaderTestWrapper allowedActions={readOnly} />);
        await page.getByRole('button', { name: 'More actions' }).click();

        await expect(menuItem(page, 'Issue')).toHaveAccessibleDescription('You need the issue permission on Certificates.');
    });

    test('offers the operations the certificate answer allows, as for a certificate the user owns', async ({ mount, page }) => {
        await mount(<CertificateDetailHeaderTestWrapper allowedActions={owned} />);
        await page.getByRole('button', { name: 'More actions' }).click();

        for (const label of gated) {
            await expect(menuItem(page, label)).not.toHaveAttribute('aria-disabled', 'true');
        }
    });

    test('offers every operation to a fully privileged user as before', async ({ mount, page }) => {
        await mount(<CertificateDetailHeaderTestWrapper />);
        await page.getByRole('button', { name: 'More actions' }).click();

        for (const label of gated) {
            await expect(menuItem(page, label)).not.toHaveAttribute('aria-disabled', 'true');
        }
    });
});

test.describe('CertificateDetailHeader — registration expiry', () => {
    test('withdraws Complete once the issuance window elapses while the page stays open', async ({ mount, page }) => {
        const start = new Date('2026-11-18T12:00:00Z');
        await page.clock.install({ time: start });
        const certificateOverrides = {
            state: CertificateState.Registered,
            registration: { state: CertificateRegistrationState.Active, failedAttempts: 0, expiresAt: '2026-11-18T12:01:00Z' },
        };
        await mount(<CertificateDetailHeaderTestWrapper certificateOverrides={certificateOverrides} />);

        await page.getByRole('button', { name: 'More actions' }).click();
        const complete = page.getByRole('menuitem', { name: 'Complete', exact: true });
        await expect(complete).not.toHaveAttribute('aria-disabled', 'true');
        await page.keyboard.press('Escape');

        await page.clock.fastForward('01:01');
        await page.getByRole('button', { name: 'More actions' }).click();
        await expect(complete).toHaveAttribute('aria-disabled', 'true');
        await expect(complete).toHaveAccessibleDescription('The issuance window has elapsed');
    });
});
