export const CBOM_REPOSITORY_HEALTH_WARNING_MESSAGE = 'Ensure that entered CBOM Repository URL is reachable. Health check failed.';
export const UTILS_SERVICE_HEALTH_WARNING_MESSAGE = 'Ensure that entered Utils Service URL is reachable. Health check failed.';

const URL_ERROR_MESSAGE = 'Please enter valid URL.';

/**
 * A whole http(s) base URL, parsed rather than prefix-matched. Surrounding whitespace is ignored (a pasted value is
 * trimmed on save as well); text after a valid-looking start, a scheme without `//`, a query or a fragment are refused
 * -- the health probe appends its path to the value, and the last two would break it. The probe is a warning, not a
 * validation error, so this is the only check that keeps a malformed URL from being saved.
 */
export const validateUrl = (url?: string): string | undefined => {
    const value = url?.trim();
    if (!value) {
        return undefined;
    }
    if (/\s/.test(value) || !/^https?:\/\//i.test(value)) {
        return URL_ERROR_MESSAGE;
    }
    try {
        const { search, hash } = new URL(value);
        return search === '' && hash === '' ? undefined : URL_ERROR_MESSAGE;
    } catch {
        return URL_ERROR_MESSAGE;
    }
};

const normalizeUrl = (url: string): string => {
    const trimmed = url.trim();
    let endIndex = trimmed.length;
    while (endIndex > 0 && (trimmed.codePointAt(endIndex - 1) ?? -1) === 47) {
        endIndex -= 1;
    }
    return endIndex === trimmed.length ? trimmed : trimmed.slice(0, endIndex);
};

export const buildCbomHealthPath = (url: string): string => {
    const baseUrl = normalizeUrl(url);
    return baseUrl.endsWith('/api') ? '/v1/health' : '/api/v1/health';
};

export const validateHealthUrl = async (url: string | undefined, path: string, error: string): Promise<string | undefined> => {
    if (!url) {
        return undefined;
    }
    try {
        const healthUrl = `${normalizeUrl(url)}${path}`;
        const result = await fetch(healthUrl);
        const json = await result.json();
        return result.status === 200 && json.status === 'UP' ? undefined : error;
    } catch {
        return error;
    }
};

export const validateCbomRepositoryUrl = (url?: string): string | undefined => validateUrl(url);

export const getCbomRepositoryHealthWarning = async (url?: string): Promise<string | undefined> => {
    if (!url || validateCbomRepositoryUrl(url)) {
        return undefined;
    }

    return validateHealthUrl(url, buildCbomHealthPath(url), CBOM_REPOSITORY_HEALTH_WARNING_MESSAGE);
};
