import { test, expect } from '../../../playwright/ct-test';
import { createMockStore, withProviders } from 'utils/test-helpers';
import DetailPageSkeleton from './index';

test.describe('DetailPageSkeleton', () => {
    test('renders with simple layout by default', async ({ mount }) => {
        const component = await mount(<DetailPageSkeleton />);
        await expect(component.getByTestId('table-skeleton').first()).toBeVisible();
    });

    test('simple layout renders two table skeletons', async ({ mount }) => {
        const component = await mount(<DetailPageSkeleton layout="simple" />);
        await expect(component.getByTestId('table-skeleton')).toHaveCount(2);
    });

    test('simple layout renders no tab skeleton', async ({ mount }) => {
        const component = await mount(<DetailPageSkeleton layout="simple" />);
        await expect(component.getByTestId('tab-layout-skeleton')).toHaveCount(0);
    });

    test('simple layout rowCount controls first table skeleton rows', async ({ mount }) => {
        const component = await mount(<DetailPageSkeleton layout="simple" rowCount={5} />);
        const firstTable = component.getByTestId('table-skeleton').first();
        await expect(firstTable.getByTestId('table-skeleton-row')).toHaveCount(5);
    });

    test('simple layout default rowCount is 8', async ({ mount }) => {
        const component = await mount(<DetailPageSkeleton layout="simple" />);
        const firstTable = component.getByTestId('table-skeleton').first();
        await expect(firstTable.getByTestId('table-skeleton-row')).toHaveCount(8);
    });

    test('simple layout buttonsCount renders correct number of button placeholders', async ({ mount }) => {
        const component = await mount(<DetailPageSkeleton layout="simple" buttonsCount={3} />);
        const buttonBar = component.getByTestId('widget-buttons-skeleton').first();
        await expect(buttonBar.locator('> div')).toHaveCount(3);
    });

    test('simple layout with buttonsCount=0 renders no button bar', async ({ mount }) => {
        const component = await mount(<DetailPageSkeleton layout="simple" buttonsCount={0} />);
        await expect(component.getByTestId('widget-buttons-skeleton')).toHaveCount(0);
    });

    test('tabs layout renders tab-layout-skeleton', async ({ mount }) => {
        const store = createMockStore();
        const component = await mount(withProviders(<DetailPageSkeleton layout="tabs" />, { store }));
        await expect(component.getByTestId('tab-layout-skeleton')).toHaveCount(1);
    });

    test('tabs layout renders one table skeleton inside tab layout', async ({ mount }) => {
        const store = createMockStore();
        const component = await mount(withProviders(<DetailPageSkeleton layout="tabs" />, { store }));
        await expect(component.getByTestId('table-skeleton')).toHaveCount(1);
    });

    test('split layout renders tab-layout-skeleton', async ({ mount }) => {
        const store = createMockStore();
        const component = await mount(withProviders(<DetailPageSkeleton layout="split" />, { store }));
        await expect(component.getByTestId('tab-layout-skeleton')).toHaveCount(1);
    });

    test('split layout renders four table skeletons', async ({ mount }) => {
        const store = createMockStore();
        const component = await mount(withProviders(<DetailPageSkeleton layout="split" />, { store }));
        // 2 side-by-side cards + 1 association card + 1 inside TabLayoutSkeleton
        await expect(component.getByTestId('table-skeleton')).toHaveCount(4);
    });
});
