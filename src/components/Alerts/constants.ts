export const AUTO_DISMISS_MS = 6000;
export const EXIT_ANIMATION_MS = 200;
export const COPY_CONFIRMATION_MS = 2000;
export const DISMISS_ALL_THRESHOLD = 3;
export const PROGRESS_ANIMATION_NAME = 'alert-progress';

// Backend-provided messages may carry simple formatting, but nothing in the app produces
// richer markup — so only basic text formatting survives sanitization. Style tags, forms,
// images, links and all attributes are stripped to prevent UI injection via API errors.
export const SANITIZE_CONFIG = {
    ALLOWED_TAGS: ['b', 'strong', 'i', 'em', 'u', 'p', 'br', 'ul', 'ol', 'li', 'code', 'pre', 'span'],
    ALLOWED_ATTR: [],
    ALLOW_ARIA_ATTR: false,
    ALLOW_DATA_ATTR: false,
};
