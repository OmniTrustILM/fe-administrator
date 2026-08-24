import { test, expect } from '../../../../../playwright/ct-test';
import CountBadgeWithStore from './CountBadgeWithStore';
import { LockTypeEnum } from 'types/user-interface';

test.describe('CountBadge', () => {
    test('should render title, link and data', async ({ mount }) => {
        const component = await mount(<CountBadgeWithStore title="Total certificates" link="/certificates" data={42} />);
        await expect(component.getByRole('heading', { name: 'Total certificates' })).toBeVisible();
        await expect(component.getByRole('link', { name: 'Total certificates' })).toHaveAttribute('href', '/certificates');
        await expect(component.getByText('42')).toBeVisible();
    });

    test('should render without data', async ({ mount }) => {
        const component = await mount(<CountBadgeWithStore title="Empty" link="/empty" />);
        await expect(component.getByRole('heading', { name: 'Empty' })).toBeVisible();
    });

    test('should render extra component when provided', async ({ mount }) => {
        const component = await mount(
            <CountBadgeWithStore title="With extra" link="/x" data={1} extraComponent={<span data-testid="extra">Extra</span>} />,
        );
        await expect(component.getByTestId('extra')).toBeVisible();
        await expect(component.getByTestId('extra')).toHaveText('Extra');
    });

    test('should render zero count instead of a lock when data is zero', async ({ mount }) => {
        const component = await mount(<CountBadgeWithStore title="Zero" link="/zero" data={0} />);
        await expect(component.getByText('0')).toBeVisible();
        await expect(component.locator('[data-testid="count-badge-lock"]')).toHaveCount(0);
    });

    test('should not render a lock when data is undefined', async ({ mount }) => {
        const component = await mount(<CountBadgeWithStore title="Unknown" link="/unknown" />);
        await expect(component.locator('[data-testid="count-badge-lock"]')).toHaveCount(0);
    });

    test('should render a lock when data is null', async ({ mount }) => {
        const component = await mount(<CountBadgeWithStore title="Unavailable" link="/unavailable" data={null} />);
        await expect(component.getByRole('heading', { name: 'Unavailable' })).toBeVisible();
        await expect(component.locator('[data-testid="count-badge-lock"]')).toBeVisible();
        await expect(component.getByText('Count is not available')).toBeVisible();
    });

    test('should keep the extra component visible when data is null', async ({ mount }) => {
        const component = await mount(
            <CountBadgeWithStore
                title="Unavailable"
                link="/unavailable"
                data={null}
                extraComponent={<span data-testid="extra">Extra</span>}
            />,
        );
        await expect(component.locator('[data-testid="count-badge-lock"]')).toBeVisible();
        await expect(component.getByTestId('extra')).toBeVisible();
    });

    test('should not render a refresh button in the lock when onRefresh is not provided', async ({ mount }) => {
        const component = await mount(<CountBadgeWithStore title="Unavailable" link="/unavailable" data={null} />);
        await expect(component.locator('[data-testid="widget-lock-refresh"]')).toHaveCount(0);
    });

    test('should call onRefresh when the lock refresh button is clicked', async ({ mount }) => {
        let refreshCount = 0;
        const component = await mount(
            <CountBadgeWithStore
                title="Unavailable"
                link="/unavailable"
                data={null}
                onRefresh={() => {
                    refreshCount += 1;
                }}
            />,
        );

        await component.locator('[data-testid="widget-lock-refresh"]').click();

        await expect.poll(() => refreshCount).toBe(1);
    });

    // A null count can mean a denied permission, a down data source or a failed request. The badge
    // does not know which, so it must not assert one: the default lock is GENERIC and the caller
    // supplies the cause when it has one.
    test('should default to a generic lock rather than claiming a service error', async ({ mount }) => {
        const component = await mount(<CountBadgeWithStore title="Unavailable" link="/unavailable" data={null} />);

        const lock = component.locator('[data-testid="count-badge-lock"]');
        await expect(lock.locator('svg.lucide-triangle-alert')).toBeVisible();
        await expect(lock.locator('svg.lucide-database')).toHaveCount(0);
        await expect(component.getByText('This count could not be loaded.')).toBeVisible();
    });

    test('should use the lock type the caller supplies', async ({ mount }) => {
        const component = await mount(
            <CountBadgeWithStore title="Unavailable" link="/unavailable" data={null} lockType={LockTypeEnum.PERMISSION} />,
        );

        const lock = component.locator('[data-testid="count-badge-lock"]');
        await expect(lock.locator('svg.lucide-lock')).toBeVisible();
        await expect(lock.locator('svg.lucide-triangle-alert')).toHaveCount(0);
    });

    test('should use the lock text the caller supplies', async ({ mount }) => {
        const component = await mount(
            <CountBadgeWithStore
                title="Unavailable"
                link="/unavailable"
                data={null}
                lockType={LockTypeEnum.PERMISSION}
                lockText="You do not have permission to view this count."
            />,
        );

        await expect(component.getByText('You do not have permission to view this count.')).toBeVisible();
        await expect(component.getByText('This count could not be loaded.')).toHaveCount(0);
    });
});
