import { test, expect } from '../../../playwright/ct-test';
import Select from './index';

const OPTIONS = [
    { value: '1', label: 'Option 1' },
    { value: '2', label: 'Option 2' },
    { value: '3', label: 'Option 3' },
];

const OPTIONS_WITH_DESC = [
    { value: 'a', label: 'Alpha', description: 'First letter description' },
    { value: 'b', label: 'Bravo', description: 'Second letter description' },
];

const VERSION_OPTIONS = [
    { value: 'v1', label: 'Version 1 (Original)' },
    { value: 'v2', label: 'Version 2' },
    { value: 'v3', label: 'Version 3 (Latest)' },
];

test.describe('Select visual', () => {
    test.skip(({ browserName }) => browserName !== 'chromium', 'visual tests run on chromium only');

    test('single closed with placeholder', async ({ mount, page }) => {
        await mount(
            <div style={{ padding: 16, width: 360 }}>
                <Select id="v1" value="" onChange={() => {}} options={OPTIONS} placeholder="Pick one" dataTestId="v" />
            </div>,
        );
        await page.waitForTimeout(150);
        await expect(page).toHaveScreenshot('select-single-closed-placeholder.png', {
            maxDiffPixelRatio: 0.02,
            threshold: 0.2,
            animations: 'disabled',
        });
    });

    test('single closed with value', async ({ mount, page }) => {
        await mount(
            <div style={{ padding: 16, width: 360 }}>
                <Select id="v2" value="2" onChange={() => {}} options={OPTIONS} dataTestId="v" />
            </div>,
        );
        await page.waitForTimeout(150);
        await expect(page).toHaveScreenshot('select-single-closed-value.png', {
            maxDiffPixelRatio: 0.02,
            threshold: 0.2,
            animations: 'disabled',
        });
    });

    test('single closed disabled', async ({ mount, page }) => {
        await mount(
            <div style={{ padding: 16, width: 360 }}>
                <Select id="v3" value="" onChange={() => {}} options={OPTIONS} isDisabled dataTestId="v" />
            </div>,
        );
        await page.waitForTimeout(150);
        await expect(page).toHaveScreenshot('select-single-closed-disabled.png', {
            maxDiffPixelRatio: 0.02,
            threshold: 0.2,
            animations: 'disabled',
        });
    });

    test('single closed no options', async ({ mount, page }) => {
        await mount(
            <div style={{ padding: 16, width: 360 }}>
                <Select id="v4" value="" onChange={() => {}} options={[]} dataTestId="v" />
            </div>,
        );
        await page.waitForTimeout(150);
        await expect(page).toHaveScreenshot('select-single-closed-no-options.png', {
            maxDiffPixelRatio: 0.02,
            threshold: 0.2,
            animations: 'disabled',
        });
    });

    test('single clearable with value', async ({ mount, page }) => {
        await mount(
            <div style={{ padding: 16, width: 360 }}>
                <Select id="v5" value="1" onChange={() => {}} options={OPTIONS} isClearable dataTestId="v" />
            </div>,
        );
        await page.waitForTimeout(150);
        await expect(page).toHaveScreenshot('select-single-clearable-value.png', {
            maxDiffPixelRatio: 0.02,
            threshold: 0.2,
            animations: 'disabled',
        });
    });

    test('single with label and error', async ({ mount, page }) => {
        await mount(
            <div style={{ padding: 16, width: 360 }}>
                <Select
                    id="v6"
                    value=""
                    onChange={() => {}}
                    options={OPTIONS}
                    label="Pick a value"
                    required
                    error="Required"
                    dataTestId="v"
                />
            </div>,
        );
        await page.waitForTimeout(150);
        await expect(page).toHaveScreenshot('select-single-label-error.png', {
            maxDiffPixelRatio: 0.02,
            threshold: 0.2,
            animations: 'disabled',
        });
    });

    test('multi closed empty', async ({ mount, page }) => {
        await mount(
            <div style={{ padding: 16, width: 360 }}>
                <Select id="v7" value={[]} onChange={() => {}} options={OPTIONS} isMulti dataTestId="v" />
            </div>,
        );
        await page.waitForTimeout(150);
        await expect(page).toHaveScreenshot('select-multi-closed-empty.png', {
            maxDiffPixelRatio: 0.02,
            threshold: 0.2,
            animations: 'disabled',
        });
    });

    test('multi closed with chips', async ({ mount, page }) => {
        await mount(
            <div style={{ padding: 16, width: 360 }}>
                <Select
                    id="v8"
                    value={[
                        { value: '1', label: 'Option 1' },
                        { value: '2', label: 'Option 2' },
                    ]}
                    onChange={() => {}}
                    options={OPTIONS}
                    isMulti
                    dataTestId="v"
                />
            </div>,
        );
        await page.waitForTimeout(150);
        await expect(page).toHaveScreenshot('select-multi-closed-chips.png', {
            maxDiffPixelRatio: 0.02,
            threshold: 0.2,
            animations: 'disabled',
        });
    });

    test('version-label colorized closed', async ({ mount, page }) => {
        await mount(
            <div style={{ padding: 16, width: 360 }}>
                <Select id="v9" value="v3" onChange={() => {}} options={VERSION_OPTIONS} colorizeVersionLabel dataTestId="v" />
            </div>,
        );
        await page.waitForTimeout(200);
        await expect(page).toHaveScreenshot('select-version-colorized.png', {
            maxDiffPixelRatio: 0.02,
            threshold: 0.2,
            animations: 'disabled',
        });
    });

    test('options with descriptions closed', async ({ mount, page }) => {
        await mount(
            <div style={{ padding: 16, width: 360 }}>
                <Select id="v10" value="a" onChange={() => {}} options={OPTIONS_WITH_DESC} showOptionDescriptionInDropdown dataTestId="v" />
            </div>,
        );
        await page.waitForTimeout(150);
        await expect(page).toHaveScreenshot('select-with-descriptions-closed.png', {
            maxDiffPixelRatio: 0.02,
            threshold: 0.2,
            animations: 'disabled',
        });
    });
});
