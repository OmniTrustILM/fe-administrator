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
        await expect(component.getByRole('button', { name: 'Expand' })).toBeAttached();
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
        await component.getByRole('button', { name: 'Expand' }).click();
        await component.getByRole('button', { name: 'Collapse' }).click();
        await expect(component.getByRole('button', { name: 'Expand' })).toBeVisible();
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
        await component.getByRole('button', { name: 'Expand' }).click();
        await expect(component.getByRole('link', { name: 'Users' })).toBeVisible();
        await component.getByRole('button', { name: 'Access Control' }).click();
        await expect(component.getByRole('link', { name: 'Roles' })).toBeVisible();
    });

    test('when large, a section chevron points up only while the section is open', async ({ mount }) => {
        const store = createMockStore();
        const component = await mount(
            withProviders(<Sidebar allowedResources={[Resource.Users, Resource.Roles]} />, { store, initialRoute: '/' }),
        );
        await component.getByRole('button', { name: 'Expand' }).click();
        const section = component.getByTestId('sidebar-access-control');
        const chevron = section.locator('svg').last();
        await expect(section).toHaveAttribute('aria-expanded', 'false');
        await expect(chevron).not.toHaveClass(/\brotate-180\b/);

        await section.click();

        await expect(section).toHaveAttribute('aria-expanded', 'true');
        await expect(chevron).toHaveClass(/\brotate-180\b/);
    });

    test('with active child route opens section when large', async ({ mount }) => {
        const store = createMockStore();
        const component = await mount(withProviders(<Sidebar allowedResources={[Resource.Users]} />, { store, initialRoute: '/users' }));
        await component.getByRole('button', { name: 'Expand' }).click();
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
        await expect(component.getByRole('button', { name: 'Expand' })).toBeAttached();
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

    test('collapsed entries show their label in a tooltip on hover and keyboard focus', async ({ mount, page }) => {
        const store = createMockStore();
        const component = await mount(
            withProviders(<Sidebar allowedResources={[Resource.Certificates, Resource.Users]} />, { store, initialRoute: '/' }),
        );

        await component.getByTestId('sidebar-certificates').hover();
        await expect(page.getByRole('tooltip', { name: 'Certificates' })).toBeVisible();

        await component.getByTestId('sidebar-access-control').focus();
        await expect(page.getByRole('tooltip', { name: 'Access Control' })).toBeVisible();

        await component.getByRole('button', { name: 'Expand' }).hover();
        await expect(page.getByRole('tooltip', { name: 'Expand' })).toBeVisible();
    });

    test('expanded sidebar shows no tooltips and labels the toggle Collapse', async ({ mount, page }) => {
        await page.clock.install();
        const store = createMockStore();
        const component = await mount(
            withProviders(<Sidebar allowedResources={[Resource.Certificates, Resource.Users]} />, { store, initialRoute: '/' }),
        );
        await component.getByRole('button', { name: 'Expand' }).click();

        const toggle = component.getByRole('button', { name: 'Collapse' });
        await expect(toggle).toBeVisible();

        await component.getByTestId('sidebar-certificates').hover();
        await component.getByTestId('sidebar-access-control').focus();
        await toggle.hover();
        await page.clock.runFor(600);
        await expect(page.getByRole('tooltip')).toHaveCount(0);
    });

    test('collapsing does not reveal tooltips for entries visited while expanded', async ({ mount, page }) => {
        await page.clock.install();
        const store = createMockStore();
        const component = await mount(
            withProviders(<Sidebar allowedResources={[Resource.Certificates, Resource.Users]} />, { store, initialRoute: '/' }),
        );
        await component.getByRole('button', { name: 'Expand' }).click();

        await component.getByTestId('sidebar-certificates').hover();
        await component.getByTestId('sidebar-access-control').focus();
        await page.clock.runFor(600);
        await component.getByTestId('sidebar-access-control').blur();
        await component.getByRole('button', { name: 'Collapse' }).click();
        await expect(component.getByRole('button', { name: 'Expand' })).toBeVisible();
        await expect(component.getByTestId('sidebar-certificates').locator('span')).toHaveClass(/\bsr-only\b/);

        await page.clock.runFor(600);
        await expect(page.getByRole('tooltip', { name: 'Certificates' })).toHaveCount(0);
        await expect(page.getByRole('tooltip', { name: 'Access Control' })).toHaveCount(0);
    });

    test('flying menu entries show no tooltips on hover or keyboard focus', async ({ mount, page }) => {
        await page.clock.install();
        const store = createMockStore();
        const component = await mount(
            withProviders(<Sidebar allowedResources={[Resource.Certificates, Resource.Users]} />, { store, initialRoute: '/' }),
        );
        await component.getByRole('button', { name: 'Access Control' }).click();
        const flying = component.getByRole('region', { name: 'Sidebar menu' });
        await expect(flying).toBeAttached();

        await flying.getByTestId('sidebar-certificates').hover();
        await page.clock.runFor(600);
        await expect(page.getByRole('tooltip')).toHaveCount(0);

        await flying.getByTestId('sidebar-access-control').focus();
        await page.clock.runFor(600);
        await expect(page.getByRole('tooltip')).toHaveCount(0);

        await flying.getByTestId('sidebar-access-control-users').hover();
        await page.clock.runFor(600);
        await expect(page.getByRole('tooltip')).toHaveCount(0);
    });

    test('toggling the sidebar from the keyboard keeps focus on the toggle', async ({ mount }) => {
        const store = createMockStore();
        const component = await mount(withProviders(<Sidebar allowedResources={[Resource.Certificates]} />, { store, initialRoute: '/' }));

        await component.getByRole('button', { name: 'Expand' }).focus();
        await component.getByRole('button', { name: 'Expand' }).press('Enter');
        await expect(component.getByRole('button', { name: 'Collapse' })).toBeFocused();

        await component.getByRole('button', { name: 'Collapse' }).press('Enter');
        await expect(component.getByRole('button', { name: 'Expand' })).toBeFocused();
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

        const seekWidthTransition = (page: Page, time: number | 'end') =>
            page.evaluate((time) => {
                const transition = document.documentElement
                    .getAnimations()
                    .find((a) => (a as CSSTransition).transitionProperty === '--sidebar-width');
                if (!transition) return false;
                if (time === 'end') {
                    transition.finish();
                } else {
                    transition.pause();
                    transition.currentTime = time;
                }
                return true;
            }, time);

        test('animates the width over 300ms once toggled', async ({ mount, page }) => {
            await page.emulateMedia({ reducedMotion: 'no-preference' });
            const store = createMockStore();
            const component = await mount(
                withProviders(<Sidebar allowedResources={[Resource.Certificates]} />, { store, initialRoute: '/' }),
            );

            await component.getByRole('button', { name: 'Expand' }).click();

            const transition = await page.evaluate(() => {
                const style = getComputedStyle(document.documentElement);
                return { property: style.transitionProperty, duration: style.transitionDuration };
            });
            expect(transition).toEqual({ property: '--sidebar-width', duration: '0.3s' });
        });

        test('animates the width, keeping labels on one line and inside the rail', async ({ mount, page }) => {
            await page.emulateMedia({ reducedMotion: 'no-preference' });
            // Long enough that the transition is still running when the next round trip pauses it.
            await page.addStyleTag({ content: ':root.sidebar-animated { transition-duration: 60s !important; }' });
            const store = createMockStore();
            const component = await mount(
                withProviders(<Sidebar allowedResources={[Resource.Certificates, Resource.Users]} />, { store, initialRoute: '/' }),
            );

            await component.getByRole('button', { name: 'Expand' }).click();

            expect(await seekWidthTransition(page, 10_000)).toBe(true);
            const midway = await page.evaluate(() =>
                Number.parseFloat(getComputedStyle(document.documentElement).getPropertyValue('--sidebar-width')),
            );
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
            const toggle = component.getByRole('button', { name: /^(Expand|Collapse)$/ });
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
            const arrow = component.getByRole('button', { name: 'Expand' }).locator('svg');
            await arrow.evaluate((icon) => {
                const record = globalThis as unknown as { arrowTransitions: number };
                record.arrowTransitions = 0;
                icon.addEventListener('transitionrun', () => {
                    record.arrowTransitions += 1;
                });
            });

            await component.getByRole('button', { name: 'Expand' }).click();

            await expect(component.getByText('Collapse', { exact: true })).toBeVisible();
            expect(await widthTransitionsRun(page)).toBe(0);
            expect(await page.evaluate(() => (globalThis as unknown as { arrowTransitions: number }).arrowTransitions)).toBe(0);
        });

        test('keeps the labels rendered while the rail collapses and hides them once it has', async ({ mount, page }) => {
            await page.emulateMedia({ reducedMotion: 'no-preference' });
            await page.evaluate(() => localStorage.setItem('menu-size', JSON.stringify('large')));
            await page.addStyleTag({ content: ':root.sidebar-animated { transition-duration: 60s !important; }' });
            const store = createMockStore();
            const component = await mount(
                withProviders(<Sidebar allowedResources={[Resource.Certificates, Resource.Users]} />, { store, initialRoute: '/' }),
            );
            const labels = [
                component.getByTestId('sidebar-certificates').locator('span'),
                component.getByTestId('sidebar-access-control').locator('span'),
                component.getByRole('button', { name: /^(Expand|Collapse)$/ }).locator('span'),
            ];

            const icons = [
                component.getByTestId('sidebar-certificates').locator('svg'),
                component.getByRole('button', { name: /^(Expand|Collapse)$/ }).locator('svg'),
            ];
            const centres = () =>
                Promise.all(
                    icons.map(async (icon) => {
                        const box = await icon.boundingBox();
                        return box ? box.x + box.width / 2 : Number.NaN;
                    }),
                );
            const expanded = await centres();

            await component.getByRole('button', { name: 'Collapse' }).click();

            expect(await seekWidthTransition(page, 30_000)).toBe(true);
            const midway = await centres();
            for (const [i, x] of midway.entries()) expect(x).toBeCloseTo(expanded[i], 0);
            for (const label of labels) await expect(label).not.toHaveClass(/\bsr-only\b/);
            await expect(labels[2]).toHaveText('Collapse');

            expect(await seekWidthTransition(page, 'end')).toBe(true);
            for (const label of labels) await expect(label).toHaveClass(/\bsr-only\b/);
            await expect(labels[2]).toHaveText('Expand');
        });

        test('hides the labels at once when collapsing with reduced motion', async ({ mount, page }) => {
            await page.emulateMedia({ reducedMotion: 'reduce' });
            await page.evaluate(() => localStorage.setItem('menu-size', JSON.stringify('large')));
            const store = createMockStore();
            const component = await mount(
                withProviders(<Sidebar allowedResources={[Resource.Certificates]} />, { store, initialRoute: '/' }),
            );

            await component.getByRole('button', { name: 'Collapse' }).click();

            await expect(component.getByRole('button', { name: 'Expand' }).locator('span')).toHaveClass(/\bsr-only\b/);
            await expect(component.getByTestId('sidebar-certificates').locator('span')).toHaveClass(/\bsr-only\b/);
        });

        test('keeps every icon at full size while the rail is still narrow', async ({ mount, page }) => {
            await page.emulateMedia({ reducedMotion: 'no-preference' });
            await page.addStyleTag({ content: ':root.sidebar-animated { transition-duration: 60s !important; }' });
            const store = createMockStore();
            const component = await mount(
                withProviders(<Sidebar allowedResources={[Resource.Certificates, Resource.Users]} />, { store, initialRoute: '/' }),
            );
            const toggle = component.getByRole('button', { name: /^(Expand|Collapse)$/ });

            await toggle.click();
            expect(await seekWidthTransition(page, 0)).toBe(true);

            const iconWidths = await component
                .getByRole('navigation')
                .locator('svg')
                .evaluateAll((icons) => icons.map((icon) => icon.getBoundingClientRect().width));
            expect(iconWidths.length).toBeGreaterThan(0);
            for (const width of iconWidths) expect(width).toBeCloseTo(16, 0);
            expect((await toggle.locator('svg').boundingBox())?.width).toBeGreaterThanOrEqual(24);
        });
    });
});
