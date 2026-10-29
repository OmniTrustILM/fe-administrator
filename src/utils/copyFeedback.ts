export const COPIED_FEEDBACK_MS = 1500;
const GAP_PX = 8;

let dismissCurrent: (() => void) | undefined;

function resolveAnchor(anchor: Element | null): Element | null {
    if (anchor?.isConnected) return anchor;
    // A menu item is gone by the time the copy resolves; focus has returned to the menu trigger.
    const focused = document.activeElement;
    return focused && focused !== document.body ? focused : null;
}

function place(toast: HTMLElement, anchor: Element | null) {
    if (!anchor) {
        toast.style.left = '50%';
        toast.style.bottom = '2rem';
        return;
    }
    const rect = anchor.getBoundingClientRect();
    const top = rect.top - GAP_PX - toast.offsetHeight;
    toast.style.left = `${rect.left + rect.width / 2}px`;
    toast.style.top = `${top >= 0 ? top : rect.bottom + GAP_PX}px`;
}

export function showCopiedFeedback(anchor: Element | null) {
    dismissCurrent?.();
    const target = resolveAnchor(anchor);

    // Kept out of any dialog: a transformed dialog would become the containing block of a fixed element.
    const toast = document.createElement('div');
    toast.dataset.testid = 'copied-feedback';
    toast.setAttribute('aria-hidden', 'true');
    toast.className =
        'pointer-events-none fixed z-[90] -translate-x-1/2 rounded-md bg-surface-inverse px-2 py-1 text-xs font-medium text-content-inverse shadow-md';
    toast.textContent = 'Copied';
    document.body.append(toast);
    place(toast, target);

    // Inside an open modal dialog, content outside it is hidden from assistive technology.
    const announcer = document.createElement('div');
    announcer.setAttribute('role', 'status');
    announcer.className = 'sr-only';
    (target?.closest('[role="dialog"]') ?? document.body).append(announcer);
    // A live region is announced only when its content changes after it is in the document.
    const frame = requestAnimationFrame(() => {
        announcer.textContent = 'Copied';
    });

    const dismiss = () => {
        cancelAnimationFrame(frame);
        clearTimeout(timeout);
        toast.remove();
        announcer.remove();
        if (dismissCurrent === dismiss) dismissCurrent = undefined;
    };
    const timeout = setTimeout(dismiss, COPIED_FEEDBACK_MS);
    dismissCurrent = dismiss;
}
