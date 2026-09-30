import type { Page } from '@playwright/test';

export async function fillEabSecretForm(page: Page, name: string) {
    const nameInput = page.getByTestId('text-input-secret-name');
    // TextInput stays read-only until focused, against browser autofill.
    await nameInput.click();
    await nameInput.fill(name);
    await page.getByTestId('select-secret-vault-profile-trigger').click();
    await page.getByRole('option', { name: 'Vault One' }).click();
}

export function createButton(page: Page) {
    return page.getByTestId('generate-eab-key-dialog').getByRole('button', { name: 'Create', exact: true });
}
