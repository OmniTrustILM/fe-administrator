import { test, expect } from '../../../playwright/ct-test';
import { createMockStore, withProviders } from 'utils/test-helpers';
import { testInitialState } from 'ducks/test-reducers';
import Widget from './index';
import { LockWidgetNameEnum, LockTypeEnum } from 'types/user-interface';

test.describe('Widget', () => {
    test('should render title and children', async ({ mount, page }) => {
        const store = createMockStore();
        await mount(
            withProviders(
                <Widget title="My Widget" dataTestId="my-widget">
                    <p>Child content</p>
                </Widget>,
                { store },
            ),
        );
        await expect(page.getByTestId('my-widget')).toBeVisible();
        await expect(page.getByRole('heading', { name: 'My Widget' })).toBeVisible();
        await expect(page.getByText('Child content')).toBeVisible();
    });

    test('should render title as link when titleLink provided', async ({ mount, page }) => {
        const store = createMockStore();
        await mount(withProviders(<Widget title="Linked Title" titleLink="/some-path" dataTestId="linked-widget" />, { store }));
        const link = page.getByRole('link', { name: 'Linked Title' });
        await expect(link).toBeVisible();
        await expect(link).toHaveAttribute('href', '/some-path');
    });

    test('should show refresh button when refreshAction provided', async ({ mount, page }) => {
        const store = createMockStore();
        await mount(withProviders(<Widget title="Refreshable" dataTestId="refresh-widget" refreshAction={() => {}} />, { store }));
        await expect(page.getByTestId('refresh-icon')).toBeVisible();
    });

    test('should disable refresh button when busy', async ({ mount, page }) => {
        const store = createMockStore();
        await mount(
            withProviders(<Widget title="Refreshable" dataTestId="refresh-widget" refreshAction={() => {}} busy={true} />, { store }),
        );
        await expect(page.getByTestId('refresh-icon')).toBeDisabled();
    });

    test('should not render blocking overlay when busy and enableBusyOverlay is not provided', async ({ mount, page }) => {
        const store = createMockStore();
        await mount(
            withProviders(
                <Widget title="Busy Widget" dataTestId="busy-widget" busy={true}>
                    <p>Content</p>
                </Widget>,
                { store },
            ),
        );
        await expect(page.getByTestId('widget-busy-overlay')).toHaveCount(0);
    });

    test('should render blocking overlay when busy and enableBusyOverlay is true', async ({ mount, page }) => {
        const store = createMockStore();
        await mount(
            withProviders(
                <div style={{ width: '400px', minHeight: '120px' }}>
                    <Widget title="Busy Widget" dataTestId="busy-widget" busy={true} enableBusyOverlay={true}>
                        <p>Content</p>
                    </Widget>
                </div>,
                { store },
            ),
        );
        const overlay = page.getByTestId('widget-busy-overlay');
        await expect(overlay).toHaveCount(1);
        await expect(overlay).toHaveClass(/absolute/);
        await expect(overlay).toHaveClass(/inset-0/);
    });

    test('should show WidgetLock when widgetLocks match widgetLockName', async ({ mount, page }) => {
        const lock = {
            widgetName: LockWidgetNameEnum.ListOfCertificates,
            lockTitle: 'Locked',
            lockText: 'Widget is locked',
            lockType: LockTypeEnum.GENERIC,
        };
        const preloadedState = {
            userInterface: {
                ...testInitialState.userInterface,
                widgetLocks: [lock],
            },
        };
        const store = createMockStore(preloadedState);
        await mount(
            withProviders(
                <Widget title="Locked Widget" dataTestId="locked-widget" widgetLockName={LockWidgetNameEnum.ListOfCertificates} />,
                { store },
            ),
        );
        await expect(page.getByTestId('locked-widget')).toBeVisible();
        await expect(page.getByRole('heading', { name: 'Locked Widget' })).toBeVisible();
    });

    test('should show spinner when busy is true', async ({ mount, page }) => {
        const store = createMockStore();
        await mount(
            withProviders(
                <Widget title="Busy Widget" dataTestId="busy-widget" busy={true}>
                    <p>Content</p>
                </Widget>,
                { store },
            ),
        );
        await expect(page.getByTestId('busy-widget')).toBeVisible();
        const spinner = page.locator('[class*="animate-spin"]');
        await expect(spinner).toBeVisible();
    });

    test('should support noBorder', async ({ mount, page }) => {
        const store = createMockStore();
        await mount(
            withProviders(
                <Widget title="No Border" dataTestId="no-border-widget" noBorder={true}>
                    <p>Content</p>
                </Widget>,
                { store },
            ),
        );
        await expect(page.getByTestId('no-border-widget')).toBeVisible();
        await expect(page.getByRole('heading', { name: 'No Border' })).toBeVisible();
    });

    test('should support titleSize large', async ({ mount, page }) => {
        const store = createMockStore();
        await mount(withProviders(<Widget title="Large Title" titleSize="large" dataTestId="large-title-widget" />, { store }));
        const heading = page.getByRole('heading', { name: 'Large Title' });
        await expect(heading).toBeVisible();
        await expect(heading).toHaveClass(/text-lg/);
    });

    test('should render widgetButtons', async ({ mount, page }) => {
        const store = createMockStore();
        await mount(
            withProviders(
                <Widget
                    title="With Buttons"
                    dataTestId="buttons-widget"
                    widgetButtons={[{ icon: 'pencil', tooltip: 'Edit', disabled: false, onClick: () => {} }]}
                />,
                { store },
            ),
        );
        await expect(page.getByTestId('buttons-widget')).toBeVisible();
        await expect(page.getByTestId('buttons-widget').getByRole('button')).toBeVisible();
    });

    test('should render widgetInfoCard when provided', async ({ mount, page }) => {
        const store = createMockStore();
        await mount(
            withProviders(
                <Widget title="With Info" dataTestId="info-widget" widgetInfoCard={{ title: 'Info', description: 'Description text' }} />,
                { store },
            ),
        );
        await expect(page.getByTestId('info-widget')).toBeVisible();
        await expect(page.getByRole('heading', { name: 'With Info' })).toBeVisible();
        await expect(page.getByText('Info: Description text')).toBeVisible();
    });
});
