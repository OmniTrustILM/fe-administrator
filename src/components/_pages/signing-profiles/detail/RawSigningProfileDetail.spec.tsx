import { expect, test } from 'playwright/ct-test';
import { ContentSigningProfileDetailTestWrapper } from './ContentSigningProfileDetailTestWrapper';
import { DOCUMENT_SIGNING_EKU, rawDetailCore, rawIlmNativeDetailCore, rawWithoutPurposeDetailCore } from './rawSigningDetailFixtures';
import { openTab, requests, row } from './signingProfileDetailTestHelpers';

test.describe('Raw-signing profile detail', () => {
    test('shows the raw-signing certificate purpose', async ({ mount, page }) => {
        await mount(<ContentSigningProfileDetailTestWrapper core={rawDetailCore} />);
        await openTab(page, 'Raw Signing Properties');

        await expect(row(page, 'Require Non-Repudiation')).toContainText('Enabled');
        await expect(row(page, 'Required Extended Key Usages')).toContainText(DOCUMENT_SIGNING_EKU);
        await expect(row(page, 'Signature Family')).toHaveCount(0);
    });

    test('accepts any extended key usage when the profile requires none', async ({ mount, page }) => {
        await mount(<ContentSigningProfileDetailTestWrapper core={rawWithoutPurposeDetailCore} />);
        await openTab(page, 'Raw Signing Properties');

        await expect(row(page, 'Required Extended Key Usages')).toContainText('Any');
        await expect(row(page, 'Require Non-Repudiation')).toContainText('Disabled');
    });

    test('activates ILM Native on a raw-signing profile', async ({ mount, page }) => {
        await mount(<ContentSigningProfileDetailTestWrapper core={rawDetailCore} />);
        await openTab(page, 'Protocols');

        await row(page, 'ILM Native').getByRole('button', { name: 'Activate', exact: true }).click();

        await expect(row(page, 'ILM Native')).toContainText('Enabled');
        const sent = await requests(page);
        expect(sent).toContainEqual({ type: 'activateIlmNative', payload: { uuid: 'sp-pades' } });
        expect(sent.map((request) => request.type)).not.toContain('getTspActivationDetails');
    });

    test('deactivates ILM Native on a raw-signing profile once confirmed', async ({ mount, page }) => {
        await mount(<ContentSigningProfileDetailTestWrapper core={rawIlmNativeDetailCore} />);
        await openTab(page, 'Protocols');

        await row(page, 'ILM Native').getByRole('button', { name: 'Deactivate', exact: true }).click();
        await page.getByRole('button', { name: 'Deactivate', exact: true }).last().click();

        await expect(row(page, 'ILM Native')).toContainText('Disabled');
        expect(await requests(page)).toContainEqual({ type: 'deactivateIlmNative', payload: { uuid: 'sp-pades' } });
    });
});
