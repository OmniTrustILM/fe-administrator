import DOMPurify from 'dompurify';

// Backend-provided messages may carry simple formatting, but nothing in the app produces
// richer markup — so only basic text formatting survives sanitization. Style tags, forms,
// images, links and all attributes are stripped to prevent UI injection via API errors.
const ALLOWED_TAGS = ['b', 'strong', 'i', 'em', 'u', 'p', 'br', 'ul', 'ol', 'li', 'code', 'pre', 'span'];

const SANITIZE_CONFIG = {
    ALLOWED_TAGS,
    ALLOWED_ATTR: [],
    ALLOW_ARIA_ATTR: false,
    ALLOW_DATA_ATTR: false,
};

const ALLOWED_TAG_START = new RegExp(`^</?(?:${ALLOWED_TAGS.join('|')})(?:\\s[^<>]*)?/?>`, 'i');

// Errors quote identifiers in angle brackets ("alias <cert-alias> already exists"). Handing those
// to the sanitizer as-is loses them: the HTML parser reads them as unknown elements and the tag
// name disappears with the tag. Escaping every bracket that does not open a supported tag keeps
// such values as literal text, and turns hostile markup into visible, inert text instead.
export function escapeUnsupportedMarkup(message: string): string {
    let escaped = '';
    let index = 0;

    while (index < message.length) {
        const bracket = message.indexOf('<', index);
        if (bracket === -1) {
            escaped += message.slice(index);
            break;
        }

        escaped += message.slice(index, bracket);
        const tag = ALLOWED_TAG_START.exec(message.slice(bracket))?.[0];
        escaped += tag ?? '&lt;';
        index = bracket + (tag?.length ?? 1);
    }

    return escaped;
}

export function sanitizeAlertMessage(message: string): string {
    return DOMPurify.sanitize(escapeUnsupportedMarkup(message), SANITIZE_CONFIG);
}
