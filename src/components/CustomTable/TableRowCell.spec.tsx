import { test, expect } from '../../../playwright/ct-test';
import { TableRowCell } from './TableRowCell';
import { withProviders } from 'utils/test-helpers';
import type { TableDataRow, TableHeader } from './types';

test.describe('TableRowCell', () => {
    const mockRow: TableDataRow = {
        id: 'row-1',
        columns: ['Name', 'Value'],
    };

    const mockHeaders: TableHeader[] = [
        { id: 'name', content: 'Name' },
        { id: 'value', content: 'Value' },
    ];

    test('renders column content in a td', async ({ mount }) => {
        const component = await mount(
            withProviders(
                <table>
                    <tbody>
                        <tr>
                            <TableRowCell column="Cell content" index={0} row={mockRow} tblHeaders={mockHeaders} onDetailClick={() => {}} />
                        </tr>
                    </tbody>
                </table>,
            ),
        );

        const cell = component.locator('td');
        await expect(cell).toContainText('Cell content');
    });

    test('renders empty fragment when column is falsy', async ({ mount }) => {
        const component = await mount(
            withProviders(
                <table>
                    <tbody>
                        <tr>
                            <TableRowCell column="" index={0} row={mockRow} tblHeaders={mockHeaders} onDetailClick={() => {}} />
                        </tr>
                    </tbody>
                </table>,
            ),
        );

        const cell = component.locator('td');
        await expect(cell).toBeVisible();
        expect(await cell.textContent()).toBe('');
    });

    test('when hasDetails and detailColumns present, first column renders as button', async ({ mount }) => {
        const rowWithDetails: TableDataRow = {
            id: 'row-1',
            columns: ['Expandable', 'Data'],
            detailColumns: ['Detail A', 'Detail B'],
        };

        let clicked = false;
        const component = await mount(
            withProviders(
                <table>
                    <tbody>
                        <tr>
                            <TableRowCell
                                column="Expandable"
                                index={0}
                                row={rowWithDetails}
                                tblHeaders={mockHeaders}
                                hasDetails={true}
                                onDetailClick={() => {
                                    clicked = true;
                                }}
                            />
                        </tr>
                    </tbody>
                </table>,
            ),
        );

        const button = component.locator('td button');
        await expect(button).toBeVisible();
        await expect(button).toContainText('Expandable');
        await button.click();
        expect(clicked).toBe(true);
    });

    test('when hasDetails but no detailColumns, renders plain div', async ({ mount }) => {
        const component = await mount(
            withProviders(
                <table>
                    <tbody>
                        <tr>
                            <TableRowCell
                                column="Plain"
                                index={0}
                                row={mockRow}
                                tblHeaders={mockHeaders}
                                hasDetails={true}
                                onDetailClick={() => {}}
                            />
                        </tr>
                    </tbody>
                </table>,
            ),
        );

        const button = component.locator('td button');
        await expect(button).toHaveCount(0);
        await expect(component.locator('td').filter({ hasText: 'Plain' })).toBeVisible();
    });

    test('detail button uses the brand colour so it reads as a link', async ({ mount }) => {
        const rowWithDetails: TableDataRow = {
            id: 'row-1',
            columns: ['1', 'Data'],
            detailColumns: ['Detail A'],
        };

        const component = await mount(
            withProviders(
                <div>
                    <span className="text-brand" data-testid="brand-reference">
                        reference
                    </span>
                    <table>
                        <tbody>
                            <tr>
                                <TableRowCell
                                    column="1"
                                    index={0}
                                    row={rowWithDetails}
                                    tblHeaders={mockHeaders}
                                    hasDetails={true}
                                    onDetailClick={() => {}}
                                />
                            </tr>
                        </tbody>
                    </table>
                </div>,
            ),
        );

        const brandColor = await component.getByTestId('brand-reference').evaluate((el) => getComputedStyle(el).color);
        await expect(component.locator('td button')).toHaveCSS('color', brandColor);
    });
});
