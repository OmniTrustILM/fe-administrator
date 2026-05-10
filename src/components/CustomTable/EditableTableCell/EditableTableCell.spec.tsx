import { test, expect } from '../../../../playwright/ct-test';
import EditableTableCell from './index';

test.describe('EditableTableCell', () => {
    test('should render value and edit button when not editing', async ({ mount, page }) => {
        await mount(<EditableTableCell value="Initial text" onSave={() => {}} />);
        await expect(page.getByTestId('editable-cell-display')).toBeVisible();
        await expect(page.getByText('Initial text')).toBeVisible();
        await expect(page.getByTestId('editable-cell-edit-btn')).toBeVisible();
    });

    test('should show input when edit clicked', async ({ mount, page }) => {
        await mount(<EditableTableCell value="Cell value" onSave={() => {}} />);
        await page.getByTestId('editable-cell-edit-btn').click();
        await expect(page.getByTestId('editable-cell-editing')).toBeVisible();
        const input = page.getByRole('textbox');
        await expect(input).toBeVisible();
        await expect(input).toHaveValue('Cell value');
    });

    test('should call onSave when value submitted', async ({ mount, page }) => {
        let saved: string | null = null;
        await mount(
            <EditableTableCell
                value="Original"
                onSave={(v) => {
                    saved = v;
                }}
            />,
        );
        await page.getByTestId('editable-cell-edit-btn').click();
        await page.getByRole('textbox').fill('Updated');
        await page.locator('button').first().click();
        expect(saved).toBe('Updated');
    });

    test('should call onCancel when cancel clicked', async ({ mount, page }) => {
        let cancelled = false;
        await mount(
            <EditableTableCell
                value="Value"
                onSave={() => {}}
                onCancel={() => {
                    cancelled = true;
                }}
            />,
        );
        await page.getByTestId('editable-cell-edit-btn').click();
        await page.locator('button').nth(1).click();
        expect(cancelled).toBe(true);
    });

    test('should cancel on Escape key', async ({ mount, page }) => {
        let cancelled = false;
        await mount(<EditableTableCell value="X" onSave={() => {}} onCancel={() => (cancelled = true)} />);
        await page.getByTestId('editable-cell-edit-btn').click();
        await expect(page.getByTestId('editable-cell-editing')).toBeVisible();
        await page.getByRole('textbox').press('Escape');
        expect(cancelled).toBe(true);
        await expect(page.getByTestId('editable-cell-display')).toBeVisible();
    });

    test('should submit on Enter key in input', async ({ mount, page }) => {
        let saved: string | null = null;
        await mount(<EditableTableCell value="" onSave={(v) => (saved = v)} />);
        await page.getByTestId('editable-cell-edit-btn').click();
        await page.getByRole('textbox').fill('Entered');
        await page.getByRole('textbox').press('Enter');
        expect(saved).toBe('Entered');
    });

    test('should show Spinner and disable buttons when busy', async ({ mount, page }) => {
        await mount(<EditableTableCell value="v" onSave={() => {}} busy={true} />);
        await expect(page.getByTestId('editable-cell-edit-btn')).toBeDisabled();
    });

    test('should not submit when formProps.validate returns error', async ({ mount, page }) => {
        let saveCalls = 0;
        await mount(
            <EditableTableCell
                value="x"
                onSave={() => (saveCalls += 1)}
                formProps={{
                    validate: (v) => (String(v).length < 2 ? 'Min 2 chars' : undefined),
                }}
            />,
        );
        await page.getByTestId('editable-cell-edit-btn').click();
        await page.getByRole('textbox').fill('a');
        await page.getByRole('textbox').blur();
        await page.locator('button').first().click();
        await expect(page.getByTestId('editable-cell-editing')).toBeVisible();
        expect(saveCalls).toBe(0);
    });
});
