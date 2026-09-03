import { describe, expect, test, vi } from 'vitest';
import {
    BRAND_COLOR_PATTERN,
    dataUriMediaType,
    isBrandColor,
    isRenderableLogo,
    LOGO_MAX_DECODED_BYTES,
    logoMediaTypeFromName,
    logoRatioError,
    logoSizeError,
    logoTypeError,
    readFileAsDataUri,
    readLogoFile,
    withDataUriMediaType,
} from './branding';

const file = (overrides: Partial<{ type: string; name: string; size: number }> = {}) => ({
    type: 'image/png',
    name: 'logo.png',
    size: 1024,
    ...overrides,
});

describe('branding', () => {
    describe('isBrandColor', () => {
        test.each(['#000000', '#ffffff', '#0073CF', '#aBcDeF'])('should accept %s', (value) => {
            expect(isBrandColor(value)).toBe(true);
        });

        test.each(['', '#fff', '0073CF', '#0073C', '#0073CFF', '#00 3CF', 'rgb(0,0,0)', '#00zzcf'])('should reject %s', (value) => {
            expect(isBrandColor(value)).toBe(false);
        });

        test('should mirror the pattern Core enforces', () => {
            expect(BRAND_COLOR_PATTERN.source).toBe('^#[0-9a-fA-F]{6}$');
        });
    });

    describe('logoTypeError', () => {
        test.each(['image/png', 'image/svg+xml'])('should accept %s', (type) => {
            expect(logoTypeError(file({ type }))).toBeUndefined();
        });

        test.each(['logo.svg', 'logo.SVG', 'logo.png'])('should accept %s reported with no media type', (name) => {
            expect(logoTypeError(file({ type: '', name }))).toBeUndefined();
        });

        test('should reject a media type Core does not accept', () => {
            expect(logoTypeError(file({ type: 'image/jpeg', name: 'logo.jpg' }))).toBe('Logo must be a PNG or an SVG.');
        });

        test('should reject an unknown extension when the media type is missing', () => {
            expect(logoTypeError(file({ type: '', name: 'logo.gif' }))).toBe('Logo must be a PNG or an SVG.');
        });
    });

    describe('logoSizeError', () => {
        test('should accept a file at the limit', () => {
            expect(logoSizeError(LOGO_MAX_DECODED_BYTES)).toBeUndefined();
        });

        test('should reject a file over the limit', () => {
            expect(logoSizeError(LOGO_MAX_DECODED_BYTES + 1)).toBe('Logo must be at most 1 MB.');
        });

        test('should mirror the one mebibyte Core enforces', () => {
            expect(LOGO_MAX_DECODED_BYTES).toBe(1024 * 1024);
        });
    });

    describe('logoRatioError', () => {
        test.each([
            [100, 100],
            [200, 100],
            [300, 100],
            [150, 100],
        ])('should accept %sx%s', (width, height) => {
            expect(logoRatioError(width, height)).toBeUndefined();
        });

        test.each([
            [100, 200],
            [301, 100],
        ])('should reject %sx%s', (width, height) => {
            expect(logoRatioError(width, height)).toBe('Logo aspect ratio must be between 1:1 and 3:1.');
        });

        test.each([
            [0, 100],
            [100, 0],
        ])('should skip the check for an image declaring no intrinsic size (%sx%s)', (width, height) => {
            expect(logoRatioError(width, height)).toBeUndefined();
        });
    });

    describe('dataUriMediaType', () => {
        test.each([
            ['data:image/png;base64,iVBORw0KGgo=', 'image/png'],
            ['data:image/svg+xml;base64,PHN2Zy8+', 'image/svg+xml'],
            ['data:image/png,raw', 'image/png'],
        ])('should read the media type out of %s', (dataUri, expected) => {
            expect(dataUriMediaType(dataUri)).toBe(expected);
        });

        test.each(['', 'https://example.com/logo.png', 'not a data uri'])('should report none for %s', (value) => {
            expect(dataUriMediaType(value)).toBeUndefined();
        });
    });

    describe('isRenderableLogo', () => {
        // A real 1x1 PNG and a minimal SVG, in the exact form Core stores: `BrandingLogoValidator` re-encodes a
        // sanitized SVG and returns a PNG unchanged only after walking its chunks, so this is the only shape a stored
        // logo takes.
        const PNG = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAAC0lEQVR4nGNgAAIAAAUAAXpeqz8AAAAASUVORK5CYII=';
        const SVG = 'data:image/svg+xml;base64,PHN2Zy8+';

        test.each([
            ['a stored PNG', PNG],
            ['a stored SVG', SVG],
            ['an unpadded payload', 'data:image/png;base64,iVBORw0KGgo'],
            ['a singly padded payload', 'data:image/png;base64,iVBORw0KGg=='],
            // Core lower-cases the declared type before comparing it, and returns a PNG's data URI unchanged, so a
            // stored logo may carry the type in any case.
            ['a media type in another case', 'data:IMAGE/PNG;base64,iVBORw0KGgo='],
        ])('should accept %s', (_case, value) => {
            expect(isRenderableLogo(value)).toBe(true);
        });

        test.each([
            // The cases the media-type check alone let through: both name a permitted type and carry a payload no
            // browser will decode, and `BrandLogo` has no decode-error fallback to catch them.
            ['a raw payload with an accepted type', 'data:image/png,raw'],
            ['a URI-encoded SVG', 'data:image/svg+xml;charset=utf-8,<svg/>'],
            ['a base64 payload behind a parameter', 'data:image/svg+xml;charset=utf-8;base64,PHN2Zy8+'],
            ['a payload outside the base64 alphabet', 'data:image/png;base64,%%%'],
            ['an empty payload', 'data:image/png;base64,'],
            ['padding in the middle of the payload', 'data:image/png;base64,iVBO=Rw0KGgo='],
            ['more than two padding characters', 'data:image/png;base64,iVBORw0KG==='],
            ['an unsupported media type', 'data:image/gif;base64,R0lGODlhAQABAAAAACw='],
            ['no media type at all', 'data:;base64,PHN2Zy8+'],
            ['an absolute URL', 'https://example.invalid/logo.svg'],
            ['a protocol-relative URL', '//example.invalid/logo.svg'],
            ['a relative path', '/logo.svg'],
            ['a javascript URL', 'javascript:alert(1)'],
            ['an empty string', ''],
        ])('should refuse %s', (_case, value) => {
            expect(isRenderableLogo(value)).toBe(false);
        });

        test.each([
            ['null', null],
            ['undefined', undefined],
        ])('should refuse %s, which is how an unset slot arrives', (_case, value) => {
            expect(isRenderableLogo(value)).toBe(false);
        });

        /** The upload path and the render path have to agree, or a logo the operator just saved would not show. */
        test('should accept what readLogoFile produces', async () => {
            const svg = new File(['<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1 1"/>'], 'logo.svg', { type: 'image/svg+xml' });
            const { dataUri } = await readLogoFile(svg);

            expect(isRenderableLogo(dataUri)).toBe(true);
        });
    });

    describe('logoMediaTypeFromName', () => {
        test.each([
            ['logo.png', 'image/png'],
            ['LOGO.PNG', 'image/png'],
            ['logo.svg', 'image/svg+xml'],
            ['logo.SVG', 'image/svg+xml'],
        ])('should read %s as %s', (name, expected) => {
            expect(logoMediaTypeFromName(name)).toBe(expected);
        });

        test.each(['logo.jpg', 'logo', 'logo.png.txt'])('should report none for %s', (name) => {
            expect(logoMediaTypeFromName(name)).toBeUndefined();
        });
    });

    describe('withDataUriMediaType', () => {
        test('should restate the media type of a base64 data URI', () => {
            expect(withDataUriMediaType('data:application/octet-stream;base64,PHN2Zy8+', 'image/svg+xml')).toBe(
                'data:image/svg+xml;base64,PHN2Zy8+',
            );
        });

        test('should supply a media type where the URI declares none', () => {
            expect(withDataUriMediaType('data:;base64,PHN2Zy8+', 'image/svg+xml')).toBe('data:image/svg+xml;base64,PHN2Zy8+');
        });

        test.each(['data:image/png,raw', 'not a data uri'])('should leave %s alone rather than corrupt it', (value) => {
            expect(withDataUriMediaType(value, 'image/png')).toBe(value);
        });
    });

    describe('readFileAsDataUri', () => {
        test('should read a blob as a data URI', async () => {
            await expect(readFileAsDataUri(new Blob(['<svg/>'], { type: 'image/svg+xml' }))).resolves.toMatch(
                /^data:image\/svg\+xml;base64,/,
            );
        });
    });

    describe('readLogoFile', () => {
        const pngFile = (bytes: number) => new File([new Uint8Array(bytes)], 'logo.png', { type: 'image/png' }) as File;

        test('should refuse a media type Core does not accept before reading anything', async () => {
            const jpeg = new File([new Uint8Array(8)], 'logo.jpg', { type: 'image/jpeg' });

            await expect(readLogoFile(jpeg)).resolves.toEqual({ error: 'Logo must be a PNG or an SVG.' });
        });

        test('should refuse an oversized file before reading anything', async () => {
            await expect(readLogoFile(pngFile(LOGO_MAX_DECODED_BYTES + 1))).resolves.toEqual({
                error: 'Logo must be at most 1 MB.',
            });
        });

        test('should refuse a file whose ratio is out of range', async () => {
            vi.stubGlobal(
                'Image',
                class {
                    onload: (() => void) | null = null;
                    naturalWidth = 100;
                    naturalHeight = 400;
                    set src(_value: string) {
                        queueMicrotask(() => this.onload?.());
                    }
                },
            );

            await expect(readLogoFile(pngFile(8))).resolves.toEqual({
                error: 'Logo aspect ratio must be between 1:1 and 3:1.',
            });

            vi.unstubAllGlobals();
        });

        test('should return the data URI for an acceptable file', async () => {
            vi.stubGlobal(
                'Image',
                class {
                    onload: (() => void) | null = null;
                    naturalWidth = 300;
                    naturalHeight = 150;
                    set src(_value: string) {
                        queueMicrotask(() => this.onload?.());
                    }
                },
            );

            const result = await readLogoFile(pngFile(8));

            expect(result.error).toBeUndefined();
            expect(result.dataUri).toMatch(/^data:image\/png;base64,/);

            vi.unstubAllGlobals();
        });

        /**
         * `readAsDataURL` takes the media type from the blob, so a file the browser reported none for produces
         * `application/octet-stream` - which Core rejects. The extension the type check accepted supplies it instead.
         */
        test('should declare the media type for a file the browser reported none for', async () => {
            vi.stubGlobal(
                'Image',
                class {
                    onload: (() => void) | null = null;
                    naturalWidth = 300;
                    naturalHeight = 150;
                    set src(_value: string) {
                        queueMicrotask(() => this.onload?.());
                    }
                },
            );

            const untyped = new File(['<svg/>'], 'logo.svg', { type: '' });
            const result = await readLogoFile(untyped);

            expect(result.error).toBeUndefined();
            expect(result.dataUri).toMatch(/^data:image\/svg\+xml;base64,/);

            vi.unstubAllGlobals();
        });

        test('should refuse a file the browser reported no type for and whose name says nothing either', async () => {
            const untyped = new File(['<svg/>'], 'logo', { type: '' });

            await expect(readLogoFile(untyped)).resolves.toEqual({ error: 'Logo must be a PNG or an SVG.' });
        });

        test('should accept an image that declares no intrinsic size', async () => {
            vi.stubGlobal(
                'Image',
                class {
                    onerror: (() => void) | null = null;
                    set src(_value: string) {
                        queueMicrotask(() => this.onerror?.());
                    }
                },
            );

            const svg = new File(['<svg/>'], 'logo.svg', { type: 'image/svg+xml' });
            const result = await readLogoFile(svg);

            expect(result.error).toBeUndefined();
            expect(result.dataUri).toMatch(/^data:image\/svg\+xml;base64,/);

            vi.unstubAllGlobals();
        });
    });
});
