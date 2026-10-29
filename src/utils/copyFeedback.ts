export const COPIED_FEEDBACK_MS = 1500;
const GAP_PX = 8;
// Screen readers miss a change made too soon after a live region starts being tracked.
const ANNOUNCE_DELAY_MS = 100;

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

// Inside an open modal dialog, content outside it is hidden from assistive technology.
function announcerIn(container: Element): HTMLElement {
    const existing = container.querySelector<HTMLElement>(':scope > [data-copy-announcer]');
    if (existing) return existing;
    const announcer = document.createElement('div');
    announcer.dataset.copyAnnouncer = '';
    announcer.setAttribute('role', 'status');
    announcer.className = 'sr-only';
    container.append(announcer);
    return announcer;
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

    const announcer = announcerIn(target?.closest('[role="dialog"]') ?? document.body);
    announcer.textContent = '';
    const announce = setTimeout(() => {
        announcer.textContent = 'Copied';
    }, ANNOUNCE_DELAY_MS);

    const dismiss = () => {
        clearTimeout(announce);
        clearTimeout(timeout);
        toast.remove();
        announcer.textContent = '';
        if (dismissCurrent === dismiss) dismissCurrent = undefined;
    };
    const timeout = setTimeout(dismiss, COPIED_FEEDBACK_MS);
    dismissCurrent = dismiss;
}
