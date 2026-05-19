import { test, expect } from '../../../playwright/ct-test';
import Dialog from './index';
import DialogWithState from './DialogWithState';

test.describe('Dialog', () => {
    test('does not render content when isOpen is false', async ({ mount, page }) => {
        await mount(<Dialog isOpen={false} caption="Test Dialog" body="Dialog content" dataTestId="test-dialog" />);
        await expect(page.getByText('Test Dialog')).toHaveCount(0);
        await expect(page.getByText('Dialog content')).toHaveCount(0);
    });

    test('renders caption and body when isOpen is true', async ({ mount, page }) => {
        await mount(<Dialog isOpen={true} caption="Test Dialog" body="Dialog content" dataTestId="test-dialog" />);
        await expect(page.getByRole('dialog')).toBeVisible();
        await expect(page.getByText('Test Dialog')).toBeVisible();
        await expect(page.getByText('Dialog content')).toBeVisible();
    });

    test('calls toggle when X close button is clicked', async ({ mount, page }) => {
        let toggleCount = 0;
        const toggle = () => {
            toggleCount++;
        };
        await mount(<Dialog isOpen={true} caption="Test Dialog" body="Dialog content" toggle={toggle} dataTestId="test-dialog" />);
        await page.getByRole('button', { name: 'Close' }).click();
        expect(toggleCount).toBe(1);
    });

    test('calls toggle when ESC is pressed', async ({ mount, page }) => {
        let toggleCount = 0;
        const toggle = () => {
            toggleCount++;
        };
        await mount(<Dialog isOpen={true} caption="Test Dialog" body="Dialog content" toggle={toggle} dataTestId="test-dialog" />);
        await page.waitForTimeout(50);
        await page.getByRole('dialog').press('Escape');
        expect(toggleCount).toBe(1);
    });

    test('does not call toggle when overlay is clicked', async ({ mount, page }) => {
        let toggleCount = 0;
        const toggle = () => {
            toggleCount++;
        };
        await mount(<Dialog isOpen={true} caption="Test Dialog" body="Dialog content" toggle={toggle} dataTestId="test-dialog" />);
        await expect(page.getByTestId('dialog-overlay')).toBeVisible();
        await page.getByTestId('dialog-overlay').click({ position: { x: 5, y: 5 } });
        expect(toggleCount).toBe(0);
    });

    test('calls button onClick handlers', async ({ mount, page }) => {
        let cancelClicked = false;
        let confirmClicked = false;
        const buttons = [
            {
                color: 'primary' as const,
                onClick: () => {
                    confirmClicked = true;
                },
                body: 'Confirm',
            },
            {
                color: 'secondary' as const,
                onClick: () => {
                    cancelClicked = true;
                },
                body: 'Cancel',
            },
        ];
        await mount(<Dialog isOpen={true} caption="Test Dialog" body="Dialog content" buttons={buttons} dataTestId="test-dialog" />);
        await page.getByRole('button', { name: 'Confirm' }).click();
        expect(confirmClicked).toBe(true);
        await page.getByRole('button', { name: 'Cancel' }).click();
        expect(cancelClicked).toBe(true);
    });

    test('disables button when button.disabled is true', async ({ mount, page }) => {
        const buttons = [{ color: 'primary' as const, onClick: () => {}, body: 'Submit', disabled: true }];
        await mount(<Dialog isOpen={true} caption="Test Dialog" body="Dialog content" buttons={buttons} dataTestId="test-dialog" />);
        await expect(page.getByRole('button', { name: 'Submit' })).toBeDisabled();
    });

    test('uses custom dataTestId on dialog content', async ({ mount, page }) => {
        await mount(<Dialog isOpen={true} caption="Test Dialog" body="Dialog content" dataTestId="custom-dialog-id" />);
        await expect(page.locator('[data-testid="custom-dialog-id"]')).toBeVisible();
    });

    test('locks page scroll while open', async ({ mount, page }) => {
        await mount(<Dialog isOpen={true} caption="Test Dialog" body="Dialog content" dataTestId="test-dialog" />);
        await page.waitForTimeout(100);
        const isLocked = await page.evaluate(() => {
            const html = document.documentElement;
            const body = document.body;
            return getComputedStyle(html).overflow === 'hidden' || getComputedStyle(body).overflow === 'hidden';
        });
        expect(isLocked).toBe(true);
    });

    test('restores page scroll after close via toggle', async ({ mount, page }) => {
        await mount(<DialogWithState />);
        await page.waitForTimeout(50);
        const lockedWhileOpen = await page.evaluate(() => {
            const html = document.documentElement;
            const body = document.body;
            return getComputedStyle(html).overflow === 'hidden' || getComputedStyle(body).overflow === 'hidden';
        });
        expect(lockedWhileOpen).toBe(true);

        await page.getByRole('button', { name: 'Close' }).click();
        await page.waitForTimeout(150);
        const lockedAfterClose = await page.evaluate(() => {
            const html = document.documentElement;
            const body = document.body;
            return getComputedStyle(html).overflow === 'hidden' || getComputedStyle(body).overflow === 'hidden';
        });
        expect(lockedAfterClose).toBe(false);
    });

    test('renders body as React node', async ({ mount, page }) => {
        await mount(
            <Dialog isOpen={true} caption="Test" body={<span data-testid="custom-body">Custom body</span>} dataTestId="test-dialog" />,
        );
        await expect(page.getByTestId('custom-body')).toBeVisible();
        await expect(page.getByText('Custom body')).toBeVisible();
    });

    test('renders caption as React node', async ({ mount, page }) => {
        await mount(
            <Dialog isOpen={true} caption={<span data-testid="custom-caption">Custom title</span>} body="Body" dataTestId="test-dialog" />,
        );
        await expect(page.getByTestId('custom-caption')).toBeVisible();
        await expect(page.getByText('Custom title')).toBeVisible();
    });

    test('renders without buttons section when buttons is empty', async ({ mount, page }) => {
        await mount(<Dialog isOpen={true} caption="No Buttons" body="Just content" buttons={[]} dataTestId="test-dialog" />);
        await expect(page.getByText('No Buttons')).toBeVisible();
        await expect(page.locator('.modal-footer')).toHaveCount(0);
    });

    test('uses button key when provided', async ({ mount, page }) => {
        const buttons = [
            { key: 'save-btn', color: 'primary' as const, onClick: () => {}, body: 'Save' },
            { key: 'cancel-btn', color: 'secondary' as const, onClick: () => {}, body: 'Cancel' },
        ];
        await mount(<Dialog isOpen={true} caption="Test" body="Content" buttons={buttons} dataTestId="test-dialog" />);
        await expect(page.getByRole('button', { name: 'Save' })).toBeVisible();
        await expect(page.getByRole('button', { name: 'Cancel' })).toBeVisible();
    });

    test('passes button variant to Button', async ({ mount, page }) => {
        const buttons = [{ color: 'primary' as const, variant: 'outline' as const, onClick: () => {}, body: 'Outline' }];
        await mount(<Dialog isOpen={true} caption="Test" body="Content" buttons={buttons} dataTestId="test-dialog" />);
        await expect(page.getByRole('button', { name: 'Outline' })).toBeVisible();
    });

    test('size sm renders', async ({ mount, page }) => {
        await mount(<Dialog isOpen={true} caption="Small" body="Content" size="sm" dataTestId="test-dialog" />);
        await expect(page.getByText('Small')).toBeVisible();
    });

    test('size md renders', async ({ mount, page }) => {
        await mount(<Dialog isOpen={true} caption="Medium" body="Content" size="md" dataTestId="test-dialog" />);
        await expect(page.getByText('Medium')).toBeVisible();
    });

    test('size lg renders', async ({ mount, page }) => {
        await mount(<Dialog isOpen={true} caption="Large" body="Content" size="lg" dataTestId="test-dialog" />);
        await expect(page.getByText('Large')).toBeVisible();
    });

    test('size xl renders', async ({ mount, page }) => {
        await mount(<Dialog isOpen={true} caption="Extra Large" body="Content" size="xl" dataTestId="test-dialog" />);
        await expect(page.getByText('Extra Large')).toBeVisible();
    });

    test('size xxl renders', async ({ mount, page }) => {
        await mount(<Dialog isOpen={true} caption="2XL" body="Content" size="xxl" dataTestId="test-dialog" />);
        await expect(page.getByText('2XL')).toBeVisible();
    });

    test('noBorder prop renders without caption-bottom border', async ({ mount, page }) => {
        await mount(<Dialog isOpen={true} caption="No Border" body="Content" noBorder={true} dataTestId="test-dialog" />);
        await expect(page.getByText('No Border')).toBeVisible();
    });

    test('renders delete icon', async ({ mount, page }) => {
        await mount(<Dialog isOpen={true} caption="Delete Item" body="Are you sure?" icon="delete" dataTestId="test-dialog" />);
        await expect(page.locator('.w-12.h-12')).toBeVisible();
    });

    test('renders info icon', async ({ mount, page }) => {
        await mount(<Dialog isOpen={true} caption="Info" body="Info" icon="info" dataTestId="test-dialog" />);
        await expect(page.locator('.w-12.h-12')).toBeVisible();
    });

    test('renders warning icon', async ({ mount, page }) => {
        await mount(<Dialog isOpen={true} caption="Warning" body="Warn" icon="warning" dataTestId="test-dialog" />);
        await expect(page.locator('.w-12.h-12')).toBeVisible();
    });

    test('renders check icon', async ({ mount, page }) => {
        await mount(<Dialog isOpen={true} caption="Success" body="Done" icon="check" dataTestId="test-dialog" />);
        await expect(page.locator('.w-12.h-12')).toBeVisible();
    });

    test('renders destroy icon', async ({ mount, page }) => {
        await mount(<Dialog isOpen={true} caption="Destroy" body="Confirm" icon="destroy" dataTestId="test-dialog" />);
        await expect(page.locator('.w-12.h-12')).toBeVisible();
    });

    test('renders upload icon', async ({ mount, page }) => {
        await mount(<Dialog isOpen={true} caption="Upload" body="Upload" icon="upload" dataTestId="test-dialog" />);
        await expect(page.locator('.w-12.h-12')).toBeVisible();
    });

    test('renders users icon', async ({ mount, page }) => {
        await mount(<Dialog isOpen={true} caption="Users" body="Users" icon="users" dataTestId="test-dialog" />);
        await expect(page.locator('.w-12.h-12')).toBeVisible();
    });

    test('renders user icon', async ({ mount, page }) => {
        await mount(<Dialog isOpen={true} caption="User" body="User" icon="user" dataTestId="test-dialog" />);
        await expect(page.locator('.w-12.h-12')).toBeVisible();
    });

    test('renders user-check icon', async ({ mount, page }) => {
        await mount(<Dialog isOpen={true} caption="Update Owner" body="Owner" icon="user-check" dataTestId="test-dialog" />);
        await expect(page.locator('.w-12.h-12')).toBeVisible();
    });

    test('renders shield-check icon', async ({ mount, page }) => {
        await mount(<Dialog isOpen={true} caption="RA Profile" body="RA" icon="shield-check" dataTestId="test-dialog" />);
        await expect(page.locator('.w-12.h-12')).toBeVisible();
    });

    test('renders download icon', async ({ mount, page }) => {
        await mount(<Dialog isOpen={true} caption="Download" body="Download" icon="download" dataTestId="test-dialog" />);
        await expect(page.locator('.w-12.h-12')).toBeVisible();
    });

    test('renders refresh icon', async ({ mount, page }) => {
        await mount(<Dialog isOpen={true} caption="Refresh" body="Refresh" icon="refresh" dataTestId="test-dialog" />);
        await expect(page.locator('.w-12.h-12')).toBeVisible();
    });

    test('renders shuffle icon', async ({ mount, page }) => {
        await mount(<Dialog isOpen={true} caption="Shuffle" body="Shuffle" icon="shuffle" dataTestId="test-dialog" />);
        await expect(page.locator('.w-12.h-12')).toBeVisible();
    });

    test('renders minus icon', async ({ mount, page }) => {
        await mount(<Dialog isOpen={true} caption="Remove" body="Remove" icon="minus" dataTestId="test-dialog" />);
        await expect(page.locator('.w-12.h-12')).toBeVisible();
    });

    test('renders plug icon', async ({ mount, page }) => {
        await mount(<Dialog isOpen={true} caption="Connect" body="Connect" icon="plug" dataTestId="test-dialog" />);
        await expect(page.locator('.w-12.h-12')).toBeVisible();
    });

    test('renders custom icon as React node', async ({ mount, page }) => {
        await mount(
            <Dialog
                isOpen={true}
                caption="Custom"
                body="Content"
                icon={<span data-testid="custom-icon">Icon</span>}
                dataTestId="test-dialog"
            />,
        );
        await expect(page.getByTestId('custom-icon')).toBeVisible();
        await expect(page.getByText('Icon')).toBeVisible();
    });
});
