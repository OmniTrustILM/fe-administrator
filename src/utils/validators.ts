import cronValidator from 'cron-expression-validator';
import regexpTree from 'regexp-tree';

// A single form-field validator. The `value` type is intentionally `never` so that validators with
// concrete parameter types (e.g. `(value: string) => ...`) remain assignable to this aggregate type;
// callers narrow the value themselves. Only the composing helpers below rely on this shape.
export type FieldValidator = (value: never, allValues?: object, fieldState?: unknown) => string | undefined;

export const composeValidators =
    (...validators: FieldValidator[]) =>
    (value: unknown, allValues?: object, fieldState?: unknown): string | undefined =>
        validators
            .filter((validator) => typeof validator === 'function')
            .reduce<string | undefined>((error, validator) => error || validator(value as never, allValues, fieldState), undefined);

export const validateRequired = () => (value: unknown) => {
    const isValid = !!(Array.isArray(value) ? value.length > 0 : value) || typeof value === 'boolean';
    return isValid ? undefined : 'Required Field';
};

const getValueFromObject = (value: unknown): unknown => {
    if (typeof value === 'object' && value && Object.hasOwn(value, 'label') && Object.hasOwn(value, 'value')) {
        return (value as { value: { data: unknown } }).value.data;
    }
    // Attribute content objects from list (select) fields are stored as {data, reference}.
    // Extract the primitive data value so pattern validators can test it correctly.
    if (typeof value === 'object' && value && Object.hasOwn(value, 'data')) {
        return (value as { data: unknown }).data;
    }
    return value;
};

export const validatePattern = (pattern: RegExp, message?: string) => (value: unknown) => {
    if (Array.isArray(value)) {
        return value.reduce((prev, curr) => prev && pattern.test(String(getValueFromObject(curr))), true)
            ? undefined
            : message || `Value must conform to ${pattern}`;
    }
    const validationInput = getValueFromObject(value);
    return !validationInput || pattern.test(String(validationInput)) ? undefined : message || `Value must conform to ${pattern}`;
};

export const validateInteger = () => validatePattern(/^[+-]?(\d*)$/, 'Value must be an integer');

export const validatePositiveInteger = () => validatePattern(/^\d+$/, 'Value must be a positive integer');

export const validateNonZeroInteger = () => validatePattern(/^[+-]?([1-9]\d*)$/, 'Value must be a non-zero integer');

export const validateFloat = () => validatePattern(/^[+-]?(\d*[.])?\d+$/, 'Value must be a float without an exponent.');

export const validateAlphaNumericWithoutAccents = () => {
    return validatePattern(/^[a-zA-Z0-9-._~]+$/, 'Value can only contain numbers or letters, dash, underscore, dot or tilde.');
};

export const validateAlphaNumericWithSpecialChars = () => {
    const word = String.raw`'?[a-zA-Z0-9À-ž]+(?:[\-/_'.][a-zA-Z0-9À-ž]+)*'?`;
    return validatePattern(
        new RegExp(`^${word}(?: ${word})*$`),
        'Value can only contain numbers or letters, optionally wrapped in apostrophes, separated by a space, dash, apostrophe, slash, underscore or dot',
    );
};

export const validateEmail = () => validatePattern(/^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]+$/, 'Value must be a valid email address');

export const validateRoutelessUrl = () =>
    validatePattern(/^((https?):\/\/)?[a-zA-Z0-9\-.]+(:\d+)?$/, 'Value must be a valid url. Example: http://localhost:8443');

export const validateUrlWithRoute = (value: string) => {
    return !value || /^(https?:\/\/)?([\w.-]+)(:\d+)?(\/[\w#.-]*)*\/?$/.test(value) ? undefined : 'Value must be a valid url';
};

const IP_OCTET = String.raw`(?:25[0-5]|2[0-4]\d|[01]?\d\d?)`;
const IP_REGEX = new RegExp(String.raw`^${IP_OCTET}\.${IP_OCTET}\.${IP_OCTET}\.${IP_OCTET}$`);

export const validateCustomIp = (value: string) => {
    return !value || IP_REGEX.test(value) ? undefined : 'Value must be a valid ip address';
};

export const validateLength = (min: number, max: number) => (value: unknown) => {
    const validationInput = getValueFromObject(value);
    if (!validationInput) return undefined;
    const length = typeof validationInput === 'string' || Array.isArray(validationInput) ? validationInput.length : Number.NaN;
    return length >= min && length <= max ? undefined : `Value must be between ${min} and ${max} characters long`;
};

export const validateDuration =
    (denominations: ('d' | 'h' | 'm' | 's')[] = ['d', 'h', 'm', 's']) =>
    (value: string) => {
        if (!value?.trim()) return undefined;
        const regexPattern = String.raw`^(\d{1,10}\s*[${denominations.join('')}]\s*)+$`;
        const regex = new RegExp(regexPattern);
        return regex.test(value.trim())
            ? undefined
            : `Invalid duration. Should be formatted as: ${denominations.map((d) => '0' + d).join(' ')}.`;
    };

export const validateQuartzCronExpression = () => (value: string) => {
    const unwrapped = getValueFromObject(value);
    // Keep the unwrapped {label,value}/{data} string when present; otherwise fall back to the raw
    // value so a non-string input is still forwarded and makes `isValidCronExpression` throw, which
    // the catch below turns into the generic error message.
    const validationInput = typeof unwrapped === 'string' ? unwrapped : value;

    try {
        const validObj: { isValid: boolean; errorMessage: string | string[] } = cronValidator.isValidCronExpression(validationInput, {
            error: true,
        });

        if (!validationInput || validObj.isValid) return undefined;

        return Array.isArray(validObj.errorMessage) ? validObj.errorMessage.join(', ') : validObj.errorMessage;
    } catch {
        return 'Unknown error, please check the cron expression.';
    }
};

export const validateOid = () =>
    validatePattern(/^[0-2](\.(0|[1-9]\d*)){1,50}$/, 'Must be a dot-separated numeric OID (e.g. 1.2.840.113549.1.1.11)');

export const validateOidCode = () => validatePattern(/^[A-Za-z][A-Za-z0-9-]*$/, 'Value must be a valid OID code');

// Letters that must NOT follow a single backslash (\\X is OK)
const FORBIDDEN_AFTER_SINGLE_BACKSLASH = new Set([
    'Q',
    'E',
    'R',
    'T',
    'U',
    'u',
    'I',
    'i',
    'O',
    'o',
    'P',
    'p',
    'F',
    'G',
    'g',
    'H',
    'h',
    'J',
    'j',
    'K',
    'k',
    'L',
    'l',
    'Z',
    'z',
    'X',
    'x',
    'C',
    'V',
    'N',
]);

// Disallow these PCRE/JS tokens — not POSIX ARE
const FORBIDDEN_TOKENS = [
    // Inline groups & modifiers not in POSIX ARE
    '(?=',
    '(?!',
    '(?:',
    '(?i',
    '(?m',
    '(?s',
    '(?x',
    '(?>',
    '(?P<',
    '(?<',
    '(?#',
    // Unicode/Property escapes & named backrefs
    String.raw`\k<`,
    String.raw`\N`,
    String.raw`\p{`,
    String.raw`\P{`,
    String.raw`\u{`,
    String.raw`\x{`,
    // PCRE specials
    String.raw`\Q`,
    String.raw`\E`,
    String.raw`\R`,
    String.raw`\K`,
    String.raw`\G`,
    String.raw`\L`,
    String.raw`\U`,
];

// Valid POSIX classes (must be used as [[:name:]])
const POSIX_CLASSES = new Set([
    'alnum',
    'alpha',
    'blank',
    'cntrl',
    'digit',
    'graph',
    'lower',
    'print',
    'punct',
    'space',
    'upper',
    'xdigit',
]);

const hasUnescapedSequence = (haystack: string, seq: string): boolean => {
    for (let i = 0; i <= haystack.length - seq.length; i++) {
        if (haystack.slice(i, i + seq.length) !== seq) continue;
        let bs = 0;
        for (let j = i - 1; j >= 0 && haystack[j] === '\\'; j--) bs++;
        if (bs % 2 === 0) {
            return true;
        }
    }
    return false;
};

// 0) Quick JS parse for gross syntax errors
const checkJsParse = (value: string): string => {
    try {
        regexpTree.parse(`/${value}/`);
        return '';
    } catch (error) {
        const message = error instanceof Error ? error.message : String(error);
        return `Invalid regex pattern: ${message}`;
    }
};

// 1) Forbid known non-POSIX/PCRE tokens outright
const checkForbiddenTokens = (value: string): string => {
    for (const tok of FORBIDDEN_TOKENS) {
        if (hasUnescapedSequence(value, tok)) {
            return `Unsupported regex token for PostgreSQL POSIX: "${tok}"`;
        }
    }
    return '';
};

// 2) Single-backslash rule — forbid \X for letters not valid in POSIX ARE
const checkForbiddenEscapes = (value: string): string => {
    for (let i = 0; i < value.length - 1; i++) {
        if (value[i] !== '\\') continue;
        let backslashes = 1;
        for (let j = i - 1; j >= 0 && value[j] === '\\'; j--) backslashes++;
        if (backslashes % 2 === 1) {
            const next = value[i + 1];
            if (FORBIDDEN_AFTER_SINGLE_BACKSLASH.has(next)) {
                return `Unsupported escape sequence "\\${next}". Use "\\\\${next}" or remove it.`;
            }
        }
    }
    return '';
};

// Validate a POSIX character class starting at position i (the ':' after '[')
const checkPosixClass = (value: string, i: number): { error: string; newIndex: number } => {
    const end = value.indexOf(':]', i + 1);
    if (end === -1) return { error: 'Unterminated POSIX character class.', newIndex: i };
    const name = value.slice(i + 1, end);
    if (!POSIX_CLASSES.has(name)) return { error: `Unknown POSIX class [:${name}:].`, newIndex: i };
    return { error: '', newIndex: end + 1 };
};

// Validate a quantifier {m}, {m,}, or {m,n} starting at position i (the '{')
const checkQuantifier = (value: string, i: number): { error: string; newIndex: number } => {
    const close = value.indexOf('}', i + 1);
    if (close === -1) return { error: 'Unterminated quantifier "{...}".', newIndex: i };
    const body = value.slice(i + 1, close);
    if (!/^\d+(,\d*)?$/.test(body)) {
        return { error: `Invalid quantifier "{${body}}". Use {m}, {m,}, or {m,n}.`, newIndex: i };
    }
    const [mStr, nStr] = body.split(',');
    const m = Number(mStr);
    if (nStr?.length) {
        const n = Number(nStr);
        if (Number.isNaN(n) || m > n) return { error: `Invalid quantifier range "{${body}}".`, newIndex: i };
    }
    return { error: '', newIndex: close };
};

type StructureState = { paren: number; inBracket: boolean };

const updateParenBalance = (ch: string, state: StructureState): string => {
    if (state.inBracket) return '';
    if (ch === '(') state.paren++;
    else if (ch === ')') {
        state.paren--;
        if (state.paren < 0) return 'Unbalanced ")".';
    }
    return '';
};

const updateBracketState = (ch: string, state: StructureState): void => {
    if (ch === '[' && !state.inBracket) state.inBracket = true;
    else if (ch === ']' && state.inBracket) state.inBracket = false;
};

const tryPosixClassAt = (value: string, i: number, state: StructureState): { error: string; newIndex: number } => {
    if (!state.inBracket || value[i] !== ':' || i === 0 || value[i - 1] !== '[') return { error: '', newIndex: i };
    return checkPosixClass(value, i);
};

const tryQuantifierAt = (value: string, i: number, state: StructureState): { error: string; newIndex: number } => {
    if (state.inBracket || value[i] !== '{') return { error: '', newIndex: i };
    return checkQuantifier(value, i);
};

// 3) Structural checks for (), [], and {m,n}
const checkStructure = (value: string): string => {
    const state: StructureState = { paren: 0, inBracket: false };

    for (let i = 0; i < value.length; i++) {
        const ch = value[i];

        if (ch === '\\') {
            i++; // NOSONAR - skip the escaped char
            continue;
        }

        const parenError = updateParenBalance(ch, state);
        if (parenError) return parenError;

        updateBracketState(ch, state);

        const posix = tryPosixClassAt(value, i, state);
        if (posix.error) return posix.error;
        i = posix.newIndex; // NOSONAR - intentional for-loop skip-ahead

        const quant = tryQuantifierAt(value, i, state);
        if (quant.error) return quant.error;
        i = quant.newIndex; // NOSONAR - intentional for-loop skip-ahead
    }

    if (state.inBracket) return 'Unterminated character class "[...]"';
    if (state.paren !== 0) return 'Unbalanced parentheses "(...)"';
    return '';
};

// Count unescaped capturing groups in the pattern
const countCapturingGroups = (value: string): number => {
    let count = 0;
    for (let i = 0; i < value.length; i++) {
        if (value[i] === '\\') {
            i++;
            continue;
        }
        if (value[i] === '(') count++;
    }
    return count;
};

// 4) Backreferences \1..\9 must refer to existing capturing groups
const checkBackreferences = (value: string): string => {
    const groupCount = countCapturingGroups(value);
    for (let i = 0; i < value.length - 1; i++) {
        if (value[i] !== '\\') continue;
        let bs = 1;
        for (let j = i - 1; j >= 0 && value[j] === '\\'; j--) bs++;
        if (bs % 2 === 1) {
            const d = (value.codePointAt(i + 1) ?? 0) - 48; // '1'..'9' -> 1..9
            if (d >= 1 && d <= 9 && d > groupCount) {
                return `Backreference \\${d} refers to non-existent capturing group.`;
            }
        }
    }
    return '';
};

export const validatePostgresPosixRegex = (value: string): string => {
    if (!value) return '';

    return (
        checkJsParse(value) ||
        checkForbiddenTokens(value) ||
        checkForbiddenEscapes(value) ||
        checkStructure(value) ||
        checkBackreferences(value)
    );
};

export const validateIso8601Duration = () => (value: unknown) => {
    if (value === undefined || value === null) return undefined;
    if (typeof value !== 'string') return 'Value must be a valid ISO 8601 duration (e.g., PT1H)';
    const trimmed = value.trim();
    if (!trimmed) return undefined;
    if (trimmed === 'P' || trimmed.endsWith('T')) return 'Value must be a valid ISO 8601 duration (e.g., PT1H)';
    const datePart = /^P(\d+D)?(T.*)?$/.exec(trimmed);
    if (!datePart) return 'Value must be a valid ISO 8601 duration (e.g., PT1H)';
    const timePart = datePart[2];
    if (!timePart) return undefined;
    return /^T(\d+H)?(\d+M)?(\d+(?:\.\d+)?S)?$/.test(timePart) ? undefined : 'Value must be a valid ISO 8601 duration (e.g., PT1H)';
};

const NTP_FQDN_LABEL_REGEX = /^[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?$/;
const NTP_FQDN_TLD_REGEX = /^[a-zA-Z]{2,}$/;
const NTP_SIMPLE_HOST_REGEX = /^[a-zA-Z0-9-]+$/;
const NTP_IPV4_REGEX = /^\d{1,3}(?:\.\d{1,3}){3}$/;

const isValidFqdn = (s: string): boolean => {
    const labels = s.split('.');
    if (labels.length < 2) return false;
    const tld = labels.at(-1);
    if (!tld || !NTP_FQDN_TLD_REGEX.test(tld)) return false;
    return labels.slice(0, -1).every((l) => NTP_FQDN_LABEL_REGEX.test(l));
};

const isValidNtpServer = (s: string): boolean =>
    isValidFqdn(s) || NTP_SIMPLE_HOST_REGEX.test(s) || (NTP_IPV4_REGEX.test(s) && s.split('.').every((p) => Number(p) <= 255));

export const validateNtpServer = () => (value: string | undefined) => {
    if (!value) return undefined;
    const trimmed = value.trim();
    if (!trimmed) return undefined;
    return isValidNtpServer(trimmed) ? undefined : 'Value must be a valid NTP server address (IP or hostname)';
};

export const validateNtpServers = () => (value: string | string[] | undefined) => {
    if (!value) return undefined;
    const servers = Array.isArray(value) ? value : value.split(',').map((s) => s.trim());
    if (servers.length === 0 || (servers.length === 1 && servers[0] === '')) return undefined;

    const invalid = servers.filter((s) => !isValidNtpServer(s));
    if (invalid.length > 0) {
        return `Value must be a comma-separated list of valid NTP server addresses (IP or hostname)`;
    }
    return undefined;
};
