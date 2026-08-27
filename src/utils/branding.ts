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

    const measured = await measureDataUri(dataUri);
    const ratioError = measured ? logoRatioError(measured.width, measured.height) : undefined;

    return ratioError ? { error: ratioError } : { dataUri };
};
