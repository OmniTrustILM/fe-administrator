import { describe, expect, test, vi } from 'vitest';
import {
    BRAND_COLOR_PATTERN,
    BRANDING_CACHE_BYPASS_WINDOW_MS,
    isBrandColor,
    markBrandingChanged,
    shouldBypassBrandingCache,
    isRenderableLogo,
    LOGO_MAX_DECODED_BYTES,
    logoContent,
    logoSizeError,
    readFileAsDataUri,
    readLogoFile,
    withDataUriMediaType,
} from './branding';

/** A real 1x1 PNG, so the bytes the format check reads are the ones a browser would write. */
const PNG_BASE64 = 'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAAC0lEQVR4nGNgAAIAAAUAAXpeqz8AAAAASUVORK5CYII=';

const pngBytes = () => Uint8Array.from(atob(PNG_BASE64), (character) => character.charCodeAt(0));

const utf8 = (text: string) => new TextEncoder().encode(text);

/** Core reads the encoding from the BOM, so these are documents it would parse rather than refuse. */
const utf16 = (text: string, endianness: 'le' | 'be') => {
    const bytes = new Uint8Array(text.length * 2 + 2);

    bytes.set(endianness === 'le' ? [0xff, 0xfe] : [0xfe, 0xff]);

    for (let index = 0; index < text.length; index += 1) {
        const unit = text.charCodeAt(index);
        const [high, low] = [unit >> 8, unit & 0xff];

        bytes.set(endianness === 'le' ? [low, high] : [high, low], 2 + index * 2);
    }

    return bytes;
};

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

    describe('logoContent', () => {
        const FORMAT_ERROR = 'Logo must be a PNG or an SVG.';

        test('should read a PNG from its signature', () => {
            expect(logoContent(pngBytes())).toEqual({ mediaType: 'image/png' });
        });

        test.each([
            ['a plain document', '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1 1"/>'],
            ['one behind a declaration and a comment', '<?xml version="1.0"?><!-- mark --><svg xmlns="http://www.w3.org/2000/svg"/>'],
            ['one whose root carries a namespace prefix', '<svg:svg xmlns:svg="http://www.w3.org/2000/svg" viewBox="0 0 1 1"/>'],
        ])('should read an SVG from %s', (_case, markup) => {
            expect(logoContent(utf8(markup))).toEqual({ mediaType: 'image/svg+xml' });
        });

        test('should refuse a JPEG whatever the file it came from was named', () => {
            expect(logoContent(Uint8Array.from([0xff, 0xd8, 0xff, 0xe0, 0x00, 0x10, 0x4a, 0x46]))).toEqual({ error: FORMAT_ERROR });
        });

        test.each([
            ['a truncated PNG signature', Uint8Array.from([0x89, 0x50, 0x4e])],
            ['an empty file', new Uint8Array()],
        ])('should refuse %s', (_case, bytes) => {
            expect(logoContent(bytes)).toEqual({ error: FORMAT_ERROR });
        });

        test('should read an SVG that declares a non-Unicode encoding', () => {
            const markup =
                '<?xml version="1.0" encoding="windows-1252"?>' +
                '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 2 1"><title>Caf\u00e9</title></svg>';
            const bytes = Uint8Array.from([...markup].map((character) => character.charCodeAt(0)));

            expect(logoContent(bytes)).toEqual({ mediaType: 'image/svg+xml' });
        });

        /**
         * The declared label is UTF-16LE and the bytes are ASCII of odd length, so the last byte is half a code unit.
         * A fatal UTF-16LE decode refuses it; a UTF-8 retry would read it and find a perfectly good SVG - which is what
         * makes this the case that fails if label resolution and decoding are ever merged back together.
         */
        test('should refuse bytes that are invalid in the non-UTF-8 encoding they declare', () => {
            const markup = '<?xml version="1.0" encoding="utf-16le"?><svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 2 1"/>';
            const odd = markup.length % 2 === 0 ? `${markup} ` : markup;

            expect(logoContent(utf8(odd))).toEqual({ error: 'Logo must be a PNG or an SVG.' });
        });

        test('should refuse bytes that are invalid in the encoding they declare', () => {
            const markup = '<?xml version="1.0" encoding="utf-8"?><svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 2 1"/>';
            const bytes = utf8(markup);

            expect(logoContent(Uint8Array.from([...bytes.slice(0, 50), 0xff, ...bytes.slice(50)]))).toEqual({
                error: 'Logo must be a PNG or an SVG.',
            });
        });

        test('should read an SVG that declares an encoding no decoder knows', () => {
            const markup = '<?xml version="1.0" encoding="x-nonesuch"?><svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 2 1"/>';

            expect(logoContent(utf8(markup))).toEqual({ mediaType: 'image/svg+xml' });
        });

        /** Nested where any namespace is legal, so only position tells it from an engine's own error node. */
        test('should read an SVG carrying a foreign-namespace parsererror inside foreignObject', () => {
            const markup =
                '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 2 1">' +
                '<foreignObject><parsererror xmlns="http://www.w3.org/1999/xhtml"/></foreignObject></svg>';

            expect(logoContent(utf8(markup))).toEqual({ mediaType: 'image/svg+xml' });
        });

        /** `parsererror` is a name an author may use; only the engine's own, in its error namespace, means a failed parse. */
        test('should read an SVG that carries an element named parsererror', () => {
            const markup = '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 2 1"><parsererror/></svg>';

            expect(logoContent(utf8(markup))).toEqual({ mediaType: 'image/svg+xml' });
        });

        /** A lenient decoder would rewrite the bad byte as U+FFFD and hand Core a document it parses differently. */
        test('should refuse markup that is not valid in the encoding it announces', () => {
            const svg = utf8('<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 2 1"><title>x</title></svg>');
            const withBadByte = Uint8Array.from([...svg.slice(0, 60), 0xff, ...svg.slice(60)]);

            expect(logoContent(withBadByte)).toEqual({ error: 'Logo must be a PNG or an SVG.' });
        });

        test.each([
            ['an unclosed element', '<svg><g></svg>'],
            ['markup that is not SVG at all', '<html><body>hello</body></html>'],
            ['plain text', 'hello'],
        ])('should refuse %s, which Core would refuse as unparseable', (_case, markup) => {
            expect(logoContent(utf8(markup))).toEqual({ error: FORMAT_ERROR });
        });

        /** `svgRootOrNull` matches the local name case-sensitively, so a root in another case is not an SVG to Core. */
        test('should refuse a root in another case', () => {
            expect(logoContent(utf8('<SVG xmlns="http://www.w3.org/2000/svg"/>'))).toEqual({ error: FORMAT_ERROR });
        });

        /**
         * Core refuses a foreign namespace already, so that half only reaches the operator sooner and with a message
         * naming the fix. A root in no namespace is the half Core takes: it is refused here because the sanitizer
         * would store it as it parsed, and no `img` renders it.
         */
        test.each([
            ['declares no namespace', '<svg viewBox="0 0 2 1"/>'],
            ['declares a foreign one', '<svg xmlns="http://example.invalid/not-svg" viewBox="0 0 2 1"/>'],
        ])('should refuse an SVG root that %s', (_case, markup) => {
            expect(logoContent(utf8(markup))).toEqual({ error: 'Logo SVG must declare xmlns="http://www.w3.org/2000/svg".' });
        });

        test('should read an SVG behind the UTF-8 BOM a Windows editor writes', () => {
            expect(logoContent(utf8('\ufeff<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 2 1"/>'))).toEqual({
                mediaType: 'image/svg+xml',
            });
        });

        test.each(['le', 'be'] as const)('should read an SVG stored as UTF-16%s, which Core decodes from the BOM', (endianness) => {
            expect(logoContent(utf16('<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 2 1"/>', endianness))).toEqual({
                mediaType: 'image/svg+xml',
            });
        });

        test('should refuse an SVG carrying a document type declaration, naming that rule', () => {
            const doctyped =
                '<!DOCTYPE svg PUBLIC "-//W3C//DTD SVG 1.1//EN" "http://www.w3.org/Graphics/SVG/1.1/DTD/svg11.dtd">' +
                '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 2 1"/>';

            expect(logoContent(utf8(doctyped))).toEqual({ error: 'Logo SVG must not carry a document type declaration.' });
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
            ['a payload padded to the quartet', 'data:image/png;base64,AAA='],
            ['a two-character unpadded payload', 'data:image/png;base64,AA'],
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
            // Undecodable lengths. The pattern alone admits these, which is why the payload is measured as well:
            // Core reaches the same verdict a moment later, when its decoder throws on them.
            ['padding that does not complete the quartet', 'data:image/png;base64,A='],
            ['two padding characters after a lone quartet remainder', 'data:image/png;base64,AAA=='],
            ['a single trailing character, too few bits for a byte', 'data:image/png;base64,A'],
            ['an unpadded payload with a lone trailing character', 'data:image/png;base64,AAAAA'],
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
        const pngFile = (name = 'logo.png', type = 'image/png') => new File([pngBytes()], name, { type });

        /** Padded past the ceiling with trailing bytes, so it is a real PNG that only the size check can object to. */
        const oversizedPngFile = () => new File([pngBytes(), new Uint8Array(LOGO_MAX_DECODED_BYTES)], 'logo.png', { type: 'image/png' });

        const measuring = (width: number, height: number) =>
            vi.stubGlobal(
                'Image',
                class {
                    onload: (() => void) | null = null;
                    naturalWidth = width;
                    naturalHeight = height;
                    set src(_value: string) {
                        queueMicrotask(() => this.onload?.());
                    }
                },
            );

        test('should refuse content that is neither of the two formats Core accepts', async () => {
            const jpeg = new File([Uint8Array.from([0xff, 0xd8, 0xff, 0xe0])], 'logo.jpg', { type: 'image/jpeg' });

            await expect(readLogoFile(jpeg)).resolves.toEqual({ error: 'Logo must be a PNG or an SVG.' });
        });

        /**
         * The disguise this check exists for: the size rule passes, and the browser reports `image/png` because the
         * name says so, so only the content can tell the two apart.
         */
        test('should refuse a JPEG named as a PNG', async () => {
            const disguised = new File([Uint8Array.from([0xff, 0xd8, 0xff, 0xe0])], 'logo.png', { type: 'image/png' });

            await expect(readLogoFile(disguised)).resolves.toEqual({ error: 'Logo must be a PNG or an SVG.' });
        });

        test('should refuse an SVG the browser cannot parse', async () => {
            const malformed = new File(['<svg><g></svg>'], 'logo.svg', { type: 'image/svg+xml' });

            await expect(readLogoFile(malformed)).resolves.toEqual({ error: 'Logo must be a PNG or an SVG.' });
        });

        test('should refuse an SVG carrying a document type declaration', async () => {
            const doctyped = new File(
                [
                    '<!DOCTYPE svg PUBLIC "-//W3C//DTD SVG 1.1//EN" "http://www.w3.org/Graphics/SVG/1.1/DTD/svg11.dtd">' +
                        '<svg xmlns="http://www.w3.org/2000/svg" width="200" height="100"/>',
                ],
                'logo.svg',
                { type: 'image/svg+xml' },
            );

            await expect(readLogoFile(doctyped)).resolves.toEqual({ error: 'Logo SVG must not carry a document type declaration.' });
        });

        test('should refuse an oversized file before reading anything', async () => {
            await expect(readLogoFile(oversizedPngFile())).resolves.toEqual({
                error: 'Logo must be at most 1 MB.',
            });
        });

        /**
         * A PNG declares its size in the header, so reaching no dimensions at all means the browser could not decode
         * it - and a logo nothing can draw is not worth storing, whatever Core's chunk walk would make of it.
         */
        test('should refuse a PNG the browser cannot decode', async () => {
            vi.stubGlobal(
                'Image',
                class {
                    onerror: (() => void) | null = null;
                    set src(_value: string) {
                        queueMicrotask(() => this.onerror?.());
                    }
                },
            );

            const truncated = new File([pngBytes().slice(0, 12)], 'logo.png', { type: 'image/png' });

            await expect(readLogoFile(truncated)).resolves.toEqual({ error: 'Logo must be a well-formed PNG image.' });

            vi.unstubAllGlobals();
        });

        test('should accept a file whose ratio is far outside the recommendation', async () => {
            measuring(100, 400);

            const result = await readLogoFile(pngFile());

            expect(result.error).toBeUndefined();
            expect(result.dataUri).toMatch(/^data:image\/png;base64,/);
            expect(result.ratio).toBe(0.25);

            vi.unstubAllGlobals();
        });

        test('should return the data URI and the measured ratio for an acceptable file', async () => {
            measuring(300, 150);

            const result = await readLogoFile(pngFile());

            expect(result.error).toBeUndefined();
            expect(result.dataUri).toMatch(/^data:image\/png;base64,/);
            expect(result.ratio).toBe(2);

            vi.unstubAllGlobals();
        });

        /**
         * `readAsDataURL` takes the media type from the blob, which is the extension's answer: empty for an SVG chosen
         * on Windows, and wrong for a file whose name disagrees with its content. Core requires the declared type to
         * match the bytes, so it is restated from what the content turned out to be.
         */
        test.each([
            ['reported no media type', '', 'logo.svg'],
            ['is named as a PNG', 'image/png', 'logo.png'],
        ])('should declare what the content is for an SVG the browser %s', async (_case, type, name) => {
            measuring(300, 150);

            const svg = new File(['<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 2 1"/>'], name, { type });
            const result = await readLogoFile(svg);

            expect(result.error).toBeUndefined();
            expect(result.dataUri).toMatch(/^data:image\/svg\+xml;base64,/);

            vi.unstubAllGlobals();
        });

        test('should declare a PNG named as an SVG for what it is rather than refuse it for its name', async () => {
            measuring(300, 150);

            const result = await readLogoFile(pngFile('logo.svg', 'image/svg+xml'));

            expect(result.error).toBeUndefined();
            expect(result.dataUri).toMatch(/^data:image\/png;base64,/);

            vi.unstubAllGlobals();
        });

        /** The same unmeasurable answer an SVG gives legitimately, which is why it is only decisive for a PNG. */
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

            const svg = new File(['<svg xmlns="http://www.w3.org/2000/svg"/>'], 'logo.svg', { type: 'image/svg+xml' });
            const result = await readLogoFile(svg);

            expect(result.error).toBeUndefined();
            expect(result.dataUri).toMatch(/^data:image\/svg\+xml;base64,/);
            expect(result.ratio).toBeUndefined();

            vi.unstubAllGlobals();
        });

        /** An image declaring a zero side has no extent to advise on, which is not the same as a flat shape. */
        test('should report no ratio for an image that measures as zero', async () => {
            measuring(0, 0);

            const svg = new File(['<svg xmlns="http://www.w3.org/2000/svg"/>'], 'logo.svg', { type: 'image/svg+xml' });
            const result = await readLogoFile(svg);

            expect(result.error).toBeUndefined();
            expect(result.ratio).toBeUndefined();

            vi.unstubAllGlobals();
        });
    });

    describe('branding cache window', () => {
        const KEY = 'branding-changed-at';

        const withStorage = (store: Map<string, string>) => {
            vi.stubGlobal('localStorage', {
                getItem: (k: string) => store.get(k) ?? null,
                setItem: (k: string, v: string) => void store.set(k, v),
                removeItem: (k: string) => void store.delete(k),
            });
            return store;
        };

        test('should not bypass the cache when this browser has changed nothing', () => {
            withStorage(new Map());

            expect(shouldBypassBrandingCache()).toBe(false);

            vi.unstubAllGlobals();
        });

        test('should bypass the cache for a change inside the window', () => {
            const store = withStorage(new Map());
            markBrandingChanged(1_000_000);

            expect(store.get(KEY)).toBe('1000000');
            expect(shouldBypassBrandingCache(1_000_000 + BRANDING_CACHE_BYPASS_WINDOW_MS)).toBe(true);

            vi.unstubAllGlobals();
        });

        test('should stop bypassing, and forget the mark, once the window has passed', () => {
            const store = withStorage(new Map());
            markBrandingChanged(1_000_000);

            expect(shouldBypassBrandingCache(1_000_000 + BRANDING_CACHE_BYPASS_WINDOW_MS + 1)).toBe(false);
            expect(store.has(KEY)).toBe(false);

            vi.unstubAllGlobals();
        });

        /** A clock that steps backwards (NTP correction, VM resume) would otherwise pin the bypass on for good. */
        test('should stop bypassing when the mark is in the future', () => {
            const store = withStorage(new Map());
            markBrandingChanged(2_000_000);

            expect(shouldBypassBrandingCache(1_000_000)).toBe(false);
            expect(store.has(KEY)).toBe(false);

            vi.unstubAllGlobals();
        });

        test('should ignore a stored value that is not a number', () => {
            withStorage(new Map([[KEY, 'not-a-timestamp']]));

            expect(shouldBypassBrandingCache()).toBe(false);

            vi.unstubAllGlobals();
        });

        /** Private browsing and an exceeded quota both throw; the cache window is an optimisation, never a hard need. */
        test('should treat unavailable storage as no reason to bypass', () => {
            vi.stubGlobal('localStorage', {
                getItem: () => {
                    throw new Error('denied');
                },
                setItem: () => {
                    throw new Error('denied');
                },
                removeItem: () => {},
            });

            expect(() => markBrandingChanged()).not.toThrow();
            expect(shouldBypassBrandingCache()).toBe(false);

            vi.unstubAllGlobals();
        });
    });
});
