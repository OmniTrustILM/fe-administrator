import { test, expect } from '../../../playwright/ct-test';
import Tabs from './index';

test.describe('Tabs', () => {
    test('renders all tab buttons with role="tab"', async ({ mount }) => {
        const tabs = [{ title: 'Tab 1' }, { title: 'Tab 2' }, { title: 'Tab 3' }];
        const component = await mount(<Tabs tabs={tabs} selectedTab={0} onTabChange={() => {}} />);
        await expect(component.getByRole('tab', { name: 'Tab 1' })).toBeVisible();
        await expect(component.getByRole('tab', { name: 'Tab 2' })).toBeVisible();
        await expect(component.getByRole('tab', { name: 'Tab 3' })).toBeVisible();
    });

    test('selected tab has data-state="active"', async ({ mount }) => {
        const tabs = [{ title: 'Tab 1' }, { title: 'Tab 2' }];
        const component = await mount(<Tabs tabs={tabs} selectedTab={1} onTabChange={() => {}} />);
        await expect(component.getByRole('tab', { name: 'Tab 2' })).toHaveAttribute('data-state', 'active');
        await expect(component.getByRole('tab', { name: 'Tab 1' })).toHaveAttribute('data-state', 'inactive');
    });

    test('calls onTabChange with index when tab clicked', async ({ mount }) => {
        const tabs = [{ title: 'Tab 1' }, { title: 'Tab 2' }];
        let selectedTab = -1;
        const component = await mount(
            <Tabs
                tabs={tabs}
                selectedTab={0}
                onTabChange={(i) => {
                    selectedTab = i;
                }}
            />,
        );
        await component.getByRole('tab', { name: 'Tab 2' }).click();
        expect(selectedTab).toBe(1);
    });

    test('calls per-tab onClick handler', async ({ mount }) => {
        let onClickCalled = false;
        const tabs = [
            { title: 'Tab 1' },
            {
                title: 'Tab 2',
                onClick: () => {
                    onClickCalled = true;
                },
            },
        ];
        const component = await mount(<Tabs tabs={tabs} selectedTab={0} onTabChange={() => {}} />);
        await component.getByRole('tab', { name: 'Tab 2' }).click();
        expect(onClickCalled).toBe(true);
    });

    test('renders ReactNode title', async ({ mount }) => {
        const tabs = [{ title: <span data-testid="custom-title">Custom</span> }];
        const component = await mount(<Tabs tabs={tabs} selectedTab={0} onTabChange={() => {}} />);
        await expect(component.getByTestId('custom-title')).toBeVisible();
    });
});
