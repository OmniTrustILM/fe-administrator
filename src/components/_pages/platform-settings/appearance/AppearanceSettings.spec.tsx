import { expect, test, type Locator, type Page } from '@playwright/experimental-ct-react';
import AppearanceSettingsTestWrapper from './AppearanceSettingsTestWrapper';

/** A real 1x1 PNG: the ratio check measures it, so an invented payload would fail to load and skip the check. */
const PNG_DATA_URI = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAAC0lEQVR4nGNgAAIAAAUAAXpeqz8AAAAASUVORK5CYII=';

/** The same image as a byte array, for the selections that have to be driven from inside the browser. */
const PNG_BYTES = [...Buffer.from(PNG_DATA_URI.split(',')[1], 'base64')];

const storedBranding = (branding: Record<string, string>) => ({
    branding: {
        branding,
        isFetchingBranding: false,
        isUpdatingBranding: false,
        isResettingBranding: false,
        updateSucceeded: false,
        resetSucceeded: false,
    },
});

/**
 * A read that succeeded against an instance with nothing branded. Core answers 404 for one, which the epic maps to an
 * empty success, so the form has a known-good state to edit from. It is not the same as no read having landed, which
 * the tab refuses to edit from - see the failed-read test at the bottom.
 */
const unbranded = storedBranding({});

/** TextInput is readonly until focused, so a value has to be clicked into rather than filled straight in. */
const setHex = async (page: Page, key: string, value: string) => {
    const input = page.getByTestId(`color-hex-${key}`);

    await input.click();
    await input.fill(value);
};

const chooseFile = (input: Locator, name: string, mimeType: string, buffer: Buffer) => input.setInputFiles({ name, mimeType, buffer });

test.describe('AppearanceSettings', () => {
    test('should render the five colour rows with their usage hints', async ({ mount, page }) => {
        await mount(<AppearanceSettingsTestWrapper preloadedState={unbranded} />);

        for (const [key, label, hint] of [
            ['primaryColor', 'Primary', 'Buttons, links and active states'],
            ['secondaryColor', 'Secondary', 'Accents, chips and info badges'],
            ['tertiaryColor', 'Tertiary', 'Accents'],
            ['backgroundColor', 'Background', 'Page background'],
            ['textColor', 'Text', 'Body text and headings'],
        ]) {
            const row = page.getByTestId(`color-field-${key}`);

            await expect(row).toBeVisible();
            await expect(row).toContainText(label);
            await expect(row).toContainText(hint);
        }
    });

    test('should seed the fields from the stored branding', async ({ mount, page }) => {
        await mount(<AppearanceSettingsTestWrapper preloadedState={storedBranding({ primaryColor: '#0073CF' })} />);

        await expect(page.getByTestId('color-hex-primaryColor')).toHaveValue('#0073CF');
        await expect(page.getByTestId('color-swatch-primaryColor')).toHaveValue('#0073cf');
    });

    test('should push a hex value into the swatch', async ({ mount, page }) => {
        await mount(<AppearanceSettingsTestWrapper preloadedState={unbranded} />);
        await setHex(page, 'primaryColor', '#0073CF');

        await expect(page.getByTestId('color-swatch-primaryColor')).toHaveValue('#0073cf');
    });

    test('should push a swatch value into the hex field', async ({ mount, page }) => {
        await mount(<AppearanceSettingsTestWrapper preloadedState={unbranded} />);
        await page.getByTestId('color-swatch-secondaryColor').fill('#00a3e0');

        await expect(page.getByTestId('color-hex-secondaryColor')).toHaveValue('#00A3E0');
    });

    test('should surface an invalid hex inline and block the save', async ({ mount, page }) => {
        await mount(<AppearanceSettingsTestWrapper preloadedState={unbranded} />);
        await setHex(page, 'primaryColor', '#12345');

        await expect(page.getByTestId('color-error-primaryColor')).toBeVisible();
        await expect(page.getByTestId('appearance-save')).toBeDisabled();
    });

    test('should treat an emptied field as unset rather than invalid', async ({ mount, page }) => {
        await mount(<AppearanceSettingsTestWrapper preloadedState={storedBranding({ primaryColor: '#0073CF' })} />);
        await setHex(page, 'primaryColor', '');

        await expect(page.getByTestId('color-error-primaryColor')).toHaveCount(0);
        // The swatch cannot hold an empty value, so it falls back to black for display only.
        await expect(page.getByTestId('color-swatch-primaryColor')).toHaveValue('#000000');
        await expect(page.getByTestId('appearance-save')).toBeEnabled();
    });

    test('should keep the save disabled until something changes', async ({ mount, page }) => {
        await mount(<AppearanceSettingsTestWrapper preloadedState={storedBranding({ primaryColor: '#0073CF' })} />);

        await expect(page.getByTestId('appearance-save')).toBeDisabled();
        await setHex(page, 'primaryColor', '#00A3E0');
        await expect(page.getByTestId('appearance-save')).toBeEnabled();
    });

    test('should show the helper text on each logo slot', async ({ mount, page }) => {
        await mount(<AppearanceSettingsTestWrapper preloadedState={unbranded} />);

        for (const key of ['lightLogo', 'darkLogo']) {
            await expect(page.getByTestId(`logo-slot-${key}`)).toContainText(
                'PNG or SVG with a transparent background, up to 1 MB, aspect ratio between 1:1 and 3:1.',
            );
        }
    });

    test('should reject a file whose format Core does not accept', async ({ mount, page }) => {
        await mount(<AppearanceSettingsTestWrapper preloadedState={unbranded} />);
        await chooseFile(page.getByTestId('logo-input-lightLogo'), 'logo.jpg', 'image/jpeg', Buffer.from([0xff, 0xd8]));

        await expect(page.getByTestId('logo-error-lightLogo')).toHaveText('Logo must be a PNG or an SVG.');
        await expect(page.getByTestId('logo-preview-lightLogo')).toHaveCount(0);
        // The rejection has to reach the input it describes, not only the alert that announced it once.
        await expect(page.getByTestId('logo-error-lightLogo')).toHaveAttribute('id', 'lightLogo-error');
        await expect(page.getByTestId('logo-input-lightLogo')).toHaveAttribute('aria-describedby', 'lightLogo-error');
    });

    test('should reject a file over the size ceiling', async ({ mount, page }) => {
        await mount(<AppearanceSettingsTestWrapper preloadedState={unbranded} />);
        await chooseFile(page.getByTestId('logo-input-lightLogo'), 'logo.png', 'image/png', Buffer.alloc(1024 * 1024 + 1));

        await expect(page.getByTestId('logo-error-lightLogo')).toHaveText('Logo must be at most 1 MB.');
    });

    test('should reject a file whose aspect ratio is out of range', async ({ mount, page }) => {
        await mount(<AppearanceSettingsTestWrapper preloadedState={unbranded} />);
        // 1x4: taller than wide, so below the 1:1 floor.
        const tall = Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAAECAYAAABP2FU6AAAAC0lEQVR4nGNgwAQAABQAAX3+Hu4AAAAASUVORK5CYII=', 'base64');

        await chooseFile(page.getByTestId('logo-input-lightLogo'), 'tall.png', 'image/png', tall);

        await expect(page.getByTestId('logo-error-lightLogo')).toHaveText('Logo aspect ratio must be between 1:1 and 3:1.');
    });

    test('should preview the pending file and show its name', async ({ mount, page }) => {
        await mount(<AppearanceSettingsTestWrapper preloadedState={unbranded} />);
        await chooseFile(
            page.getByTestId('logo-input-lightLogo'),
            'brand.png',
            'image/png',
            Buffer.from(PNG_DATA_URI.split(',')[1], 'base64'),
        );

        const preview = page.getByTestId('logo-preview-lightLogo');

        await expect(preview).toBeVisible();
        await expect(preview).toHaveAttribute('src', /^data:image\/png;base64,/);
        await expect(page.getByTestId('logo-filename-lightLogo')).toHaveText('brand.png');
    });

    /**
     * The reads settle asynchronously, so the slot is claimed by a token. These pin that the token still admits the
     * result it was issued for: a compare that is off by one would silently drop every selection.
     */
    test('should keep the second of two selections on the same slot', async ({ mount, page }) => {
        const png = Buffer.from(PNG_DATA_URI.split(',')[1], 'base64');
        await mount(<AppearanceSettingsTestWrapper preloadedState={unbranded} />);
        const input = page.getByTestId('logo-input-lightLogo');

        await chooseFile(input, 'first.png', 'image/png', png);
        await chooseFile(input, 'second.png', 'image/png', png);

        await expect(page.getByTestId('logo-filename-lightLogo')).toHaveText('second.png');

        await page.getByTestId('appearance-save').click();
        await expect(page.getByTestId('sent-branding')).toContainText('"lightLogo"');
    });

    test('should leave the slot empty when a selection is deleted again', async ({ mount, page }) => {
        await mount(<AppearanceSettingsTestWrapper preloadedState={unbranded} />);
        await chooseFile(
            page.getByTestId('logo-input-lightLogo'),
            'brand.png',
            'image/png',
            Buffer.from(PNG_DATA_URI.split(',')[1], 'base64'),
        );
        await expect(page.getByTestId('logo-filename-lightLogo')).toHaveText('brand.png');

        await page.getByTestId('logo-delete-lightLogo').click();

        await expect(page.getByTestId('logo-empty-lightLogo')).toBeVisible();
        await expect(page.getByTestId('logo-filename-lightLogo')).toHaveText('No file selected');
    });

    test('should render a stored logo through an img element', async ({ mount, page }) => {
        await mount(<AppearanceSettingsTestWrapper preloadedState={storedBranding({ lightLogo: PNG_DATA_URI })} />);

        const preview = page.getByTestId('logo-preview-lightLogo');

        await expect(preview).toBeVisible();
        await expect(preview).toHaveJSProperty('tagName', 'IMG');
    });

    test('should delete only the slot that was cleared', async ({ mount, page }) => {
        await mount(<AppearanceSettingsTestWrapper preloadedState={storedBranding({ lightLogo: PNG_DATA_URI, darkLogo: PNG_DATA_URI })} />);
        await page.getByTestId('logo-delete-lightLogo').click();

        await expect(page.getByTestId('logo-empty-lightLogo')).toBeVisible();
        await expect(page.getByTestId('logo-preview-darkLogo')).toBeVisible();

        await page.getByTestId('appearance-save').click();
        await expect(page.getByTestId('sent-branding')).toContainText('"darkLogo"');
        await expect(page.getByTestId('sent-branding')).not.toContainText('"lightLogo"');
    });

    test('should disable delete on an empty slot', async ({ mount, page }) => {
        await mount(<AppearanceSettingsTestWrapper preloadedState={unbranded} />);

        await expect(page.getByTestId('logo-delete-lightLogo')).toBeDisabled();
    });

    test('should send the edited colours on save', async ({ mount, page }) => {
        await mount(<AppearanceSettingsTestWrapper preloadedState={unbranded} />);
        await setHex(page, 'primaryColor', '#0073CF');
        await setHex(page, 'textColor', '#171717');
        await page.getByTestId('appearance-save').click();

        const sent = page.getByTestId('sent-branding');

        await expect(sent).toContainText('"primaryColor":"#0073CF"');
        await expect(sent).toContainText('"textColor":"#171717"');
    });

    test('should carry the operator default theme through a save it does not edit', async ({ mount, page }) => {
        await mount(<AppearanceSettingsTestWrapper preloadedState={storedBranding({ primaryColor: '#0073CF', defaultTheme: 'dark' })} />);
        await setHex(page, 'primaryColor', '#00A3E0');
        await page.getByTestId('appearance-save').click();

        await expect(page.getByTestId('sent-branding')).toContainText('"defaultTheme":"dark"');
    });

    test('should reset to default only after the confirmation is accepted', async ({ mount, page }) => {
        await mount(<AppearanceSettingsTestWrapper preloadedState={storedBranding({ primaryColor: '#0073CF' })} />);

        await page.getByTestId('appearance-reset').click();
        await page.getByRole('button', { name: 'Cancel' }).click();
        await expect(page.getByTestId('sent-branding')).toHaveText('none');

        await page.getByTestId('appearance-reset').click();
        await page.getByRole('button', { name: 'Reset', exact: true }).click();
        await expect(page.getByTestId('sent-branding')).toHaveText('{}');
    });

    test('should surface an error reported by the server', async ({ mount, page }) => {
        await mount(
            <AppearanceSettingsTestWrapper
                preloadedState={{ branding: { ...unbranded.branding, error: 'Access denied for action UPDATE_BRANDING' } }}
            />,
        );

        await expect(page.getByTestId('appearance-error')).toHaveText('Access denied for action UPDATE_BRANDING');
    });

    test('should show the values but refuse edits without the update permission', async ({ mount, page }) => {
        await mount(<AppearanceSettingsTestWrapper canUpdate={false} preloadedState={storedBranding({ primaryColor: '#0073CF' })} />);

        await expect(page.getByTestId('appearance-read-only')).toBeVisible();
        await expect(page.getByTestId('color-hex-primaryColor')).toHaveValue('#0073CF');
        await expect(page.getByTestId('color-hex-primaryColor')).toBeDisabled();
        await expect(page.getByTestId('color-swatch-primaryColor')).toBeDisabled();
        await expect(page.getByTestId('logo-choose-lightLogo')).toBeDisabled();
        await expect(page.getByTestId('appearance-save')).toBeDisabled();
        await expect(page.getByTestId('appearance-reset')).toBeDisabled();
    });
    /**
     * Both actions are driven from one synchronous browser task, so the read is genuinely still in flight when the
     * second lands: `readLogoFile` cannot settle before a `FileReader` callback, which is a later task. Driven from
     * the test process instead, the read wins the race and neither of these pins what it claims to.
     */
    test('should not let a read still in flight resurrect a slot deleted meanwhile', async ({ mount, page }) => {
        await mount(<AppearanceSettingsTestWrapper preloadedState={storedBranding({ lightLogo: PNG_DATA_URI })} />);

        await page.evaluate((bytes) => {
            const input = document.querySelector<HTMLInputElement>('[data-testid="logo-input-lightLogo"]');
            const remove = document.querySelector<HTMLButtonElement>('[data-testid="logo-delete-lightLogo"]');

            if (!input || !remove) {
                throw new Error('The logo slot did not render its input and delete button.');
            }

            const transfer = new DataTransfer();

            transfer.items.add(new File([new Uint8Array(bytes)], 'brand.png', { type: 'image/png' }));
            input.files = transfer.files;
            input.dispatchEvent(new Event('change', { bubbles: true }));
            remove.click();
        }, PNG_BYTES);

        await expect(page.getByTestId('logo-empty-lightLogo')).toBeVisible();

        await page.getByTestId('appearance-save').click();

        await expect(page.getByTestId('sent-branding')).not.toContainText('lightLogo');
        // Re-checked after the round trips above, by which point the superseded read has long settled.
        await expect(page.getByTestId('logo-empty-lightLogo')).toBeVisible();
    });

    test('should block the save while a logo is being read', async ({ mount, page }) => {
        await mount(<AppearanceSettingsTestWrapper preloadedState={storedBranding({ primaryColor: '#0073CF' })} />);
        await setHex(page, 'primaryColor', '#00A3E0');
        await expect(page.getByTestId('appearance-save')).toBeEnabled();

        const disabledDuringRead = await page.evaluate(async (bytes) => {
            const input = document.querySelector<HTMLInputElement>('[data-testid="logo-input-lightLogo"]');

            if (!input) {
                throw new Error('The logo slot did not render its input.');
            }

            const transfer = new DataTransfer();

            transfer.items.add(new File([new Uint8Array(bytes)], 'brand.png', { type: 'image/png' }));
            input.files = transfer.files;
            input.dispatchEvent(new Event('change', { bubbles: true }));
            // A microtask is enough for React to have rendered the change, and still ahead of the FileReader callback
            // the read is waiting on, so the button is observed mid-read.
            await Promise.resolve();

            return document.querySelector<HTMLButtonElement>('[data-testid="appearance-save"]')?.disabled;
        }, PNG_BYTES);

        expect(disabledDuringRead).toBe(true);

        await expect(page.getByTestId('logo-filename-lightLogo')).toHaveText('brand.png');
        await expect(page.getByTestId('appearance-save')).toBeEnabled();
    });

    test('should refuse to edit when the branding read never succeeded', async ({ mount, page }) => {
        // No branding at all in the slice, which only a failed read leaves behind: the genuinely unbranded case is a
        // 404, which the epic maps to an empty success. Editing from it would build the save payload out of an empty
        // form, and Core clears every field left out of a request.
        await mount(
            <AppearanceSettingsTestWrapper
                preloadedState={{
                    branding: {
                        isFetchingBranding: false,
                        isUpdatingBranding: false,
                        isResettingBranding: false,
                        updateSucceeded: false,
                        resetSucceeded: false,
                        error: 'Failed to get branding',
                    },
                }}
            />,
        );

        await expect(page.getByTestId('appearance-unavailable')).toBeVisible();
        await expect(page.getByTestId('color-hex-primaryColor')).toBeDisabled();
        await expect(page.getByTestId('color-swatch-primaryColor')).toBeDisabled();
        await expect(page.getByTestId('logo-choose-lightLogo')).toBeDisabled();
        await expect(page.getByTestId('appearance-save')).toBeDisabled();
        await expect(page.getByTestId('appearance-reset')).toBeDisabled();
    });

    test('should not offer the failed-read notice on an instance that simply has no branding', async ({ mount, page }) => {
        await mount(<AppearanceSettingsTestWrapper preloadedState={unbranded} />);

        await expect(page.getByTestId('appearance-unavailable')).toHaveCount(0);
        await expect(page.getByTestId('color-hex-primaryColor')).toBeEnabled();
    });
});
