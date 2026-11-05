export const COPIED_FEEDBACK_MS = 1500;
const GAP_PX = 8;
// Screen readers miss a change made too soon after a live region starts being tracked.
const ANNOUNCE_DELAY_MS = 100;

let dismissCurrent: (() => void) | undefined;

function place(toast: HTMLElement, anchor: Element | null) {
    if (!anchor) {
        toast.style.left = '50%';
        toast.style.bottom = '2rem';
        return;
    }
    const rect = anchor.getBoundingClientRect();
    const top = rect.top - GAP_PX - toast.offsetHeight;
    const half = toast.offsetWidth / 2;
    const maxCenter = document.documentElement.clientWidth - half - GAP_PX;
    const center = Math.max(half + GAP_PX, Math.min(rect.left + rect.width / 2, maxCenter));
    toast.style.left = `${center}px`;
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
    const target = anchor?.isConnected ? anchor : null;

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

    // The toast is placed once, so any scroll or resize would leave it detached from the button.
    const hideToast = () => toast.remove();
    window.addEventListener('scroll', hideToast, { capture: true, passive: true });
    window.addEventListener('resize', hideToast);

    const dismiss = () => {
        clearTimeout(announce);
        clearTimeout(timeout);
        window.removeEventListener('scroll', hideToast, { capture: true });
        window.removeEventListener('resize', hideToast);
        hideToast();
        announcer.textContent = '';
        if (dismissCurrent === dismiss) dismissCurrent = undefined;
    };
    const timeout = setTimeout(dismiss, COPIED_FEEDBACK_MS);
    dismissCurrent = dismiss;
}
