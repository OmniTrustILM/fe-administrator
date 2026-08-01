export type TokenMap = Record<string, string>;

export type SemanticTokens = {
    light: TokenMap;
    dark: TokenMap;
};

// The stylesheet may declare more than one `:root` or `.dark` block (a pre-existing legacy block,
// a future print override, ...). The semantic token block is therefore identified by content, not
// position: it is the block that declares `--surface-raised`. Position never matters.
const MARKER_TOKEN = 'surface-raised';
const ROOT_BLOCKS = /^:root[^\S\n]*\{([^}]*)\}/gm;
const DARK_BLOCKS = /^\.dark[^\S\n]*\{([^}]*)\}/gm;
const HEX_VALUE = /^#[0-9a-fA-F]{3,8}$/;

/**
 * Collects the `--name: #hex;` declarations from a block body, one line at a time. Splitting on
 * lines and locating the colon by index keeps this linear in the size of the block; a single
 * regex over the whole body would backtrack across every candidate name.
 */
const parseDeclarations = (body: string): TokenMap => {
    const tokens: TokenMap = {};

    for (const line of body.split('\n')) {
        const declaration = line.trim();

        if (!declaration.startsWith('--')) {
            continue;
        }

        const separator = declaration.indexOf(':');

        if (separator === -1) {
            continue;
        }

        const name = declaration.slice(2, separator).trim();
        const value = declaration
            .slice(separator + 1)
            .replace(';', '')
            .trim();

        if (HEX_VALUE.test(value)) {
            tokens[name] = value.toLowerCase();
        }
    }

    return tokens;
};

/** Finds the block matched by `pattern` whose declarations include the marker token, wherever it falls in the file. */
const parseMarkedBlock = (css: string, pattern: RegExp, blockLabel: string): TokenMap => {
    for (const match of css.matchAll(pattern)) {
        const tokens = parseDeclarations(match[1]);

        if (MARKER_TOKEN in tokens) {
            return tokens;
        }
    }

    throw new Error(`readSemanticTokens: no ${blockLabel} block declaring --${MARKER_TOKEN} was found`);
};

const describeKeyMismatch = (missingFromDark: string[], missingFromLight: string[]): string => {
    const parts: string[] = [];

    if (missingFromDark.length > 0) {
        parts.push(`missing from .dark: ${missingFromDark.join(', ')}`);
    }
    if (missingFromLight.length > 0) {
        parts.push(`missing from :root: ${missingFromLight.join(', ')}`);
    }

    return parts.join('; ');
};

/**
 * Extracts the semantic colour tokens from the stylesheet source. Only literal hex declarations
 * are collected, so layout variables and var() aliases are skipped. The stylesheet is the single
 * source of truth for these values; nothing else in the codebase redeclares them.
 *
 * The semantic `:root` and `.dark` blocks are located by content (declaring `--surface-raised`),
 * not by position, so an unrelated block sharing the same selector is never mistaken for them.
 * Both blocks must declare exactly the same token names, or the mismatch is thrown by name rather
 * than silently dropped.
 */
export const readSemanticTokens = (css: string): SemanticTokens => {
    const light = parseMarkedBlock(css, ROOT_BLOCKS, ':root');
    const dark = parseMarkedBlock(css, DARK_BLOCKS, '.dark');

    const lightNames = new Set(Object.keys(light));
    const darkNames = new Set(Object.keys(dark));
    const missingFromDark = [...lightNames].filter((name) => !darkNames.has(name));
    const missingFromLight = [...darkNames].filter((name) => !lightNames.has(name));

    if (missingFromDark.length > 0 || missingFromLight.length > 0) {
        throw new Error(`readSemanticTokens: light and dark token sets differ (${describeKeyMismatch(missingFromDark, missingFromLight)})`);
    }

    return { light, dark };
};
