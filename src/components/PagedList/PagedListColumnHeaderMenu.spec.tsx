import type { Page } from '@playwright/test';
import type { SearchFieldListModel, SearchRequestModel } from 'types/certificate';
import type { ListViewModel } from 'types/listViews';
import { AttributeContentType, FilterFieldSource, FilterFieldType, Resource } from 'types/openapi';
import type { ColumnDefinition } from 'types/tableColumns';
import { relativeLuminance } from 'utils/contrast';
import { expect, test } from '../../../playwright/ct-test';
import PagedListColumnsWithStore, { type StubRow } from './PagedListColumnsWithStore';

const field = (identifier: string, label: string, overrides: Record<string, unknown> = {}) => ({
    fieldIdentifier: identifier,
    fieldLabel: label,
    type: FilterFieldType.String,
    conditions: [],
    displayable: true,
    sortable: true,
    ...overrides,
});

const catalogue = [
    {
        filterFieldSource: FilterFieldSource.Property,
        searchFieldData: [field('COMMON_NAME', 'Common Name'), field('NOT_AFTER', 'Expires At', { type: FilterFieldType.Datetime })],
    },
    {
        filterFieldSource: FilterFieldSource.Custom,
        // Mirrors the catalogue, which reports every attribute-sourced field unsortable.
        searchFieldData: [field('department|STRING', 'Department', { sortable: false, attributeContentType: AttributeContentType.String })],
    },
] as unknown as SearchFieldListModel[];

const property = (identifier: string, catalogueLabel: string): ColumnDefinition => ({
    fieldSource: FilterFieldSource.Property,
    fieldIdentifier: identifier,
    catalogueLabel,
    sortable: true,
});

const department: ColumnDefinition = {
    fieldSource: FilterFieldSource.Custom,
    fieldIdentifier: 'department|STRING',
    catalogueLabel: 'Department',
    attributeContentType: AttributeContentType.String,
};

const standardColumns = [property('COMMON_NAME', 'Common Name'), property('NOT_AFTER', 'Expires At'), department];

/** As a page actually ships them: a static column set cannot know what the API can order by. */
const undeclaredColumns: ColumnDefinition[] = standardColumns.map(({ sortable: _sortable, ...column }) => column);

const COMMON_NAME = 'property:COMMON_NAME';
const NOT_AFTER = 'property:NOT_AFTER';
const DEPARTMENT = 'custom:department|STRING';

const rows: StubRow[] = [
    {
        uuid: 'cert-1',
        commonName: 'acme.example',
        notAfter: '2027-01-01',
        attributeValues: { [FilterFieldSource.Custom]: { 'department|STRING': [{ data: 'Platform' }] } },
    },
    { uuid: 'cert-2', commonName: 'beta.example', notAfter: '2028-06-30' },
];

const expiryWatch: ListViewModel = {
    uuid: 'view-1',
    name: 'Expiry watch',
    resource: Resource.Certificates,
    columns: [
        { fieldSource: FilterFieldSource.Property, fieldIdentifier: 'COMMON_NAME' },
        { fieldSource: FilterFieldSource.Property, fieldIdentifier: 'NOT_AFTER' },
        { fieldSource: FilterFieldSource.Custom, fieldIdentifier: 'department|STRING' },
    ],
    filters: [],
    defaultView: true,
};

/** A stored view whose order differs from the standard one, so applying it is visible. */
const reorderedView: ListViewModel = {
    ...expiryWatch,
    columns: [
        { fieldSource: FilterFieldSource.Custom, fieldIdentifier: 'department|STRING' },
        { fieldSource: FilterFieldSource.Property, fieldIdentifier: 'COMMON_NAME' },
        { fieldSource: FilterFieldSource.Property, fieldIdentifier: 'NOT_AFTER' },
    ],
};

const headings = async (page: Page): Promise<string[]> => {
    const ids = await page.locator('thead th[data-id]').evaluateAll((cells) => cells.map((cell) => cell.getAttribute('data-id') ?? ''));
    return ids.filter((id) => id !== '' && id !== '__checkbox__');
};

const lastRequest = async (page: Page): Promise<SearchRequestModel | undefined> => {
    const requests = JSON.parse((await page.getByTestId('list-requests').textContent()) ?? '[]') as SearchRequestModel[];
    return requests.at(-1);
};

const requestCount = async (page: Page): Promise<number> => {
    const requests = JSON.parse((await page.getByTestId('list-requests').textContent()) ?? '[]') as SearchRequestModel[];
    return requests.length;
};

const dispatchedTypes = async (page: Page): Promise<string[]> => {
    const dispatched = JSON.parse((await page.getByTestId('dispatched').textContent()) ?? '[]') as Array<{ type: string }>;
    return dispatched.map((action) => action.type);
};

/** WCAG contrast for two `rgb(r, g, b)` strings, as `getComputedStyle` returns them. */
const contrastOf = (foreground: string, background: string): number => {
    const toRgb = (colour: string) => {
        const [r, g, b] = colour.match(/\d+/g)?.map(Number) ?? [0, 0, 0];
        return { r, g, b };
    };

    const light = relativeLuminance(toRgb(foreground));
    const dark = relativeLuminance(toRgb(background));
    const [brighter, darker] = light > dark ? [light, dark] : [dark, light];
    return (brighter + 0.05) / (darker + 0.05);
};

const trigger = (page: Page, columnKey: string) => page.getByTestId(`column-header-menu-${columnKey}-trigger`);

const openMenu = async (page: Page, columnKey: string) => {
    await trigger(page, columnKey).click();
    await expect(page.getByTestId(`column-header-menu-${columnKey}`)).toBeVisible();
};

const centreOf = async (page: Page, selector: string) => {
    const box = await page.locator(selector).boundingBox();
    if (!box) throw new Error(`No box for ${selector}`);
    return { x: box.x + box.width / 2, y: box.y + box.height / 2, box };
};

/** Picks a column up by its control and releases it over the named edge of another column's header. */
const dragColumn = async (page: Page, fromKey: string, toKey: string, edge: 'before' | 'after') => {
    const start = await centreOf(page, `[data-testid="column-header-menu-${fromKey}-trigger"]`);
    const target = await centreOf(page, `thead th[data-id="${toKey}"]`);
    const dropX = edge === 'before' ? target.box.x + 2 : target.box.x + target.box.width - 2;

    await page.mouse.move(start.x, start.y);
    await page.mouse.down();
    await page.mouse.move(dropX, target.y, { steps: 8 });
    await expect(page.getByTestId(`column-header-menu-${fromKey}-drop-indicator`)).toBeVisible();
    await page.mouse.up();
};

test.describe('PagedList · column header menu', () => {
    test('gives every column of a column-driven table its own control', async ({ mount, page }) => {
        await mount(<PagedListColumnsWithStore rows={rows} standardColumns={standardColumns} catalogue={catalogue} />);

        await expect.poll(() => headings(page)).toEqual([COMMON_NAME, NOT_AFTER, DEPARTMENT]);

        for (const key of [COMMON_NAME, NOT_AFTER, DEPARTMENT]) {
            await expect(trigger(page, key)).toBeVisible();
            expect(await trigger(page, key).evaluate((node) => node.closest('th')?.getAttribute('data-id'))).toBe(key);
        }
    });

    test('offers no control until the opening view has been applied, which would replace what it did', async ({ mount, page }) => {
        await mount(
            <PagedListColumnsWithStore
                rows={rows}
                standardColumns={standardColumns}
                catalogue={catalogue}
                views={[reorderedView]}
                withheldViews
                withViewsControl
            />,
        );
        await expect.poll(() => headings(page)).toEqual([COMMON_NAME, NOT_AFTER, DEPARTMENT]);

        await expect(page.locator('[data-testid^="column-header-menu-"]')).toHaveCount(0);

        await page.getByTestId('land-views').click();

        // The view brings its own order, which is what a move made a moment earlier would have lost.
        await expect.poll(() => headings(page)).toEqual([DEPARTMENT, COMMON_NAME, NOT_AFTER]);
        await expect(trigger(page, DEPARTMENT)).toBeVisible();

        await openMenu(page, DEPARTMENT);
        await page.getByTestId(`column-header-menu-${DEPARTMENT}-move-end`).click();
        await expect.poll(() => headings(page)).toEqual([COMMON_NAME, NOT_AFTER, DEPARTMENT]);
    });

    test('offers none while the catalogue the sort entries depend on is still in flight', async ({ mount, page }) => {
        await mount(
            <PagedListColumnsWithStore
                rows={rows}
                standardColumns={undeclaredColumns}
                catalogue={catalogue}
                withheldCatalogue
                withCatalogueControl
            />,
        );
        await expect.poll(() => headings(page)).toHaveLength(3);

        await expect(page.locator('[data-testid^="column-header-menu-"]')).toHaveCount(0);

        await page.getByTestId('land-catalogue').click();

        await expect(trigger(page, NOT_AFTER)).toBeVisible();
        await openMenu(page, NOT_AFTER);
        await expect(page.getByTestId(`column-header-menu-${NOT_AFTER}-sort-asc`)).not.toHaveAttribute('aria-disabled', 'true');
    });

    test('meets the 24px target size, which 4px of gap from the sort button does not excuse', async ({ mount, page }) => {
        await mount(<PagedListColumnsWithStore rows={rows} standardColumns={standardColumns} catalogue={catalogue} />);
        await expect.poll(() => headings(page)).toHaveLength(3);

        const box = await trigger(page, COMMON_NAME).boundingBox();
        expect(box?.width ?? 0).toBeGreaterThanOrEqual(24);
        expect(box?.height ?? 0).toBeGreaterThanOrEqual(24);
    });

    test('names each control after the column it belongs to', async ({ mount, page }) => {
        await mount(<PagedListColumnsWithStore rows={rows} standardColumns={standardColumns} catalogue={catalogue} />);

        await expect(page.getByRole('button', { name: 'Column options for Common Name' })).toBeVisible();
        await expect(page.getByRole('button', { name: 'Column options for Department' })).toBeVisible();
    });

    test('offers both sort directions and all four moves', async ({ mount, page }) => {
        await mount(<PagedListColumnsWithStore rows={rows} standardColumns={standardColumns} catalogue={catalogue} />);
        await expect.poll(() => headings(page)).toHaveLength(3);

        await openMenu(page, NOT_AFTER);

        const menu = page.getByTestId(`column-header-menu-${NOT_AFTER}`);
        await expect(menu.getByRole('menuitem')).toHaveText([
            'Sort ascending',
            'Sort descending',
            'Move left',
            'Move right',
            'Move to the start',
            'Move to the end',
        ]);
    });

    test('orders the whole result set through the server-side sort path', async ({ mount, page }) => {
        await mount(<PagedListColumnsWithStore rows={rows} standardColumns={standardColumns} catalogue={catalogue} />);
        await expect.poll(() => headings(page)).toHaveLength(3);

        await openMenu(page, NOT_AFTER);
        await page.getByTestId(`column-header-menu-${NOT_AFTER}-sort-desc`).click();

        await expect
            .poll(async () => (await lastRequest(page))?.sort)
            .toEqual({ fieldSource: 'property', fieldIdentifier: 'NOT_AFTER', direction: 'desc' });
        await expect(page.locator(`thead th[data-id="${NOT_AFTER}"]`)).toHaveAttribute('aria-sort', 'descending');
        await expect(page.locator(`thead th[data-id="${NOT_AFTER}"]`).getByTestId('sort-indicator')).toHaveAttribute(
            'data-direction',
            'desc',
        );

        // The other direction from an ordering already on the column: an explicit direction is not the
        // header click's toggle, so choosing it has to reach the request rather than turn it around.
        await openMenu(page, NOT_AFTER);
        await page.getByTestId(`column-header-menu-${NOT_AFTER}-sort-asc`).click();

        await expect.poll(async () => (await lastRequest(page))?.sort?.direction).toBe('asc');
        await expect(page.locator(`thead th[data-id="${NOT_AFTER}"]`)).toHaveAttribute('aria-sort', 'ascending');
    });

    test('takes the sort directions away on a column the catalogue cannot order by', async ({ mount, page }) => {
        await mount(<PagedListColumnsWithStore rows={rows} standardColumns={standardColumns} catalogue={catalogue} />);
        await expect.poll(() => headings(page)).toHaveLength(3);

        await openMenu(page, DEPARTMENT);

        const menu = page.getByTestId(`column-header-menu-${DEPARTMENT}`);
        await expect(menu.getByTestId(`column-header-menu-${DEPARTMENT}-sort-asc`)).toHaveAttribute('aria-disabled', 'true');
        await expect(menu.getByTestId(`column-header-menu-${DEPARTMENT}-sort-desc`)).toHaveAttribute('aria-disabled', 'true');
        await expect(menu.getByTestId(`column-header-menu-${DEPARTMENT}-sort-unavailable`)).toBeVisible();

        await menu.getByTestId(`column-header-menu-${DEPARTMENT}-sort-asc`).click({ force: true });
        const settled = await lastRequest(page);
        expect(settled).toBeDefined();
        expect(settled?.sort).toBeUndefined();
        // Inert rather than dismissed: a disabled entry that closed the menu would read as having acted.
        await expect(menu).toBeVisible();
    });

    test('keeps the unavailable entries reachable, and says why where a reader will meet it', async ({ mount, page }) => {
        await mount(<PagedListColumnsWithStore rows={rows} standardColumns={standardColumns} catalogue={catalogue} />);
        await expect.poll(() => headings(page)).toHaveLength(3);

        await openMenu(page, DEPARTMENT);
        const menu = page.getByTestId(`column-header-menu-${DEPARTMENT}`);
        const reason = menu.getByTestId(`column-header-menu-${DEPARTMENT}-sort-unavailable`);

        const reasonId = await reason.getAttribute('id');
        expect(reasonId).toBeTruthy();
        await expect(menu).toHaveAttribute('aria-describedby', reasonId ?? '');
        await expect(menu.getByTestId(`column-header-menu-${DEPARTMENT}-sort-asc`)).toHaveAttribute('aria-describedby', reasonId ?? '');
        await expect(menu.getByTestId(`column-header-menu-${DEPARTMENT}-sort-desc`)).toHaveAttribute('aria-describedby', reasonId ?? '');

        await expect(reason).not.toHaveAttribute('aria-hidden', 'true');
        await expect(reason).toHaveText('This field cannot be used for ordering.');
    });

    test('opens focus onto the unavailable entry rather than stepping over it', async ({ mount, page }) => {
        await mount(<PagedListColumnsWithStore rows={rows} standardColumns={standardColumns} catalogue={catalogue} />);
        await expect.poll(() => headings(page)).toHaveLength(3);

        await trigger(page, DEPARTMENT).focus();
        await page.keyboard.press('Enter');
        await expect(page.getByTestId(`column-header-menu-${DEPARTMENT}`)).toBeVisible();

        // See MenuItem: aria-disabled keeps the entry in the roving focus.
        const entry = page.getByTestId(`column-header-menu-${DEPARTMENT}-sort-asc`);
        await expect(entry).toBeFocused();

        // Focused is not the same as looking focused: keeping the entry in the roving focus is only
        // worth anything if landing on it is visible, and readable once it is.
        const resting = page.getByTestId(`column-header-menu-${DEPARTMENT}-move-right`);
        for (const theme of ['light', 'dark'] as const) {
            await page.evaluate((mode) => document.documentElement.classList.toggle('dark', mode === 'dark'), theme);

            const focused = await entry.evaluate((node) => {
                const style = getComputedStyle(node);
                return { background: style.backgroundColor, color: style.color };
            });
            const unfocused = await resting.evaluate((node) => {
                const style = getComputedStyle(node);
                return { background: style.backgroundColor, color: style.color };
            });

            expect(focused.background, theme).not.toBe(unfocused.background);
            expect(focused.background, theme).not.toBe('rgba(0, 0, 0, 0)');
            // The ratio rather than a difference: the defect this guards was 4.28:1, and any other
            // distinct token would satisfy "the colour changed" while failing AA just the same.
            expect(contrastOf(focused.color, focused.background), theme).toBeGreaterThanOrEqual(4.5);
        }
    });

    test('says the catalogue could not be read rather than that the field cannot be ordered', async ({ mount, page }) => {
        await mount(
            <PagedListColumnsWithStore
                rows={rows}
                standardColumns={standardColumns}
                catalogue={catalogue}
                withheldCatalogue
                withCatalogueFailureControl
            />,
        );
        await expect.poll(() => headings(page)).toHaveLength(3);

        await page.getByTestId('fail-catalogue').click();

        // A failed read settles with no fields behind it, so every column reads unsortable — which is
        // the state, not an answer about the field.
        await expect(trigger(page, NOT_AFTER)).toBeVisible();
        await openMenu(page, NOT_AFTER);
        await expect(page.getByTestId(`column-header-menu-${NOT_AFTER}-sort-unavailable`)).toHaveText(
            'Could not load which fields can be ordered.',
        );
    });

    test('closes again when the control is pressed a second time', async ({ mount, page }) => {
        await mount(<PagedListColumnsWithStore rows={rows} standardColumns={standardColumns} catalogue={catalogue} />);
        await expect.poll(() => headings(page)).toHaveLength(3);

        await openMenu(page, COMMON_NAME);

        // Pressed through the modal layer Radix puts over the page, which is what a second press on
        // the trigger actually meets.
        const spot = await centreOf(page, `[data-testid="column-header-menu-${COMMON_NAME}-trigger"]`);
        await page.mouse.click(spot.x, spot.y);

        await expect(page.getByTestId(`column-header-menu-${COMMON_NAME}`)).toHaveCount(0);
    });

    test('shifts a column one position either way', async ({ mount, page }) => {
        await mount(<PagedListColumnsWithStore rows={rows} standardColumns={standardColumns} catalogue={catalogue} />);
        await expect.poll(() => headings(page)).toHaveLength(3);

        await openMenu(page, NOT_AFTER);
        await page.getByTestId(`column-header-menu-${NOT_AFTER}-move-left`).click();
        await expect.poll(() => headings(page)).toEqual([NOT_AFTER, COMMON_NAME, DEPARTMENT]);

        await openMenu(page, NOT_AFTER);
        await page.getByTestId(`column-header-menu-${NOT_AFTER}-move-right`).click();
        await expect.poll(() => headings(page)).toEqual([COMMON_NAME, NOT_AFTER, DEPARTMENT]);
    });

    test('sends a column to either end in one action', async ({ mount, page }) => {
        await mount(<PagedListColumnsWithStore rows={rows} standardColumns={standardColumns} catalogue={catalogue} />);
        await expect.poll(() => headings(page)).toHaveLength(3);

        await openMenu(page, DEPARTMENT);
        await page.getByTestId(`column-header-menu-${DEPARTMENT}-move-start`).click();
        await expect.poll(() => headings(page)).toEqual([DEPARTMENT, COMMON_NAME, NOT_AFTER]);

        await openMenu(page, DEPARTMENT);
        await page.getByTestId(`column-header-menu-${DEPARTMENT}-move-end`).click();
        await expect.poll(() => headings(page)).toEqual([COMMON_NAME, NOT_AFTER, DEPARTMENT]);
    });

    test('offers no move to a column already at the end the entry names', async ({ mount, page }) => {
        await mount(<PagedListColumnsWithStore rows={rows} standardColumns={standardColumns} catalogue={catalogue} />);
        await expect.poll(() => headings(page)).toHaveLength(3);

        await openMenu(page, COMMON_NAME);
        const first = page.getByTestId(`column-header-menu-${COMMON_NAME}`);
        await expect(first.getByTestId(`column-header-menu-${COMMON_NAME}-move-left`)).toHaveAttribute('aria-disabled', 'true');
        await expect(first.getByTestId(`column-header-menu-${COMMON_NAME}-move-start`)).toHaveAttribute('aria-disabled', 'true');
        await expect(first.getByTestId(`column-header-menu-${COMMON_NAME}-move-right`)).not.toHaveAttribute('aria-disabled', 'true');
        await page.keyboard.press('Escape');

        await openMenu(page, DEPARTMENT);
        const last = page.getByTestId(`column-header-menu-${DEPARTMENT}`);
        await expect(last.getByTestId(`column-header-menu-${DEPARTMENT}-move-right`)).toHaveAttribute('aria-disabled', 'true');
        await expect(last.getByTestId(`column-header-menu-${DEPARTMENT}-move-end`)).toHaveAttribute('aria-disabled', 'true');
        await expect(last.getByTestId(`column-header-menu-${DEPARTMENT}-move-left`)).not.toHaveAttribute('aria-disabled', 'true');
    });

    test('opens the menu on a press that stays within the threshold', async ({ mount, page }) => {
        await mount(<PagedListColumnsWithStore rows={rows} standardColumns={standardColumns} catalogue={catalogue} />);
        await expect.poll(() => headings(page)).toHaveLength(3);

        const start = await centreOf(page, `[data-testid="column-header-menu-${COMMON_NAME}-trigger"]`);
        await page.mouse.move(start.x, start.y);
        await page.mouse.down();
        await page.mouse.move(start.x + 2, start.y + 1);
        await page.mouse.up();

        await expect(page.getByTestId(`column-header-menu-${COMMON_NAME}`)).toBeVisible();
        expect(await headings(page)).toEqual([COMMON_NAME, NOT_AFTER, DEPARTMENT]);
    });

    test('picks the column up instead once the press travels past the threshold', async ({ mount, page }) => {
        await mount(<PagedListColumnsWithStore rows={rows} standardColumns={standardColumns} catalogue={catalogue} />);
        await expect.poll(() => headings(page)).toHaveLength(3);

        await dragColumn(page, COMMON_NAME, DEPARTMENT, 'after');

        await expect(page.getByTestId(`column-header-menu-${COMMON_NAME}`)).toHaveCount(0);
        await expect.poll(() => headings(page)).toEqual([NOT_AFTER, DEPARTMENT, COMMON_NAME]);
    });

    test('drops a column onto the position the indicator marked', async ({ mount, page }) => {
        await mount(<PagedListColumnsWithStore rows={rows} standardColumns={standardColumns} catalogue={catalogue} />);
        await expect.poll(() => headings(page)).toHaveLength(3);

        await dragColumn(page, DEPARTMENT, COMMON_NAME, 'before');
        await expect.poll(() => headings(page)).toEqual([DEPARTMENT, COMMON_NAME, NOT_AFTER]);

        await dragColumn(page, DEPARTMENT, NOT_AFTER, 'before');
        await expect.poll(() => headings(page)).toEqual([COMMON_NAME, DEPARTMENT, NOT_AFTER]);
    });

    test('leaves the header click sorting the column as it always has', async ({ mount, page }) => {
        await mount(<PagedListColumnsWithStore rows={rows} standardColumns={standardColumns} catalogue={catalogue} />);
        await expect.poll(() => headings(page)).toHaveLength(3);

        await page.getByRole('button', { name: 'Expires At', exact: true }).click();
        await expect.poll(async () => (await lastRequest(page))?.sort?.direction).toBe('asc');

        await page.getByRole('button', { name: 'Expires At', exact: true }).click();
        await expect.poll(async () => (await lastRequest(page))?.sort?.direction).toBe('desc');
    });

    test('re-lists nothing for a reorder, so the rows the user ticked survive it', async ({ mount, page }) => {
        await mount(<PagedListColumnsWithStore rows={rows} standardColumns={standardColumns} catalogue={catalogue} />);
        await expect.poll(() => headings(page)).toHaveLength(3);

        const before = await requestCount(page);
        await page.locator('tbody tr').first().getByRole('checkbox').check();

        await openMenu(page, DEPARTMENT);
        await page.getByTestId(`column-header-menu-${DEPARTMENT}-move-start`).click();
        await expect.poll(() => headings(page)).toEqual([DEPARTMENT, COMMON_NAME, NOT_AFTER]);

        expect(await requestCount(page)).toBe(before);
        await expect(page.locator('tbody tr').first().getByRole('checkbox')).toBeChecked();
    });

    test('abandons a drag on Escape, leaving the column where it was', async ({ mount, page }) => {
        await mount(<PagedListColumnsWithStore rows={rows} standardColumns={standardColumns} catalogue={catalogue} />);
        await expect.poll(() => headings(page)).toHaveLength(3);

        const start = await centreOf(page, `[data-testid="column-header-menu-${COMMON_NAME}-trigger"]`);
        const target = await centreOf(page, `thead th[data-id="${DEPARTMENT}"]`);

        await page.mouse.move(start.x, start.y);
        await page.mouse.down();
        await page.mouse.move(target.box.x + target.box.width - 2, target.y, { steps: 8 });
        await expect(page.getByTestId(`column-header-menu-${COMMON_NAME}-drop-indicator`)).toBeVisible();

        await page.keyboard.press('Escape');
        await expect(page.getByTestId(`column-header-menu-${COMMON_NAME}-drop-indicator`)).toHaveCount(0);
        await page.mouse.up();

        expect(await headings(page)).toEqual([COMMON_NAME, NOT_AFTER, DEPARTMENT]);
        await expect(page.getByTestId(`column-header-menu-${COMMON_NAME}`)).toHaveCount(0);
    });

    test('keeps the ordering on the column when it is moved somewhere else', async ({ mount, page }) => {
        await mount(<PagedListColumnsWithStore rows={rows} standardColumns={standardColumns} catalogue={catalogue} />);
        await expect.poll(() => headings(page)).toHaveLength(3);

        await openMenu(page, NOT_AFTER);
        await page.getByTestId(`column-header-menu-${NOT_AFTER}-sort-desc`).click();
        await expect.poll(async () => (await lastRequest(page))?.sort?.direction).toBe('desc');

        await openMenu(page, NOT_AFTER);
        await page.getByTestId(`column-header-menu-${NOT_AFTER}-move-start`).click();

        await expect.poll(() => headings(page)).toEqual([NOT_AFTER, COMMON_NAME, DEPARTMENT]);
        await expect(page.locator(`thead th[data-id="${NOT_AFTER}"]`)).toHaveAttribute('aria-sort', 'descending');
        expect((await lastRequest(page))?.sort?.fieldIdentifier).toBe('NOT_AFTER');
    });

    test('stores nothing, leaving the reorder for the summary bar to save', async ({ mount, page }) => {
        await mount(
            <PagedListColumnsWithStore rows={rows} standardColumns={standardColumns} catalogue={catalogue} views={[expiryWatch]} />,
        );
        await expect(page.getByTestId('view-tabs-tab-view-1')).toBeVisible();
        await expect.poll(() => headings(page)).toHaveLength(3);

        await openMenu(page, DEPARTMENT);
        await page.getByTestId(`column-header-menu-${DEPARTMENT}-move-start`).click();
        await expect.poll(() => headings(page)).toEqual([DEPARTMENT, COMMON_NAME, NOT_AFTER]);

        await expect(page.getByTestId('view-tabs-summary-unsaved')).toBeVisible();
        await expect(page.getByTestId('view-tabs-summary-save')).toHaveText('Save to view');
        expect(await dispatchedTypes(page)).toEqual(['listViews/listViews']);
    });

    test('stores nothing on Standard either, where a sort has no view to write to', async ({ mount, page }) => {
        await mount(<PagedListColumnsWithStore rows={rows} standardColumns={standardColumns} catalogue={catalogue} />);
        await expect.poll(() => headings(page)).toHaveLength(3);

        await openMenu(page, COMMON_NAME);
        await page.getByTestId(`column-header-menu-${COMMON_NAME}-sort-desc`).click();

        await expect.poll(async () => (await lastRequest(page))?.sort?.direction).toBe('desc');
        await expect(page.getByTestId('view-tabs-summary-unsaved')).toBeVisible();
        await expect(page.getByTestId('view-tabs-summary-save')).toHaveText('Save as view…');
        expect(await dispatchedTypes(page)).toEqual(['listViews/listViews']);
    });

    test('opens from the keyboard and hands focus back to the control on dismissal', async ({ mount, page }) => {
        await mount(<PagedListColumnsWithStore rows={rows} standardColumns={standardColumns} catalogue={catalogue} />);
        await expect.poll(() => headings(page)).toHaveLength(3);

        await trigger(page, COMMON_NAME).focus();
        await page.keyboard.press('Enter');

        const menu = page.getByTestId(`column-header-menu-${COMMON_NAME}`);
        await expect(menu).toBeVisible();
        await expect(menu.getByRole('menuitem').first()).toBeFocused();

        await page.keyboard.press('Escape');
        await expect(menu).toHaveCount(0);
        await expect(trigger(page, COMMON_NAME)).toBeFocused();
    });

    test('reorders from the keyboard alone', async ({ mount, page }) => {
        await mount(<PagedListColumnsWithStore rows={rows} standardColumns={standardColumns} catalogue={catalogue} />);
        await expect.poll(() => headings(page)).toHaveLength(3);

        await trigger(page, DEPARTMENT).focus();
        await page.keyboard.press('Enter');
        await expect(page.getByTestId(`column-header-menu-${DEPARTMENT}`)).toBeVisible();

        // Arrowed to rather than focused directly: the roving focus is the mechanism the whole
        // aria-disabled-instead-of-disabled design exists to keep, so reaching the entry is the claim.
        // Stepped one assertion at a time because Radix drops presses that arrive before it has
        // handled the one before, which reads as the traversal stalling.
        await expect(page.getByTestId(`column-header-menu-${DEPARTMENT}-sort-asc`)).toBeFocused();
        for (const entry of ['sort-desc', 'move-left', 'move-right', 'move-start']) {
            await page.keyboard.press('ArrowDown');
            await expect(page.getByTestId(`column-header-menu-${DEPARTMENT}-${entry}`)).toBeFocused();
        }

        await page.keyboard.press('Enter');

        await expect.poll(() => headings(page)).toEqual([DEPARTMENT, COMMON_NAME, NOT_AFTER]);
    });
});
