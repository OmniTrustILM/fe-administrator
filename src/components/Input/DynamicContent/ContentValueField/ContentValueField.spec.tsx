import { test, expect } from '../../../../../playwright/ct-test';
import ContentValueFieldTestWrapper from './ContentValueFieldTestWrapper';
import { buildDescriptor } from './ContentValueFieldTestDescriptors';
import { AttributeContentType } from 'types/openapi';

type Page = import('@playwright/test').Page;

const fieldLocator = '[id="testAttr"]';
const readOnlyTextProps = {
    label: 'Test',
    visible: true,
    required: false,
    readOnly: true,
    list: false,
    multiSelect: false,
    extensibleList: false,
};
const requiredTextProps = {
    label: 'Test',
    visible: true,
    required: true,
    readOnly: false,
    list: false,
    multiSelect: false,
    extensibleList: false,
};

function buildListDescriptor({
    name,
    contentType = AttributeContentType.String,
    multiSelect = false,
    content,
}: {
    name: string;
    contentType?: AttributeContentType;
    multiSelect?: boolean;
    content: Array<{ data: string; reference?: string }>;
}) {
    return buildDescriptor({
        name,
        contentType,
        properties: {
            label: 'List',
            visible: true,
            required: false,
            readOnly: false,
            list: true,
            multiSelect,
            extensibleList: false,
        } as any,
        content,
    });
}

function buildExtensibleDescriptor({
    name,
    label = 'Extensible List',
    multiSelect = false,
    content,
}: {
    name: string;
    label?: string;
    multiSelect?: boolean;
    content?: Array<{ data: string }>;
}) {
    return buildDescriptor({
        name,
        contentType: AttributeContentType.String,
        properties: {
            label,
            visible: true,
            required: false,
            readOnly: false,
            list: true,
            multiSelect,
            extensibleList: true,
        } as any,
        content,
    });
}

function createSubmitTracker() {
    const result: { uuid: string; value: unknown[] } = { uuid: '', value: [] };
    const onSubmit = (uuid: string, content: unknown[]) => {
        result.uuid = uuid;
        result.value = content;
    };
    return { result, onSubmit };
}

async function setTimeValue(page: Page, value: string) {
    const input = page.locator(fieldLocator);
    await input.evaluate((element) => {
        const field = element as HTMLInputElement;
        field.removeAttribute('readonly');
        field.setAttribute('type', 'text');
    });
    await input.fill(value);
}

async function triggerSelectChange(page: Page, selectId: string, selectedValues: string[]) {
    const trigger = page.getByTestId(`select-${selectId}-trigger`);
    await trigger.click();
    // Iterate options; clicking toggles selection for multi, replaces for single.
    for (const value of selectedValues) {
        await page.locator(`[role="option"][data-value="${value}"]`).click();
    }
    // Close the popover by pressing Escape (mostly relevant for multi-select where it stays open).
    await page.keyboard.press('Escape');
}

async function clearMultiSelect(page: Page, selectId: string) {
    const clearBtn = page.getByTestId(`select-${selectId}-clear`);
    if ((await clearBtn.count()) > 0) {
        await clearBtn.click();
    }
}

test.describe('ContentValueField', () => {
    test('renders string field and Save button', async ({ mount, page }) => {
        await mount(<ContentValueFieldTestWrapper descriptor={buildDescriptor({ contentType: AttributeContentType.String })} />);
        await expect(page.locator(fieldLocator)).toBeVisible();
        const saveBtn = page.getByTestId('save-custom-value');
        await expect(saveBtn).toBeDisabled();
    });

    test('string: fill value enables Save and onSubmit is called', async ({ mount, page }) => {
        const { result, onSubmit } = createSubmitTracker();
        await mount(
            <ContentValueFieldTestWrapper descriptor={buildDescriptor({ contentType: AttributeContentType.String })} onSubmit={onSubmit} />,
        );
        const input = page.locator(fieldLocator);
        await input.focus();
        await input.fill('hello');
        await expect(page.getByTestId('save-custom-value')).toBeEnabled();
        await page.getByTestId('save-custom-value').click();
        expect(result.uuid).toBe('test-uuid');
        expect(result.value).toEqual([{ data: 'hello' }]);
    });

    test('textarea type renders', async ({ mount, page }) => {
        await mount(<ContentValueFieldTestWrapper descriptor={buildDescriptor({ contentType: AttributeContentType.Text })} />);
        await expect(page.locator(fieldLocator)).toBeVisible();
    });

    for (const [name, inputValue] of [
        ['submits non-zero value', '42'],
        ['zero is valid content', '0'],
    ] as const) {
        test(`Integer: ${name}`, async ({ mount, page }) => {
            const { result, onSubmit } = createSubmitTracker();
            await mount(
                <ContentValueFieldTestWrapper
                    descriptor={buildDescriptor({ contentType: AttributeContentType.Integer })}
                    onSubmit={onSubmit}
                />,
            );
            await page.locator(fieldLocator).fill(inputValue);
            await page.getByTestId('save-custom-value').click();
            expect(result.value).toHaveLength(1);
            expect((result.value[0] as { data: unknown }).data).toBe(inputValue);
        });
    }

    test('Float type renders number input', async ({ mount, page }) => {
        await mount(<ContentValueFieldTestWrapper descriptor={buildDescriptor({ contentType: AttributeContentType.Float })} />);
        await expect(page.locator(fieldLocator)).toBeVisible();
    });

    test('checkbox (Boolean) renders Switch and Save submits boolean', async ({ mount, page }) => {
        const { result, onSubmit } = createSubmitTracker();
        await mount(
            <ContentValueFieldTestWrapper
                descriptor={buildDescriptor({ contentType: AttributeContentType.Boolean })}
                onSubmit={onSubmit}
            />,
        );
        await expect(page.getByTestId('switch-testAttr')).toBeVisible();
        await page.locator('label[for="testAttr"]').first().click();
        await expect(page.getByTestId('save-custom-value')).toBeEnabled();
        await page.getByTestId('save-custom-value').click();
        expect(result.value).toEqual([{ data: true }]);
    });

    test('date type: beforeOnSubmit formats date', async ({ mount, page }) => {
        const { result, onSubmit } = createSubmitTracker();
        await mount(
            <ContentValueFieldTestWrapper descriptor={buildDescriptor({ contentType: AttributeContentType.Date })} onSubmit={onSubmit} />,
        );
        const input = page.locator(fieldLocator);
        await input.click();
        await expect(page.locator('div.fixed').first()).toBeVisible({ timeout: 5000 });
        const day15 = page.locator('div.fixed').getByRole('button', { name: '15' }).first();
        await day15.click();
        await page.getByTestId('save-custom-value').click();
        expect(result.value).toHaveLength(1);
        expect((result.value[0] as { data: string }).data).toMatch(/^\d{4}-\d{2}-\d{2}$/);
    });

    for (const [name, input, expected] of [
        ['appends :00 when two parts', '14:30', '14:30:00'],
        ['leaves full time string unchanged', '14:30:00', '14:30:00'],
    ] as const) {
        test(`time type: beforeOnSubmit ${name}`, async ({ mount, page }) => {
            const { result, onSubmit } = createSubmitTracker();
            await mount(
                <ContentValueFieldTestWrapper
                    descriptor={buildDescriptor({ contentType: AttributeContentType.Time })}
                    onSubmit={onSubmit}
                />,
            );
            await setTimeValue(page, input);
            await page.getByTestId('save-custom-value').click();
            expect((result.value[0] as { data: string }).data).toBe(expected);
        });
    }

    test('datetime type renders DatePicker', async ({ mount, page }) => {
        await mount(<ContentValueFieldTestWrapper descriptor={buildDescriptor({ contentType: AttributeContentType.Datetime })} />);
        await expect(page.locator(fieldLocator)).toBeVisible();
    });

    test('initialContent sets initial value for non-list', async ({ mount, page }) => {
        await mount(
            <ContentValueFieldTestWrapper
                descriptor={buildDescriptor({ contentType: AttributeContentType.String })}
                initialContent={[{ data: 'initial' }]}
            />,
        );
        const input = page.locator(fieldLocator);
        await expect(input).toHaveValue('initial');
    });

    test('descriptor.content sets initial when no initialContent', async ({ mount, page }) => {
        await mount(
            <ContentValueFieldTestWrapper
                descriptor={buildDescriptor({
                    contentType: AttributeContentType.String,
                    content: [{ data: 'fromDescriptor' }],
                })}
            />,
        );
        const input = page.locator(fieldLocator);
        await expect(input).toHaveValue('fromDescriptor');
    });

    test('list single select: descriptor with content options', async ({ mount, page }) => {
        const descriptor = buildListDescriptor({
            name: 'listAttr',
            content: [{ data: 'opt1' }, { data: 'opt2' }],
        });
        await mount(<ContentValueFieldTestWrapper descriptor={descriptor} />);
        await expect(page.getByTestId('select-listAttr')).toBeVisible();
    });

    test('list multiSelect', async ({ mount, page }) => {
        const descriptor = buildListDescriptor({
            name: 'multiAttr',
            multiSelect: true,
            content: [{ data: 'a' }, { data: 'b' }],
        });
        await mount(<ContentValueFieldTestWrapper descriptor={descriptor} />);
        await expect(page.getByTestId('select-multiAttr')).toBeVisible();
    });

    test('initialContent with list single matches option', async ({ mount, page }) => {
        const descriptor = buildListDescriptor({
            name: 'listAttr',
            content: [{ data: 'opt1' }, { data: 'opt2' }],
        });
        await mount(<ContentValueFieldTestWrapper descriptor={descriptor} initialContent={[{ data: 'opt2' }]} />);
        await expect(page.getByTestId('select-listAttr')).toBeVisible();
    });

    test('readOnly disables input', async ({ mount, page }) => {
        await mount(
            <ContentValueFieldTestWrapper
                descriptor={buildDescriptor({
                    contentType: AttributeContentType.String,
                    properties: readOnlyTextProps,
                })}
            />,
        );
        const input = page.locator(fieldLocator);
        await expect(input).toBeDisabled();
    });

    test('required validation shows error on touch', async ({ mount, page }) => {
        await mount(
            <ContentValueFieldTestWrapper
                descriptor={buildDescriptor({
                    contentType: AttributeContentType.String,
                    properties: requiredTextProps,
                })}
            />,
        );
        const input = page.locator(fieldLocator);
        await input.focus();
        await input.blur();
        await expect(page.getByTestId('save-custom-value')).toBeDisabled();
    });

    test('Save disabled when invalid', async ({ mount, page }) => {
        await mount(
            <ContentValueFieldTestWrapper
                descriptor={buildDescriptor({
                    contentType: AttributeContentType.String,
                    properties: requiredTextProps,
                })}
            />,
        );
        await expect(page.getByTestId('save-custom-value')).toBeDisabled();
    });

    test('beforeOnSubmit not called when content empty', async ({ mount, page }) => {
        let callCount = 0;
        await mount(
            <ContentValueFieldTestWrapper
                descriptor={buildDescriptor({ contentType: AttributeContentType.String })}
                onSubmit={() => {
                    callCount++;
                }}
            />,
        );
        const saveBtn = page.getByTestId('save-custom-value');
        await expect(saveBtn).toBeDisabled();
        expect(callCount).toBe(0);
    });

    test('content options with reference use reference as label', async ({ mount, page }) => {
        const descriptor = buildListDescriptor({
            name: 'refAttr',
            content: [
                { data: 'v1', reference: 'Label One' },
                { data: 'v2', reference: 'Label Two' },
            ],
        });
        await mount(<ContentValueFieldTestWrapper descriptor={descriptor} />);
        await expect(page.getByTestId('select-refAttr')).toBeVisible();
    });

    test('checkbox input is rendered with descriptor name as id', async ({ mount, page }) => {
        await mount(
            <ContentValueFieldTestWrapper
                descriptor={buildDescriptor({
                    contentType: AttributeContentType.Boolean,
                    name: 'boolAttr',
                })}
            />,
        );
        const checkbox = page.getByRole('checkbox');
        await expect(checkbox).toBeVisible();
    });

    test('datetime value with space is normalized for DatePicker', async ({ mount, page }) => {
        await mount(
            <ContentValueFieldTestWrapper
                descriptor={buildDescriptor({ contentType: AttributeContentType.Datetime })}
                initialContent={[{ data: '2024-06-10 12:00' }]}
            />,
        );
        await expect(page.locator(fieldLocator)).toBeVisible();
    });

    test('initialContent with list multiSelect sets initial options', async ({ mount, page }) => {
        const descriptor = buildListDescriptor({
            name: 'multiList',
            multiSelect: true,
            content: [{ data: 'a' }, { data: 'b' }, { data: 'c' }],
        });
        await mount(<ContentValueFieldTestWrapper descriptor={descriptor} initialContent={[{ data: 'a' }, { data: 'c' }]} />);
        await expect(page.getByTestId('select-multiList')).toBeVisible();
    });

    test('initialContent with list single Datetime matches option', async ({ mount, page }) => {
        const descriptor = buildListDescriptor({
            name: 'dtList',
            contentType: AttributeContentType.Datetime,
            content: [{ data: '2024-01-15T10:00:00' }, { data: '2024-01-16T10:00:00' }],
        });
        await mount(<ContentValueFieldTestWrapper descriptor={descriptor} initialContent={[{ data: '2024-01-16T10:00:00' }]} />);
        await expect(page.getByTestId('select-dtList')).toBeVisible();
    });

    test('initialContent with list single value not in options (custom value) still displays', async ({ mount, page }) => {
        const descriptor = buildListDescriptor({
            name: 'listAttr',
            content: [{ data: 'opt1' }, { data: 'opt2' }],
        });
        await mount(<ContentValueFieldTestWrapper descriptor={descriptor} initialContent={[{ data: 'customValue' }]} />);
        const select = page.getByTestId('select-listAttr');
        await expect(select).toBeVisible();
        await expect(select).toContainText('customValue');
    });

    test('initialContent with list multiSelect values not in options still display', async ({ mount, page }) => {
        const descriptor = buildListDescriptor({
            name: 'multiList',
            multiSelect: true,
            content: [{ data: 'a' }, { data: 'b' }],
        });
        await mount(<ContentValueFieldTestWrapper descriptor={descriptor} initialContent={[{ data: 'a' }, { data: 'customItem' }]} />);
        const select = page.getByTestId('select-multiList');
        await expect(select).toBeVisible();
        await expect(select).toContainText('customItem');
    });

    test('list single select: selecting option submits correct value', async ({ mount, page }) => {
        const { result, onSubmit } = createSubmitTracker();
        const descriptor = buildListDescriptor({
            name: 'singleList',
            content: [{ data: 'opt1' }, { data: 'opt2' }],
        });
        await mount(<ContentValueFieldTestWrapper descriptor={descriptor} onSubmit={onSubmit} />);
        await triggerSelectChange(page, 'singleList', ['opt1']);
        await page.getByTestId('save-custom-value').click();
        expect(result.value).toEqual([{ data: 'opt1' }]);
    });

    for (const [name, selected, expected] of [
        ['selecting one option submits correct value', ['opt1'], [{ data: 'opt1' }]],
        ['selecting multiple options submits all', ['opt1', 'opt2'], [{ data: 'opt1' }, { data: 'opt2' }]],
    ] as [string, string[], { data: string }[]][]) {
        test(`list multiSelect: ${name}`, async ({ mount, page }) => {
            const { result, onSubmit } = createSubmitTracker();
            const descriptor = buildListDescriptor({
                name: 'multiList',
                multiSelect: true,
                content: [{ data: 'opt1' }, { data: 'opt2' }],
            });
            await mount(<ContentValueFieldTestWrapper descriptor={descriptor} onSubmit={onSubmit} />);
            await triggerSelectChange(page, 'multiList', selected);
            await page.getByTestId('save-custom-value').click();
            expect(result.value).toEqual(expected);
        });
    }

    test('list multiSelect: deselecting all disables Save', async ({ mount, page }) => {
        const descriptor = buildListDescriptor({
            name: 'multiList',
            multiSelect: true,
            content: [{ data: 'opt1' }, { data: 'opt2' }],
        });
        await mount(<ContentValueFieldTestWrapper descriptor={descriptor} />);
        await triggerSelectChange(page, 'multiList', ['opt1']);
        await expect(page.getByTestId('save-custom-value')).toBeEnabled();
        await clearMultiSelect(page, 'multiList');
        await expect(page.getByTestId('save-custom-value')).toBeDisabled();
    });

    test('list multiSelect Integer: values are parsed to numbers', async ({ mount, page }) => {
        const { result, onSubmit } = createSubmitTracker();
        const descriptor = buildListDescriptor({
            name: 'intList',
            contentType: AttributeContentType.Integer,
            multiSelect: true,
            content: [{ data: '42' }, { data: '7' }],
        });
        await mount(<ContentValueFieldTestWrapper descriptor={descriptor} onSubmit={onSubmit} />);
        await triggerSelectChange(page, 'intList', ['42']);
        await page.getByTestId('save-custom-value').click();
        expect(result.value).toEqual([{ data: 42 }]);
    });

    test('list with extensibleList shows Add custom value button below select', async ({ mount, page }) => {
        await mount(<ContentValueFieldTestWrapper descriptor={buildExtensibleDescriptor({ name: 'extList' })} />);
        await expect(page.getByRole('button', { name: /add custom value/i })).toBeVisible();
    });

    test('multiSelect extensibleList: Add custom value button opens AddCustomValuePanel', async ({ mount, page }) => {
        const descriptor = buildExtensibleDescriptor({
            name: 'multiExtList',
            label: 'Multi Extensible List',
            multiSelect: true,
            content: [{ data: 'opt1' }, { data: 'opt2' }],
        });
        await mount(<ContentValueFieldTestWrapper descriptor={descriptor} />);
        await page.getByRole('button', { name: /add custom value/i }).click();
        await expect(page.getByTestId('multiExtList-add-custom-panel')).toBeVisible();
    });

    test('single-select extensibleList: Add custom value button opens AddCustomValuePanel', async ({ mount, page }) => {
        const descriptor = buildExtensibleDescriptor({
            name: 'singleExtList',
            label: 'Single Extensible List',
            content: [{ data: 'opt1' }, { data: 'opt2' }],
        });
        await mount(<ContentValueFieldTestWrapper descriptor={descriptor} />);
        await page.getByRole('button', { name: /add custom value/i }).click();
        await expect(page.getByTestId('singleExtList-add-custom-panel')).toBeVisible();
    });

    test('datetime required shows validation error message', async ({ mount, page }) => {
        const descriptor = buildDescriptor({
            contentType: AttributeContentType.Datetime,
            properties: {
                label: 'Required Datetime',
                visible: true,
                required: true,
                readOnly: false,
                list: false,
                multiSelect: false,
                extensibleList: false,
            } as any,
        });
        await mount(<ContentValueFieldTestWrapper descriptor={descriptor} />);
        const input = page.locator(fieldLocator);
        await input.focus();
        await input.blur();
        await expect(page.getByTestId('save-custom-value')).toBeDisabled();
    });
});
