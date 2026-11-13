import { test, expect } from '../../../../playwright/ct-test';
import NewRowWidget from './index';

const mockOptions = [
    { value: 'a', label: 'Option A' },
    { value: 'b', label: 'Option B' },
];

test.describe('NewRowWidget', () => {
    test('should render select with placeholder', async ({ mount }) => {
        const component = await mount(<NewRowWidget newItemsList={mockOptions} isBusy={false} onAddClick={() => {}} />);
        await expect(component.getByTestId('select-newRowWidgetSelect-trigger')).toContainText('Select items to add');
    });

    test('should use custom selectHint when provided', async ({ mount }) => {
        const component = await mount(
            <NewRowWidget newItemsList={mockOptions} isBusy={false} onAddClick={() => {}} selectHint="Add items..." />,
        );
        await expect(component.getByTestId('select-newRowWidgetSelect-trigger')).toContainText('Add items...');
    });

    test('disables the select and names the missing permission when adding is denied', async ({ mount }) => {
        const reason = 'You need the Update permission on Rules.';
        const component = await mount(
            <NewRowWidget
                newItemsList={mockOptions}
                isBusy={false}
                onAddClick={() => {}}
                requires={{ available: false, hidden: false, loading: false, reason }}
            />,
        );

        const trigger = component.getByTestId('select-newRowWidgetSelect-trigger');
        await expect(trigger).toBeDisabled();
        await expect(trigger).toContainText(reason);
    });

    test('keeps the select usable when adding is allowed', async ({ mount }) => {
        const component = await mount(
            <NewRowWidget
                newItemsList={mockOptions}
                isBusy={false}
                onAddClick={() => {}}
                requires={{ available: true, hidden: false, loading: false }}
            />,
        );

        await expect(component.getByTestId('select-newRowWidgetSelect-trigger')).toBeEnabled();
    });
});
