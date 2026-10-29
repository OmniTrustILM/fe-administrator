import type { Page } from '@playwright/test';
import { test, expect } from '../../../../playwright/ct-test';
import { createMockStore, withProviders } from 'utils/test-helpers';
import { Resource } from 'types/openapi';
import Sidebar from './index';

test.describe('Sidebar', () => {
    test('should render sidebar with nav and toggle', async ({ mount }) => {
        const store = createMockStore();
        const component = await mount(withProviders(<Sidebar />, { store, initialRoute: '/' }));
        await expect(component.locator('nav').first()).toBeAttached();
        await expect(component.getByRole('button', { name: /Collapse/i })).toBeAttached();
    });

    test('with no allowedResources renders empty menu', async ({ mount }) => {
        const store = createMockStore();
        const component = await mount(withProviders(<Sidebar />, { store, initialRoute: '/' }));
        const nav = component.locator('nav').first();
        await expect(nav).toBeAttached();
        const links = component.getByRole('link');
        await expect(links).toHaveCount(0);
    });

    test('with allowedResources shows matching headerLink item', async ({ mount }) => {
        const store = createMockStore();
        const component = await mount(withProviders(<Sidebar allowedResources={[Resource.Certificates]} />, { store, initialRoute: '/' }));
        // Scope to the Certificates management headerLink (/certificates); the Dashboard group also exposes a
        // 'Certificates' shortcut (/dashboard/certificates) with the same visible name.
        await expect(
            component.getByRole('link', { name: 'Certificates', exact: true }).and(component.locator('[href="/certificates"]')),
        ).toBeVisible();
    });

    test('with allowedResources shows section with children', async ({ mount }) => {
        const store = createMockStore();
        const component = await mount(withProviders(<Sidebar allowedResources={[Resource.Users]} />, { store, initialRoute: '/' }));
        await expect(component.getByRole('button', { name: 'Access Control' })).toBeVisible();
        await expect(component.getByRole('link', { name: 'Users' })).toBeVisible();
    });

    test('headerLink item exposes a stable data-testid', async ({ mount }) => {
        const store = createMockStore();
        const component = await mount(withProviders(<Sidebar allowedResources={[Resource.Certificates]} />, { store, initialRoute: '/' }));
        await expect(component.getByTestId('sidebar-certificates')).toBeVisible();
    });

    test('button-styled sidebar entry is not underlined on hover', async ({ mount }) => {
        const store = createMockStore();
        const component = await mount(withProviders(<Sidebar allowedResources={[Resource.Certificates]} />, { store, initialRoute: '/' }));
        const entry = component.getByTestId('sidebar-certificates');
        await entry.hover();
        await expect(entry).toHaveCSS('text-decoration-line', 'none');
    });

    test('section toggle and nested children expose stable data-testid attributes', async ({ mount }) => {
        const store = createMockStore();
        const component = await mount(
            withProviders(<Sidebar allowedResources={[Resource.Users, Resource.Roles]} />, { store, initialRoute: '/' }),
        );
        // parent toggle: sidebar-<parent>
        await expect(component.getByTestId('sidebar-access-control')).toBeVisible();
        // nested items: sidebar-<parent>-<child> (present in DOM even while the section is collapsed)
        await expect(component.getByTestId('sidebar-access-control-users')).toBeAttached();
        await expect(component.getByTestId('sidebar-access-control-roles')).toBeAttached();
    });

    test('toggle button can be clicked', async ({ mount }) => {
        const store = createMockStore();
        const component = await mount(withProviders(<Sidebar allowedResources={[Resource.Certificates]} />, { store, initialRoute: '/' }));
        const toggle = component.getByRole('button', { name: /Collapse/i });
        await expect(toggle).toBeVisible();
        await toggle.click();
        await toggle.click();
        await expect(component.locator('nav').first()).toBeAttached();
    });

    test('when small, clicking section with children opens flying menu', async ({ mount }) => {
        const store = createMockStore();
        const component = await mount(withProviders(<Sidebar allowedResources={[Resource.Users]} />, { store, initialRoute: '/' }));
        await expect(component.getByRole('region', { name: 'Sidebar menu' })).not.toBeAttached();
        await component.getByRole('button', { name: 'Access Control' }).click();
        await expect(component.getByRole('region', { name: 'Sidebar menu' })).toBeAttached();
    });

    test('flying menu closes on mouse leave', async ({ mount, page }) => {
        const store = createMockStore();
        const component = await mount(withProviders(<Sidebar allowedResources={[Resource.Users]} />, { store, initialRoute: '/' }));
        await component.getByRole('button', { name: 'Access Control' }).click();
        const flying = component.getByRole('region', { name: 'Sidebar menu' });
        await expect(flying).toBeAttached();
        await flying.hover();
        await page.mouse.move(500, 500);
        await expect(flying).not.toBeAttached();
    });

    test('when flying, clicking headerLink in flying panel closes flying', async ({ mount }) => {
        const store = createMockStore();
        const component = await mount(
            withProviders(<Sidebar allowedResources={[Resource.Certificates, Resource.Users]} />, { store, initialRoute: '/' }),
        );
        await component.getByRole('button', { name: 'Access Control' }).click();
        const flying = component.getByRole('region', { name: 'Sidebar menu' });
        await expect(flying).toBeAttached();
        // The Dashboard group also has a 'Certificates' link; target the management headerLink by href.
        await flying.getByRole('link', { name: 'Certificates', exact: true }).and(flying.locator('[href="/certificates"]')).click();
        await expect(flying).not.toBeAttached();
    });

    test('when large, section expands on click and shows children', async ({ mount }) => {
        const store = createMockStore();
        const component = await mount(
            withProviders(<Sidebar allowedResources={[Resource.Users, Resource.Roles]} />, { store, initialRoute: '/' }),
        );
        await component.getByRole('button', { name: /Collapse/i }).click();
        await expect(component.getByRole('link', { name: 'Users' })).toBeVisible();
        await component.getByRole('button', { name: 'Access Control' }).click();
        await expect(component.getByRole('link', { name: 'Roles' })).toBeVisible();
    });

    test('with active child route opens section when large', async ({ mount }) => {
        const store = createMockStore();
        const component = await mount(withProviders(<Sidebar allowedResources={[Resource.Users]} />, { store, initialRoute: '/users' }));
        await component.getByRole('button', { name: /Collapse/i }).click();
        await expect(component.getByRole('link', { name: 'Users' })).toBeVisible();
    });

    test('allowedResources with multiple items shows both link and section', async ({ mount }) => {
        const store = createMockStore();
        const component = await mount(
            withProviders(<Sidebar allowedResources={[Resource.Certificates, Resource.Keys, Resource.Users]} />, {
                store,
                initialRoute: '/',
            }),
        );
        await expect(
            component.getByRole('link', { name: 'Certificates', exact: true }).and(component.locator('[href="/certificates"]')),
        ).toBeVisible();
        await expect(component.getByRole('link', { name: 'Keys', exact: true })).toBeVisible();
        await expect(component.getByRole('button', { name: 'Access Control' })).toBeVisible();
    });

    test('shows Secrets item with custom icon when Secrets resource is allowed', async ({ mount }) => {
        const store = createMockStore();
        const component = await mount(withProviders(<Sidebar allowedResources={[Resource.Secrets]} />, { store, initialRoute: '/' }));

        // The Dashboard group also has a 'Secrets' shortcut; target the management headerLink (/secrets) which carries the custom icon.
        const secretsLink = component.getByRole('link', { name: 'Secrets', exact: true }).and(component.locator('[href="/secrets"]'));
        await expect(secretsLink).toBeVisible();

        // custom icon rendered inside the link as an SVG
        const secretsIcon = secretsLink.locator('svg');
        await expect(secretsIcon).toBeVisible();
    });

    test('empty allowedResources shows no menu items', async ({ mount }) => {
        const store = createMockStore();
        const component = await mount(withProviders(<Sidebar allowedResources={[]} />, { store, initialRoute: '/' }));
        await expect(component.getByRole('button', { name: /Collapse/i })).toBeAttached();
        const links = component.getByRole('link');
        await expect(links).toHaveCount(0);
    });

    test('shows Trusted Certificates under Settings when Settings resource is allowed', async ({ mount }) => {
        const store = createMockStore();
        const component = await mount(
            withProviders(<Sidebar allowedResources={[Resource.Settings]} />, {
                store,
                initialRoute: '/trusted-certificates',
            }),
        );

        await expect(component.getByRole('button', { name: 'Settings' })).toBeVisible();
        await expect(component.getByRole('link', { name: 'Trusted Certificates' })).toBeVisible();
    });

    test('highlights the active headerLink item in the brand colour', async ({ mount }) => {
        const store = createMockStore();
        const component = await mount(
            withProviders(
                <div>
                    <span data-testid="brand-reference" className="text-brand" />
                    <span data-testid="content-reference" className="text-content" />
                    <Sidebar allowedResources={[Resource.Certificates, Resource.Keys]} />
                </div>,
                { store, initialRoute: '/certificates' },
            ),
        );

        const brandColor = await component.getByTestId('brand-reference').evaluate((el) => getComputedStyle(el).color);
        const contentColor = await component.getByTestId('content-reference').evaluate((el) => getComputedStyle(el).color);
        await expect(component.getByTestId('sidebar-certificates')).toHaveAttribute('aria-current', 'page');
        await expect(component.getByTestId('sidebar-certificates')).toHaveCSS('color', brandColor);
        await expect(component.getByTestId('sidebar-keys')).toHaveCSS('color', contentColor);
    });

    test.describe('expand and collapse animation', () => {
        // transitionrun is recorded even for a transition that has already finished by the time it is checked.
        const recordWidthTransitions = (page: Page) =>
            page.evaluate(() => {
                const record = globalThis as unknown as { widthTransitions: number };
                record.widthTransitions = 0;
                document.documentElement.addEventListener('transitionrun', (event) => {
                    if (event.propertyName === '--sidebar-width') record.widthTransitions += 1;
                });
            });
        const widthTransitionsRun = (page: Page) =>
            page.evaluate(
                () =>
                    new Promise<number>((resolve) =>
                        requestAnimationFrame(() =>
                            requestAnimationFrame(() => resolve((globalThis as unknown as { widthTransitions: number }).widthTransitions)),
                        ),
                    ),
            );

        test('animates the width, keeping labels on one line and inside the rail', async ({ mount, page }) => {
            await page.emulateMedia({ reducedMotion: 'no-preference' });
            // Long enough that the transition is still running when the next round trip pauses it.
            await page.addStyleTag({ content: ':root.sidebar-animated { transition-duration: 60s !important; }' });
            const store = createMockStore();
            const component = await mount(
                withProviders(<Sidebar allowedResources={[Resource.Certificates, Resource.Users]} />, { store, initialRoute: '/' }),
            );

            await component.getByRole('button', { name: /Collapse/i }).click();

            const midway = await page.evaluate(() => {
                const transition = document.documentElement
                    .getAnimations()
                    .find((a) => (a as CSSTransition).transitionProperty === '--sidebar-width');
                if (!transition) return Number.NaN;
                transition.pause();
                transition.currentTime = 10_000;
                return Number.parseFloat(getComputedStyle(document.documentElement).getPropertyValue('--sidebar-width'));
            });
            expect(midway).toBeGreaterThan(84);
            expect(midway).toBeLessThan(260);

            const label = component.getByTestId('sidebar-access-control').locator('span');
            const lineHeight = await label.evaluate((el) => Number.parseFloat(getComputedStyle(el).lineHeight));
            expect((await label.boundingBox())?.height).toBeLessThanOrEqual(lineHeight);
            const overflows = await component.locator('.simplebar-content-wrapper').evaluate((el) => el.scrollWidth > el.clientWidth);
            expect(overflows).toBe(false);
        });

        test('keeps the icons in one column, centred in the collapsed rail', async ({ mount, page }) => {
            await page.emulateMedia({ reducedMotion: 'reduce' });
            const store = createMockStore();
            const component = await mount(
                withProviders(<Sidebar allowedResources={[Resource.Certificates, Resource.Users]} />, { store, initialRoute: '/' }),
            );
            const toggle = component.getByRole('button', { name: /Collapse/i });
            const icons = [
                component.getByTestId('sidebar-certificates').locator('svg'),
                component.getByTestId('sidebar-access-control').locator('svg').first(),
                toggle.locator('svg'),
            ];
            const centresOf = () =>
                Promise.all(
                    icons.map(async (icon) => {
                        const box = await icon.boundingBox();
                        return (box?.x ?? 0) + (box?.width ?? 0) / 2;
                    }),
                );
            const rail = await component.locator('.simplebar-content-wrapper').boundingBox();
            const railCentre = (rail?.x ?? 0) + (rail?.width ?? 0) / 2;

            const collapsed = await centresOf();
            for (const centre of collapsed) expect(centre).toBeCloseTo(railCentre, 0);

            await toggle.click();
            await expect(component.getByText('Collapse', { exact: true })).toBeVisible();
            const expanded = await centresOf();
            expect(expanded[0]).toBeCloseTo(collapsed[0], 0);
            expect(expanded[1]).toBeCloseTo(collapsed[1], 0);
            expect(expanded[2]).toBeCloseTo(collapsed[2], 0);
        });

        test('does not animate the size restored on load', async ({ mount, page }) => {
            await page.emulateMedia({ reducedMotion: 'no-preference' });
            await page.evaluate(() => localStorage.setItem('menu-size', JSON.stringify('large')));
            await recordWidthTransitions(page);
            const store = createMockStore();
            const component = await mount(
                withProviders(<Sidebar allowedResources={[Resource.Certificates]} />, { store, initialRoute: '/' }),
            );

            await expect(component.getByText('Collapse', { exact: true })).toBeVisible();
            expect(await widthTransitionsRun(page)).toBe(0);
        });

        test('does not animate with reduced motion', async ({ mount, page }) => {
            await page.emulateMedia({ reducedMotion: 'reduce' });
            await recordWidthTransitions(page);
            const store = createMockStore();
            const component = await mount(
                withProviders(<Sidebar allowedResources={[Resource.Certificates]} />, { store, initialRoute: '/' }),
            );

            await component.getByRole('button', { name: /Collapse/i }).click();

            await expect(component.getByText('Collapse', { exact: true })).toBeVisible();
            expect(await widthTransitionsRun(page)).toBe(0);
        });
    });
});
