import { expect, test } from '../../../../playwright/ct-test';
import { withProviders } from 'utils/test-helpers';
import TruncatedCell from './TruncatedCell';

const LONG_VALUE = 'CN=api.internal.acme.test, OU=Platform Engineering, O=Acme Corporation, L=Prague, C=CZ';

const inBox = (width: number, value: string) => (
    <div style={{ width: `${width}px` }} data-testid="box">
        <TruncatedCell value={value} dataTestId="cell" />
    </div>
);

test.describe('TruncatedCell', () => {
    test('shows the value on one line when the column is wide enough', async ({ mount, page }) => {
        await mount(withProviders(inBox(600, 'api.acme.test')));

        await expect(page.getByTestId('cell')).toHaveText('api.acme.test');
        // No tooltip wrapper at all: repeating a value that is already fully visible would be
        // noise on every cell of every row.
        await page.getByTestId('cell').hover();
        await expect(page.getByRole('tooltip')).toHaveCount(0);
    });

    test('keeps a value that does not fit on one line and cuts it off', async ({ mount, page }) => {
        await mount(withProviders(inBox(120, LONG_VALUE)));

        const metrics = await page.getByTestId('cell').evaluate((element) => ({
            scrollWidth: element.scrollWidth,
            clientWidth: element.clientWidth,
            whiteSpace: getComputedStyle(element).whiteSpace,
            textOverflow: getComputedStyle(element).textOverflow,
        }));

        expect(metrics.scrollWidth).toBeGreaterThan(metrics.clientWidth);
        expect(metrics.whiteSpace).toBe('nowrap');
        expect(metrics.textOverflow).toBe('ellipsis');
    });

    test('reveals the full value when it has been cut off', async ({ mount, page }) => {
        await mount(withProviders(inBox(120, LONG_VALUE)));

        await page.getByTestId('cell').hover();

        await expect(page.getByRole('tooltip')).toHaveText(LONG_VALUE);
    });
});
