import { expect, test, type Locator, type Page } from '@playwright/experimental-ct-react';
import { isBrandedUtility } from 'utils/brand-tokens';
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
 * A brand with every field filled, so a test that edits one field starts from a state where the others are set.
 *
 * The colours are the platform's own, which matters beyond realism: they clear WCAG AA everywhere, so a Save here goes
 * straight through rather than stopping at the contrast warning. The tests that want that warning choose colours that
 * fail it - see the contrast group at the bottom.
 */
const COMPLETE_BRANDING = {
    primaryColor: '#0073CF',
    secondaryColor: '#0369A1',
    backgroundColor: '#F8FAFC',
    textColor: '#1F2937',
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
    test('should render each colour row with its label and an info tooltip', async ({ mount, page }) => {
        await mount(<AppearanceSettingsTestWrapper preloadedState={unbranded} />);

        for (const [key, label] of [
            ['primaryColor', 'Primary'],
            ['secondaryColor', 'Secondary'],
            ['backgroundColor', 'Background'],
            ['textColor', 'Text'],
        ]) {
            const row = page.getByTestId(`color-field-${key}`);

            await expect(row).toBeVisible();
            await expect(row).toContainText(label);
            await expect(page.getByTestId(`color-help-${key}`)).toBeVisible();
        }
    });

    /**
     * `Label` carries its own `mb-2`, and `classnames` does not resolve a Tailwind conflict: `.mb-0` is emitted first,
     * so a plain `mb-0` loses and the dead margin drops the icon below the text it labels.
     */
    test('should center the info tooltip on its label', async ({ mount, page }) => {
        await mount(<AppearanceSettingsTestWrapper preloadedState={unbranded} />);

        const label = await page.getByTestId('label-primaryColor').boundingBox();
        const icon = await page.getByTestId('color-help-primaryColor').boundingBox();

        expect(label).not.toBeNull();
        expect(icon).not.toBeNull();
        expect(Math.abs(label!.y + label!.height / 2 - (icon!.y + icon!.height / 2))).toBeLessThanOrEqual(1);
    });

    /**
     * Behind a toggletip rather than a hover tooltip: the description is the only place saying which theme a colour
     * reaches, so it has to be reachable without a pointer.
     */
    test('should say what a colour drives and which theme it reaches', async ({ mount, page }) => {
        await mount(<AppearanceSettingsTestWrapper preloadedState={unbranded} />);

        await page.getByTestId('color-help-primaryColor').click();

        await expect(page.getByTestId('color-help-primaryColor-content')).toContainText(
            'Buttons, links, active states and the page header. Applies to both the light and the dark theme.',
        );
    });

    test('should keep focus on the field a colour was cleared from', async ({ mount, page }) => {
        await mount(<AppearanceSettingsTestWrapper preloadedState={branded} />);

        await page.getByTestId('color-clear-primaryColor').click();

        await expect(page.getByTestId('color-hex-primaryColor')).toBeFocused();
    });

    /**
     * An empty field means the platform default applies, so both hints an unset field shows - the placeholder and the
     * swatch the browser cannot leave blank - have to name that field's own default rather than one colour for all four.
     */
    const PLATFORM_DEFAULTS = [
        { key: 'primaryColor', hex: '#0073CF' },
        { key: 'secondaryColor', hex: '#0369A1' },
        { key: 'backgroundColor', hex: '#F8FAFC' },
        { key: 'textColor', hex: '#1F2937' },
    ];

    for (const { key, hex } of PLATFORM_DEFAULTS) {
        test(`should hint the platform default for ${key} while it is unset`, async ({ mount, page }) => {
            await mount(<AppearanceSettingsTestWrapper preloadedState={unbranded} />);

            await expect(page.getByTestId(`color-hex-${key}`)).toHaveAttribute('placeholder', hex);
            await expect(page.getByTestId(`color-swatch-${key}`)).toHaveValue(hex.toLowerCase());
        });
    }

    test('should not offer a tertiary colour', async ({ mount, page }) => {
        await mount(<AppearanceSettingsTestWrapper preloadedState={unbranded} />);

        await expect(page.getByTestId('color-field-tertiaryColor')).toHaveCount(0);
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

    test('should treat an emptied field as a saveable unset value rather than invalid input', async ({ mount, page }) => {
        // Stored away from the platform default, so the swatch below can only read it back from the fallback.
        await mount(<AppearanceSettingsTestWrapper preloadedState={storedBranding({ ...COMPLETE_BRANDING, primaryColor: '#00A3E0' })} />);
        await setHex(page, 'primaryColor', '');

        await expect(page.getByTestId('color-error-primaryColor')).toHaveCount(0);
        // The swatch cannot hold an empty value, so it falls back to the field's own default for display only.
        await expect(page.getByTestId('color-swatch-primaryColor')).toHaveValue('#0073cf');
        await expect(page.getByTestId('appearance-save')).toBeEnabled();
    });

    test('should keep the save disabled until something changes', async ({ mount, page }) => {
        await mount(<AppearanceSettingsTestWrapper preloadedState={branded} />);

        await expect(page.getByTestId('appearance-save')).toBeDisabled();
        await setHex(page, 'primaryColor', '#00A3E0');
        await expect(page.getByTestId('appearance-save')).toBeEnabled();
    });

    /**
     * Every part of a brand stands on its own: Core validates each field's format and falls back per field, and the
     * token layer overrides only what is set, so one colour is as valid a brand as all six fields.
     */
    test('should save a brand that sets only one colour', async ({ mount, page }) => {
        await mount(<AppearanceSettingsTestWrapper preloadedState={unbranded} />);
        await setHex(page, 'primaryColor', '#0073CF');

        await expect(page.getByTestId('appearance-save')).toBeEnabled();
        await page.getByTestId('appearance-save').click();

        await expect(page.getByTestId('sent-branding')).toContainText('"primaryColor":"#0073CF"');
    });

    /**
     * Core validates the format of any colour it is given, so an empty string is rejected where an absent field is
     * what clears that part of the brand.
     */
    test('should omit an unset colour from the save rather than send an empty string', async ({ mount, page }) => {
        await mount(<AppearanceSettingsTestWrapper preloadedState={branded} />);
        await setHex(page, 'secondaryColor', '');
        await page.getByTestId('appearance-save').click();

        const sent = page.getByTestId('sent-branding');

        await expect(sent).toContainText('"primaryColor":"#0073CF"');
        await expect(sent).not.toContainText('secondaryColor');
    });

    test('should offer the save once a single logo is chosen', async ({ mount, page }) => {
        const png = Buffer.from(PNG_DATA_URI.split(',')[1], 'base64');

        await mount(<AppearanceSettingsTestWrapper preloadedState={unbranded} />);
        await expect(page.getByTestId('appearance-save')).toBeDisabled();

        await chooseFile(page.getByTestId('logo-input-lightLogo'), 'light.png', 'image/png', png);

        await expect(page.getByTestId('appearance-save')).toBeEnabled();
    });

    test('should mark no colour or logo as required', async ({ mount, page }) => {
        await mount(<AppearanceSettingsTestWrapper preloadedState={unbranded} />);

        for (const key of ['primaryColor', 'secondaryColor', 'backgroundColor', 'textColor', 'lightLogo', 'darkLogo']) {
            await expect(page.getByTestId(`label-${key}`)).not.toContainText('*');
        }
    });

    test('should clear a colour from its own control', async ({ mount, page }) => {
        await mount(<AppearanceSettingsTestWrapper preloadedState={branded} />);

        await page.getByTestId('color-clear-primaryColor').click();

        await expect(page.getByTestId('color-hex-primaryColor')).toHaveValue('');
        await expect(page.getByTestId('color-clear-primaryColor')).toHaveCount(0);
    });

    test('should state the logo requirements behind the info toggletip', async ({ mount, page }) => {
        await mount(<AppearanceSettingsTestWrapper preloadedState={unbranded} />);

        await page.getByTestId('appearance-logo-help').click();

        const content = page.getByTestId('appearance-logo-help-content');

        await expect(content).toContainText('PNG or SVG with a transparent background, up to 1 MB, aspect ratio between 1:1 and 3:1.');
        // A one-logo brand is saveable now, so the tab has to say what the empty slot falls back to.
        await expect(content).toContainText('shows the platform logo in that theme');
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

    test('should reject a file whose content is not the format its name claims', async ({ mount, page }) => {
        await mount(<AppearanceSettingsTestWrapper preloadedState={unbranded} />);
        await chooseFile(page.getByTestId('logo-input-lightLogo'), 'logo.png', 'image/png', Buffer.from([0xff, 0xd8, 0xff, 0xe0]));

        await expect(page.getByTestId('logo-error-lightLogo')).toHaveText('Logo must be a PNG or an SVG.');
        await expect(page.getByTestId('logo-preview-lightLogo')).toHaveCount(0);
        await expect(page.getByTestId('appearance-save')).toBeDisabled();
    });

    /** Browsers report a failed parse differently, so this pins the rejection in each one rather than only the logic. */
    test('should reject an SVG the browser cannot parse', async ({ mount, page }) => {
        await mount(<AppearanceSettingsTestWrapper preloadedState={unbranded} />);
        await chooseFile(page.getByTestId('logo-input-lightLogo'), 'logo.svg', 'image/svg+xml', Buffer.from('<svg><g></svg>'));

        await expect(page.getByTestId('logo-error-lightLogo')).toHaveText('Logo must be a PNG or an SVG.');
        await expect(page.getByTestId('logo-preview-lightLogo')).toHaveCount(0);
    });

    /** A PNG that keeps its signature but nothing else: the browser cannot decode it, and Core's chunk walk refuses it. */
    test('should reject a PNG the browser cannot decode', async ({ mount, page }) => {
        const truncated = Buffer.from(PNG_DATA_URI.split(',')[1], 'base64').subarray(0, 12);
        await mount(<AppearanceSettingsTestWrapper preloadedState={unbranded} />);
        await chooseFile(page.getByTestId('logo-input-lightLogo'), 'logo.png', 'image/png', truncated);

        await expect(page.getByTestId('logo-error-lightLogo')).toHaveText('Logo must be a well-formed PNG image.');
        await expect(page.getByTestId('logo-preview-lightLogo')).toHaveCount(0);
    });

    /**
     * XML lets the declaration space its `=`, and a legacy export that does is a document Core stores. Pinned here
     * rather than in the unit suite because happy-dom refuses the spaced form that real engines accept.
     */
    test('should accept an SVG whose declaration spaces the equals sign and names a legacy encoding', async ({ mount, page }) => {
        const markup =
            '<?xml version = "1.0" encoding = "windows-1252"?>' +
            '<svg xmlns="http://www.w3.org/2000/svg" width="200" height="100"><title>Caf\u00e9</title><rect width="200" height="100"/></svg>';
        await mount(<AppearanceSettingsTestWrapper preloadedState={unbranded} />);
        await chooseFile(page.getByTestId('logo-input-lightLogo'), 'legacy.svg', 'image/svg+xml', Buffer.from(markup, 'latin1'));

        await expect(page.getByTestId('logo-preview-lightLogo')).toBeVisible();
        await expect(page.getByTestId('logo-error-lightLogo')).toHaveCount(0);
    });

    /** Pinned in a real browser because the parse, not the rule, is what differs between engines. */
    test('should reject an SVG carrying a document type declaration', async ({ mount, page }) => {
        const doctyped = Buffer.from(
            '<!DOCTYPE svg PUBLIC "-//W3C//DTD SVG 1.1//EN" "http://www.w3.org/Graphics/SVG/1.1/DTD/svg11.dtd">' +
                '<svg xmlns="http://www.w3.org/2000/svg" width="200" height="100"/>',
        );
        await mount(<AppearanceSettingsTestWrapper preloadedState={unbranded} />);
        await chooseFile(page.getByTestId('logo-input-lightLogo'), 'logo.svg', 'image/svg+xml', doctyped);

        await expect(page.getByTestId('logo-error-lightLogo')).toHaveText('Logo SVG must not carry a document type declaration.');
        await expect(page.getByTestId('logo-preview-lightLogo')).toHaveCount(0);
    });

    /** Windows reports no media type for an SVG, which is why the format is read from the content rather than declared. */
    test('should accept an SVG the browser reported no media type for', async ({ mount, page }) => {
        const svg = Buffer.from('<svg xmlns="http://www.w3.org/2000/svg" width="200" height="100"><rect width="200" height="100"/></svg>');
        await mount(<AppearanceSettingsTestWrapper preloadedState={unbranded} />);
        await chooseFile(page.getByTestId('logo-input-lightLogo'), 'logo.svg', '', svg);

        const preview = page.getByTestId('logo-preview-lightLogo');

        await expect(preview).toBeVisible();
        await expect(preview).toHaveAttribute('src', /^data:image\/svg\+xml;base64,/);
        await expect(page.getByTestId('logo-error-lightLogo')).toHaveCount(0);
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

    test('should delete only the selected slot and keep the one-logo brand saveable', async ({ mount, page }) => {
        await mount(<AppearanceSettingsTestWrapper preloadedState={branded} />);
        await page.getByTestId('logo-delete-lightLogo').click();

        await expect(page.getByTestId('logo-empty-lightLogo')).toBeVisible();
        await expect(page.getByTestId('logo-preview-darkLogo')).toBeVisible();
        await expect(page.getByTestId('appearance-save')).toBeEnabled();
    });

    test('should not offer delete on an empty slot', async ({ mount, page }) => {
        await mount(<AppearanceSettingsTestWrapper preloadedState={unbranded} />);

        await expect(page.getByTestId('logo-delete-lightLogo')).toHaveCount(0);
        await expect(page.getByTestId('logo-delete-darkLogo')).toHaveCount(0);
    });

    test('should hold the drop-zone highlight across a nested dragenter and dragleave', async ({ mount, page }) => {
        await mount(<AppearanceSettingsTestWrapper preloadedState={unbranded} />);

        const zone = page.getByTestId('logo-choose-lightLogo');
        await expect(zone).toBeVisible();

        // Dispatched one at a time and asserted through the retrying matcher: the highlight is React state, so
        // reading className in the same task as the dispatch races the re-render. The pattern is anchored because
        // the resting zone carries `hover:border-brand`, which a bare `border-brand` match would hit.
        const fire = (event: string, onChild = false) =>
            page.evaluate(
                ([name, child]) => {
                    const el = document.querySelector<HTMLButtonElement>('[data-testid="logo-choose-lightLogo"]');

                    if (!el) {
                        throw new Error('The logo slot did not render its drop zone.');
                    }

                    const target = child === 'child' ? (el.firstElementChild ?? el) : el;
                    target.dispatchEvent(new DragEvent(name, { bubbles: true, dataTransfer: new DataTransfer() }));
                },
                [event, onChild ? 'child' : 'self'],
            );

        await fire('dragenter');
        await expect(zone).toHaveClass(/(^|\s)border-brand(\s|$)/);

        // Entering a child fires dragleave on the zone; the pointer has not left it, so the tint must hold.
        await fire('dragenter', true);
        await fire('dragleave');
        await expect(zone).toHaveClass(/(^|\s)border-brand(\s|$)/);

        await fire('dragleave');
        await expect(zone).not.toHaveClass(/(^|\s)border-brand(\s|$)/);
    });

    test('should move focus to the drop zone when a logo is deleted', async ({ mount, page }) => {
        await mount(<AppearanceSettingsTestWrapper preloadedState={branded} />);

        await page.getByTestId('logo-delete-lightLogo').click();

        await expect(page.getByTestId('logo-choose-lightLogo')).toBeFocused();
    });

    test('should accept a logo dropped onto the slot', async ({ mount, page }) => {
        await mount(<AppearanceSettingsTestWrapper preloadedState={unbranded} />);
        await expect(page.getByTestId('logo-choose-lightLogo')).toBeVisible();

        // A drop cannot be synthesised from the test process: DataTransfer has to be built in the page, and its file
        // list is read-only, so the file is put there through a DataTransfer the browser itself constructed.
        await page.evaluate((bytes) => {
            const zone = document.querySelector<HTMLButtonElement>('[data-testid="logo-choose-lightLogo"]');

            if (!zone) {
                throw new Error('The logo slot did not render its drop zone.');
            }

            const transfer = new DataTransfer();
            transfer.items.add(new File([new Uint8Array(bytes)], 'dropped.png', { type: 'image/png' }));
            zone.dispatchEvent(new DragEvent('drop', { bubbles: true, dataTransfer: transfer }));
        }, PNG_BYTES);

        await expect(page.getByTestId('logo-preview-lightLogo')).toBeVisible();
        await expect(page.getByTestId('logo-filename-lightLogo')).toHaveText('dropped.png');
    });

    test('should reject a dropped file that breaks a rule', async ({ mount, page }) => {
        await mount(<AppearanceSettingsTestWrapper preloadedState={unbranded} />);
        await expect(page.getByTestId('logo-choose-lightLogo')).toBeVisible();

        await page.evaluate(() => {
            const zone = document.querySelector<HTMLButtonElement>('[data-testid="logo-choose-lightLogo"]');

            if (!zone) {
                throw new Error('The logo slot did not render its drop zone.');
            }

            const transfer = new DataTransfer();
            transfer.items.add(new File([new Uint8Array([0xff, 0xd8])], 'photo.jpg', { type: 'image/jpeg' }));
            zone.dispatchEvent(new DragEvent('drop', { bubbles: true, dataTransfer: transfer }));
        });

        await expect(page.getByTestId('logo-error-lightLogo')).toHaveText('Logo must be a PNG or an SVG.');
        await expect(page.getByTestId('logo-preview-lightLogo')).toHaveCount(0);
    });

    test('should send the edited colours on save', async ({ mount, page }) => {
        await mount(<AppearanceSettingsTestWrapper preloadedState={branded} />);
        await setHex(page, 'primaryColor', '#1D4ED8');
        await setHex(page, 'textColor', '#292524');
        await page.getByTestId('appearance-save').click();

        const sent = page.getByTestId('sent-branding');

        await expect(sent).toContainText('"primaryColor":"#1D4ED8"');
        await expect(sent).toContainText('"textColor":"#292524"');
        // The untouched fields go with them: Core clears anything left out of an update.
        await expect(sent).toContainText('"secondaryColor":"#0369A1"');
    });

    test('should carry the operator default theme through a save it does not edit', async ({ mount, page }) => {
        await mount(<AppearanceSettingsTestWrapper preloadedState={storedBranding({ ...COMPLETE_BRANDING, defaultTheme: 'dark' })} />);
        await setHex(page, 'primaryColor', '#1D4ED8');
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

    test('should not let a logo read still in flight repopulate the form a reset has cleared', async ({ mount, page }) => {
        await mount(<AppearanceSettingsTestWrapper preloadedState={storedBranding({ ...COMPLETE_BRANDING, lightLogo: undefined })} />);

        await page.getByTestId('appearance-reset').click();
        await expect(page.getByTestId('appearance-reset-dialog')).toBeVisible();

        // The confirmation is accepted in the same turn the file is handed over, so the reset is dispatched while the
        // FileReader callback is still pending. Reset stays enabled during a read - only Save is held back for it.
        await page.evaluate((bytes) => {
            const input = document.querySelector<HTMLInputElement>('[data-testid="logo-input-lightLogo"]');
            const confirm = [...document.querySelectorAll('button')].find((button) => button.textContent?.trim() === 'Reset');

            if (!input || !confirm) {
                throw new Error('The logo slot or the confirmation button did not render.');
            }

            const transfer = new DataTransfer();

            transfer.items.add(new File([new Uint8Array(bytes)], 'brand.png', { type: 'image/png' }));
            input.files = transfer.files;
            input.dispatchEvent(new Event('change', { bubbles: true }));
            confirm.click();
        }, PNG_BYTES);

        await expect(page.getByTestId('sent-branding')).toHaveText('{}');

        // The slot the reset emptied stays empty: the read gave up its claim on the way out, so it has nothing left to
        // write back. Otherwise the tab reports a successful reset over a form that is partly populated again.
        await expect(page.getByTestId('logo-empty-lightLogo')).toBeVisible();
        await expect(page.getByTestId('logo-filename-lightLogo')).toHaveText('No file selected');
    });

    test('should surface an error reported by the server', async ({ mount, page }) => {
        await mount(
            <AppearanceSettingsTestWrapper
                preloadedState={{ branding: { ...unbranded.branding, error: 'Access denied for action UPDATE_BRANDING' } }}
            />,
        );

        await expect(page.getByTestId('appearance-error')).toHaveText('Access denied for action UPDATE_BRANDING');
        // It arrives while the operator is looking at the form they just submitted, so it has to interrupt.
        await expect(page.getByTestId('appearance-error')).toHaveRole('alert');
    });

    /**
     * Both actions are driven from one synchronous browser task, so the read is genuinely still in flight when the
     * second lands: `readLogoFile` cannot settle before a `FileReader` callback, which is a later task. Driven from
     * the test process instead, the read wins the race and neither of these pins what it claims to.
     */
    test('should not let a read still in flight resurrect a slot deleted meanwhile', async ({ mount, page }) => {
        await mount(<AppearanceSettingsTestWrapper preloadedState={branded} />);

        // Delete is only rendered for a filled slot, so waiting for it is what pins the stored logo as committed
        // before the browser task below runs.
        await expect(page.getByTestId('logo-delete-lightLogo')).toBeVisible();

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
        // Asserted again after the round trips above, by which point the superseded read has long settled: the slot
        // staying empty is what pins that it did not write its logo back in.
        await expect(page.getByTestId('logo-preview-lightLogo')).toHaveCount(0);
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

    /**
     * The brand belongs to the operator, so contrast warns and never blocks.
     *
     * Which pairs fail for which colours is `brand-contrast.spec.ts`; these cases take a colour it establishes as
     * failing and assert what the warning then does with it.
     */
    test.describe('contrast warning', () => {
        test('should save straight through when the colours clear AA everywhere', async ({ mount, page }) => {
            await mount(<AppearanceSettingsTestWrapper preloadedState={branded} />);
            await setHex(page, 'primaryColor', '#1D4ED8');

            await page.getByTestId('appearance-save').click();

            await expect(page.getByTestId('appearance-contrast-dialog')).toHaveCount(0);
            await expect(page.getByTestId('sent-branding')).toContainText('"primaryColor":"#1D4ED8"');
        });

        /**
         * The dialog reports the operator's own colours, so nothing the warning itself renders may be painted in one:
         * a branded token would render the complaint at the ratio it is complaining about. Derived from the override
         * table rather than listed here, and walked over every element, since this is markup no token suite can check.
         *
         * `Dialog`'s own chrome - the panel, the caption and the footer buttons - is outside this and stays on the
         * platform tokens every other dialog uses. Pinning it to unbranded ones is a decision about the whole modal
         * system rather than about this one dialog.
         */
        test('should paint the boxes only in tokens branding leaves alone', async ({ mount, page }) => {
            await mount(<AppearanceSettingsTestWrapper preloadedState={branded} />);
            await setHex(page, 'primaryColor', '#7FC4FF');

            await page.getByTestId('appearance-save').click();
            await expect(page.getByTestId('appearance-contrast-primary')).toBeVisible();

            const classesIn = (testId: string) =>
                page.getByTestId(testId).evaluate((box) => [box, ...box.querySelectorAll('*')].flatMap((el) => [...el.classList]));

            // The lead and the legend carry the message as much as the boxes do, and the lead is the sentence a
            // failing content-muted on surface-raised would make unreadable, so the dialog's own chrome will not do.
            for (const testId of ['appearance-contrast-lead', 'appearance-contrast-findings', 'appearance-contrast-legend']) {
                const classes = await classesIn(testId);

                expect(classes.length, testId).toBeGreaterThan(0);
                expect(classes.filter(isBrandedUtility), testId).toStrictEqual([]);
            }
        });

        /** Pins the heading icon to the warning family rather than whatever `Dialog`'s named icon resolves to. */
        test('should head the dialog in the warning colour rather than the danger one', async ({ mount, page }) => {
            await mount(<AppearanceSettingsTestWrapper preloadedState={branded} />);
            await setHex(page, 'primaryColor', '#7FC4FF');

            await page.getByTestId('appearance-save').click();

            const paints = await page.getByTestId('appearance-contrast-dialog-icon').evaluate((icon) => {
                const probe = document.createElement('span');

                // Beside the icon rather than inside it: an HTML child of an SVG is outside the SVG rendering model,
                // and engines disagree on whether it takes styles at all.
                icon.parentElement?.append(probe);

                const resolve = (value: string) => {
                    probe.style.color = value;

                    return getComputedStyle(probe).color;
                };
                const measured = {
                    icon: getComputedStyle(icon).color,
                    warning: resolve('var(--warning)'),
                    danger: resolve('var(--danger)'),
                };

                probe.remove();

                return measured;
            });

            expect(paints.icon).toBe(paints.warning);
            expect(paints.icon).not.toBe(paints.danger);
        });

        /** The figures under each line mean nothing without the scale, so the scale is on screen rather than behind a control. */
        test('should lead with one line and spell out what the ratios mean', async ({ mount, page }) => {
            await mount(<AppearanceSettingsTestWrapper preloadedState={branded} />);
            await setHex(page, 'primaryColor', '#7FC4FF');

            await page.getByTestId('appearance-save').click();

            const dialog = page.getByTestId('appearance-contrast-dialog');

            await expect(dialog).toContainText('Some of these colors will be hard to read. You can save anyway.');
            // The boxes unmount when a suggestion is taken and this sentence changes in place, so it has to announce.
            await expect(page.getByTestId('appearance-contrast-lead')).toHaveRole('status');
            await expect(dialog).toContainText('at least 4.5:1 for text and 3:1 for outlines and indicators');
            await expect(dialog.getByRole('link', { name: 'How WCAG measures contrast' })).toHaveAttribute(
                'href',
                'https://www.w3.org/WAI/WCAG21/Understanding/contrast-minimum.html',
            );
        });

        test('should offer a shade that passes and put it in the field', async ({ mount, page }) => {
            await mount(<AppearanceSettingsTestWrapper preloadedState={branded} />);
            await setHex(page, 'primaryColor', '#7FC4FF');

            await page.getByTestId('appearance-save').click();

            const fix = page.getByTestId('appearance-contrast-fix-primary');

            await expect(fix).toContainText('Use #');

            const suggested = (await fix.textContent())?.match(/#[0-9A-F]{6}/)?.[0];

            // The name names the field, and opens with the visible text so that saying it aloud activates the button.
            const name = `Use ${suggested} instead for Primary`;

            await expect(fix).toHaveAccessibleName(name);
            expect(name.startsWith((await fix.textContent())?.trim() ?? '')).toBe(true);

            await fix.click();

            await expect(page.getByTestId('color-hex-primaryColor')).toHaveValue(suggested ?? 'no suggestion');
            // The save the operator started is still theirs to finish, so the dialog stays and says where it stands.
            await expect(page.getByTestId('appearance-contrast-dialog')).toBeVisible();
            await expect(page.getByTestId('appearance-contrast-primary')).toHaveCount(0);

            const lead = page.getByTestId('appearance-contrast-lead');

            // Pressing the fix unmounts the button, which would otherwise leave focus parked on the dialog itself.
            await expect(lead).toBeFocused();
            await expect(lead).toContainText('These colors all pass now');
            // Nothing is wrong any more, so the sentence saying so must not still be dressed as a problem.
            await expect(lead).toHaveClass(/bg-success-surface/);
            await expect(lead).not.toHaveClass(/bg-warning-surface/);
            // The legend explains figures, and there are none left to explain.
            await expect(page.getByTestId('appearance-contrast-legend')).toHaveCount(0);
        });

        test('should box each finding under the colour that causes it, with the measurement underneath', async ({ mount, page }) => {
            await mount(<AppearanceSettingsTestWrapper preloadedState={branded} />);
            await setHex(page, 'primaryColor', '#7FC4FF');

            await page.getByTestId('appearance-save').click();

            const primary = page.getByTestId('appearance-contrast-primary');

            await expect(primary).toBeVisible();
            await expect(primary).toContainText('Primary');
            await expect(primary.getByRole('listitem')).toHaveCount(2);
            await expect(primary).toContainText('Links and active controls are hard to read on cards and dialogs in the light theme.');
            await expect(primary).toContainText('1.81:1, needs 4.5:1');
            // The field to change is the box's heading, so the list has to carry it: read inside the list alone, a
            // consequence never says which of the four colours produced it.
            await expect(primary.getByRole('list')).toHaveAccessibleName('Primary');
            // The header takes Primary in both compositions, and one line says so rather than two saying it apart.
            await expect(primary).toContainText(
                'White text is hard to read on the page header and on primary buttons in the light and dark themes.',
            );
            await expect(page.getByTestId('appearance-contrast-text')).toHaveCount(0);
        });

        test('should give each colour its own box', async ({ mount, page }) => {
            await mount(<AppearanceSettingsTestWrapper preloadedState={branded} />);
            await setHex(page, 'primaryColor', '#7FC4FF');
            await setHex(page, 'backgroundColor', '#FFFFFF');
            await setHex(page, 'textColor', '#C9C9C9');

            await page.getByTestId('appearance-save').click();

            await expect(page.getByTestId('appearance-contrast-primary')).toBeVisible();
            await expect(page.getByTestId('appearance-contrast-text')).toContainText('Text');
            await expect(page.getByTestId('appearance-contrast-text')).toContainText('Body text is hard to read on the page background');
        });

        test('should report a non-text pairing against the 3:1 threshold', async ({ mount, page }) => {
            await mount(<AppearanceSettingsTestWrapper preloadedState={branded} />);
            await setHex(page, 'secondaryColor', '#E8F4FF');

            await page.getByTestId('appearance-save').click();

            const secondary = page.getByTestId('appearance-contrast-secondary');

            await expect(secondary).toContainText('Informational status dots are hard to see on cards and dialogs');
            await expect(secondary).toContainText('needs 3:1');
        });

        test('should send nothing when the warning is cancelled', async ({ mount, page }) => {
            await mount(<AppearanceSettingsTestWrapper preloadedState={branded} />);
            await setHex(page, 'primaryColor', '#7FC4FF');

            await page.getByTestId('appearance-save').click();
            await page.getByRole('button', { name: 'Cancel' }).click();

            await expect(page.getByTestId('sent-branding')).toHaveText('none');
        });

        test('should save the colours as chosen once the warning is confirmed', async ({ mount, page }) => {
            await mount(<AppearanceSettingsTestWrapper preloadedState={branded} />);
            await setHex(page, 'primaryColor', '#7FC4FF');

            await page.getByTestId('appearance-save').click();
            await page.getByRole('button', { name: 'Save anyway' }).click();

            await expect(page.getByTestId('appearance-contrast-dialog')).toHaveCount(0);
            await expect(page.getByTestId('sent-branding')).toContainText('"primaryColor":"#7FC4FF"');
        });

        test('should measure the derived weights, not only the colour that was typed', async ({ mount, page }) => {
            await mount(<AppearanceSettingsTestWrapper preloadedState={branded} />);
            // #767676 clears AA as body text on a white page; the two quieter weights derived below it do not, which
            // is exactly what a check over the four typed colours alone would miss.
            await setHex(page, 'backgroundColor', '#FFFFFF');
            await setHex(page, 'textColor', '#767676');

            await page.getByTestId('appearance-save').click();

            const findings = page.getByTestId('appearance-contrast-findings');

            await expect(findings).toContainText('Supporting text is hard to read on the page background');
            await expect(findings).toContainText('Hint text is hard to read on cards and dialogs');
            await expect(findings).not.toContainText('Body text is hard to read on the page background');
        });
    });
});
