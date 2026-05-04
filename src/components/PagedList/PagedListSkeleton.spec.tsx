import { test, expect } from '../../../playwright/ct-test';
import { createMockStore, withProviders } from 'utils/test-helpers';
import PagedListSkeleton from './PagedListSkeleton';

test.describe('PagedListSkeleton', () => {
    test('should render 10 skeleton rows', async ({ mount }) => {
        const component = await mount(<PagedListSkeleton />);
        await expect(component.getByTestId('table-skeleton-row')).toHaveCount(10);
    });

    test('should render filter widget skeleton when hasFilter is true', async ({ mount }) => {
        const store = createMockStore();
        const component = await mount(withProviders(<PagedListSkeleton hasFilter />, { store }));
        await expect(component.getByTestId('filter-widget-skeleton')).toHaveCount(1);
    });

    test('should not render filter widget skeleton when hasFilter is false', async ({ mount }) => {
        const component = await mount(<PagedListSkeleton />);
        await expect(component.getByTestId('filter-widget-skeleton')).toHaveCount(0);
    });

    test('should render the correct number of button skeletons', async ({ mount }) => {
        const component = await mount(<PagedListSkeleton buttonsCount={3} />);
        const header = component.locator('section').first().locator('> div').first();
        const buttons = header.locator('> div').last().locator('> div');
        await expect(buttons).toHaveCount(3);
    });
});
