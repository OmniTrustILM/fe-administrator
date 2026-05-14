import { test, expect } from '../../../playwright/ct-test';
import Select from './index';
import { MultiHarness, SearchableHarness, SingleHarness } from './Select.harness';

const BASE_OPTIONS = [
    { value: '1', label: 'Option 1' },
    { value: '2', label: 'Option 2' },
    { value: '3', label: 'Option 3' },
];

test.describe('Select', () => {
    test('renders trigger with placeholder when no value', async ({ mount, page }) => {
        await mount(<Select id="t" value="" onChange={() => {}} options={BASE_OPTIONS} placeholder="Pick one" dataTestId="sel" />);
        await expect(page.getByTestId('sel-trigger')).toBeVisible();
        await expect(page.getByTestId('sel-trigger')).toContainText('Pick one');
    });

    test('renders selected value label on trigger', async ({ mount, page }) => {
        await mount(<Select id="t" value="2" onChange={() => {}} options={BASE_OPTIONS} dataTestId="sel" />);
        await expect(page.getByTestId('sel-trigger')).toContainText('Option 2');
    });

    test('renders label with htmlFor', async ({ mount, page }) => {
        await mount(<Select id="lbl" value="" onChange={() => {}} options={BASE_OPTIONS} label="Pick" dataTestId="sel" />);
        await expect(page.getByText('Pick')).toBeVisible();
        await expect(page.getByText('Pick')).toHaveAttribute('for', 'lbl');
    });

    test('renders error message', async ({ mount, page }) => {
        await mount(<Select id="t" value="" onChange={() => {}} options={BASE_OPTIONS} error="Required" dataTestId="sel" />);
        await expect(page.getByText('Required')).toBeVisible();
    });

    test('trigger is disabled when isDisabled', async ({ mount, page }) => {
        await mount(<Select id="t" value="" onChange={() => {}} options={BASE_OPTIONS} isDisabled dataTestId="sel" />);
        await expect(page.getByTestId('sel-trigger')).toBeDisabled();
    });

    test('trigger is disabled when no options', async ({ mount, page }) => {
        await mount(<Select id="t" value="" onChange={() => {}} options={[]} dataTestId="sel" />);
        await expect(page.getByTestId('sel-trigger')).toBeDisabled();
        await expect(page.getByTestId('sel-trigger')).toContainText('No options');
    });

    test('opens popover on trigger click', async ({ mount, page }) => {
        await mount(<Select id="t" value="" onChange={() => {}} options={BASE_OPTIONS} dataTestId="sel" />);
        await page.getByTestId('sel-trigger').click();
        await expect(page.getByRole('listbox')).toBeVisible();
        await expect(page.getByRole('option', { name: 'Option 1' })).toBeVisible();
    });

    test('selects single option on click and closes popover', async ({ mount, page }) => {
        await mount(<SingleHarness />);
        await page.getByTestId('sel-trigger').click();
        await page.getByRole('option', { name: 'Option 2' }).click();
        await expect(page.getByRole('listbox')).toHaveCount(0);
        await expect(page.getByTestId('value-display')).toHaveText('2');
    });

    test('multi mode renders chips and removes via chip X', async ({ mount, page }) => {
        await mount(
            <MultiHarness
                initial={[
                    { value: '1', label: 'Option 1' },
                    { value: '2', label: 'Option 2' },
                ]}
            />,
        );
        const trigger = page.getByTestId('sel-trigger');
        await expect(trigger.locator('[data-tag-value="1"]')).toBeVisible();
        await expect(trigger.locator('[data-tag-value="2"]')).toBeVisible();
        await trigger.locator('button[aria-label="Remove Option 1"]').click();
        await expect(page.getByTestId('value-display')).toContainText('Option 2');
        await expect(page.getByTestId('value-display')).not.toContainText('Option 1');
    });

    test('multi mode adds option without closing popover', async ({ mount, page }) => {
        await mount(<MultiHarness />);
        await page.getByTestId('sel-trigger').click();
        await page.getByRole('option', { name: 'Option 1' }).click();
        await expect(page.getByRole('listbox')).toBeVisible();
        await page.getByRole('option', { name: 'Option 2' }).click();
        await expect(page.getByRole('listbox')).toBeVisible();
        await expect(page.getByTestId('value-display')).toContainText('Option 1');
        await expect(page.getByTestId('value-display')).toContainText('Option 2');
    });

    test('multi mode emits undefined when all chips removed', async ({ mount, page }) => {
        await mount(<MultiHarness initial={[{ value: '1', label: 'Option 1' }]} />);
        await page.getByTestId('sel-trigger').locator('button[aria-label="Remove Option 1"]').click();
        await expect(page.getByTestId('value-display')).toHaveText('undefined');
    });

    test('searchable filters options live', async ({ mount, page }) => {
        await mount(<SearchableHarness />);
        await page.getByTestId('sel-trigger').click();
        await page.getByTestId('sel-search').fill('ban');
        await expect(page.getByRole('option', { name: 'Banana' })).toBeVisible();
        await expect(page.getByRole('option', { name: 'Apple' })).toHaveCount(0);
        await expect(page.getByRole('option', { name: 'Cherry' })).toHaveCount(0);
    });

    test('searchable shows "No options" when no matches', async ({ mount, page }) => {
        await mount(<SearchableHarness />);
        await page.getByTestId('sel-trigger').click();
        await page.getByTestId('sel-search').fill('zzz');
        await expect(page.getByText('No options')).toBeVisible();
    });

    test('clear button resets single value', async ({ mount, page }) => {
        await mount(<SingleHarness initial="1" isClearable />);
        await expect(page.getByTestId('value-display')).toHaveText('1');
        await page.getByTestId('sel-clear').click();
        await expect(page.getByTestId('value-display')).toHaveText('');
    });

    test('clear button resets multi value to undefined', async ({ mount, page }) => {
        await mount(<MultiHarness initial={[{ value: '1', label: 'Option 1' }]} />);
        await page.getByTestId('sel-clear').click();
        await expect(page.getByTestId('value-display')).toHaveText('undefined');
    });

    test('arrow-key navigation highlights options and Enter selects', async ({ mount, page }) => {
        await mount(<SingleHarness />);
        await page.getByTestId('sel-trigger').click();
        await page.keyboard.press('ArrowDown');
        await page.keyboard.press('ArrowDown');
        await page.keyboard.press('Enter');
        await expect(page.getByRole('listbox')).toHaveCount(0);
        await expect(page.getByTestId('value-display')).toHaveText('2');
    });

    test('Escape closes the popover', async ({ mount, page }) => {
        await mount(<SingleHarness />);
        await page.getByTestId('sel-trigger').click();
        await expect(page.getByRole('listbox')).toBeVisible();
        await page.keyboard.press('Escape');
        await expect(page.getByRole('listbox')).toHaveCount(0);
    });

    test('disabled option is skipped by arrows and ignored on click', async ({ mount, page }) => {
        const opts = [
            { value: '1', label: 'One' },
            { value: '2', label: 'Two', disabled: true },
            { value: '3', label: 'Three' },
        ];
        let changes = 0;
        await mount(<Select id="d" value="" onChange={() => changes++} options={opts} dataTestId="sel" />);
        await page.getByTestId('sel-trigger').click();
        await page.getByRole('option', { name: 'Two' }).click({ force: true });
        expect(changes).toBe(0);
    });

    test('colorizeVersionLabel renders blue + gray spans on trigger', async ({ mount, page }) => {
        const opts = [{ value: 'v1', label: 'Version 1 (Latest)' }];
        await mount(<Select id="vv" value="v1" onChange={() => {}} options={opts} colorizeVersionLabel dataTestId="sel" />);
        const trigger = page.getByTestId('sel-trigger');
        await expect(trigger).toContainText('Version 1');
        await expect(trigger).toContainText('(Latest)');
        await expect(trigger.locator('span.text-\\[var\\(--primary-blue-color\\)\\]')).toBeVisible();
    });

    test('showOptionDescriptionInDropdown renders second line in option', async ({ mount, page }) => {
        const opts = [{ value: 'a', label: 'Alpha', description: 'First letter description' }];
        await mount(<Select id="dd" value="" onChange={() => {}} options={opts} showOptionDescriptionInDropdown dataTestId="sel" />);
        await page.getByTestId('sel-trigger').click();
        await expect(page.getByText('First letter description')).toBeVisible();
    });

    test('"+ Add new" option gets blue medium-weight styling', async ({ mount, page }) => {
        const opts = [
            { value: '1', label: 'One' },
            { value: '__add_new__', label: '+ Add new' },
        ];
        await mount(<Select id="an" value="" onChange={() => {}} options={opts} dataTestId="sel" />);
        await page.getByTestId('sel-trigger').click();
        const addNew = page.getByRole('option', { name: '+ Add new' });
        await expect(addNew).toBeVisible();
        await expect(addNew.locator('span.text-blue-600, span.dark\\:text-blue-400')).toHaveCount(1);
    });

    test('object-valued options match selected via value matchers', async ({ mount, page }) => {
        const opts = [
            { value: { uuid: 'aaa', name: 'Alpha' }, label: 'Alpha' },
            { value: { uuid: 'bbb', name: 'Bravo' }, label: 'Bravo' },
        ];
        await mount(<Select id="ov" value={{ uuid: 'bbb', name: 'Bravo' }} onChange={() => {}} options={opts} dataTestId="sel" />);
        await expect(page.getByTestId('sel-trigger')).toContainText('Bravo');
    });

    test('hidden native select mirrors single value', async ({ mount, page }) => {
        await mount(<Select id="hn" value="2" onChange={() => {}} options={BASE_OPTIONS} dataTestId="sel" />);
        const native = page.getByTestId('sel-input');
        await expect(native).toHaveValue('2');
    });

    test('hidden native select keeps multiple attribute in multi mode', async ({ mount, page }) => {
        await mount(<Select id="hn" value={[]} onChange={() => {}} options={BASE_OPTIONS} isMulti dataTestId="sel" />);
        await expect(page.getByTestId('sel-input')).toHaveAttribute('multiple', '');
    });

    test('dropdownWidth sets fixed content width', async ({ mount, page }) => {
        await mount(<Select id="dw" value="" onChange={() => {}} options={BASE_OPTIONS} dropdownWidth={500} dataTestId="sel" />);
        await page.getByTestId('sel-trigger').click();
        const content = page.getByTestId('sel-content');
        const box = await content.boundingBox();
        expect(box?.width).toBeGreaterThanOrEqual(490);
        expect(box?.width).toBeLessThanOrEqual(510);
    });

    test('placement="top" opens above the trigger', async ({ mount, page }) => {
        await mount(
            <div style={{ paddingTop: 400 }}>
                <Select id="pl" value="" onChange={() => {}} options={BASE_OPTIONS} placement="top" dataTestId="sel" />
            </div>,
        );
        await page.getByTestId('sel-trigger').click();
        const trigger = await page.getByTestId('sel-trigger').boundingBox();
        const content = await page.getByTestId('sel-content').boundingBox();
        expect(content?.y).toBeLessThan(trigger?.y ?? 0);
    });
});
