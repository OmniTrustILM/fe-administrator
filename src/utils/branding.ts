/**
 * Client-side mirror of the branding rules Core enforces. Every check here is a convenience that catches a common
 * mistake before a request is sent; Core remains the authority and its rejection is what actually decides.
 *
 * Two rules are deliberately not mirrors, and are marked where they are declared: a namespace-less SVG root and a PNG
 * no browser can decode are both refused here although Core takes them. Neither is about what Core will store - they
 * are about what the page can render, and a logo that renders as nothing is worse than a rejection the operator can
 * act on.
 */

/** Matches `BrandingSettingsUpdateDto.COLOR_REGEX`. */
export const BRAND_COLOR_PATTERN = /^#[0-9a-fA-F]{6}$/;

export const BRAND_COLOR_MESSAGE = "Color must be a six-digit hexadecimal value prefixed with '#', for example #0073CF.";

/** Matches `BrandingSettingsUpdateDto.LOGO_MAX_DECODED_BYTES` - one mebibyte of image data, before base64. */
export const LOGO_MAX_DECODED_BYTES = 1024 * 1024;

export const LOGO_MIN_RATIO = 1;
export const LOGO_MAX_RATIO = 3;

export const LOGO_MEDIA_TYPES = ['image/png', 'image/svg+xml'] as const;

/** Fed to the file input, so the picker filters to what Core accepts. Extensions included: Windows reports SVG as ''. */
export const LOGO_ACCEPT = '.png,.svg,image/png,image/svg+xml';

export const LOGO_HELP = 'PNG or SVG with a transparent background, up to 1 MB, aspect ratio between 1:1 and 3:1.';

export const isBrandColor = (value: string): boolean => BRAND_COLOR_PATTERN.test(value);

const PNG_SIGNATURE = [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a];

const SVG_NAMESPACE = 'http://www.w3.org/2000/svg';

/** Enough for an XML declaration; anything past it is content, not the label. */
const DECLARATION_BYTES = 120;

const LOGO_FORMAT_ERROR = 'Logo must be a PNG or an SVG.';

/**
 * Core refuses a DOCTYPE outright rather than resolving it - its parser runs with `disallow-doctype-decl`, so the
 * SVG 1.1 preamble some editors still emit makes the parse throw. Named as its own rule because the format message
 * would read as wrong to an operator holding a file that opens in every viewer.
 */
const LOGO_DOCTYPE_ERROR = 'Logo SVG must not carry a document type declaration.';

const LOGO_PNG_ERROR = 'Logo must be a well-formed PNG image.';

/**
 * Core refuses a foreign namespace but takes a root in none, so only that second case is stricter here. `SvgSanitizer`
 * stores the document as it parsed, and an `img` renders no namespace-less root, so accepting it would trade a
 * rejection the operator can act on for a broken mark on every page, the anonymous login included.
 */
const LOGO_NAMESPACE_ERROR = 'Logo SVG must declare xmlns="http://www.w3.org/2000/svg".';

const isPng = (bytes: Uint8Array): boolean => PNG_SIGNATURE.every((byte, index) => bytes[index] === byte);

/** A chunk's length, type and trailing CRC - everything in it that is not its data. */
const PNG_CHUNK_OVERHEAD = 12;

const PNG_CHUNK_TYPE_LENGTH = 4;

const PNG_IHDR_DATA_LENGTH = 13;

const CRC_TABLE = Uint32Array.from({ length: 256 }, (_entry, index) => {
    let value = index;

    for (let bit = 0; bit < 8; bit += 1) {
        value = (value >>> 1) ^ (0xedb88320 & -(value & 1));
    }

    return value >>> 0;
});

const crc32 = (bytes: Uint8Array, from: number, to: number): number => {
    let crc = ~0;

    for (let index = from; index < to; index += 1) {
        crc = (crc >>> 8) ^ CRC_TABLE[(crc ^ bytes[index]) & 0xff];
    }

    return ~crc >>> 0;
};

const readUint32 = (bytes: Uint8Array, offset: number): number =>
    ((bytes[offset] << 24) | (bytes[offset + 1] << 16) | (bytes[offset + 2] << 8) | bytes[offset + 3]) >>> 0;

const chunkType = (bytes: Uint8Array, offset: number): string =>
    String.fromCharCode(...bytes.subarray(offset, offset + PNG_CHUNK_TYPE_LENGTH));

/**
 * Mirrors `BrandingLogoValidator.pngDimensions`: IHDR first at its declared length, every chunk's CRC intact, image
 * data present, and IEND closing the file exactly at its end. Walking the sequence is what makes the signature check
 * mean something - a browser draws a PNG with bytes appended after IEND, and Core refuses it.
 *
 * Every step is bounded by the buffer, so a truncated or hostile chunk length ends the walk rather than driving it.
 */
const isWellFormedPng = (bytes: Uint8Array): boolean => {
    let sawHeader = false;
    let sawImageData = false;
    let offset = PNG_SIGNATURE.length;

    while (offset + PNG_CHUNK_OVERHEAD <= bytes.length) {
        const dataLength = readUint32(bytes, offset);

        if (dataLength > bytes.length - offset - PNG_CHUNK_OVERHEAD) {
            return false;
        }

        const typeOffset = offset + PNG_CHUNK_TYPE_LENGTH;
        const type = chunkType(bytes, typeOffset);
        const crcOffset = typeOffset + PNG_CHUNK_TYPE_LENGTH + dataLength;

        if (crc32(bytes, typeOffset, crcOffset) !== readUint32(bytes, crcOffset)) {
            return false;
        }

        if (!sawHeader) {
            if (type !== 'IHDR' || dataLength !== PNG_IHDR_DATA_LENGTH) {
                return false;
            }

            sawHeader = true;
        } else if (type === 'IHDR') {
            return false;
        } else if (type === 'IDAT') {
            sawImageData = true;
        } else if (type === 'IEND') {
            return dataLength === 0 && sawImageData && offset + PNG_CHUNK_OVERHEAD === bytes.length;
        }

        offset += PNG_CHUNK_OVERHEAD + dataLength;
    }

    return false;
};

/**
 * A failed parse is reported two ways depending on the browser - a `parsererror` root, or one inserted as the root's
 * first child - so position alone cannot decide it, and neither can the name: a well-formed SVG may carry an element
 * called `parsererror` of its own, which `SvgSanitizer` simply drops. Both together can. The scan stays at the top of
 * the tree, so an authored one nested deeper - inside `foreignObject`, where any namespace is legal - is not mistaken
 * for an engine's.
 */
const hasParserError = (parsed: Document): boolean => {
    const root = parsed.documentElement;

    return (
        root === null || [root, ...root.children].some((node) => node.localName === 'parsererror' && node.namespaceURI !== SVG_NAMESPACE)
    );
};

/**
 * Whether the document is the one `BrandingLogoValidator.svgRootOrNull` would take: an `svg` root, matched on the
 * local name so that a namespace prefix does not hide it and a different case is not it, from a parse that was clean.
 */
const isSvgRoot = (parsed: Document): boolean => parsed.documentElement?.localName === 'svg' && !hasParserError(parsed);

/** The declaration is ASCII whatever the rest of the document is, so it can be read before the encoding is known. */
const DECLARED_ENCODING = /^<\?xml[^>]*\bencoding\s*=\s*["']([\w.-]+)["']/;

/** Undefined for a label no decoder knows. Separate from decoding, so the two failures cannot be confused below. */
const fatalDecoder = (encoding: string): TextDecoder | undefined => {
    try {
        return new TextDecoder(encoding, { fatal: true });
    } catch {
        return undefined;
    }
};

/**
 * The markup, or undefined when the bytes are not text in the encoding the document announces.
 *
 * Core parses the raw stream, so it honours both the BOM and the `encoding` of an XML declaration - a legacy export in
 * `windows-1252` is a document it stores. Reading only UTF-8 here would refuse one. The decoders are fatal because a
 * lenient one rewrites a bad byte as U+FFFD, and the document then parses cleanly into an SVG that Core still rejects.
 */
const decodeXml = (bytes: Uint8Array): string | undefined => {
    const [first, second] = [bytes[0], bytes[1]];
    const bom = first === 0xff && second === 0xfe ? 'utf-16le' : first === 0xfe && second === 0xff ? 'utf-16be' : undefined;
    const declared = bom ?? DECLARED_ENCODING.exec(new TextDecoder('ascii').decode(bytes.slice(0, DECLARATION_BYTES)))?.[1];

    // A label nothing knows falls back to UTF-8; bytes that are wrong for a label we do know do not. Letting the
    // second case retry as UTF-8 would be the lenient decode again, one step further along.
    const decoder = (declared === undefined ? undefined : fatalDecoder(declared)) ?? fatalDecoder('utf-8');

    try {
        return decoder?.decode(bytes);
    } catch {
        return undefined;
    }
};

export type LogoContent = { mediaType: string; error?: undefined } | { mediaType?: undefined; error: string };

/**
 * What a file actually is, or the rule its content breaks.
 *
 * Decided from the content rather than from `File.type`, which the browser derives from the extension: a JPEG renamed
 * to `.png` reports `image/png`, and no other check catches it, since the browser renders a JPEG as happily as a PNG.
 * The name is not consulted at all, so a PNG named `.svg` is read as the PNG it is, and an SVG the browser reported
 * no type for - which is what Windows does - needs no extension fallback.
 */
export const logoContent = (bytes: Uint8Array): LogoContent => {
    if (isPng(bytes)) {
        return isWellFormedPng(bytes) ? { mediaType: 'image/png' } : { error: LOGO_PNG_ERROR };
    }

    const markup = decodeXml(bytes);

    if (markup === undefined) {
        return { error: LOGO_FORMAT_ERROR };
    }

    const parsed = new DOMParser().parseFromString(markup, 'image/svg+xml');

    if (!isSvgRoot(parsed)) {
        return { error: LOGO_FORMAT_ERROR };
    }

    if (parsed.doctype !== null) {
        return { error: LOGO_DOCTYPE_ERROR };
    }

    return parsed.documentElement.namespaceURI === SVG_NAMESPACE ? { mediaType: 'image/svg+xml' } : { error: LOGO_NAMESPACE_ERROR };
};

export const logoSizeError = (bytes: number): string | undefined =>
    bytes > LOGO_MAX_DECODED_BYTES ? 'Logo must be at most 1 MB.' : undefined;

/**
 * Zero on either side means the image declares no intrinsic size, which an SVG without width and height attributes
 * does. There is nothing to measure, so the check is skipped and Core decides.
 */
export const logoRatioError = (width: number, height: number): string | undefined => {
    if (width <= 0 || height <= 0) {
        return undefined;
    }

    const ratio = width / height;

    return ratio < LOGO_MIN_RATIO || ratio > LOGO_MAX_RATIO ? 'Logo aspect ratio must be between 1:1 and 3:1.' : undefined;
};

/**
 * The shape of a stored logo, mirroring `BrandingLogoValidator.DATA_URI` in Core: a media type, then a base64 payload
 * in the standard alphabet with at most two padding characters. The media type is captured rather than fixed here so
 * that it can be compared case-insensitively, as Core compares it, and the payload so its length can be checked.
 */
const LOGO_DATA_URI_PATTERN = /^data:([^;,]+);base64,([A-Za-z0-9+/]+={0,2})$/;

/**
 * Whether a base64 payload is one a decoder would actually accept.
 *
 * The pattern above cannot express this, and Core does not ask it to: it decodes the payload immediately afterwards
 * and turns the failure into a rejection, so `A=`, `A`, `AAAAA` and `AAA==` are refused there by the decoder rather
 * than by the regex. This is that step, and it follows the same decoder Core uses. Padding, when present, has to
 * complete the four-character group; without padding the only impossible remainder is a single trailing character,
 * which carries too few bits to be a byte - an otherwise well-formed payload that simply was not padded is accepted,
 * as `Base64.getDecoder()` accepts it.
 */
const isDecodableBase64 = (payload: string): boolean => (payload.endsWith('=') ? payload.length % 4 === 0 : payload.length % 4 !== 1);

/**
 * Whether a stored logo is safe to point an `img` at.
 *
 * Core stores a logo only in the form above - it re-encodes an SVG after sanitizing it, and accepts a PNG only once
 * its bytes have been walked - so anything else did not come from an upload. An absolute URL is the case that matters
 * most: rendering one would have every viewer, the anonymous ones on the login page included, fetch from whatever host
 * it names. The whole form is required rather than only the media type, because a data URI can declare an accepted
 * type and still carry something no browser will decode: `data:image/png,raw` and
 * `data:image/svg+xml;charset=utf-8,<svg/>` both name a permitted type, and `BrandLogo` has no decode-error fallback,
 * so either one would show a broken image where the platform mark belongs.
 */
export const isRenderableLogo = (value: string | null | undefined): value is string => {
    if (typeof value !== 'string') {
        return false;
    }

    const match = LOGO_DATA_URI_PATTERN.exec(value);

    if (!match) {
        return false;
    }

    const [, mediaType, payload] = match;

    return (LOGO_MEDIA_TYPES as readonly string[]).includes(mediaType.toLowerCase()) && isDecodableBase64(payload);
};

/** Where the payload of a base64 data URI starts, or -1 for anything that is not one. */
const base64PayloadStart = (dataUri: string): number => {
    const separator = dataUri.indexOf(',');

    return separator >= 0 && dataUri.slice(0, separator).endsWith(';base64') ? separator + 1 : -1;
};

/**
 * Restates the media type of a base64 data URI. `readAsDataURL` takes it from the blob, so a file the browser reported
 * no type for yields a URI that declares none either - which Core rejects, and which an `Image` cannot decode.
 */
export const withDataUriMediaType = (dataUri: string, mediaType: string): string => {
    const payloadStart = base64PayloadStart(dataUri);

    return payloadStart < 0 ? dataUri : `data:${mediaType};base64,${dataUri.slice(payloadStart)}`;
};

export const readFileAsDataUri = (file: Blob): Promise<string> =>
    new Promise((resolve, reject) => {
        const reader = new FileReader();

        reader.onerror = () => reject(new Error('Could not read the selected file.'));
        reader.onload = () => {
            const result = reader.result;

            if (typeof result === 'string') {
                resolve(result);
            } else {
                reject(new Error('Could not read the selected file.'));
            }
        };
        reader.readAsDataURL(file);
    });

/**
 * Intrinsic size of an image data URI, or undefined when it cannot be determined. Loading through an `Image` rather
 * than the DOM keeps SVG markup out of the document, which is the same rule the previews follow.
 */
export const measureDataUri = (dataUri: string): Promise<{ width: number; height: number } | undefined> =>
    new Promise((resolve) => {
        const image = new Image();

        image.onload = () => resolve({ width: image.naturalWidth, height: image.naturalHeight });
        image.onerror = () => resolve(undefined);
        image.src = dataUri;
    });

export type LogoReadResult = { dataUri: string; error?: undefined } | { dataUri?: undefined; error: string };

/** The bytes a base64 data URI carries, or undefined for anything else. */
const decodeDataUri = (dataUri: string): Uint8Array | undefined => {
    const payloadStart = base64PayloadStart(dataUri);

    if (payloadStart < 0) {
        return undefined;
    }

    try {
        return Uint8Array.from(atob(dataUri.slice(payloadStart)), (character) => character.charCodeAt(0));
    } catch {
        return undefined;
    }
};

/** Reads a chosen file into the data URI Core expects, refusing it on any rule above - mirrored or not. */
export const readLogoFile = async (file: File): Promise<LogoReadResult> => {
    const sizeError = logoSizeError(file.size);

    if (sizeError) {
        return { error: sizeError };
    }

    let dataUri: string;

    try {
        dataUri = await readFileAsDataUri(file);
    } catch {
        return { error: 'Could not read the selected file.' };
    }

    // Read back from the URI rather than from the file a second time, so the format is decided on the bytes that will
    // actually be sent.
    const bytes = decodeDataUri(dataUri);
    const content = bytes === undefined ? { error: LOGO_FORMAT_ERROR } : logoContent(bytes);

    if (content.mediaType === undefined) {
        return { error: content.error };
    }

    // `readAsDataURL` takes the media type from the blob, which is the extension's answer and can disagree with the
    // content or be missing entirely. Restated before the measurement below, which needs a URI a browser can decode.
    dataUri = withDataUriMediaType(dataUri, content.mediaType);

    const measured = await measureDataUri(dataUri);

    // A PNG always carries its size in the header, so one the browser could not measure is one it could not decode.
    // Refused whatever Core would make of it - its walk reads the chunk structure, not the compressed data - because a
    // logo no browser can draw is not worth storing. Nothing to measure is a legitimate answer for an SVG alone.
    if (measured === undefined && content.mediaType === 'image/png') {
        return { error: LOGO_PNG_ERROR };
    }

    const ratioError = measured ? logoRatioError(measured.width, measured.height) : undefined;

    return ratioError ? { error: ratioError } : { dataUri };
};

/**
 * How long after a local branding change an anonymous read bypasses the browser cache.
 *
 * Deliberately longer than the `max-age` Core serves that response with rather than equal to it: the two live in
 * different repositories with nothing tying them together, so matching exactly would silently stop working the day
 * Core raises its own value. Over-covering costs one administrator a few uncached reads.
 */
export const BRANDING_CACHE_BYPASS_WINDOW_MS = 10 * 60_000;

const BRANDING_CHANGED_STORAGE_KEY = 'branding-changed-at';

/**
 * Records that this browser just changed the branding.
 *
 * The anonymous response is `max-age=60, public`, so for the following minute a reload is answered from the browser's
 * own cache with the branding that was just replaced - the token layer then paints it back and re-caches it, and the
 * change looks not to have taken. The authenticated read the Appearance tab uses is `no-store`, which is why the form
 * shows the new state while the page around it does not.
 */
export const markBrandingChanged = (now: number = Date.now()): void => {
    try {
        globalThis.localStorage?.setItem(BRANDING_CHANGED_STORAGE_KEY, String(now));
    } catch {
        // Storage can be unavailable through private browsing or an exceeded quota. Without the mark a reload inside
        // the cache window may show the previous branding, which is what this avoids rather than something it needs.
    }
};

/** Whether an anonymous branding read has to bypass the browser cache because this browser changed it recently. */
export const shouldBypassBrandingCache = (now: number = Date.now()): boolean => {
    try {
        const stored = globalThis.localStorage?.getItem(BRANDING_CHANGED_STORAGE_KEY);

        if (stored === null || stored === undefined) {
            return false;
        }

        const changedAt = Number(stored);

        if (!Number.isFinite(changedAt) || Math.abs(now - changedAt) > BRANDING_CACHE_BYPASS_WINDOW_MS) {
            globalThis.localStorage?.removeItem(BRANDING_CHANGED_STORAGE_KEY);
            return false;
        }

        return true;
    } catch {
        return false;
    }
};
