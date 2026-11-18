/** Core's refusals of platform settings fields, each keyed by the field's path in the update body. */
export type PlatformSettingsFieldErrors = Readonly<Partial<Record<string, string>>>;

export const SIGNING_MAX_ITEMS_PER_REQUEST_PATH = 'signing.maxItemsPerRequest';

/** The update-body paths whose refusal a settings form shows on the field. */
const FIELD_PATHS_SHOWN_ON_FORMS: readonly string[] = [SIGNING_MAX_ITEMS_PER_REQUEST_PATH];

const CORE_FIELD_MESSAGE_SEPARATOR = ' ';

const refusalPrefix = (path: string) => `${path}${CORE_FIELD_MESSAGE_SEPARATOR}`;

/** The messages of Core's 422 entries that refuse a field a form shows, keyed by the field's path. */
export const fieldErrorsShownOnForms = (err: unknown): PlatformSettingsFieldErrors | undefined => {
    const { status, response } = (err ?? {}) as { status?: unknown; response?: unknown };
    if (status !== 422 || !Array.isArray(response)) return undefined;
    const fieldErrors: Record<string, string> = {};
    for (const entry of response) {
        const path =
            typeof entry === 'string' ? FIELD_PATHS_SHOWN_ON_FORMS.find((shown) => entry.startsWith(refusalPrefix(shown))) : undefined;
        if (path !== undefined) {
            fieldErrors[path] = entry.slice(refusalPrefix(path).length);
        }
    }
    return Object.keys(fieldErrors).length > 0 ? fieldErrors : undefined;
};
