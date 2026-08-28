/**
 * Pure text transforms behind the comment composer's formatting bar. Each takes the textarea value and selection and
 * returns the new value with the selection to restore, so the component only has to apply the result. The output is
 * plain Markdown from the ratified comment subset: nothing here can produce anything the renderer would drop.
 */

export type MarkdownAction = 'heading' | 'bold' | 'italic' | 'strikethrough' | 'code' | 'link' | 'bulletList' | 'numberedList' | 'quote';

export type EditState = {
    value: string;
    selectionStart: number;
    selectionEnd: number;
};

const LINK_URL_PLACEHOLDER = 'https://';

const isUrl = (text: string) => /^(https?:\/\/|mailto:)\S+$/i.test(text.trim());

/** Wraps the selection in `marker`; wrapping an already wrapped selection unwraps it instead. */
function wrap(state: EditState, marker: string): EditState {
    const { value, selectionStart: start, selectionEnd: end } = state;
    const selected = value.slice(start, end);
    const before = value.slice(0, start);
    const after = value.slice(end);

    if (before.endsWith(marker) && after.startsWith(marker)) {
        return {
            value: before.slice(0, -marker.length) + selected + after.slice(marker.length),
            selectionStart: start - marker.length,
            selectionEnd: end - marker.length,
        };
    }
    if (selected.startsWith(marker) && selected.endsWith(marker) && selected.length >= marker.length * 2) {
        const inner = selected.slice(marker.length, -marker.length);
        return { value: before + inner + after, selectionStart: start, selectionEnd: start + inner.length };
    }
    return {
        value: before + marker + selected + marker + after,
        selectionStart: start + marker.length,
        selectionEnd: end + marker.length,
    };
}

/** The whole lines the selection touches, so line-level actions never split a line. */
function selectedLines(state: EditState) {
    const { value, selectionStart: start, selectionEnd: end } = state;
    const lineStart = value.lastIndexOf('\n', start - 1) + 1;
    const nextBreak = value.indexOf('\n', end);
    const lineEnd = nextBreak === -1 ? value.length : nextBreak;
    return { lineStart, lineEnd, lines: value.slice(lineStart, lineEnd).split('\n') };
}

/** Maps each selected line through `transform` and selects the result. */
function perLine(state: EditState, transform: (line: string, index: number) => string): EditState {
    const { lineStart, lineEnd, lines } = selectedLines(state);
    const replaced = lines.map((line, index) => transform(line, index)).join('\n');
    return {
        value: state.value.slice(0, lineStart) + replaced + state.value.slice(lineEnd),
        selectionStart: lineStart,
        selectionEnd: lineStart + replaced.length,
    };
}

/** Adds `prefix` to each line, or removes it from each line when every line already carries it. */
function togglePrefix(state: EditState, prefix: string, matcher: RegExp): EditState {
    const allPrefixed = selectedLines(state).lines.every((line) => matcher.test(line));
    return perLine(state, (line) => (allPrefixed ? line.replace(matcher, '') : prefix + line));
}

const NUMBERED_ITEM = /^\d+\. /;

function numberedList(state: EditState): EditState {
    const allNumbered = selectedLines(state).lines.every((line) => NUMBERED_ITEM.test(line));
    return perLine(state, (line, index) => (allNumbered ? line.replace(NUMBERED_ITEM, '') : `${index + 1}. ${line}`));
}

function code(state: EditState): EditState {
    const selected = state.value.slice(state.selectionStart, state.selectionEnd);
    if (!selected.includes('\n')) return wrap(state, '`');
    const before = state.value.slice(0, state.selectionStart);
    const after = state.value.slice(state.selectionEnd);
    const fenced = `\`\`\`\n${selected}\n\`\`\``;
    return {
        value: before + fenced + after,
        selectionStart: state.selectionStart + 4,
        selectionEnd: state.selectionStart + 4 + selected.length,
    };
}

function link(state: EditState): EditState {
    const { value, selectionStart: start, selectionEnd: end } = state;
    const selected = value.slice(start, end);
    const before = value.slice(0, start);
    const after = value.slice(end);

    if (isUrl(selected)) {
        // The URL is known and the text is what the writer still has to type, so that is what gets selected.
        const inserted = `[](${selected.trim()})`;
        return { value: before + inserted + after, selectionStart: start + 1, selectionEnd: start + 1 };
    }
    const text = selected || 'text';
    const inserted = `[${text}](${LINK_URL_PLACEHOLDER})`;
    const urlStart = start + text.length + 3;
    return { value: before + inserted + after, selectionStart: urlStart, selectionEnd: urlStart + LINK_URL_PLACEHOLDER.length };
}

export function applyMarkdownAction(state: EditState, action: MarkdownAction): EditState {
    switch (action) {
        case 'heading':
            return togglePrefix(state, '# ', /^#{1,6} /);
        case 'bold':
            return wrap(state, '**');
        case 'italic':
            return wrap(state, '_');
        case 'strikethrough':
            return wrap(state, '~~');
        case 'code':
            return code(state);
        case 'link':
            return link(state);
        case 'bulletList':
            return togglePrefix(state, '- ', /^[-*] /);
        case 'numberedList':
            return numberedList(state);
        case 'quote':
            return togglePrefix(state, '> ', /^> /);
        default:
            return state;
    }
}

/** Keyboard shortcuts of the bar: Ctrl/Cmd + B, I, K. Anything else returns undefined. */
export function markdownShortcut(event: { key: string; ctrlKey: boolean; metaKey: boolean; altKey: boolean }): MarkdownAction | undefined {
    if (!(event.ctrlKey || event.metaKey) || event.altKey) return undefined;
    switch (event.key.toLowerCase()) {
        case 'b':
            return 'bold';
        case 'i':
            return 'italic';
        case 'k':
            return 'link';
        default:
            return undefined;
    }
}
