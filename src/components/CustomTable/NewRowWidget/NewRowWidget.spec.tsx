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
});
