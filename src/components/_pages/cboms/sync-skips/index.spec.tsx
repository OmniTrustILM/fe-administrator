import { expect, test } from '../../../../../playwright/ct-test';
import type { CbomSyncSkipDto } from 'types/openapi';
import CbomSyncSkipsListTestWrapper from './CbomSyncSkipsListTestWrapper';

const writtenOff = {
    uuid: 'skip-1',
    serialNumber: 'urn:uuid:written-off',
    version: 2,
    state: 'permanentlySkipped',
    attempts: 4,
    firstSkippedAt: '2026-09-01T12:00:00Z',
    lastAttemptAt: '2026-09-04T12:00:00Z',
    reason: 'The CBOM Repository answered 404 for the document',
    algorithms: 0,
    certificates: 0,
    protocols: 0,
    cryptoMaterial: 0,
    totalAssets: 0,
} as unknown as CbomSyncSkipDto;
const retrying = {
    ...writtenOff,
    uuid: 'skip-2',
    serialNumber: 'urn:uuid:still-retrying',
    state: 'retrying',
    attempts: 1,
} as unknown as CbomSyncSkipDto;

test.describe('Skipped CBOM documents', () => {
    test('lists every skipped document with its state label and reason, offering a retry only where the sync gave up', async ({
        mount,
    }) => {
        const component = await mount(<CbomSyncSkipsListTestWrapper items={[writtenOff, retrying]} />);

        await expect(component.getByText('Skipped CBOM documents')).toBeVisible();
        await expect(component.getByText('urn:uuid:written-off')).toBeVisible();
        await expect(component.getByText('urn:uuid:still-retrying')).toBeVisible();
        await expect(component.getByText('Permanently skipped', { exact: true })).toBeVisible();
        await expect(component.getByText('Retrying', { exact: true })).toBeVisible();
        await expect(component.getByText('The CBOM Repository answered 404 for the document')).toHaveCount(2);

        await expect(component.getByTestId('retry-skip-1-button')).toBeVisible();
        await expect(component.getByTestId('retry-skip-2-button')).toHaveCount(0);
    });

    test('a retry asks for confirmation and cancelling leaves the row untouched', async ({ mount, page }) => {
        const component = await mount(<CbomSyncSkipsListTestWrapper items={[writtenOff, retrying]} />);

        await component.getByTestId('retry-skip-1-button').click();

        const dialog = page.getByRole('dialog');
        await expect(dialog.getByText('Retry a skipped document')).toBeVisible();
        await expect(dialog.getByText(/urn:uuid:written-off version 2 after 4 attempt/)).toBeVisible();

        await dialog.getByRole('button', { name: 'Cancel' }).click();

        await expect(page.getByRole('dialog')).toHaveCount(0);
        await expect(component.getByTestId('widget-busy-overlay')).toHaveCount(0);
        await expect(component.getByTestId('retry-skip-1-button')).toBeEnabled();
    });

    test('confirming the retry dispatches it: the list goes busy and the button refuses a second click', async ({ mount, page }) => {
        const component = await mount(<CbomSyncSkipsListTestWrapper items={[writtenOff, retrying]} />);

        await component.getByTestId('retry-skip-1-button').click();
        await page.getByRole('dialog').getByRole('button', { name: 'Retry' }).click();

        await expect(page.getByRole('dialog')).toHaveCount(0);
        await expect(component.getByTestId('widget-busy-overlay')).toBeVisible();
        await expect(component.getByTestId('retry-skip-1-button')).toBeDisabled();
    });
});
