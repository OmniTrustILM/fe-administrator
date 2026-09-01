import { expect, test, type Locator, type Page } from '@playwright/experimental-ct-react';
import AppearanceSettingsTestWrapper from './AppearanceSettingsTestWrapper';

/** A real 1x1 PNG: the ratio check measures it, so an invented payload would fail to load and skip the check. */
const PNG_DATA_URI = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAAC0lEQVR4nGNgAAIAAAUAAXpeqz8AAAAASUVORK5CYII=';

/** The same image as a byte array, for the selections that have to be driven from inside the browser. */
const PNG_BYTES = [...Buffer.from(PNG_DATA_URI.split(',')[1], 'base64')];

/** A second real PNG, 2x1 so it clears the ratio check. Distinct bytes, so replacing a stored logo with it is a change. */
const OTHER_PNG_DATA_URI =
    'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAIAAAABCAIAAAB7QOjdAAAADUlEQVR4nGNgKD4PRAAHNwKFC/xdIQAAAABJRU5ErkJggg==';

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

/**
 * A brand with every field filled. Most of these tests need one now: branding saves whole, so a form missing any
 * colour or either logo offers no Save to click.
 */
const COMPLETE_BRANDING = {
    primaryColor: '#0073CF',
    secondaryColor: '#00A3E0',
    tertiaryColor: '#7AC143',
    backgroundColor: '#FFFFFF',
    textColor: '#171717',
    lightLogo: PNG_DATA_URI,
    darkLogo: PNG_DATA_URI,
};

const branded = storedBranding(COMPLETE_BRANDING);

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
            ['tertiaryColor', 'Tertiary', 'Accents. Stored, not yet applied anywhere.'],
            ['backgroundColor', 'Background', 'Page background, light theme only'],
            ['textColor', 'Text', 'Body text and headings, light theme only'],
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

    /**
     * Emptying a field is a different failure from mistyping one, and the form has to keep saying which: no inline
     * error, because nothing about the value is wrong, but no Save either, because the brand is now incomplete.
     */
    test('should treat an emptied field as incomplete rather than invalid', async ({ mount, page }) => {
        await mount(<AppearanceSettingsTestWrapper preloadedState={branded} />);
        await setHex(page, 'primaryColor', '');

        await expect(page.getByTestId('color-error-primaryColor')).toHaveCount(0);
        // The swatch cannot hold an empty value, so it falls back to black for display only.
        await expect(page.getByTestId('color-swatch-primaryColor')).toHaveValue('#000000');
        await expect(page.getByTestId('appearance-incomplete')).toContainText('Primary');
        await expect(page.getByTestId('appearance-save')).toBeDisabled();
    });

    test('should keep the save disabled until something changes', async ({ mount, page }) => {
        await mount(<AppearanceSettingsTestWrapper preloadedState={branded} />);

        await expect(page.getByTestId('appearance-save')).toBeDisabled();
        await setHex(page, 'primaryColor', '#00A3E0');
        await expect(page.getByTestId('appearance-save')).toBeEnabled();
    });

    test('should refuse to save a brand that is only partly filled, naming what is missing', async ({ mount, page }) => {
        await mount(<AppearanceSettingsTestWrapper preloadedState={unbranded} />);
        await setHex(page, 'primaryColor', '#0073CF');

        const missing = page.getByTestId('appearance-incomplete');

        for (const label of ['Secondary', 'Tertiary', 'Background', 'Text', 'Light Logo', 'Dark Logo']) {
            await expect(missing).toContainText(label);
        }
        // The one field that is filled must not be listed as missing.
        await expect(missing).not.toContainText('Primary,');
        await expect(page.getByTestId('appearance-save')).toBeDisabled();
    });

    test('should offer the save once every colour and both logos are filled', async ({ mount, page }) => {
        const png = Buffer.from(PNG_DATA_URI.split(',')[1], 'base64');

        await mount(<AppearanceSettingsTestWrapper preloadedState={unbranded} />);

        for (const [key, value] of Object.entries(COMPLETE_BRANDING)) {
            if (key.endsWith('Color')) {
                await setHex(page, key, value);
            }
        }
        await expect(page.getByTestId('appearance-save')).toBeDisabled();

        await chooseFile(page.getByTestId('logo-input-lightLogo'), 'light.png', 'image/png', png);
        await chooseFile(page.getByTestId('logo-input-darkLogo'), 'dark.png', 'image/png', png);

        await expect(page.getByTestId('appearance-incomplete')).toHaveCount(0);
        await expect(page.getByTestId('appearance-save')).toBeEnabled();
    });

    test('should mark every colour and both logos as required', async ({ mount, page }) => {
        await mount(<AppearanceSettingsTestWrapper preloadedState={unbranded} />);

        for (const key of ['primaryColor', 'secondaryColor', 'tertiaryColor', 'backgroundColor', 'textColor']) {
            await expect(page.getByTestId(`label-${key}`)).toContainText('*');
        }
        for (const key of ['lightLogo', 'darkLogo']) {
            await expect(page.getByTestId(`label-${key}`)).toContainText('*');
        }
    });

    /** Which colour reaches which theme is the question the form is asked most, so it answers it on the page. */
    test('should say which colours reach which theme, and that neither logo covers for the other', async ({ mount, page }) => {
        await mount(<AppearanceSettingsTestWrapper preloadedState={unbranded} />);

        await expect(page.getByTestId('appearance-color-composition')).toContainText('Background and Text apply to the light theme only');
        await expect(page.getByTestId('appearance-color-composition')).toContainText('no color is inverted for it automatically');
        await expect(page.getByTestId('appearance-logo-composition')).toContainText('Neither slot falls back to the other.');
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
        const otherPng = Buffer.from(OTHER_PNG_DATA_URI.split(',')[1], 'base64');
        await mount(<AppearanceSettingsTestWrapper preloadedState={branded} />);
        const input = page.getByTestId('logo-input-lightLogo');

        await chooseFile(input, 'first.png', 'image/png', png);
        await chooseFile(input, 'second.png', 'image/png', otherPng);

        await expect(page.getByTestId('logo-filename-lightLogo')).toHaveText('second.png');

        await page.getByTestId('appearance-save').click();
        // Named rather than merely present: with every field required the payload carries a light logo either way, so
        // only the bytes distinguish the selection that won.
        await expect(page.getByTestId('sent-branding')).toContainText(`"lightLogo":"${OTHER_PNG_DATA_URI}"`);
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

    /**
     * Deleting one slot leaves the other alone. It also leaves the brand incomplete, which is the point: a logo is
     * removed by resetting the whole brand, not by saving one half of it, so there is no save to assert here.
     */
    test('should delete only the slot that was cleared', async ({ mount, page }) => {
        await mount(<AppearanceSettingsTestWrapper preloadedState={branded} />);
        await page.getByTestId('logo-delete-lightLogo').click();

        await expect(page.getByTestId('logo-empty-lightLogo')).toBeVisible();
        await expect(page.getByTestId('logo-preview-darkLogo')).toBeVisible();

        await expect(page.getByTestId('appearance-incomplete')).toContainText('Light Logo');
        await expect(page.getByTestId('appearance-incomplete')).not.toContainText('Dark Logo');
        await expect(page.getByTestId('appearance-save')).toBeDisabled();
    });

    test('should disable delete on an empty slot', async ({ mount, page }) => {
        await mount(<AppearanceSettingsTestWrapper preloadedState={unbranded} />);

        await expect(page.getByTestId('logo-delete-lightLogo')).toBeDisabled();
    });

    test('should send the edited colours on save', async ({ mount, page }) => {
        await mount(<AppearanceSettingsTestWrapper preloadedState={branded} />);
        await setHex(page, 'primaryColor', '#123456');
        await setHex(page, 'textColor', '#654321');
        await page.getByTestId('appearance-save').click();

        const sent = page.getByTestId('sent-branding');

        await expect(sent).toContainText('"primaryColor":"#123456"');
        await expect(sent).toContainText('"textColor":"#654321"');
        // The untouched fields go with them: Core clears anything left out of an update.
        await expect(sent).toContainText('"secondaryColor":"#00A3E0"');
    });

    test('should carry the operator default theme through a save it does not edit', async ({ mount, page }) => {
        await mount(<AppearanceSettingsTestWrapper preloadedState={storedBranding({ ...COMPLETE_BRANDING, defaultTheme: 'dark' })} />);
        await setHex(page, 'primaryColor', '#00A3E0');
        await page.getByTestId('appearance-save').click();

        await expect(page.getByTestId('sent-branding')).toContainText('"defaultTheme":"dark"');
    });

    test('should reset to default only after the confirmation is accepted', async ({ mount, page }) => {
        await mount(<AppearanceSettingsTestWrapper preloadedState={branded} />);

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

    /**
     * Both actions are driven from one synchronous browser task, so the read is genuinely still in flight when the
     * second lands: `readLogoFile` cannot settle before a `FileReader` callback, which is a later task. Driven from
     * the test process instead, the read wins the race and neither of these pins what it claims to.
     */
    test('should not let a read still in flight resurrect a slot deleted meanwhile', async ({ mount, page }) => {
        await mount(<AppearanceSettingsTestWrapper preloadedState={branded} />);

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
        // The deleted slot is what the brand is now missing, which is only true if the superseded read did not fill it
        // back in. Re-checked after those round trips, by which point that read has long settled.
        await expect(page.getByTestId('appearance-incomplete')).toContainText('Light Logo');
        await expect(page.getByTestId('logo-empty-lightLogo')).toBeVisible();
        await expect(page.getByTestId('sent-branding')).toHaveText('none');
    });

    test('should block the save while a logo is being read', async ({ mount, page }) => {
        await mount(<AppearanceSettingsTestWrapper preloadedState={branded} />);
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
