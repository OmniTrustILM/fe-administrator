import { test, expect } from '../../../playwright/ct-test';
import Dialog from './index';

test.describe('Dialog visual', () => {
    test.skip(({ browserName }) => browserName !== 'chromium', 'visual tests run on chromium only');

    test('closed', async ({ mount, page }) => {
        await mount(<Dialog isOpen={false} caption="Test" body="Body" dataTestId="visual-dialog" />);
        await expect(page).toHaveScreenshot('dialog-closed.png', {
            maxDiffPixelRatio: 0.02,
            threshold: 0.2,
            animations: 'disabled',
        });
    });

    test('open sm no icon no buttons', async ({ mount, page }) => {
        await mount(
            <Dialog
                isOpen={true}
                caption="Small dialog"
                body="Just some text content."
                size="sm"
                dataTestId="visual-dialog"
                toggle={() => {}}
            />,
        );
        await page.waitForTimeout(150);
        await expect(page).toHaveScreenshot('dialog-open-sm.png', {
            maxDiffPixelRatio: 0.02,
            threshold: 0.2,
            animations: 'disabled',
        });
    });

    test('open md two buttons', async ({ mount, page }) => {
        await mount(
            <Dialog
                isOpen={true}
                caption="Confirm action"
                body="Are you sure you want to continue?"
                size="md"
                buttons={[
                    { color: 'primary', onClick: () => {}, body: 'Confirm' },
                    { color: 'secondary', onClick: () => {}, body: 'Cancel' },
                ]}
                dataTestId="visual-dialog"
                toggle={() => {}}
            />,
        );
        await page.waitForTimeout(150);
        await expect(page).toHaveScreenshot('dialog-open-md-buttons.png', {
            maxDiffPixelRatio: 0.02,
            threshold: 0.2,
            animations: 'disabled',
        });
    });

    test('open lg warning icon two buttons', async ({ mount, page }) => {
        await mount(
            <Dialog
                isOpen={true}
                caption="Warning"
                body="Proceeding may cause issues."
                size="lg"
                icon="warning"
                buttons={[
                    { color: 'danger', onClick: () => {}, body: 'Proceed' },
                    { color: 'secondary', onClick: () => {}, body: 'Cancel' },
                ]}
                dataTestId="visual-dialog"
                toggle={() => {}}
            />,
        );
        await page.waitForTimeout(150);
        await expect(page).toHaveScreenshot('dialog-open-lg-warning.png', {
            maxDiffPixelRatio: 0.02,
            threshold: 0.2,
            animations: 'disabled',
        });
    });

    test('open xl delete icon two buttons', async ({ mount, page }) => {
        await mount(
            <Dialog
                isOpen={true}
                caption="Delete item"
                body="This action cannot be undone."
                size="xl"
                icon="delete"
                buttons={[
                    { color: 'danger', onClick: () => {}, body: 'Delete' },
                    { color: 'secondary', onClick: () => {}, body: 'Cancel' },
                ]}
                dataTestId="visual-dialog"
                toggle={() => {}}
            />,
        );
        await page.waitForTimeout(150);
        await expect(page).toHaveScreenshot('dialog-open-xl-delete.png', {
            maxDiffPixelRatio: 0.02,
            threshold: 0.2,
            animations: 'disabled',
        });
    });

    test('open xxl info icon one button', async ({ mount, page }) => {
        await mount(
            <Dialog
                isOpen={true}
                caption="Information"
                body="Here is some information you should know."
                size="xxl"
                icon="info"
                buttons={[{ color: 'primary', onClick: () => {}, body: 'OK' }]}
                dataTestId="visual-dialog"
                toggle={() => {}}
            />,
        );
        await page.waitForTimeout(150);
        await expect(page).toHaveScreenshot('dialog-open-xxl-info.png', {
            maxDiffPixelRatio: 0.02,
            threshold: 0.2,
            animations: 'disabled',
        });
    });

    test('open sm check icon one button', async ({ mount, page }) => {
        await mount(
            <Dialog
                isOpen={true}
                caption="Success"
                body="Operation completed."
                size="sm"
                icon="check"
                buttons={[{ color: 'primary', onClick: () => {}, body: 'Close' }]}
                dataTestId="visual-dialog"
                toggle={() => {}}
            />,
        );
        await page.waitForTimeout(150);
        await expect(page).toHaveScreenshot('dialog-open-sm-check.png', {
            maxDiffPixelRatio: 0.02,
            threshold: 0.2,
            animations: 'disabled',
        });
    });

    test('open sm no border no icon no buttons', async ({ mount, page }) => {
        await mount(
            <Dialog
                isOpen={true}
                caption="Bare dialog"
                body="Content without borders."
                size="sm"
                noBorder={true}
                dataTestId="visual-dialog"
                toggle={() => {}}
            />,
        );
        await page.waitForTimeout(150);
        await expect(page).toHaveScreenshot('dialog-open-sm-noborder.png', {
            maxDiffPixelRatio: 0.02,
            threshold: 0.2,
            animations: 'disabled',
        });
    });
});
