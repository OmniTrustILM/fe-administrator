import { test, expect } from '../../../../../playwright/ct-test';
import { ContentDescriptorFieldTestWrapper } from './ContentDescriptorFieldTestWrapper';
import { AttributeContentType } from 'types/openapi';

test.describe('ContentDescriptorField', () => {
    test('renders single content field for string type', async ({ mount, page }) => {
        await mount(<ContentDescriptorFieldTestWrapper isList={false} contentType={AttributeContentType.String} />);
        await expect(page.getByText('Default Content')).toBeVisible();
        await expect(page.getByPlaceholder('Default Content')).toBeVisible();
        // When single item and !isList, Add Content is hidden
    });

    test('renders Add Content when content is empty', async ({ mount, page }) => {
        await mount(<ContentDescriptorFieldTestWrapper isList={false} contentType={AttributeContentType.String} defaultContent={[]} />);
        await expect(page.getByRole('button', { name: 'Add Content' })).toBeVisible();
    });

    test('isList single: trims content to one item when multiple', async ({ mount, page }) => {
        await mount(
            <ContentDescriptorFieldTestWrapper
                isList={false}
                contentType={AttributeContentType.String}
                defaultContent={[{ data: 'a' }, { data: 'b' }]}
            />,
        );
        await expect(page.getByPlaceholder('Default Content')).toHaveValue('a');
        await expect(page.getByPlaceholder('Default Content')).toHaveCount(1);
    });

    test('isList true: shows multiple fields and Add Option', async ({ mount, page }) => {
        await mount(
            <ContentDescriptorFieldTestWrapper
                isList
                contentType={AttributeContentType.String}
                defaultContent={[{ data: 'first' }, { data: 'second' }]}
            />,
        );
        const inputs = page.getByPlaceholder('Option');
        await expect(inputs).toHaveCount(2);
        await expect(inputs.first()).toHaveValue('first');
        await expect(inputs.nth(1)).toHaveValue('second');
        await expect(page.getByRole('button', { name: 'Add Option' })).toBeVisible();
    });

    test('isList true: labels the content as options, not as a default value', async ({ mount, page }) => {
        await mount(
            <ContentDescriptorFieldTestWrapper isList contentType={AttributeContentType.String} defaultContent={[{ data: 'a' }]} />,
        );
        await expect(page.getByText('Options')).toBeVisible();
        await expect(page.getByText('Default Content')).toHaveCount(0);
    });

    test('checkbox type renders checkbox and boolean layout', async ({ mount, page }) => {
        await mount(
            <ContentDescriptorFieldTestWrapper
                isList={false}
                contentType={AttributeContentType.Boolean}
                defaultContent={[{ data: false }]}
            />,
        );
        const checkbox = page.getByRole('checkbox', { name: 'Default Content' });
        await expect(checkbox).toBeVisible();
        await expect(checkbox).not.toBeChecked();
        await expect(page.getByText('Default Content')).toBeVisible();
    });

    test('checkbox can be toggled', async ({ mount, page }) => {
        await mount(
            <ContentDescriptorFieldTestWrapper
                isList={false}
                contentType={AttributeContentType.Boolean}
                defaultContent={[{ data: false }]}
            />,
        );
        const checkbox = page.getByRole('checkbox', { name: 'Default Content' });
        await checkbox.click();
        await expect(checkbox).toBeChecked();
    });

    test('number type renders number input with placeholder', async ({ mount, page }) => {
        await mount(
            <ContentDescriptorFieldTestWrapper
                isList={false}
                contentType={AttributeContentType.Integer}
                defaultContent={[{ data: '42' }]}
            />,
        );
        const input = page.getByPlaceholder('Default Content');
        await expect(input).toBeVisible();
        await expect(input).toHaveValue('42');
    });

    test('textarea type renders text input', async ({ mount, page }) => {
        await mount(
            <ContentDescriptorFieldTestWrapper
                isList={false}
                contentType={AttributeContentType.Text}
                defaultContent={[{ data: 'text' }]}
            />,
        );
        await expect(page.getByPlaceholder('Default Content')).toHaveValue('text');
    });

    test('date type renders date input', async ({ mount, page }) => {
        await mount(
            <ContentDescriptorFieldTestWrapper
                isList={false}
                contentType={AttributeContentType.Date}
                defaultContent={[{ data: '2025-01-15' }]}
            />,
        );
        await expect(page.locator('[id="content.0.data"]')).toBeVisible();
    });

    test('time type renders', async ({ mount, page }) => {
        await mount(
            <ContentDescriptorFieldTestWrapper
                isList={false}
                contentType={AttributeContentType.Time}
                defaultContent={[{ data: '14:30' }]}
            />,
        );
        await expect(page.getByPlaceholder('Default Content')).toBeVisible();
    });

    test('datetime-local: value with T passed through', async ({ mount, page }) => {
        await mount(
            <ContentDescriptorFieldTestWrapper
                isList={false}
                contentType={AttributeContentType.Datetime}
                defaultContent={[{ data: '2025-01-15T10:00' }]}
            />,
        );
        await expect(page.locator('[id="content.0.data"]')).toBeVisible();
    });

    test('datetime-local: value with space converted to T', async ({ mount, page }) => {
        await mount(
            <ContentDescriptorFieldTestWrapper
                isList={false}
                contentType={AttributeContentType.Datetime}
                defaultContent={[{ data: '2025-01-15 10:00' }]}
            />,
        );
        await expect(page.locator('[id="content.0.data"]')).toBeVisible();
    });

    test('Add Option adds new item', async ({ mount, page }) => {
        await mount(
            <ContentDescriptorFieldTestWrapper isList contentType={AttributeContentType.String} defaultContent={[{ data: 'one' }]} />,
        );
        await expect(page.getByPlaceholder('Option')).toHaveCount(1);
        await page.getByRole('button', { name: 'Add Option' }).click();
        await expect(page.getByPlaceholder('Option')).toHaveCount(2);
    });

    test('Remove button removes item', async ({ mount, page }) => {
        await mount(
            <ContentDescriptorFieldTestWrapper
                isList
                contentType={AttributeContentType.String}
                defaultContent={[{ data: 'a' }, { data: 'b' }]}
            />,
        );
        const removeButtons = page
            .getByRole('button')
            .filter({ has: page.locator('svg') })
            .filter({ hasNotText: 'Add Option' });
        await expect(removeButtons).toHaveCount(2);
        await removeButtons.first().click();
        await expect(page.getByPlaceholder('Option')).toHaveCount(1);
        await expect(page.getByPlaceholder('Option')).toHaveValue('b');
    });

    test('readOnly: Remove disabled when single item', async ({ mount, page }) => {
        await mount(
            <ContentDescriptorFieldTestWrapper
                isList={false}
                contentType={AttributeContentType.String}
                defaultContent={[{ data: 'only' }]}
                readOnly
            />,
        );
        const removeBtn = page
            .getByRole('button')
            .filter({ has: page.locator('svg') })
            .filter({ hasNotText: 'Add Content' });
        await expect(removeBtn).toBeDisabled();
    });

    test('readOnly: initializes content with initial value when empty', async ({ mount, page }) => {
        await mount(
            <ContentDescriptorFieldTestWrapper isList={false} contentType={AttributeContentType.String} defaultContent={[]} readOnly />,
        );
        await expect(page.getByPlaceholder('Default Content')).toHaveValue('');
    });

    test('readOnly: normalizes content data to initial when set', async ({ mount, page }) => {
        await mount(
            <ContentDescriptorFieldTestWrapper
                isList={false}
                contentType={AttributeContentType.Integer}
                defaultContent={[{ data: '99' }]}
                readOnly
            />,
        );
        await expect(page.getByPlaceholder('Default Content')).toBeVisible();
    });

    test('Float type renders number input', async ({ mount, page }) => {
        await mount(
            <ContentDescriptorFieldTestWrapper
                isList={false}
                contentType={AttributeContentType.Float}
                defaultContent={[{ data: '3.14' }]}
            />,
        );
        await expect(page.getByPlaceholder('Default Content')).toHaveValue('3.14');
    });

    test('validation error message shown when touched and invalid', async ({ mount, page }) => {
        await mount(
            <ContentDescriptorFieldTestWrapper isList={false} contentType={AttributeContentType.String} defaultContent={[{ data: '' }]} />,
        );
        const input = page.getByPlaceholder('Default Content');
        await input.focus();
        await input.blur();
        await expect(page.getByText('Required Field').first()).toBeVisible({ timeout: 5000 });
    });

    test('input value change updates form state', async ({ mount, page }) => {
        await mount(
            <ContentDescriptorFieldTestWrapper isList={false} contentType={AttributeContentType.String} defaultContent={[{ data: '' }]} />,
        );
        const input = page.getByPlaceholder('Default Content');
        await input.focus();
        await input.fill('new value');
        await expect(input).toHaveValue('new value');
    });

    test('removing the only content field clears required error and re-enables form validity', async ({ mount, page }) => {
        await mount(
            <ContentDescriptorFieldTestWrapper
                isList={false}
                contentType={AttributeContentType.String}
                defaultContent={[{ data: '' }]}
                showSubmitButton
            />,
        );

        const input = page.getByPlaceholder('Default Content');
        await input.focus();
        await input.blur();
        await expect(page.getByText('Required Field').first()).toBeVisible({ timeout: 5000 });
        await expect(page.getByTestId('form-submit')).toBeDisabled();

        const removeBtn = page
            .getByRole('button')
            .filter({ has: page.locator('svg') })
            .filter({ hasNotText: 'Add Content' });
        await removeBtn.click();

        await expect(page.getByPlaceholder('Default Content')).not.toBeVisible();
        await expect(page.getByText('Required Field')).toHaveCount(0);
        await expect(page.getByTestId('form-submit')).toBeEnabled();
    });
});
