import { expect, test, type Page } from 'playwright/ct-test';
import OAuth2DelegationTestHarness from './OAuth2DelegationTestHarness';
import { provider } from './oauth2ProviderTestFixtures';

const loadedTag = '"tag-when-the-form-loaded"';

const concurrentChange = {
    provider: { ...provider, delegateClaim: 'azp-from-someone-else' },
    eTag: '"tag-after-someone-else-saved"',
};

test('sendsTheTagOfTheLoadedProvider_whenSaving', async ({ mount, page }) => {
    // given
    await mount(<OAuth2DelegationTestHarness mode="edit" provider={provider} eTag={loadedTag} />);

    // when
    await saveDelegateClaim(page, 'azp');

    // then
    await expect(async () => {
        expect(await submission(page)).toMatchObject({ ifMatch: loadedTag });
    }).toPass();
});

test('explainsTheConflictAndOffersAReload_whenSomeoneElseChangedTheProvider', async ({ mount, page }) => {
    // given
    await mount(<OAuth2DelegationTestHarness mode="edit" provider={provider} eTag={loadedTag} concurrentChange={concurrentChange} />);

    // when
    await saveDelegateClaim(page, 'azp');

    // then
    const conflict = page.getByTestId('provider-changed-conflict');
    await expect(conflict).toContainText('Someone else changed this provider since you opened it');
    await expect(conflict.getByRole('button', { name: 'Reload', exact: true })).toBeEnabled();
});

test('showsTheCurrentSettingsAndSavesWithTheirTag_whenReloadedAfterAConflict', async ({ mount, page }) => {
    // given
    await mount(<OAuth2DelegationTestHarness mode="edit" provider={provider} eTag={loadedTag} concurrentChange={concurrentChange} />);
    await saveDelegateClaim(page, 'azp');

    // when
    await page.getByTestId('provider-changed-conflict').getByRole('button', { name: 'Reload', exact: true }).click();

    // then
    await expect(page.getByTestId('provider-changed-conflict')).toBeHidden();
    await expect(page.getByLabel('Delegate claim', { exact: true })).toHaveValue(concurrentChange.provider.delegateClaim);
    await saveDelegateClaim(page, 'azp');
    await expect.poll(() => submission(page)).toMatchObject({ ifMatch: concurrentChange.eTag });
});

// ── Helpers ───────────────────────────────────────────────────────────────

async function saveDelegateClaim(page: Page, delegateClaim: string) {
    const input = page.getByLabel('Delegate claim', { exact: true });
    await input.focus();
    await input.fill(delegateClaim);
    await page.getByRole('button', { name: 'Save', exact: true }).click();
}

async function submission(page: Page) {
    return JSON.parse((await page.getByTestId('provider-submission').textContent()) || '{}');
}
