import { expect, test } from '../../../../playwright/ct-test';
import { withProviders } from 'utils/test-helpers';
import { AttributeContentType } from 'types/openapi';
import AttributeCell from './AttributeCell';

/** A cell is only comparable down a column if every row is the same height. */
const CELL_WIDTH = 200;

const inCell = (component: React.ReactElement) => (
    <div style={{ width: `${CELL_WIDTH}px` }} data-testid="cell-box">
        {component}
    </div>
);

test.describe('AttributeCell', () => {
    test('renders the empty state when the row has no value for the column', async ({ mount, page }) => {
        await mount(withProviders(inCell(<AttributeCell contentType={AttributeContentType.String} content={undefined} />)));

        await expect(page.getByTestId('empty-cell')).toBeVisible();
        await expect(page.getByText('No value')).toHaveCount(1);
    });

    test('renders the empty state for content that is present but empty', async ({ mount, page }) => {
        await mount(withProviders(inCell(<AttributeCell contentType={AttributeContentType.String} content={[]} />)));

        await expect(page.getByTestId('empty-cell')).toBeVisible();
    });

    test('renders the empty state when the catalogue reports no content type', async ({ mount, page }) => {
        await mount(withProviders(inCell(<AttributeCell contentType={undefined} content={[{ data: 'ignored' }]} />)));

        await expect(page.getByTestId('empty-cell')).toBeVisible();
    });

    test('renders a single value as text', async ({ mount, page }) => {
        await mount(withProviders(inCell(<AttributeCell contentType={AttributeContentType.String} content={[{ data: 'production' }]} />)));

        await expect(page.getByText('production')).toBeVisible();
        await expect(page.getByTestId('empty-cell')).toHaveCount(0);
    });

    test('renders a boolean as Yes rather than as true', async ({ mount, page }) => {
        await mount(withProviders(inCell(<AttributeCell contentType={AttributeContentType.Boolean} content={[{ data: true }]} />)));

        await expect(page.getByText('Yes')).toBeVisible();
    });

    test('shows the first value and a count for a multi-valued attribute', async ({ mount, page }) => {
        await mount(
            withProviders(
                inCell(
                    <AttributeCell
                        contentType={AttributeContentType.String}
                        content={[{ data: 'production' }, { data: 'staging' }, { data: 'dr-site' }]}
                    />,
                ),
            ),
        );

        await expect(page.getByText('production')).toBeVisible();
        await expect(page.getByText('+2')).toBeVisible();
        await expect(page.getByText('staging')).toHaveCount(0);
    });

    test('reveals every value of a multi-valued attribute, in item order', async ({ mount, page }) => {
        await mount(
            withProviders(
                inCell(
                    <AttributeCell
                        contentType={AttributeContentType.String}
                        content={[{ data: 'production' }, { data: 'staging' }, { data: 'dr-site' }]}
                    />,
                ),
            ),
        );

        await page.getByRole('button', { name: 'Show all 3 values' }).click();

        await expect(page.getByRole('listitem')).toHaveText(['production', 'staging', 'dr-site']);
    });

    test('keeps a multi-valued cell exactly as tall as a single-valued one', async ({ mount, page }) => {
        // Rendered together so the two are measured in one layout: a `+N` pill that made its row a
        // fraction taller would be invisible on one row and obvious down a column of twenty-five.
        await mount(
            withProviders(
                <div style={{ width: `${CELL_WIDTH}px` }}>
                    <div data-testid="one">
                        <AttributeCell contentType={AttributeContentType.String} content={[{ data: 'production' }]} />
                    </div>
                    <div data-testid="many">
                        <AttributeCell
                            contentType={AttributeContentType.String}
                            content={[{ data: 'a-very-long-value-that-would-wrap-if-it-could' }, { data: 'b' }, { data: 'c' }]}
                        />
                    </div>
                    <div data-testid="none">
                        <AttributeCell contentType={AttributeContentType.String} content={undefined} />
                    </div>
                </div>,
            ),
        );

        const heights = await page.evaluate(() =>
            ['one', 'many', 'none'].map((id) =>
                Math.round(document.querySelector(`[data-testid="${id}"]`)?.getBoundingClientRect().height ?? 0),
            ),
        );

        expect(new Set(heights).size).toBe(1);
    });

    test('links a resource value to the referenced object', async ({ mount, page }) => {
        await mount(
            withProviders(
                inCell(
                    <AttributeCell
                        contentType={AttributeContentType.Resource}
                        content={[{ data: { resource: 'certificates', uuid: 'u-1', name: 'api.acme.test' } }]}
                    />,
                ),
            ),
        );

        await expect(page.getByRole('link', { name: 'api.acme.test' })).toHaveAttribute('href', '/certificates/detail/u-1');
    });

    test('shows a file by name only and keeps the mime type off the column', async ({ mount, page }) => {
        await mount(
            withProviders(
                inCell(
                    <AttributeCell
                        contentType={AttributeContentType.File}
                        content={[{ data: { fileName: 'chain.pem', mimeType: 'application/x-pem-file', content: 'x' } }]}
                    />,
                ),
            ),
        );

        await expect(page.getByText('chain.pem')).toBeVisible();
        await expect(page.getByText('application/x-pem-file')).toHaveCount(0);
    });
});
