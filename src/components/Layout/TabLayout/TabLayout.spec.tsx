import { test, expect } from '../../../../playwright/ct-test';
import TabLayoutWithStore from './TabLayoutWithStore';
import TabLayoutKeySelectionWithStore from './TabLayoutKeySelectionWithStore';

test.describe('TabLayout', () => {
    test('should render tabs and active tab content', async ({ mount }) => {
        const component = await mount(
            <TabLayoutWithStore
                tabs={[
                    { title: 'Tab One', content: <div data-testid="tab-one-content">Content 1</div> },
                    { title: 'Tab Two', content: <div data-testid="tab-two-content">Content 2</div> },
                ]}
            />,
        );
        await expect(component.getByText('Tab One')).toBeVisible();
        await expect(component.getByText('Tab Two')).toBeVisible();
        await expect(component.getByTestId('tab-one-content')).toBeVisible();
        await expect(component.getByTestId('tab-one-content')).toHaveText('Content 1');
    });

    test('should render all tab contents with onlyActiveTabContent false but hide inactive ones', async ({ mount }) => {
        const component = await mount(
            <TabLayoutWithStore
                tabs={[
                    { title: 'A', content: <span data-testid="a">A</span> },
                    { title: 'B', content: <span data-testid="b">B</span> },
                ]}
                onlyActiveTabContent={false}
            />,
        );
        const tabA = component.getByTestId('a');
        const tabBWrapper = component.getByTestId('b').locator('..');

        await expect(tabA).toBeVisible();
        await expect(tabBWrapper).toHaveClass(/hidden/);
    });

    test('should switch content when second tab is clicked', async ({ mount }) => {
        const component = await mount(
            <TabLayoutWithStore
                tabs={[
                    { title: 'Tab One', content: <div data-testid="tab-one">One</div> },
                    { title: 'Tab Two', content: <div data-testid="tab-two">Two</div> },
                ]}
            />,
        );
        await expect(component.getByTestId('tab-one')).toBeVisible();
        await component.getByText('Tab Two').click();
        await expect(component.getByTestId('tab-two')).toBeVisible();
        await expect(component.getByTestId('tab-one')).not.toBeVisible();
    });

    test('should filter hidden tabs', async ({ mount }) => {
        const component = await mount(
            <TabLayoutWithStore
                tabs={[
                    { title: 'Visible', content: <span data-testid="visible">Visible</span> },
                    { title: 'Hidden', content: <span data-testid="hidden">Hidden</span>, hidden: true },
                ]}
            />,
        );
        await expect(component.getByRole('tab', { name: 'Visible' })).toBeVisible();
        await expect(component.getByText('Hidden')).not.toBeVisible();
        await expect(component.getByTestId('visible')).toBeVisible();
    });

    test('should support noBorder', async ({ mount, page }) => {
        await mount(<TabLayoutWithStore tabs={[{ title: 'Tab', content: <div>Content</div> }]} noBorder={true} />);
        await expect(page.getByTestId('tab-layout')).toBeVisible();
        await expect(page.getByText('Content')).toBeVisible();
    });

    test.describe('tabUrlParam', () => {
        const urlTabs = [
            { title: 'Details', content: <div data-testid="details-content">Details</div> },
            { title: 'Related Certificates', content: <div data-testid="related-content">Related</div> },
            { title: 'Flow', content: <div data-testid="flow-content">Flow</div> },
        ];

        test('activates tab matching slug from URL on mount', async ({ mount }) => {
            const component = await mount(<TabLayoutWithStore tabUrlParam="tab" initialEntries={['/?tab=flow']} tabs={urlTabs} />);
            await expect(component.getByTestId('flow-content')).toBeVisible();
            await expect(component.getByTestId('details-content')).not.toBeVisible();
        });

        test('falls back to first tab when URL slug is unknown', async ({ mount }) => {
            const component = await mount(<TabLayoutWithStore tabUrlParam="tab" initialEntries={['/?tab=nonexistent']} tabs={urlTabs} />);
            await expect(component.getByTestId('details-content')).toBeVisible();
        });

        test('writes kebab-case slug to URL on tab click', async ({ mount }) => {
            const component = await mount(<TabLayoutWithStore tabUrlParam="tab" tabs={urlTabs} />);
            await component.getByRole('tab', { name: 'Related Certificates' }).click();
            await expect(component.getByTestId('location-probe')).toHaveAttribute('data-search', '?tab=related-certificates');
            await expect(component.getByTestId('related-content')).toBeVisible();
        });

        test('removes URL param when first tab is reselected', async ({ mount }) => {
            const component = await mount(<TabLayoutWithStore tabUrlParam="tab" initialEntries={['/?tab=flow']} tabs={urlTabs} />);
            await component.getByRole('tab', { name: 'Details' }).click();
            await expect(component.getByTestId('location-probe')).toHaveAttribute('data-search', '');
        });

        test('fires tab onClick when activated via URL', async ({ mount }) => {
            let flowActivations = 0;
            const tabsWithOnClick = [
                { title: 'Details', content: <div data-testid="details-content">Details</div> },
                {
                    title: 'Flow',
                    onClick: () => {
                        flowActivations += 1;
                    },
                    content: <div data-testid="flow-content">Flow</div>,
                },
            ];
            await mount(<TabLayoutWithStore tabUrlParam="tab" initialEntries={['/?tab=flow']} tabs={tabsWithOnClick} />);
            await expect.poll(() => flowActivations).toBe(1);
        });

        test('fires tab onClick exactly once on user click', async ({ mount }) => {
            let flowActivations = 0;
            const tabsWithOnClick = [
                { title: 'Details', content: <div data-testid="details-content">Details</div> },
                {
                    title: 'Flow',
                    onClick: () => {
                        flowActivations += 1;
                    },
                    content: <div data-testid="flow-content">Flow</div>,
                },
            ];
            const component = await mount(<TabLayoutWithStore tabUrlParam="tab" tabs={tabsWithOnClick} />);
            await component.getByRole('tab', { name: 'Flow' }).click();
            await expect(component.getByTestId('flow-content')).toBeVisible();
            await expect.poll(() => flowActivations).toBe(1);
        });

        test('preserves unrelated query params on tab change', async ({ mount }) => {
            const component = await mount(<TabLayoutWithStore tabUrlParam="tab" initialEntries={['/?foo=bar']} tabs={urlTabs} />);
            await component.getByRole('tab', { name: 'Flow' }).click();
            // Auto-retrying assertions: a one-shot attribute read races the click's state flush.
            await expect(component.getByTestId('location-probe')).toHaveAttribute('data-search', /foo=bar/);
            await expect(component.getByTestId('location-probe')).toHaveAttribute('data-search', /tab=flow/);
        });
    });

    test.describe('selectedTabKey', () => {
        test('keeps the selected tab when a tab before it becomes visible', async ({ mount, page }) => {
            const component = await mount(<TabLayoutKeySelectionWithStore />);

            await component.getByRole('tab', { name: 'Gamma' }).click();
            await expect(page.getByTestId('selected-key')).toHaveText('gamma');
            await expect(component.getByTestId('gamma')).toBeVisible();

            // Alpha is inserted at position 0, shifting Gamma from index 1 to index 2. Because the
            // selection is tracked by key, the user must stay on Gamma rather than being moved.
            await page.getByTestId('toggle-first-tab').click();
            await expect(component.getByRole('tab', { name: 'Alpha' })).toBeVisible();
            await expect(page.getByTestId('selected-key')).toHaveText('gamma');
            await expect(component.getByTestId('gamma')).toBeVisible();
        });

        test('falls back to the first visible tab when the selected tab is hidden', async ({ mount, page }) => {
            const component = await mount(<TabLayoutKeySelectionWithStore />);

            await page.getByTestId('toggle-first-tab').click();
            await component.getByRole('tab', { name: 'Alpha' }).click();
            await expect(component.getByTestId('alpha')).toBeVisible();

            await page.getByTestId('toggle-first-tab').click();
            await expect(component.getByRole('tab', { name: 'Alpha' })).toHaveCount(0);
            await expect(component.getByTestId('beta')).toBeVisible();
        });
    });
});
