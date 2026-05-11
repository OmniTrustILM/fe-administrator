import { test, expect } from '../../../playwright/ct-test';
import Tabs from './index';

test.describe('Tabs visual', () => {
    test.skip(({ browserName }) => browserName !== 'chromium', 'visual tests run on chromium only');

    test('first tab selected', async ({ mount }) => {
        const tabs = [{ title: 'Tab 1' }, { title: 'Tab 2' }, { title: 'Tab 3' }];
        const component = await mount(
            <div style={{ padding: 40, width: 600 }}>
                <Tabs tabs={tabs} selectedTab={0} onTabChange={() => {}} />
            </div>,
        );
        await expect(component).toHaveScreenshot('tabs-first-selected.png', {
            maxDiffPixelRatio: 0.02,
            threshold: 0.2,
            animations: 'disabled',
        });
    });

    test('second tab selected', async ({ mount }) => {
        const tabs = [{ title: 'Tab 1' }, { title: 'Tab 2' }, { title: 'Tab 3' }];
        const component = await mount(
            <div style={{ padding: 40, width: 600 }}>
                <Tabs tabs={tabs} selectedTab={1} onTabChange={() => {}} />
            </div>,
        );
        await expect(component).toHaveScreenshot('tabs-second-selected.png', {
            maxDiffPixelRatio: 0.02,
            threshold: 0.2,
            animations: 'disabled',
        });
    });

    test('overflow scroll', async ({ mount }) => {
        const tabs = Array.from({ length: 10 }, (_, i) => ({ title: `Long Tab Title ${i + 1}` }));
        const component = await mount(
            <div style={{ padding: 40, width: 400 }}>
                <Tabs tabs={tabs} selectedTab={0} onTabChange={() => {}} />
            </div>,
        );
        await expect(component).toHaveScreenshot('tabs-overflow.png', {
            maxDiffPixelRatio: 0.02,
            threshold: 0.2,
            animations: 'disabled',
        });
    });
});
