import type { Action } from '@reduxjs/toolkit';
import { AjaxError } from 'rxjs/ajax';
import { AttributeContentType } from 'types/openapi';

export const MASKED = '<masked>';

/** The payload fields that hold a passphrase, a key container or a secret's content. */
const SECRET_FIELDS = new Set(['passphrase', 'passphraseConfirmation', 'inputPassphrase', 'file', 'secret']);

/** The content types of the attributes whose content is a secret or a file; a credential attribute holds only a reference. */
const SECRET_CONTENT_TYPES = new Set<unknown>([AttributeContentType.Secret, AttributeContentType.File]);

const isPlainObject = (value: unknown): value is Record<string, unknown> =>
    typeof value === 'object' && value !== null && Object.getPrototypeOf(value) === Object.prototype;

const isSecret = (object: Record<string, unknown>, key: string) =>
    SECRET_FIELDS.has(key) || (key === 'content' && SECRET_CONTENT_TYPES.has(object.contentType) && Array.isArray(object.content));

function mask(value: unknown): unknown {
    if (value instanceof AjaxError) return { ...value, request: { ...value.request, body: MASKED } };
    if (Array.isArray(value)) return value.map(mask);
    if (!isPlainObject(value)) return value;
    return Object.fromEntries(Object.entries(value).map(([key, each]) => [key, isSecret(value, key) ? MASKED : mask(each)]));
}

/**
 * An action as Redux DevTools shows it. Wherever they are in its payload, passphrases, files and a secret's content are
 * masked, and so is the content of a secret or a file attribute, such as a provider PIN or key material, whose other
 * fields are kept. The request body of an error is masked too, since it carries them.
 */
export function sanitizeAction<A extends Action>(action: A): A {
    return 'payload' in action ? { ...action, payload: mask(action.payload) } : action;
}
