/**
 * Client-side mirror of the branding rules Core enforces. Every check here is a convenience that catches a common
 * mistake before a request is sent; Core remains the authority and its rejection is what actually decides.
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

/**
 * Browsers do not agree on the media type of an SVG chosen from disk - Windows commonly reports an empty string - so
 * the extension is accepted as a fallback rather than rejecting a file Core would have taken.
 */
export const logoTypeError = (file: { type: string; name: string }): string | undefined => {
    if ((LOGO_MEDIA_TYPES as readonly string[]).includes(file.type)) {
        return undefined;
    }

    if (file.type === '' && /\.(png|svg)$/i.test(file.name)) {
        return undefined;
    }

    return 'Logo must be a PNG or an SVG.';
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

/** The media type carried by a data URI, or undefined for anything that is not one. */
export const dataUriMediaType = (dataUri: string): string | undefined => /^data:([^;,]+)[;,]/.exec(dataUri)?.[1];

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

/** The media type implied by a file name, for the extension fallback above. */
export const logoMediaTypeFromName = (name: string): string | undefined => {
    if (/\.png$/i.test(name)) {
        return 'image/png';
    }

    return /\.svg$/i.test(name) ? 'image/svg+xml' : undefined;
};

/**
 * Restates the media type of a base64 data URI. `readAsDataURL` takes it from the blob, so a file the browser reported
 * no type for yields a URI that declares none either - which Core rejects, and which an `Image` cannot decode.
 */
export const withDataUriMediaType = (dataUri: string, mediaType: string): string => {
    const separator = dataUri.indexOf(',');

    if (separator < 0 || !dataUri.slice(0, separator).endsWith(';base64')) {
        return dataUri;
    }

    return `data:${mediaType};base64${dataUri.slice(separator)}`;
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

/** Reads a chosen file into the data URI Core expects, refusing it if any of the mirrored rules fails. */
export const readLogoFile = async (file: File): Promise<LogoReadResult> => {
    const typeError = logoTypeError(file);

    if (typeError) {
        return { error: typeError };
    }

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

    // The type check above deliberately accepts a file the browser reported no type for, so the URI it produced may
    // declare nothing, or a generic type. Core requires one of its two, so it is restated from the extension that was
    // accepted - before the measurement below, which needs a decodable URI.
    if (!(LOGO_MEDIA_TYPES as readonly string[]).includes(dataUriMediaType(dataUri) ?? '')) {
        const inferred = logoMediaTypeFromName(file.name);

        if (!inferred) {
            return { error: 'Logo must be a PNG or an SVG.' };
        }

        dataUri = withDataUriMediaType(dataUri, inferred);
    }

    const measured = await measureDataUri(dataUri);
    const ratioError = measured ? logoRatioError(measured.width, measured.height) : undefined;

    return ratioError ? { error: ratioError } : { dataUri };
};
