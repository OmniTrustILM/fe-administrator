import { test, expect } from '../../../playwright/ct-test';
import WidgetLock from './index';
import { LockTypeEnum } from 'types/user-interface';

test.describe('WidgetLock', () => {
    test('should render widget lock with title and text', async ({ mount }) => {
        const component = await mount(<WidgetLock lockTitle="Test Lock" lockText="Test lock text" />);

        await expect(component.getByRole('heading', { name: 'Test Lock' })).toBeVisible();
        await expect(component.getByText('Test lock text')).toBeVisible();
    });

    test('should render with default title and text when not provided', async ({ mount }) => {
        const component = await mount(<WidgetLock />);

        await expect(component.getByText('There was some problem')).toBeVisible();
        await expect(component.getByText('There was some issue please try again later')).toBeVisible();
    });

    test('should render info icon button when lockDetails is provided', async ({ mount }) => {
        const component = await mount(<WidgetLock lockTitle="Test Lock" lockText="Test text" lockDetails="Test details" />);

        const infoButton = component.locator('button[type="button"]');
        await expect(infoButton).toBeVisible();
    });

    test('should not render info icon button when lockDetails is not provided', async ({ mount }) => {
        const component = await mount(<WidgetLock lockTitle="Test Lock" lockText="Test text" />);

        const infoButton = component.locator('button[type="button"]');
        await expect(infoButton).not.toBeVisible();
    });

    test('should render GENERIC lock type icon', async ({ mount }) => {
        const component = await mount(<WidgetLock lockType={LockTypeEnum.GENERIC} />);
        await expect(component.getByText('There was some problem')).toBeVisible();
    });

    test('should render CLIENT lock type icon', async ({ mount }) => {
        const component = await mount(<WidgetLock lockType={LockTypeEnum.CLIENT} />);
        await expect(component.getByText('There was some problem')).toBeVisible();
    });

    test('should render PERMISSION lock type icon', async ({ mount }) => {
        const component = await mount(<WidgetLock lockType={LockTypeEnum.PERMISSION} />);
        await expect(component.getByText('There was some problem')).toBeVisible();
    });

    test('should render NETWORK lock type icon', async ({ mount }) => {
        const component = await mount(<WidgetLock lockType={LockTypeEnum.NETWORK} />);
        await expect(component.getByText('There was some problem')).toBeVisible();
    });

    test('should render SERVICE_ERROR lock type icon', async ({ mount }) => {
        const component = await mount(<WidgetLock lockType={LockTypeEnum.SERVICE_ERROR} />);
        await expect(component.getByText('There was some problem')).toBeVisible();
    });

    test('should render SERVER_ERROR lock type icon', async ({ mount }) => {
        const component = await mount(<WidgetLock lockType={LockTypeEnum.SERVER_ERROR} />);
        await expect(component.getByText('There was some problem')).toBeVisible();
    });

    test('should support small size', async ({ mount }) => {
        const component = await mount(<WidgetLock size="small" />);
        await expect(component.getByText('There was some problem')).toBeVisible();
    });

    test('should support normal size', async ({ mount }) => {
        const component = await mount(<WidgetLock size="normal" />);
        await expect(component.getByText('There was some problem')).toBeVisible();
    });

    test('should support large size', async ({ mount }) => {
        const component = await mount(<WidgetLock size="large" />);
        await expect(component.getByText('There was some problem')).toBeVisible();
    });

    test('should not render a refresh button when onRefresh is not provided', async ({ mount }) => {
        const component = await mount(<WidgetLock lockTitle="Test Lock" />);

        await expect(component.locator('[data-testid="widget-lock-refresh"]')).toHaveCount(0);
    });

    test('should render a refresh button when onRefresh is provided', async ({ mount }) => {
        const component = await mount(<WidgetLock lockTitle="Test Lock" onRefresh={() => {}} />);

        await expect(component.locator('[data-testid="widget-lock-refresh"]')).toBeVisible();
        await expect(component.getByRole('button', { name: 'Retry' })).toBeVisible();
    });

    test('should call onRefresh when the refresh button is clicked', async ({ mount }) => {
        let refreshCount = 0;
        const component = await mount(
            <WidgetLock
                lockTitle="Test Lock"
                onRefresh={() => {
                    refreshCount += 1;
                }}
            />,
        );

        await component.locator('[data-testid="widget-lock-refresh"]').click();

        await expect.poll(() => refreshCount).toBe(1);
        expect(refreshCount).toBe(1);
    });

    test('should render a custom refresh label when refreshLabel is provided', async ({ mount }) => {
        const component = await mount(<WidgetLock lockTitle="Test Lock" onRefresh={() => {}} refreshLabel="Try again" />);

        await expect(component.getByRole('button', { name: 'Try again' })).toBeVisible();
        await expect(component.getByRole('button', { name: 'Retry' })).toHaveCount(0);
    });

    test('should give the details button an accessible name', async ({ mount }) => {
        const component = await mount(<WidgetLock lockTitle="Test Lock" lockDetails="Test details" />);

        await expect(component.getByRole('button', { name: 'Show details' })).toBeVisible();
    });

    test('should render both the details tooltip and the refresh button together', async ({ mount }) => {
        const component = await mount(<WidgetLock lockTitle="Test Lock" lockDetails="Test details" onRefresh={() => {}} />);

        await expect(component.locator('[data-testid="widget-lock-details"]')).toBeVisible();
        await expect(component.locator('[data-testid="widget-lock-refresh"]')).toBeVisible();
    });

    // Reproduces the dashboard count badge: a ~240px card on a full-width viewport. A `sm:`
    // breakpoint stays in row layout there and pushes the panel out past its card.
    test('should stack and stay inside its card when dropped into a narrow container', async ({ mount }) => {
        const component = await mount(
            <div style={{ width: '240px' }}>
                <WidgetLock
                    size="small"
                    lockTitle="Count is not available"
                    lockText="This count could not be loaded."
                    onRefresh={() => {}}
                />
            </div>,
        );

        const card = component.locator('[data-testid="widget-lock"]');
        const cardBox = (await card.boundingBox()) ?? { width: 0, x: 0 };
        expect(cardBox.width).toBeLessThanOrEqual(240);

        // Stacked, not side by side: the button starts below the text rather than beside it.
        const text = component.getByText('This count could not be loaded.');
        const button = component.locator('[data-testid="widget-lock-refresh"]');
        const textBox = (await text.boundingBox()) ?? { y: 0, height: 0, width: 0 };
        const buttonBox = (await button.boundingBox()) ?? { y: 0, x: 0, width: 0 };
        expect(buttonBox.y).toBeGreaterThanOrEqual(textBox.y + textBox.height);

        // Nothing overflows the 240px card.
        expect(buttonBox.x + buttonBox.width).toBeLessThanOrEqual(cardBox.x + 240);
        // The text is not squeezed to one word per line.
        expect(textBox.width).toBeGreaterThan(120);
    });

    test('should lay out in a row when the container is wide enough', async ({ mount }) => {
        const component = await mount(
            <div style={{ width: '700px' }}>
                <WidgetLock lockTitle="Count is not available" lockText="This count could not be loaded." onRefresh={() => {}} />
            </div>,
        );

        const textBox = (await component.getByText('This count could not be loaded.').boundingBox()) ?? { y: 0, height: 0 };
        const buttonBox = (await component.locator('[data-testid="widget-lock-refresh"]').boundingBox()) ?? { y: 0 };

        expect(buttonBox.y).toBeLessThan(textBox.y + textBox.height);
    });

    test('should use custom data-testid when provided', async ({ mount }) => {
        const component = await mount(<WidgetLock lockTitle="Test" dataTestId="custom-lock-id" />);

        await expect(component.getByRole('heading', { name: 'Test' })).toBeVisible();

        const customLockContainer = component.locator('[data-testid="custom-lock-id"]');
        await expect(customLockContainer).toBeVisible();

        await expect(component.locator('[data-testid="widget-lock"]')).toHaveCount(0);
    });
});
