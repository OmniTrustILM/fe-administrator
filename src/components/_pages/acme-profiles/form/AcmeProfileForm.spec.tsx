import { expect, test } from '../../../../../playwright/ct-test';
import AcmeProfileFormHarness from './AcmeProfileFormHarness';

test.describe('AcmeProfileForm renewal information', () => {
    test('keeps the stored renewal information when the RA profile list is empty', async ({ mount, page }) => {
        await mount(<AcmeProfileFormHarness profile={{ renewalInfoEnabled: true, renewalInfoRetryAfter: 7200 }} />);

        await expect(page.locator('#renewalInfoRetryAfter')).toHaveValue('7200');
        await expect(page.locator('#renewalInfoEnabled')).toBeChecked();
    });

    test('submits the stored renewal information once the RA profiles arrive after the profile', async ({ mount, page }) => {
        await mount(<AcmeProfileFormHarness raProfilesDelayMs={800} profile={{ renewalInfoEnabled: true, renewalInfoRetryAfter: 7200 }} />);

        await expect(page.locator('#renewalInfoRetryAfter')).toHaveValue('7200');
        await expect(page.locator('#name')).toHaveValue('ACME profile');
        await page.locator('#description').fill('Edited');
        await page.getByRole('button', { name: 'Update' }).click();

        const request = JSON.parse((await page.getByTestId('update-request').textContent()) ?? 'null');
        expect(request).toMatchObject({ description: 'Edited', renewalInfoEnabled: true, renewalInfoRetryAfter: 7200 });
    });

    test('cannot be saved before the profile is edited', async ({ mount, page }) => {
        await mount(<AcmeProfileFormHarness profile={{ renewalInfoEnabled: true, renewalInfoRetryAfter: 7200 }} />);

        await expect(page.locator('#renewalInfoRetryAfter')).toHaveValue('7200');
        await expect(page.getByRole('button', { name: 'Update' })).toBeDisabled();
    });
});

test.describe('AcmeProfileForm without RA profile options', () => {
    const profile = { description: 'Stored', dnsResolverPort: '5353', renewalInfoEnabled: true, renewalInfoRetryAfter: 7200 };

    for (const raProfilesResult of ['empty', 'fail'] as const) {
        test(`loads and submits the stored values when the RA profile list is ${raProfilesResult}`, async ({ mount, page }) => {
            await mount(<AcmeProfileFormHarness raProfilesDelayMs={0} raProfilesResult={raProfilesResult} profile={profile} />);

            await expect(page.locator('#description')).toHaveValue('Stored');
            await expect(page.locator('#dnsPort')).toHaveValue('5353');
            await page.locator('#description').fill('Edited');
            const update = page.getByRole('button', { name: 'Update' });
            await expect(update).toBeEnabled();
            await update.click();

            const request = JSON.parse((await page.getByTestId('update-request').textContent()) ?? 'null');
            expect(request).toMatchObject({
                description: 'Edited',
                dnsResolverPort: '5353',
                renewalInfoEnabled: true,
                renewalInfoRetryAfter: 7200,
            });
            expect(request).not.toHaveProperty('raProfileUuid');
        });
    }

    test('keeps the stored RA profile selected when its options load late', async ({ mount, page }) => {
        const raProfile = { uuid: 'ra-1', name: 'RA profile', enabled: true };
        await mount(<AcmeProfileFormHarness raProfilesDelayMs={800} profile={{ ...profile, raProfile } as never} />);

        const select = page.locator('#raProfileSelect');
        await expect(select).toContainText('RA profile');
        await page.locator('#description').fill('Edited');
        await page.waitForTimeout(1000);
        await expect(select).toContainText('RA profile');
        await page.getByRole('button', { name: 'Update' }).click();

        const request = JSON.parse((await page.getByTestId('update-request').textContent()) ?? 'null');
        expect(request).toMatchObject({ description: 'Edited', raProfileUuid: 'ra-1' });
    });
});

test.describe('AcmeProfileForm stored certificate associations', () => {
    const profile = { certificateAssociations: { ownerUuid: 'user-1', groupUuids: ['group-1', 'group-2'] } };

    for (const associationsDelayMs of [undefined, 800]) {
        test(`submits the stored owner and groups when their lists ${associationsDelayMs ? 'load late' : 'stay empty'}`, async ({
            mount,
            page,
        }) => {
            await mount(<AcmeProfileFormHarness raProfilesDelayMs={0} associationsDelayMs={associationsDelayMs} profile={profile} />);

            await expect(page.locator('#name')).toHaveValue('ACME profile');
            await expect(page.locator('#owner')).toContainText('user-1');
            await page.locator('#description').fill('Edited');
            if (associationsDelayMs) {
                await expect(page.locator('#owner')).toContainText('Alice');
                await expect(page.locator('#groups')).toContainText('Admins');
                await expect(page.locator('#groups')).toContainText('Ops');
            }
            await page.getByRole('button', { name: 'Update' }).click();

            const request = JSON.parse((await page.getByTestId('update-request').textContent()) ?? 'null');
            expect(request).toMatchObject({
                description: 'Edited',
                certificateAssociations: { ownerUuid: 'user-1', groupUuids: ['group-1', 'group-2'] },
            });
        });
    }
});

test.describe('AcmeProfileForm attribute descriptors', () => {
    const profile = {
        raProfile: { uuid: 'ra-1', name: 'RA profile', enabled: true, authorityInstanceUuid: 'authority-1' },
        issueCertificateAttributes: [{ name: 'issueField', uuid: 'issue-1', contentType: 'string', content: [{ data: 'stored issue' }] }],
        customAttributes: [{ name: 'customField', uuid: 'custom-1', contentType: 'string', content: [{ data: 'stored custom' }] }],
    } as never;

    test('cannot be saved until the descriptors arrive, then keeps the stored attribute values', async ({ mount, page }) => {
        await mount(<AcmeProfileFormHarness raProfilesDelayMs={0} descriptorsDelayMs={1500} profile={profile} />);

        await expect(page.locator('#name')).toHaveValue('ACME profile');
        await page.locator('#description').fill('Edited');
        const update = page.getByRole('button', { name: 'Update' });
        await expect(update).toBeDisabled();
        await expect(update).toBeEnabled();
        await update.click();

        const request = JSON.parse((await page.getByTestId('update-request').textContent()) ?? 'null');
        expect(request).toMatchObject({
            description: 'Edited',
            raProfileUuid: 'ra-1',
            issueCertificateAttributes: [{ name: 'issueField', content: [{ data: 'stored issue' }] }],
            customAttributes: [{ name: 'customField', content: [{ data: 'stored custom' }] }],
        });
    });
});
