import Button from 'components/Button';
import cn from 'classnames';
import { Bold, Code, Heading, Italic, Link, List, ListOrdered, type LucideIcon, Strikethrough, TextQuote } from 'lucide-react';
import { type KeyboardEvent, useCallback, useEffect, useId, useLayoutEffect, useRef, useState } from 'react';
import { COMMENT_BODY_MAX_LENGTH } from 'utils/comment-markdown';
import { applyMarkdownAction, type EditState, type MarkdownAction, markdownShortcut } from 'utils/markdown-editing';
import CommentBody from './CommentBody';

type Props = {
    onSubmit: (body: string) => void;
    onCancel?: () => void;
    isPosting: boolean;
    /** Set by the store when the last post committed; the draft is kept until then, so a failure loses nothing. */
    postSucceeded: boolean;
    /** Message from the API's 403: shown in place of the box, because the API, not the FE, decides who may post. */
    denied?: string;
    placeholder: string;
    submitLabel: string;
    dataTestId: string;
    /** Scroll the box into view and focus it when it appears; used by the reply box, which opens below the thread. */
    autoFocus?: boolean;
};

type ToolbarItem = { action: MarkdownAction; label: string; icon: LucideIcon; shortcut?: string };

/** Only the ratified subset gets a button: there is deliberately no image and no raw HTML here. */
const TOOLBAR: ToolbarItem[][] = [
    [
        { action: 'heading', label: 'Heading', icon: Heading },
        { action: 'bold', label: 'Bold', icon: Bold, shortcut: 'B' },
        { action: 'italic', label: 'Italic', icon: Italic, shortcut: 'I' },
        { action: 'strikethrough', label: 'Strikethrough', icon: Strikethrough },
    ],
    [
        { action: 'code', label: 'Code', icon: Code },
        { action: 'link', label: 'Link', icon: Link, shortcut: 'K' },
    ],
    [
        { action: 'bulletList', label: 'Bulleted list', icon: List },
        { action: 'numberedList', label: 'Numbered list', icon: ListOrdered },
        { action: 'quote', label: 'Quote', icon: TextQuote },
    ],
];

const MODES = [
    { label: 'Write', isPreview: false },
    { label: 'Preview', isPreview: true },
] as const;

/** Roughly 16 lines; beyond that the textarea scrolls instead of pushing the page down. */
const MAX_TEXTAREA_HEIGHT = 400;

const isMac = typeof navigator !== 'undefined' && /Mac|iPhone|iPad/.test(navigator.userAgent);
const shortcutHint = (key: string) => `${isMac ? '⌘' : 'Ctrl+'}${key}`;

export default function CommentComposer({
    onSubmit,
    onCancel,
    isPosting,
    postSucceeded,
    denied,
    placeholder,
    submitLabel,
    dataTestId,
    autoFocus = false,
}: Readonly<Props>) {
    const [body, setBody] = useState('');
    const [preview, setPreview] = useState(false);
    const [deniedDismissed, setDeniedDismissed] = useState(false);
    const [pendingSelection, setPendingSelection] = useState<[number, number] | undefined>(undefined);
    const textareaRef = useRef<HTMLTextAreaElement>(null);
    const containerRef = useRef<HTMLDivElement>(null);
    const id = useId();

    // Grows with the text up to a ceiling, after which the textarea scrolls on its own. Measured in a layout effect
    // so the height is settled before paint and the box never flashes at the old size.
    // biome-ignore lint/correctness/useExhaustiveDependencies: re-measured when the text changes or the textarea is remounted after a preview
    useLayoutEffect(() => {
        const textarea = textareaRef.current;
        if (!textarea) return;
        // Collapsing to `auto` for the measurement would reset a capped textarea's scroll position, so it is kept.
        const { scrollTop } = textarea;
        textarea.style.height = 'auto';
        textarea.style.height = `${Math.min(textarea.scrollHeight, MAX_TEXTAREA_HEIGHT)}px`;
        textarea.scrollTop = scrollTop;
    }, [body, preview]);

    // The draft is cleared only once the store reports the post committed: a 422 or a network failure keeps the
    // text in the box so the user can correct or retry it.
    const wasSucceeded = useRef(postSucceeded);
    useEffect(() => {
        if (!wasSucceeded.current && postSucceeded) {
            setBody('');
            setPreview(false);
        }
        wasSucceeded.current = postSucceeded;
    }, [postSucceeded]);

    // The whole box is scrolled, not just the textarea, so the toolbar and the submit button end up on screen too.
    useEffect(() => {
        if (!autoFocus || !containerRef.current) return;
        containerRef.current.scrollIntoView({ block: 'center', behavior: 'smooth' });
        textareaRef.current?.focus({ preventScroll: true });
    }, [autoFocus]);

    // The selection is restored after React has committed the new value, otherwise it would land on the old text.
    useEffect(() => {
        if (!pendingSelection || !textareaRef.current) return;
        const textarea = textareaRef.current;
        const { scrollTop } = textarea;
        textarea.focus({ preventScroll: true });
        textarea.setSelectionRange(pendingSelection[0], pendingSelection[1]);
        textarea.scrollTop = scrollTop;
        setPendingSelection(undefined);
    }, [pendingSelection]);

    // A denial belongs to the text that was rejected: editing it takes the message down and re-arms the button, so a
    // user whose permission has since been granted can retry without remounting the panel.
    const updateBody = useCallback((value: string) => {
        setBody(value);
        setDeniedDismissed(true);
    }, []);

    const runAction = useCallback(
        (action: MarkdownAction) => {
            const textarea = textareaRef.current;
            if (!textarea) return;
            const state: EditState = {
                value: textarea.value,
                selectionStart: textarea.selectionStart,
                selectionEnd: textarea.selectionEnd,
            };
            const next = applyMarkdownAction(state, action);
            updateBody(next.value);
            setPendingSelection([next.selectionStart, next.selectionEnd]);
        },
        [updateBody],
    );

    const onKeyDown = (event: KeyboardEvent<HTMLTextAreaElement>) => {
        const action = markdownShortcut(event);
        if (!action) return;
        event.preventDefault();
        runAction(action);
    };

    // The box is never taken away: the text has to stay reachable, or a denied post traps whatever was typed.
    const showDenied = !!denied && !deniedDismissed;
    const overLimit = body.length > COMMENT_BODY_MAX_LENGTH;
    const canSubmit = body.trim().length > 0 && !overLimit && !isPosting && !showDenied;

    const submit = () => {
        if (!canSubmit) return;
        setDeniedDismissed(false);
        onSubmit(body);
    };

    return (
        <div ref={containerRef} className="flex flex-col gap-2" data-testid={dataTestId}>
            {showDenied && (
                <p className="text-sm text-danger" data-testid={`${dataTestId}-denied`}>
                    {denied}
                </p>
            )}
            <div
                className={cn(
                    'rounded-lg border bg-surface-raised overflow-hidden focus-within:ring-1 focus-within:ring-brand focus-within:border-brand',
                    {
                        'border-outline': !overLimit,
                        'border-danger': overLimit,
                    },
                )}
            >
                <div
                    className="flex items-center gap-0.5 px-2 py-1.5 border-b border-divider bg-surface flex-wrap"
                    role="toolbar"
                    aria-label="Formatting"
                >
                    <div className="flex items-center" role="tablist" aria-label="Editor mode">
                        {MODES.map(({ label, isPreview }) => (
                            <button
                                key={label}
                                type="button"
                                role="tab"
                                aria-selected={preview === isPreview}
                                className={cn(
                                    'px-2.5 py-1 text-xs font-medium rounded-md border border-transparent focus:outline-hidden focus-visible:ring-2 focus-visible:ring-brand',
                                    preview === isPreview ? 'text-brand bg-brand-subtle' : 'text-content-muted hover:bg-surface-hover',
                                )}
                                onClick={() => setPreview(isPreview)}
                                data-testid={`${dataTestId}-${isPreview ? 'toggle-preview' : 'toggle-write'}`}
                            >
                                {label}
                            </button>
                        ))}
                    </div>
                    <span className="w-px h-4 bg-divider mx-1.5" aria-hidden="true" />
                    {TOOLBAR.map((group, groupIndex) => (
                        <div key={group[0].action} className="flex items-center gap-0.5">
                            {groupIndex > 0 && <span className="w-px h-4 bg-divider mx-1.5" aria-hidden="true" />}
                            {group.map(({ action, label, icon: Icon, shortcut }) => {
                                const title = shortcut ? `${label} (${shortcutHint(shortcut)})` : label;
                                return (
                                    <Button
                                        key={action}
                                        variant="transparent"
                                        color="secondary"
                                        className="!p-1.5"
                                        title={title}
                                        aria-label={label}
                                        disabled={preview || isPosting}
                                        onClick={() => runAction(action)}
                                        data-testid={`${dataTestId}-tool-${action}`}
                                    >
                                        <Icon size={15} />
                                    </Button>
                                );
                            })}
                        </div>
                    ))}
                </div>

                {preview ? (
                    <div className="px-4 py-3 min-h-24 bg-surface" data-testid={`${dataTestId}-preview`}>
                        {body.trim() ? (
                            <CommentBody source={body} />
                        ) : (
                            <span className="text-sm text-content-subtle">Nothing to preview</span>
                        )}
                    </div>
                ) : (
                    <textarea
                        ref={textareaRef}
                        id={id}
                        className="py-2.5 sm:py-3 px-4 block w-full border-0 text-sm text-content focus:ring-0 focus:outline-hidden disabled:opacity-50 disabled:pointer-events-none bg-surface-raised placeholder-content-subtle min-h-24 resize-none overflow-y-auto"
                        value={body}
                        onChange={(event) => updateBody(event.target.value)}
                        onKeyDown={onKeyDown}
                        placeholder={placeholder}
                        disabled={isPosting}
                        rows={3}
                        aria-invalid={overLimit || undefined}
                        aria-describedby={`${id}-hint`}
                    />
                )}
            </div>
            <div className="flex items-center justify-between gap-2 flex-wrap">
                <span id={`${id}-hint`} className="text-xs text-danger tabular-nums" data-testid={`${dataTestId}-counter`}>
                    {overLimit && `${body.length}/${COMMENT_BODY_MAX_LENGTH}`}
                </span>
                <div className="flex items-center gap-2">
                    {onCancel && (
                        <Button
                            variant="outline"
                            color="primary"
                            onClick={onCancel}
                            disabled={isPosting}
                            data-testid={`${dataTestId}-cancel`}
                        >
                            Cancel
                        </Button>
                    )}
                    <Button color="primary" onClick={submit} disabled={!canSubmit} data-testid={`${dataTestId}-submit`}>
                        {submitLabel}
                    </Button>
                </div>
            </div>
        </div>
    );
}
