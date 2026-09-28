import type { Action } from '@reduxjs/toolkit';
import { AjaxError } from 'rxjs/ajax';

export const MASKED = '<masked>';

/** The payload fields that hold a passphrase or a key container. */
const SECRET_FIELDS = new Set(['passphrase', 'passphraseConfirmation', 'inputPassphrase', 'file']);

const isPlainObject = (value: unknown): value is Record<string, unknown> =>
    typeof value === 'object' && value !== null && Object.getPrototypeOf(value) === Object.prototype;

function mask(value: unknown): unknown {
    if (value instanceof AjaxError) return { ...value, request: { ...value.request, body: MASKED } };
    if (Array.isArray(value)) return value.map(mask);
    if (!isPlainObject(value)) return value;
    return Object.fromEntries(Object.entries(value).map(([key, each]) => [key, SECRET_FIELDS.has(key) ? MASKED : mask(each)]));
}

/**
 * An action as Redux DevTools shows it: passphrases and files masked wherever they are in its payload, and the request
 * body of an error masked, since it carries them too.
 */
export function sanitizeAction<A extends Action>(action: A): A {
    return 'payload' in action ? { ...action, payload: mask(action.payload) } : action;
}
