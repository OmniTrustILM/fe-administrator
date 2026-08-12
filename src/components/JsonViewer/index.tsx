import { useMemo } from 'react';
import cn from 'classnames';
import { useTheme } from 'components/ThemeProvider';

type Props = {
    value: string;
    height?: number | string;
    className?: string;
    paddingTop?: number;
};

const STRING_CHAR = String.raw`\\u[\da-fA-F]{4}|\\[^u]|[^\\"]`;
const JSON_STRING = `"(?:${STRING_CHAR})*"`;
const JSON_KEY = String.raw`${JSON_STRING}(?=\s*:)`;
const JSON_NUMBER = String.raw`-?\d+(?:\.\d+)?(?:[eE][+-]?\d+)?`;
const TOKEN_REGEX = new RegExp(String.raw`(${JSON_KEY}|${JSON_STRING}|\btrue\b|\bfalse\b|\bnull\b|${JSON_NUMBER})`, 'g');

const PALETTES = {
    light: {
        background: '#f5f5f5',
        base: '#1f2937',
        key: '#0550ae',
        string: '#0a7c42',
        number: '#b3246b',
        boolean: '#7c3aed',
        null: '#8a5a00',
    },
    dark: {
        background: '#0b1220',
        base: '#c8d3f5',
        key: '#7aa2f7',
        string: '#9ece6a',
        number: '#f7768e',
        boolean: '#bb9af7',
        null: '#e0af68',
    },
} as const;

type SyntaxPalette = (typeof PALETTES)[keyof typeof PALETTES];

const escapeHtml = (text: string) =>
    text.replaceAll('&', '&amp;').replaceAll('<', '&lt;').replaceAll('>', '&gt;').replaceAll('"', '&quot;').replaceAll("'", '&#039;');

const isObjectKeyAtPosition = (source: string, tokenEndIndex: number) => {
    let cursor = tokenEndIndex;
    while (cursor < source.length && /\s/.test(source[cursor])) {
        cursor += 1;
    }

    return source[cursor] === ':';
};

const highlightJson = (source: string, palette: SyntaxPalette): string => {
    let result = '';
    let previousIndex = 0;

    for (const match of source.matchAll(TOKEN_REGEX)) {
        const token = match[0];
        const index = match.index ?? 0;

        result += escapeHtml(source.slice(previousIndex, index));

        let color: string;

        if (token.startsWith('"')) {
            color = isObjectKeyAtPosition(source, index + token.length) ? palette.key : palette.string;
        } else if (token === 'true' || token === 'false') {
            color = palette.boolean;
        } else if (token === 'null') {
            color = palette.null;
        } else {
            color = palette.number;
        }

        result += `<span style="color:${color}">${escapeHtml(token)}</span>`;
        previousIndex = index + token.length;
    }

    result += escapeHtml(source.slice(previousIndex));

    return result;
};

export default function JsonViewer({ value, height, className, paddingTop }: Readonly<Props>) {
    const { resolvedTheme } = useTheme();
    const palette = PALETTES[resolvedTheme];

    const normalizedJson = useMemo(() => {
        if (!value) return '';

        try {
            return JSON.stringify(JSON.parse(value), null, 2);
        } catch {
            return value;
        }
    }, [value]);

    const highlightedHtml = useMemo(() => highlightJson(normalizedJson, palette), [normalizedJson, palette]);

    return (
        <pre
            className={cn(
                'w-full overflow-y-auto overflow-x-hidden whitespace-pre-wrap break-words rounded-lg p-3 text-xs leading-5 [scrollbar-width:thin] [scrollbar-color:var(--outline)_var(--divider)] [&::-webkit-scrollbar]:h-3 [&::-webkit-scrollbar]:w-3 [&::-webkit-scrollbar-track]:rounded-full [&::-webkit-scrollbar-track]:bg-divider [&::-webkit-scrollbar-thumb]:rounded-full [&::-webkit-scrollbar-thumb]:border-2 [&::-webkit-scrollbar-thumb]:border-divider [&::-webkit-scrollbar-thumb]:bg-outline',
                className,
            )}
            style={{
                height,
                paddingTop,
                fontFamily: 'monospace',
                whiteSpace: 'pre-wrap',
                overflowWrap: 'anywhere',
                overflowX: 'hidden',
                overflowY: 'auto',
                backgroundColor: palette.background,
                color: palette.base,
            }}
        >
            <code dangerouslySetInnerHTML={{ __html: highlightedHtml }} />
        </pre>
    );
}
