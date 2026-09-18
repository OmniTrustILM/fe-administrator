import type React from 'react';
import { test, expect } from '../../../playwright/ct-test';
import { MemoryRouter } from 'react-router';
import Breadcrumb from './index';

type BreadcrumbItem = { label: string; href?: string };

async function mountBreadcrumb<T>(mount: (component: React.ReactElement) => Promise<T>, items: BreadcrumbItem[]): Promise<T> {
    return mount(
        <MemoryRouter>
            <Breadcrumb items={items} />
        </MemoryRouter>,
    );
}

test.describe('Breadcrumb', () => {
    test('should render breadcrumb items', async ({ mount }) => {
        const component = await mountBreadcrumb(mount, [
            { label: 'Home', href: '/' },
            { label: 'Page', href: '/page' },
        ]);

        await expect(component.getByRole('link', { name: 'Home' })).toBeVisible();
        await expect(component.getByRole('link', { name: 'Page' })).toBeVisible();
    });

    test('should render items without href as span', async ({ mount }) => {
        const component = await mountBreadcrumb(mount, [{ label: 'Home', href: '/' }, { label: 'Current Page' }]);

        await expect(component.getByRole('link', { name: 'Home' })).toBeVisible();
        await expect(component.getByRole('listitem').filter({ hasText: 'Current Page' })).toBeVisible();
    });

    test('should render separator between items', async ({ mount }) => {
        const component = await mountBreadcrumb(mount, [
            { label: 'First', href: '/first' },
            { label: 'Second', href: '/second' },
        ]);

        await expect(component.getByRole('link', { name: 'First' })).toBeVisible();
        await expect(component.getByRole('link', { name: 'Second' })).toBeVisible();
        await expect(component.locator('svg[aria-hidden="true"]')).toBeVisible();
    });

    test('should not render separator for last item', async ({ mount }) => {
        const component = await mountBreadcrumb(mount, [{ label: 'Single Item' }]);

        await expect(component.locator('li').filter({ hasText: 'Single Item' })).toBeVisible();
        await expect(component.locator('svg[aria-hidden="true"]')).toHaveCount(0);
    });

    test('should render single item', async ({ mount }) => {
        const component = await mountBreadcrumb(mount, [{ label: 'Single', href: '/single' }]);

        await expect(component.getByRole('link', { name: 'Single' })).toBeVisible();
    });

    test('should render multiple items', async ({ mount }) => {
        const component = await mountBreadcrumb(mount, [
            { label: 'First', href: '/first' },
            { label: 'Second', href: '/second' },
            { label: 'Third', href: '/third' },
        ]);

        await expect(component.getByRole('link', { name: 'First' })).toBeVisible();
        await expect(component.getByRole('link', { name: 'Second' })).toBeVisible();
        await expect(component.getByRole('link', { name: 'Third' })).toBeVisible();
        await expect(component.locator('svg[aria-hidden="true"]')).toHaveCount(2);
    });

    test('should apply correct styling to non-last items', async ({ mount }) => {
        const component = await mountBreadcrumb(mount, [{ label: 'First', href: '/first' }, { label: 'Last' }]);

        const firstItem = component.getByRole('link', { name: 'First' }).locator('..');
        await expect(firstItem).toHaveClass(/text-content-muted/);
    });

    // A detail page names the record it shows, and that name can be a long run of characters with nowhere to wrap.
    test('should keep a long current page inside the page width', async ({ mount, page }) => {
        const label = 'A'.repeat(1024);
        const component = await mount(
            <MemoryRouter>
                <div style={{ width: '600px' }}>
                    <Breadcrumb items={[{ label: 'Crypto Assets', href: '/cryptoassets' }, { label }]} />
                </div>
            </MemoryRouter>,
        );

        const crumb = component.locator('ol li:last-child span');
        const crumbMetrics = await crumb.evaluate((element) => ({
            scrollWidth: element.scrollWidth,
            clientWidth: element.clientWidth,
        }));

        expect(crumbMetrics.scrollWidth).toBeGreaterThan(crumbMetrics.clientWidth);

        // Two lines of the heading, not the forty the name would otherwise take.
        const heading = await component.getByRole('heading', { level: 1 }).boundingBox();
        expect(heading?.height).toBeLessThan(100);

        // The crumb before it is a section name, and stays whole.
        await expect(component.getByRole('link', { name: 'Crypto Assets' })).toHaveText('Crypto Assets');
        expect(await page.evaluate(() => document.documentElement.scrollWidth > document.documentElement.clientWidth)).toBe(false);
    });

    test('should render custom title and right content', async ({ mount }) => {
        const component = await mount(
            <MemoryRouter>
                <Breadcrumb
                    items={[{ label: 'Home', href: '/' }, { label: 'Detail' }]}
                    title="Custom Title"
                    rightContent={<button type="button">History Select</button>}
                />
            </MemoryRouter>,
        );

        await expect(component.getByRole('heading', { name: 'Custom Title' })).toBeVisible();
        await expect(component.getByRole('button', { name: 'History Select' })).toBeVisible();
    });
});
