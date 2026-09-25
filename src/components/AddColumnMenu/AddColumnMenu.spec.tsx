import { FilterFieldSource } from 'types/openapi';
import type { ColumnDefinition, SourcedCatalogueField } from 'types/tableColumns';
import { expect, test, type Page } from '../../../playwright/ct-test';
import AddColumnMenuHarness from './AddColumnMenuHarness';

const field = (source: FilterFieldSource, identifier: string, label: string) =>
    ({ fieldSource: source, fieldIdentifier: identifier, fieldLabel: label, sortable: true }) as SourcedCatalogueField;

const fields = [
    field(FilterFieldSource.Property, 'COMMON_NAME', 'Common Name'),
    field(FilterFieldSource.Property, 'NOT_AFTER', 'Expires At'),
    field(FilterFieldSource.Custom, 'costCentre|STRING', 'Cost centre'),
    field(FilterFieldSource.Meta, 'discoverySource|STRING', 'Discovery source'),
];

const column = (source: FilterFieldSource, identifier: string, catalogueLabel: string): ColumnDefinition => ({
    fieldSource: source,
    fieldIdentifier: identifier,
    catalogueLabel,
    sortable: true,
});

const commonName = column(FilterFieldSource.Property, 'COMMON_NAME', 'Common Name');
const expiresAt = column(FilterFieldSource.Property, 'NOT_AFTER', 'Expires At');

const appliedColumns = async (page: Page): Promise<string[]> =>
    JSON.parse((await page.getByTestId('applied-columns').textContent()) ?? '[]') as string[];

const manyFields = Array.from({ length: 80 }, (_, i) => {
    const sources = [FilterFieldSource.Property, FilterFieldSource.Meta, FilterFieldSource.Custom, FilterFieldSource.Data];
    return field(sources[i % sources.length], `FIELD_${i}`, `Field ${i}`);
});

/** Puts the trigger low on the page, so the menu opens short of height, as it does below a table header. */
const lowerTheTrigger = async (page: Page) => {
    await page.setViewportSize({ width: 1440, height: 900 });
    await page.addStyleTag({ content: '#root { padding-top: 380px; }' });
};

const shownColumns = (count: number) => manyFields.slice(0, count).map((f) => column(f.fieldSource, f.fieldIdentifier, f.fieldLabel));

test.describe('AddColumnMenu', () => {
    test('opens the catalogue as four source columns, an unpublished source included', async ({ mount, page }) => {
        await mount(<AddColumnMenuHarness fields={fields} columns={[commonName, expiresAt]} />);

        await page.getByTestId('add-column-menu-trigger').click();

        await expect(page.getByTestId('add-column-menu')).toBeVisible();
        for (const source of [FilterFieldSource.Custom, FilterFieldSource.Meta, FilterFieldSource.Data, FilterFieldSource.Property]) {
            await expect(page.getByTestId(`add-column-menu-source-${source}`)).toBeVisible();
        }
        await expect(page.getByTestId(`add-column-menu-source-${FilterFieldSource.Data}`)).toContainText('None published');
    });

    test('reports which fields are already columns', async ({ mount, page }) => {
        await mount(<AddColumnMenuHarness fields={fields} columns={[commonName, expiresAt]} />);

        await page.getByTestId('add-column-menu-trigger').click();

        await expect(page.getByTestId('add-column-menu-field-property:COMMON_NAME')).toBeChecked();
        await expect(page.getByTestId('add-column-menu-field-custom:costCentre|STRING')).not.toBeChecked();
    });

    test('puts a checked field first, where it is visible without scrolling the table', async ({ mount, page }) => {
        await mount(<AddColumnMenuHarness fields={fields} columns={[commonName, expiresAt]} />);

        await page.getByTestId('add-column-menu-trigger').click();
        await page.getByTestId('add-column-menu-field-custom:costCentre|STRING').check();

        await expect.poll(() => appliedColumns(page)).toEqual(['custom:costCentre|STRING', 'property:COMMON_NAME', 'property:NOT_AFTER']);
    });

    test('stays open across a toggle, so several fields can be checked in one visit', async ({ mount, page }) => {
        await mount(<AddColumnMenuHarness fields={fields} columns={[commonName, expiresAt]} />);

        await page.getByTestId('add-column-menu-trigger').click();
        await page.getByTestId('add-column-menu-field-custom:costCentre|STRING').check();

        await expect(page.getByTestId('add-column-menu')).toBeVisible();

        await page.getByTestId('add-column-menu-field-meta:discoverySource|STRING').check();

        await expect
            .poll(() => appliedColumns(page))
            .toEqual(['meta:discoverySource|STRING', 'custom:costCentre|STRING', 'property:COMMON_NAME', 'property:NOT_AFTER']);
    });

    test('lists what the table is showing above the catalogue, and keeps it out of its source column', async ({ mount, page }) => {
        await mount(<AddColumnMenuHarness fields={fields} columns={[expiresAt, commonName]} />);

        await page.getByTestId('add-column-menu-trigger').click();

        const shown = page.getByTestId('add-column-menu-shown');
        await expect(shown.getByRole('checkbox')).toHaveCount(2);
        await expect(shown.getByTestId('add-column-menu-field-property:NOT_AFTER')).toBeChecked();
        await expect(
            page.getByTestId('add-column-menu-source-property').getByTestId('add-column-menu-field-property:NOT_AFTER'),
        ).toHaveCount(0);
    });

    test('moves a field into the shown section as it is checked', async ({ mount, page }) => {
        await mount(<AddColumnMenuHarness fields={fields} columns={[commonName, expiresAt]} />);

        await page.getByTestId('add-column-menu-trigger').click();
        await page.getByTestId('add-column-menu-field-custom:costCentre|STRING').check();

        const shown = page.getByTestId('add-column-menu-shown');
        await expect(shown.getByTestId('add-column-menu-field-custom:costCentre|STRING')).toBeVisible();
        await expect(
            page.getByTestId('add-column-menu-source-custom').getByTestId('add-column-menu-field-custom:costCentre|STRING'),
        ).toHaveCount(0);
    });

    test('keeps focus on the field a toggle moves between the two lists', async ({ mount, page }) => {
        await mount(<AddColumnMenuHarness fields={fields} columns={[commonName, expiresAt]} />);

        await page.getByTestId('add-column-menu-trigger').click();
        const field = page.getByTestId('add-column-menu-field-custom:costCentre|STRING');
        await field.focus();
        await field.press(' ');

        // It has moved into the shown section and been remounted there; focus has to have gone with it.
        await expect.poll(() => appliedColumns(page)).toContain('custom:costCentre|STRING');
        await expect(page.getByTestId('add-column-menu-field-custom:costCentre|STRING')).toBeFocused();
    });

    test('scrolls the shown section once it outgrows half the menu, rather than spilling over the catalogue', async ({ mount, page }) => {
        await lowerTheTrigger(page);
        await mount(<AddColumnMenuHarness fields={manyFields} columns={shownColumns(40)} />);

        await page.getByTestId('add-column-menu-trigger').click();
        const shown = page.getByTestId('add-column-menu-shown');
        const lastShown = shown.getByRole('listitem').last();
        await lastShown.scrollIntoViewIfNeeded();

        const menuBox = await page.getByTestId('add-column-menu').boundingBox();
        const shownBox = await shown.boundingBox();
        const rowBox = await lastShown.boundingBox();
        const catalogueBox = await page.getByTestId('add-column-menu-source-property').boundingBox();
        if (!menuBox || !shownBox || !rowBox || !catalogueBox) throw new Error('menu did not lay out');

        expect(shownBox.height).toBeLessThanOrEqual(menuBox.height / 2);
        expect(rowBox.y + rowBox.height).toBeLessThanOrEqual(shownBox.y + shownBox.height);
        expect(shownBox.y + shownBox.height).toBeLessThanOrEqual(catalogueBox.y);
    });

    test('shows every selected column without scrolling while they fit in half the menu', async ({ mount, page }) => {
        await lowerTheTrigger(page);
        await mount(<AddColumnMenuHarness fields={manyFields} columns={shownColumns(14)} />);

        await page.getByTestId('add-column-menu-trigger').click();
        const shown = page.getByTestId('add-column-menu-shown');
        await expect(shown).toBeVisible();

        expect(await shown.evaluate((el) => el.scrollHeight <= el.clientHeight)).toBe(true);
    });

    test('truncates a long selected label on a narrow screen rather than scrolling the section sideways', async ({ mount, page }) => {
        await page.setViewportSize({ width: 375, height: 700 });
        const longLabel = field(FilterFieldSource.Custom, 'owner|STRING', 'An organisation-wide ownership attribute with a very long name');
        await mount(
            <AddColumnMenuHarness
                fields={[...fields, longLabel]}
                columns={[commonName, column(FilterFieldSource.Custom, 'owner|STRING', longLabel.fieldLabel)]}
            />,
        );

        await page.getByTestId('add-column-menu-trigger').click();
        const shown = page.getByTestId('add-column-menu-shown');
        await expect(shown).toBeVisible();

        expect(await shown.evaluate((el) => el.scrollWidth <= el.clientWidth)).toBe(true);
    });

    test('puts the platform column set back from the reset entry', async ({ mount, page }) => {
        await mount(<AddColumnMenuHarness fields={fields} columns={[commonName, expiresAt]} standardColumns={[commonName]} />);

        await page.getByTestId('add-column-menu-trigger').click();
        await page.getByTestId('add-column-menu-reset').click();

        await expect.poll(() => appliedColumns(page)).toEqual(['property:COMMON_NAME']);
        await expect(page.getByTestId('add-column-menu')).toBeVisible();
    });

    test('offers no reset where the host has nothing to go back to', async ({ mount, page }) => {
        await mount(<AddColumnMenuHarness fields={fields} columns={[commonName, expiresAt]} />);

        await page.getByTestId('add-column-menu-trigger').click();

        await expect(page.getByTestId('add-column-menu')).toBeVisible();
        await expect(page.getByTestId('add-column-menu-reset')).toHaveCount(0);
    });

    test('names each source group with its coloured tag', async ({ mount, page }) => {
        await mount(<AddColumnMenuHarness fields={fields} columns={[commonName]} />);

        await page.getByTestId('add-column-menu-trigger').click();

        await expect(page.getByTestId('add-column-menu-legend-property')).toHaveText('Property');
        await expect(page.getByTestId('add-column-menu-legend-custom')).toHaveText('Custom attribute');
        await expect(page.getByTestId('add-column-menu-legend-meta')).toHaveText('Metadata');
        await expect(page.getByTestId('add-column-menu-legend-data')).toHaveText('Data attribute');
    });

    test('takes a column away when its field is unchecked', async ({ mount, page }) => {
        await mount(<AddColumnMenuHarness fields={fields} columns={[commonName, expiresAt]} />);

        await page.getByTestId('add-column-menu-trigger').click();
        await page.getByTestId('add-column-menu-field-property:NOT_AFTER').uncheck();

        await expect.poll(() => appliedColumns(page)).toEqual(['property:COMMON_NAME']);
    });

    test('will not let the last remaining column be unchecked', async ({ mount, page }) => {
        await mount(<AddColumnMenuHarness fields={fields} columns={[commonName]} />);

        await page.getByTestId('add-column-menu-trigger').click();

        const last = page.getByTestId('add-column-menu-field-property:COMMON_NAME');
        await expect(last).toBeChecked();
        await expect(last).toBeDisabled();
        await expect(page.getByTestId('add-column-menu-field-property:NOT_AFTER')).toBeEnabled();
    });

    test('searches across every source at once', async ({ mount, page }) => {
        await mount(<AddColumnMenuHarness fields={fields} columns={[commonName, expiresAt]} />);

        await page.getByTestId('add-column-menu-trigger').click();
        await page.getByTestId('add-column-menu-search').fill('co');

        await expect(page.getByTestId('add-column-menu-field-custom:costCentre|STRING')).toBeVisible();
        await expect(page.getByTestId('add-column-menu-field-meta:discoverySource|STRING')).toBeVisible();
        await expect(page.getByTestId('add-column-menu-field-property:COMMON_NAME')).toBeVisible();
        await expect(page.getByTestId('add-column-menu-field-property:NOT_AFTER')).toHaveCount(0);
    });

    test('tells a source emptied by the search from one that publishes nothing', async ({ mount, page }) => {
        await mount(<AddColumnMenuHarness fields={fields} columns={[commonName, expiresAt]} />);

        await page.getByTestId('add-column-menu-trigger').click();
        await page.getByTestId('add-column-menu-search').fill('zzz');

        await expect(page.getByTestId(`add-column-menu-source-${FilterFieldSource.Meta}`)).toContainText('No match');
        await expect(page.getByTestId(`add-column-menu-source-${FilterFieldSource.Data}`)).toContainText('None published');
    });

    test('says the catalogue is still loading rather than that nothing is published', async ({ mount, page }) => {
        await mount(<AddColumnMenuHarness fields={[]} columns={[commonName, expiresAt]} isCatalogueLoaded={false} />);

        await page.getByTestId('add-column-menu-trigger').click();

        await expect(page.getByTestId(`add-column-menu-source-${FilterFieldSource.Custom}`)).toContainText('Loading');
        await expect(page.getByTestId('add-column-menu')).not.toContainText('None published');
    });

    test('names each checkbox by its field and its source', async ({ mount, page }) => {
        await mount(<AddColumnMenuHarness fields={fields} columns={[commonName, expiresAt]} />);

        await page.getByTestId('add-column-menu-trigger').click();

        await expect(page.getByRole('checkbox', { name: 'Cost centre Custom attribute' })).toBeVisible();
        await expect(page.getByRole('checkbox', { name: 'Common Name Property' })).toBeVisible();
    });

    test('opens from the keyboard and gives focus back to the trigger on Escape', async ({ mount, page }) => {
        await mount(<AddColumnMenuHarness fields={fields} columns={[commonName, expiresAt]} />);

        const trigger = page.getByRole('button', { name: 'Add column' });
        await trigger.focus();
        await page.keyboard.press('Enter');

        await expect(page.getByTestId('add-column-menu')).toBeVisible();
        expect(await page.evaluate(() => document.querySelector('[data-testid="add-column-menu"]')?.contains(document.activeElement))).toBe(
            true,
        );

        await page.keyboard.press('Escape');

        await expect(page.getByTestId('add-column-menu')).toHaveCount(0);
        await expect(trigger).toBeFocused();
    });

    test('checks a field from the keyboard', async ({ mount, page }) => {
        await mount(<AddColumnMenuHarness fields={fields} columns={[commonName, expiresAt]} />);

        await page.getByTestId('add-column-menu-trigger').click();
        await page.getByTestId('add-column-menu-field-custom:costCentre|STRING').focus();
        await page.keyboard.press('Space');

        await expect.poll(() => appliedColumns(page)).toContain('custom:costCentre|STRING');
    });

    test('names the locked checkbox with the reason it cannot be unchecked', async ({ mount, page }) => {
        await mount(<AddColumnMenuHarness fields={fields} columns={[commonName]} />);

        await page.getByTestId('add-column-menu-trigger').click();

        await expect(page.getByRole('checkbox', { name: /A view must keep at least one column/ })).toBeVisible();
    });

    test('shows the reason the last checkbox is locked where a sighted keyboard user can read it', async ({ mount, page }) => {
        await mount(<AddColumnMenuHarness fields={fields} columns={[commonName]} />);

        await page.getByTestId('add-column-menu-trigger').click();

        await expect(page.getByTestId('add-column-menu-hint')).toHaveText('A view must keep at least one column');
    });

    test('names no such reason while more than one column stands', async ({ mount, page }) => {
        await mount(<AddColumnMenuHarness fields={fields} columns={[commonName, expiresAt]} />);

        await page.getByTestId('add-column-menu-trigger').click();

        await expect(page.getByTestId('add-column-menu')).toBeVisible();
        await expect(page.getByTestId('add-column-menu-hint')).toHaveCount(0);
    });

    test('locks every checkbox, and says why, while the host cannot keep a change', async ({ mount, page }) => {
        await mount(<AddColumnMenuHarness fields={fields} columns={[commonName, expiresAt]} canToggle={false} />);

        await page.getByTestId('add-column-menu-trigger').click();

        await expect(page.getByTestId('add-column-menu-field-custom:costCentre|STRING')).toBeDisabled();
        await expect(page.getByTestId('add-column-menu-field-property:COMMON_NAME')).toBeDisabled();
        await expect(page.getByTestId('add-column-menu-hint')).toHaveText('Columns cannot be changed while the page is loading');
    });

    test('counts the fields in the search placeholder only once the catalogue has arrived', async ({ mount, page }) => {
        await mount(<AddColumnMenuHarness fields={[]} columns={[commonName, expiresAt]} isCatalogueLoaded={false} />);

        await page.getByTestId('add-column-menu-trigger').click();

        await expect(page.getByTestId('add-column-menu-search')).toHaveAttribute('placeholder', 'Search fields…');
    });

    test('counts them once it has', async ({ mount, page }) => {
        await mount(<AddColumnMenuHarness fields={fields} columns={[commonName, expiresAt]} />);

        await page.getByTestId('add-column-menu-trigger').click();

        await expect(page.getByTestId('add-column-menu-search')).toHaveAttribute('placeholder', 'Search 4 fields…');
    });
});
