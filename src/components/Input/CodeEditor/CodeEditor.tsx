/*
 * Adapted from react-simple-code-editor (MIT).
 * Copyright (c) 2018–2019 Satyajit Sahoo.
 * https://github.com/react-simple-code-editor/react-simple-code-editor
 */
import * as React from 'react';

type Padding<T> = T | { top?: T; right?: T; bottom?: T; left?: T };

type Props = React.HTMLAttributes<HTMLDivElement> & {
    highlight: (value: string) => string | React.ReactNode;
    ignoreTabKey?: boolean;
    insertSpaces?: boolean;
    onValueChange: (value: string) => void;
    padding?: Padding<number | string>;
    style?: React.CSSProperties;
    tabSize?: number;
    value: string;

    autoFocus?: boolean;
    disabled?: boolean;
    form?: string;
    maxLength?: number;
    minLength?: number;
    name?: string;
    onBlur?: React.FocusEventHandler<HTMLTextAreaElement>;
    onClick?: React.MouseEventHandler<HTMLTextAreaElement>;
    onFocus?: React.FocusEventHandler<HTMLTextAreaElement>;
    onKeyDown?: React.KeyboardEventHandler<HTMLTextAreaElement>;
    onKeyUp?: React.KeyboardEventHandler<HTMLTextAreaElement>;
    placeholder?: string;
    readOnly?: boolean;
    required?: boolean;
    textareaClassName?: string;
    textareaId?: string;

    preClassName?: string;
};

type EditRecord = {
    value: string;
    selectionStart: number;
    selectionEnd: number;
};

type History = {
    stack: (EditRecord & { timestamp: number })[];
    offset: number;
};

const HISTORY_LIMIT = 100;
const HISTORY_TIME_GAP = 3000;

const platform = typeof globalThis !== 'undefined' && globalThis.navigator ? globalThis.navigator.platform : '';
const isWindows = /Win/i.test(platform);
const isMacLike = /(Mac|iPhone|iPod|iPad)/i.test(platform);

const WRAP_KEY_CHARS: Record<string, { plain?: [string, string]; shift?: [string, string] }> = {
    Digit9: { shift: ['(', ')'] },
    BracketLeft: { plain: ['[', ']'], shift: ['{', '}'] },
    Quote: { plain: ["'", "'"], shift: ['"', '"'] },
    Backquote: { plain: ['`', '`'] },
};

function isUndoCombo(e: React.KeyboardEvent): boolean {
    if (e.code !== 'KeyZ' || e.shiftKey || e.altKey) return false;
    return isMacLike ? e.metaKey : e.ctrlKey;
}

function isRedoCombo(e: React.KeyboardEvent): boolean {
    if (e.altKey) return false;
    if (isMacLike) return e.metaKey && e.code === 'KeyZ' && e.shiftKey;
    if (isWindows) return e.ctrlKey && e.code === 'KeyY';
    return e.ctrlKey && e.code === 'KeyZ' && e.shiftKey;
}

function isToggleCaptureCombo(e: React.KeyboardEvent): boolean {
    if (e.code !== 'KeyM' || !e.ctrlKey) return false;
    return isMacLike ? e.shiftKey : true;
}

const textareaClassNameBase = 'npm__react-simple-code-editor__textarea';

const getLines = (text: string, position: number) => text.substring(0, position).split('\n');

const cssText = /* CSS */ `
.${textareaClassNameBase}:empty {
    -webkit-text-fill-color: inherit !important;
}

@media all and (-ms-high-contrast: none), (-ms-high-contrast: active) {
    .${textareaClassNameBase} {
        color: transparent !important;
    }

    .${textareaClassNameBase}::selection {
        background-color: #accef7 !important;
        color: transparent !important;
    }
}
`;

const CodeEditor = React.forwardRef(function CodeEditor(props: Props, ref: React.Ref<null | { session: { history: History } }>) {
    const {
        autoFocus,
        disabled,
        form,
        highlight,
        ignoreTabKey = false,
        insertSpaces = true,
        maxLength,
        minLength,
        name,
        onBlur,
        onClick,
        onFocus,
        onKeyDown,
        onKeyUp,
        onValueChange,
        padding = 0,
        placeholder,
        preClassName,
        readOnly,
        required,
        style,
        tabSize = 2,
        textareaClassName,
        textareaId,
        value,
        ...rest
    } = props;

    const historyRef = React.useRef<History>({
        stack: [],
        offset: -1,
    });
    const inputRef = React.useRef<HTMLTextAreaElement | null>(null);
    const [capture, setCapture] = React.useState(true);
    const contentStyle = {
        paddingTop: typeof padding === 'object' ? padding.top : padding,
        paddingRight: typeof padding === 'object' ? padding.right : padding,
        paddingBottom: typeof padding === 'object' ? padding.bottom : padding,
        paddingLeft: typeof padding === 'object' ? padding.left : padding,
    };
    const highlighted = highlight(value);

    const recordChange = React.useCallback((record: EditRecord, overwrite = false) => {
        const { stack, offset } = historyRef.current;

        if (stack.length && offset > -1) {
            historyRef.current.stack = stack.slice(0, offset + 1);

            const count = historyRef.current.stack.length;

            if (count > HISTORY_LIMIT) {
                const extras = count - HISTORY_LIMIT;

                historyRef.current.stack = stack.slice(extras, count);
                historyRef.current.offset = Math.max(historyRef.current.offset - extras, 0);
            }
        }

        const timestamp = Date.now();

        if (overwrite) {
            const last = historyRef.current.stack[historyRef.current.offset];

            if (last && timestamp - last.timestamp < HISTORY_TIME_GAP) {
                const re = /[^a-z0-9]([a-z0-9]+)$/i;

                const previous = getLines(last.value, last.selectionStart).pop()?.match(re);
                const current = getLines(record.value, record.selectionStart).pop()?.match(re);

                if (previous?.[1] && current?.[1]?.startsWith(previous[1])) {
                    historyRef.current.stack[historyRef.current.offset] = {
                        ...record,
                        timestamp,
                    };

                    return;
                }
            }
        }

        historyRef.current.stack.push({ ...record, timestamp });
        historyRef.current.offset++;
    }, []);

    const recordCurrentState = React.useCallback(() => {
        const input = inputRef.current;

        if (!input) return;

        const { value: inputValue, selectionStart, selectionEnd } = input;

        recordChange({
            value: inputValue,
            selectionStart,
            selectionEnd,
        });
    }, [recordChange]);

    const updateInput = (record: EditRecord) => {
        const input = inputRef.current;

        if (!input) return;

        input.value = record.value;
        input.selectionStart = record.selectionStart;
        input.selectionEnd = record.selectionEnd;

        onValueChange?.(record.value);
    };

    const applyEdits = (record: EditRecord) => {
        const input = inputRef.current;
        const last = historyRef.current.stack[historyRef.current.offset];

        if (last && input) {
            historyRef.current.stack[historyRef.current.offset] = {
                ...last,
                selectionStart: input.selectionStart,
                selectionEnd: input.selectionEnd,
            };
        }

        recordChange(record);
        updateInput(record);
    };

    const undoEdit = () => {
        const { stack, offset } = historyRef.current;
        const record = stack[offset - 1];

        if (record) {
            updateInput(record);
            historyRef.current.offset = Math.max(offset - 1, 0);
        }
    };

    const redoEdit = () => {
        const { stack, offset } = historyRef.current;
        const record = stack[offset + 1];

        if (record) {
            updateInput(record);
            historyRef.current.offset = Math.min(offset + 1, stack.length - 1);
        }
    };

    const handleShiftTab = (currentValue: string, selectionStart: number, selectionEnd: number, tabCharacter: string) => {
        const linesBeforeCaret = getLines(currentValue, selectionStart);
        const startLine = linesBeforeCaret.length - 1;
        const endLine = getLines(currentValue, selectionEnd).length - 1;
        const nextValue = currentValue
            .split('\n')
            .map((line, i) => {
                if (i >= startLine && i <= endLine && line.startsWith(tabCharacter)) {
                    return line.substring(tabCharacter.length);
                }
                return line;
            })
            .join('\n');

        if (currentValue === nextValue) return;

        const startLineText = linesBeforeCaret[startLine];
        const shouldShiftStart = startLineText?.startsWith(tabCharacter) ?? false;
        applyEdits({
            value: nextValue,
            selectionStart: shouldShiftStart ? selectionStart - tabCharacter.length : selectionStart,
            selectionEnd: selectionEnd - (currentValue.length - nextValue.length),
        });
    };

    const handleTabWithSelection = (currentValue: string, selectionStart: number, selectionEnd: number, tabCharacter: string) => {
        const linesBeforeCaret = getLines(currentValue, selectionStart);
        const startLine = linesBeforeCaret.length - 1;
        const endLine = getLines(currentValue, selectionEnd).length - 1;
        const startLineText = linesBeforeCaret[startLine];

        applyEdits({
            value: currentValue
                .split('\n')
                .map((line, i) => (i >= startLine && i <= endLine ? tabCharacter + line : line))
                .join('\n'),
            selectionStart: startLineText && /\S/.test(startLineText) ? selectionStart + tabCharacter.length : selectionStart,
            selectionEnd: selectionEnd + tabCharacter.length * (endLine - startLine + 1),
        });
    };

    const handleTabAtCaret = (currentValue: string, selectionStart: number, selectionEnd: number, tabCharacter: string) => {
        const updatedSelection = selectionStart + tabCharacter.length;
        applyEdits({
            value: currentValue.substring(0, selectionStart) + tabCharacter + currentValue.substring(selectionEnd),
            selectionStart: updatedSelection,
            selectionEnd: updatedSelection,
        });
    };

    const handleTabKey = (
        e: React.KeyboardEvent<HTMLTextAreaElement>,
        currentValue: string,
        selectionStart: number,
        selectionEnd: number,
    ) => {
        e.preventDefault();
        const tabCharacter = (insertSpaces ? ' ' : '\t').repeat(tabSize);

        if (e.shiftKey) {
            handleShiftTab(currentValue, selectionStart, selectionEnd, tabCharacter);
        } else if (selectionStart === selectionEnd) {
            handleTabAtCaret(currentValue, selectionStart, selectionEnd, tabCharacter);
        } else {
            handleTabWithSelection(currentValue, selectionStart, selectionEnd, tabCharacter);
        }
    };

    const handleBackspaceKey = (
        e: React.KeyboardEvent<HTMLTextAreaElement>,
        currentValue: string,
        selectionStart: number,
        selectionEnd: number,
    ) => {
        if (selectionStart !== selectionEnd) return;
        const tabCharacter = (insertSpaces ? ' ' : '\t').repeat(tabSize);
        const textBeforeCaret = currentValue.substring(0, selectionStart);
        if (!textBeforeCaret.endsWith(tabCharacter)) return;

        e.preventDefault();
        const updatedSelection = selectionStart - tabCharacter.length;
        applyEdits({
            value: currentValue.substring(0, selectionStart - tabCharacter.length) + currentValue.substring(selectionEnd),
            selectionStart: updatedSelection,
            selectionEnd: updatedSelection,
        });
    };

    const handleEnterKey = (
        e: React.KeyboardEvent<HTMLTextAreaElement>,
        currentValue: string,
        selectionStart: number,
        selectionEnd: number,
    ) => {
        if (selectionStart !== selectionEnd) return;
        const line = getLines(currentValue, selectionStart).pop();
        const matches = line?.match(/^\s+/);
        if (!matches?.[0]) return;

        e.preventDefault();
        const indent = '\n' + matches[0];
        const updatedSelection = selectionStart + indent.length;
        applyEdits({
            value: currentValue.substring(0, selectionStart) + indent + currentValue.substring(selectionEnd),
            selectionStart: updatedSelection,
            selectionEnd: updatedSelection,
        });
    };

    const handleWrapKey = (
        e: React.KeyboardEvent<HTMLTextAreaElement>,
        currentValue: string,
        selectionStart: number,
        selectionEnd: number,
    ) => {
        const mapping = WRAP_KEY_CHARS[e.code];
        if (!mapping) return false;
        const chars = e.shiftKey ? mapping.shift : mapping.plain;
        if (!chars || selectionStart === selectionEnd) return false;

        e.preventDefault();
        applyEdits({
            value:
                currentValue.substring(0, selectionStart) +
                chars[0] +
                currentValue.substring(selectionStart, selectionEnd) +
                chars[1] +
                currentValue.substring(selectionEnd),
            selectionStart,
            selectionEnd: selectionEnd + 2,
        });
        return true;
    };

    const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
        if (onKeyDown) {
            onKeyDown(e);
            if (e.defaultPrevented) return;
        }

        if (e.key === 'Escape') {
            e.currentTarget.blur();
        }

        const { value: currentValue, selectionStart, selectionEnd } = e.currentTarget;

        if (e.key === 'Tab' && !ignoreTabKey && capture) {
            handleTabKey(e, currentValue, selectionStart, selectionEnd);
            return;
        }
        if (e.key === 'Backspace') {
            handleBackspaceKey(e, currentValue, selectionStart, selectionEnd);
            return;
        }
        if (e.key === 'Enter') {
            handleEnterKey(e, currentValue, selectionStart, selectionEnd);
            return;
        }
        if (handleWrapKey(e, currentValue, selectionStart, selectionEnd)) return;
        if (isUndoCombo(e)) {
            e.preventDefault();
            undoEdit();
            return;
        }
        if (isRedoCombo(e)) {
            e.preventDefault();
            redoEdit();
            return;
        }
        if (isToggleCaptureCombo(e)) {
            e.preventDefault();
            setCapture((prev) => !prev);
        }
    };

    const handleChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
        const { value: nextValue, selectionStart, selectionEnd } = e.currentTarget;

        recordChange(
            {
                value: nextValue,
                selectionStart,
                selectionEnd,
            },
            true,
        );

        onValueChange(nextValue);
    };

    React.useEffect(() => {
        recordCurrentState();
    }, [recordCurrentState]);

    React.useImperativeHandle(ref, () => {
        return {
            get session() {
                return {
                    history: historyRef.current,
                };
            },
            set session(session: { history: History }) {
                historyRef.current = session.history;
            },
        };
    }, []);

    return (
        <div {...rest} style={{ ...styles.container, ...style }}>
            <pre
                className={preClassName}
                aria-hidden="true"
                style={{ ...styles.editor, ...styles.highlight, ...contentStyle }}
                {...(typeof highlighted === 'string'
                    ? { dangerouslySetInnerHTML: { __html: highlighted + '<br />' } }
                    : { children: highlighted })}
            />
            <textarea
                ref={(c) => {
                    inputRef.current = c;
                }}
                style={{
                    ...styles.editor,
                    ...styles.textarea,
                    ...contentStyle,
                }}
                className={textareaClassNameBase + (textareaClassName ? ` ${textareaClassName}` : '')}
                id={textareaId}
                value={value}
                onChange={handleChange}
                onKeyDown={handleKeyDown}
                onClick={onClick}
                onKeyUp={onKeyUp}
                onFocus={onFocus}
                onBlur={onBlur}
                disabled={disabled}
                form={form}
                maxLength={maxLength}
                minLength={minLength}
                name={name}
                placeholder={placeholder}
                readOnly={readOnly}
                required={required}
                // biome-ignore lint/a11y/noAutofocus: opt-in prop forwarded from the parent component
                autoFocus={autoFocus}
                autoCapitalize="off"
                autoComplete="off"
                autoCorrect="off"
                spellCheck={false}
                data-gramm={false}
            />
            <style>{cssText}</style>
        </div>
    );
});

const styles = {
    container: {
        position: 'relative',
        textAlign: 'left',
        boxSizing: 'border-box',
        padding: 0,
        overflow: 'hidden',
    },
    textarea: {
        position: 'absolute',
        top: 0,
        left: 0,
        height: '100%',
        width: '100%',
        resize: 'none',
        color: 'inherit',
        overflow: 'hidden',
        MozOsxFontSmoothing: 'grayscale',
        WebkitFontSmoothing: 'antialiased',
        WebkitTextFillColor: 'transparent',
    },
    highlight: {
        position: 'relative',
        pointerEvents: 'none',
    },
    editor: {
        margin: 0,
        border: 0,
        background: 'none',
        boxSizing: 'inherit',
        display: 'inherit',
        fontFamily: 'inherit',
        fontSize: 'inherit',
        fontStyle: 'inherit',
        fontVariantLigatures: 'inherit',
        fontWeight: 'inherit',
        letterSpacing: 'inherit',
        lineHeight: 'inherit',
        tabSize: 'inherit',
        textIndent: 'inherit',
        textRendering: 'inherit',
        textTransform: 'inherit',
        whiteSpace: 'pre-wrap',
        wordBreak: 'keep-all',
        overflowWrap: 'break-word',
    },
} as const;

export default CodeEditor;
