import type { Locator, Page } from 'playwright/ct-test';

export const provider = {
    name: 'provider',
    clientId: 'ilm-login',
    issuerUrl: 'https://issuer.example',
    jwkSetUrl: 'https://issuer.example/jwks',
    authorizationUrl: 'https://issuer.example/auth',
    tokenUrl: 'https://issuer.example/token',
    logoutUrl: 'https://issuer.example/logout',
    postLogoutUrl: 'https://ilm.example',
    jwkSetKeys: [],
};

export async function fillInput(input: Locator, value: string) {
    await input.focus();
    await input.fill(value);
}

export async function submittedModel(page: Page) {
    return JSON.parse((await page.getByTestId('provider-submission').textContent()) || '{}').oauth2ProviderSettingsUpdateModel;
}

export async function chooseScheme(page: Page, label: string) {
    await page.getByTestId('select-schemes-trigger').click();
    await page.getByRole('option', { name: label, exact: true }).click();
}

export function row(page: Page, property: string) {
    return page.getByRole('row').filter({ has: page.getByRole('cell', { name: property, exact: true }) });
}
