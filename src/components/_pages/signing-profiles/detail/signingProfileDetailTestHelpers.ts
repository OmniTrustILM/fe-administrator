import type { Locator, Page } from '@playwright/test';
import type { RecordedRequest } from './ContentSigningProfileDetailTestWrapper';

export const row = (scope: Locator | Page, label: string) =>
    scope.getByRole('row').filter({ has: scope.getByRole('cell', { name: label, exact: true }) });

export async function requests(page: Page): Promise<RecordedRequest[]> {
    return JSON.parse((await page.getByTestId('requests').textContent()) ?? '[]') as RecordedRequest[];
}

export async function openTab(page: Page, name: string) {
    await page.getByRole('tab', { name }).click();
}
