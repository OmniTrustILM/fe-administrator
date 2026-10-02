type LinkClick = Pick<MouseEvent, 'button' | 'metaKey' | 'ctrlKey' | 'shiftKey' | 'altKey'>;

/**
 * Whether a link click navigates the current tab. A modified or non-primary click is left to the browser,
 * which opens the target elsewhere, so state handed to the target here would wait in this tab instead.
 */
export const isSameTabClick = (event: LinkClick): boolean =>
    event.button === 0 && !event.metaKey && !event.ctrlKey && !event.shiftKey && !event.altKey;

/** Wraps a link's click handler so it runs only for a click that navigates the current tab. */
export const onSameTabClick =
    (handler: () => void) =>
    (event: LinkClick): void => {
        if (isSameTabClick(event)) handler();
    };
