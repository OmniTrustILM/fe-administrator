import type { Page } from '@playwright/test';
import { expect } from 'playwright/ct-test';
import type { RecordedRequest } from './ContentSigningProfileFormTestWrapper';

export const TAB_GENERAL = '1 · General';
export const TAB_CONTENT_SIGNING = '2 · Content Signing Properties';
export const TAB_RAW_SIGNING = '2 · Raw Signing Properties';
export const TAB_SIGNING_SCHEME = '3 · Signing Scheme';
export const TAB_RECORD_POLICY = '4 · Record Policy';

export async function requests(page: Page, type: string): Promise<unknown[]> {
    const recorded: RecordedRequest[] = JSON.parse((await page.getByTestId('requests').textContent()) ?? '[]');
    return recorded.filter((request) => request.type === type).map((request) => request.payload);
}

export async function chooseWorkflow(page: Page, label: string) {
    await page.getByRole('radio', { name: label }).check();
}

export async function choose(page: Page, selectId: string, option: string) {
    await page.getByTestId(`select-${selectId}-trigger`).click();
    await page.getByRole('option', { name: option, exact: true }).click();
}

// Switch renders its checkbox as `sr-only`, so its label is the hit target.
export async function toggleSwitch(page: Page, id: string, expected: boolean) {
    await page.locator(`label[for="${id}"]`).first().click();
    await expect(page.locator(`#${id}`)).toBeChecked({ checked: expected });
}

export async function addExtendedKeyUsage(page: Page, oid: string) {
    await page.getByTestId('hostname-list-input-requiredExtendedKeyUsageOidInput').fill(oid);
    await page.getByRole('button', { name: 'Add', exact: true }).click();
}

export async function lastWorkflow(page: Page, type: 'createSigningProfile' | 'updateSigningProfile') {
    return ((await requests(page, type)).at(-1) as any)?.signingProfileRequestDto?.workflow;
}

export async function editDescription(page: Page, name = 'DocumentSigning') {
    await expect(page.locator('#signingProfileName')).toHaveValue(name);
    const descriptionInput = page.locator('#description');
    await descriptionInput.focus();
    await descriptionInput.fill('Signs contracts');
}
