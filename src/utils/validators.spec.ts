import { describe, expect, test } from 'vitest';
import {
    validateRequired,
    validatePattern,
    validateInteger,
    validatePositiveInteger,
    validateNonZeroInteger,
    validateFloat,
    validateEmail,
    validateLength,
    validateDuration,
    composeValidators,
    validateRoutelessUrl,
    validateUrlWithRoute,
    validateCustomIp,
    validateAlphaNumericWithoutAccents,
    validateAlphaNumericWithSpecialChars,
    validateOid,
    validateOidCode,
    validateQuartzCronExpression,
    validatePostgresPosixRegex,
    validateIso8601Duration,
    validateNtpServer,
    validateNtpServers,
} from './validators';

const REQUIRED_FIELD_MSG = 'Required Field';
const INVALID_IP_MSG = 'Value must be a valid ip address';
const INVALID_OID_MSG = 'Must be a dot-separated numeric OID (e.g. 1.2.840.113549.1.1.11)';
const UNSUPPORTED_REGEX_TOKEN_MSG = 'Unsupported regex token';

describe('validators', () => {
    describe('validateRequired', () => {
        test('should return undefined for non-empty value', () => {
            expect(validateRequired()('test')).toBeUndefined();
            expect(validateRequired()(123)).toBeUndefined();
            expect(validateRequired()(true)).toBeUndefined();
            expect(validateRequired()([1, 2])).toBeUndefined();
        });

        test('should return error for empty value', () => {
            expect(validateRequired()('')).toBe(REQUIRED_FIELD_MSG);
            expect(validateRequired()(undefined)).toBe(REQUIRED_FIELD_MSG);
            expect(validateRequired()(null)).toBe(REQUIRED_FIELD_MSG);
            expect(validateRequired()([])).toBe(REQUIRED_FIELD_MSG);
        });

        test('should accept false as valid', () => {
            expect(validateRequired()(false)).toBeUndefined();
        });
    });

    describe('validatePattern', () => {
        test('should return undefined when value matches pattern', () => {
            const validator = validatePattern(/^[a-z]+$/);
            expect(validator('abc')).toBeUndefined();
        });

        test('should return default message when value does not match', () => {
            const validator = validatePattern(/^[a-z]+$/);
            expect(validator('ABC')).toContain('Value must conform');
        });

        test('should return custom message when provided', () => {
            const validator = validatePattern(/^\d+$/, 'Must be digits only');
            expect(validator('abc')).toBe('Must be digits only');
        });

        test('should return undefined for empty value', () => {
            const validator = validatePattern(/^[a-z]+$/);
            expect(validator('')).toBeUndefined();
            expect(validator(undefined)).toBeUndefined();
        });

        test('should validate each item in an array', () => {
            const validator = validatePattern(/^\d+$/);
            expect(validator(['1', '2', '3'])).toBeUndefined();
            expect(validator(['1', 'abc', '3'])).toBeTruthy();
        });

        test('should unwrap {label, value} object before validating', () => {
            const validator = validatePattern(/^\d+$/);
            expect(validator({ label: '123', value: { data: '123' } })).toBeUndefined();
            expect(validator({ label: 'abc', value: { data: 'abc' } })).toBeTruthy();
        });

        test('should unwrap {data, reference} attribute content object before validating', () => {
            const validator = validatePattern(/^\d+$/);
            expect(validator({ data: '2048', reference: 'RSA_2048' })).toBeUndefined();
            expect(validator({ data: 'abc', reference: 'LABEL' })).toBeTruthy();
        });

        test('should return undefined for null value', () => {
            const validator = validatePattern(/^\d+$/);
            expect(validator(null)).toBeUndefined();
        });

        test('should return undefined for an empty array', () => {
            const validator = validatePattern(/^\d+$/);
            expect(validator([])).toBeUndefined();
        });

        test('should unwrap {label, value} objects inside an array', () => {
            const validator = validatePattern(/^\d+$/);
            expect(
                validator([
                    { label: '1', value: { data: '1' } },
                    { label: '2', value: { data: '2' } },
                ]),
            ).toBeUndefined();
            expect(
                validator([
                    { label: '1', value: { data: '1' } },
                    { label: 'x', value: { data: 'x' } },
                ]),
            ).toBeTruthy();
        });
    });

    describe('validateInteger', () => {
        test('should accept valid integers', () => {
            expect(validateInteger()('123')).toBeUndefined();
            expect(validateInteger()('-456')).toBeUndefined();
            expect(validateInteger()('0')).toBeUndefined();
        });

        test('should reject non-integers', () => {
            expect(validateInteger()('12.3')).toBe('Value must be an integer');
            expect(validateInteger()('abc')).toBe('Value must be an integer');
        });
    });

    describe('validatePositiveInteger', () => {
        test('should accept positive integers', () => {
            expect(validatePositiveInteger()('123')).toBeUndefined();
            expect(validatePositiveInteger()('0')).toBeUndefined();
        });

        test('should reject negatives and non-integers', () => {
            expect(validatePositiveInteger()('-1')).toBe('Value must be a positive integer');
            expect(validatePositiveInteger()('12.5')).toBe('Value must be a positive integer');
        });
    });

    describe('validateNonZeroInteger', () => {
        test('should accept non-zero integers', () => {
            expect(validateNonZeroInteger()('123')).toBeUndefined();
            expect(validateNonZeroInteger()('-5')).toBeUndefined();
        });

        test('should reject zero and non-integers', () => {
            expect(validateNonZeroInteger()('0')).toBe('Value must be a non-zero integer');
            expect(validateNonZeroInteger()('12.5')).toBe('Value must be a non-zero integer');
        });
    });

    describe('validateDuration', () => {
        test('should accept valid duration strings', () => {
            expect(validateDuration()('1d')).toBeUndefined();
            expect(validateDuration()('2h 30m')).toBeUndefined();
            expect(validateDuration()('1s')).toBeUndefined();
        });

        test('should accept empty value', () => {
            expect(validateDuration()('')).toBeUndefined();
            expect(validateDuration()('   ')).toBeUndefined();
        });

        test('should accept undefined value', () => {
            expect(validateDuration()(undefined as unknown as string)).toBeUndefined();
        });

        test('should reject invalid duration', () => {
            expect(validateDuration()('invalid')).toBeTruthy();
            expect(validateDuration()('1x')).toBeTruthy();
        });

        test('should respect custom denominations', () => {
            const validator = validateDuration(['h', 'm']);
            expect(validator('1h 30m')).toBeUndefined();
            expect(validator('1d')).toBeTruthy();
        });

        test('should produce an error mentioning the configured denominations', () => {
            const result = validateDuration(['h', 'm'])('invalid');
            expect(result).toContain('0h');
            expect(result).toContain('0m');
        });
    });

    describe('validateFloat', () => {
        test('should accept valid floats', () => {
            expect(validateFloat()('123.45')).toBeUndefined();
            expect(validateFloat()('-0.5')).toBeUndefined();
            expect(validateFloat()('123')).toBeUndefined();
        });

        test('should reject invalid floats', () => {
            expect(validateFloat()('abc')).toBe('Value must be a float without an exponent.');
        });
    });

    describe('validateEmail', () => {
        test('should accept valid emails', () => {
            expect(validateEmail()('test@example.com')).toBeUndefined();
            expect(validateEmail()('user.name@domain.co')).toBeUndefined();
        });

        test('should reject invalid emails', () => {
            expect(validateEmail()('invalid')).toBe('Value must be a valid email address');
            expect(validateEmail()('missing@')).toBe('Value must be a valid email address');
        });
    });

    describe('validateLength', () => {
        test('should accept value within range', () => {
            const validator = validateLength(2, 5);
            expect(validator('ab')).toBeUndefined();
            expect(validator('abcde')).toBeUndefined();
        });

        test('should accept empty or undefined value', () => {
            const validator = validateLength(2, 5);
            expect(validator('')).toBeUndefined();
            expect(validator(undefined)).toBeUndefined();
        });

        test('should reject value too short', () => {
            const validator = validateLength(2, 5);
            expect(validator('a')).toBe('Value must be between 2 and 5 characters long');
        });

        test('should reject value too long', () => {
            const validator = validateLength(2, 5);
            expect(validator('abcdef')).toBe('Value must be between 2 and 5 characters long');
        });
    });

    describe('composeValidators', () => {
        test('should return first error from validators', () => {
            const validator = composeValidators(validateRequired(), validateEmail());
            expect(validator('')).toBe(REQUIRED_FIELD_MSG);
            expect(validator('invalid')).toBe('Value must be a valid email address');
            expect(validator('test@example.com')).toBeUndefined();
        });

        test('should filter non-function validators', () => {
            const validator = composeValidators(validateRequired(), undefined, null, validateEmail());
            expect(validator('test@example.com')).toBeUndefined();
        });

        test('should return undefined when no validators are passed', () => {
            expect(composeValidators()('anything')).toBeUndefined();
        });

        test('should return undefined when all validators pass', () => {
            const validator = composeValidators(validateRequired(), validateLength(1, 20));
            expect(validator('hello')).toBeUndefined();
        });

        test('should pass value, allValues and fieldState through to each validator', () => {
            const captured: Array<[unknown, unknown, unknown]> = [];
            const spy = (value: unknown, allValues: unknown, fieldState: unknown) => {
                captured.push([value, allValues, fieldState]);
                return undefined;
            };
            const allValues = { other: 42 };
            const fieldState = { touched: true };
            composeValidators(spy, spy)('v', allValues, fieldState);
            expect(captured).toEqual([
                ['v', allValues, fieldState],
                ['v', allValues, fieldState],
            ]);
        });
    });

    describe('validateRoutelessUrl', () => {
        test('should accept valid urls', () => {
            expect(validateRoutelessUrl()('localhost:8443')).toBeUndefined();
            expect(validateRoutelessUrl()('https://example.com')).toBeUndefined();
        });

        test('should accept empty value', () => {
            expect(validateRoutelessUrl()('')).toBeUndefined();
        });

        test('should reject invalid urls', () => {
            expect(validateRoutelessUrl()('https://example.com/path')).toBeTruthy();
        });
    });

    describe('validateUrlWithRoute', () => {
        test('should accept empty value', () => {
            expect(validateUrlWithRoute('')).toBeUndefined();
        });

        test('should accept undefined value', () => {
            expect(validateUrlWithRoute(undefined as unknown as string)).toBeUndefined();
        });

        test('should accept valid url with path', () => {
            expect(validateUrlWithRoute('https://example.com/path')).toBeUndefined();
        });

        test('should accept url without protocol', () => {
            expect(validateUrlWithRoute('example.com/path')).toBeUndefined();
        });

        test('should reject invalid url', () => {
            expect(validateUrlWithRoute('invalid url with spaces')).toBe('Value must be a valid url');
        });
    });

    describe('validateAlphaNumericWithSpecialChars', () => {
        test('should accept valid strings with spaces and separators', () => {
            expect(validateAlphaNumericWithSpecialChars()('John Doe')).toBeUndefined();
            expect(validateAlphaNumericWithSpecialChars()(`O'Brien`)).toBeUndefined();
        });

        test('should accept accented Latin characters', () => {
            expect(validateAlphaNumericWithSpecialChars()('Jáchym')).toBeUndefined();
            expect(validateAlphaNumericWithSpecialChars()('Žluťoučký kůň')).toBeUndefined();
        });

        test('should reject invalid format', () => {
            expect(validateAlphaNumericWithSpecialChars()('invalid@char')).toBeTruthy();
        });
    });

    describe('validateCustomIp', () => {
        test('should accept valid IP', () => {
            expect(validateCustomIp('192.168.1.1')).toBeUndefined();
            expect(validateCustomIp('255.255.255.255')).toBeUndefined();
            expect(validateCustomIp('0.0.0.0')).toBeUndefined();
        });

        test('should accept empty value', () => {
            expect(validateCustomIp('')).toBeUndefined();
            expect(validateCustomIp(undefined as unknown as string)).toBeUndefined();
        });

        test('should reject invalid IP', () => {
            expect(validateCustomIp('256.1.1.1')).toBe(INVALID_IP_MSG);
            expect(validateCustomIp('not-an-ip')).toBe(INVALID_IP_MSG);
            expect(validateCustomIp('1.2.3')).toBe(INVALID_IP_MSG);
        });
    });

    describe('validateAlphaNumericWithoutAccents', () => {
        test('should accept alphanumeric with allowed chars', () => {
            expect(validateAlphaNumericWithoutAccents()('abc123')).toBeUndefined();
            expect(validateAlphaNumericWithoutAccents()('test_id-1.value')).toBeUndefined();
        });

        test('should reject spaces', () => {
            expect(validateAlphaNumericWithoutAccents()('hello world')).toBeTruthy();
        });
    });

    describe('validateOid', () => {
        test('should accept valid OIDs starting with 0, 1 or 2', () => {
            expect(validateOid()('0.9.2342.19200300.100.1.1')).toBeUndefined();
            expect(validateOid()('1.2.840.113549.1.1.11')).toBeUndefined();
            expect(validateOid()('2.5.4.3')).toBeUndefined();
        });

        test('should reject OIDs with a first segment > 2', () => {
            expect(validateOid()('3.1.1')).toBe(INVALID_OID_MSG);
        });

        test('should reject non-numeric values', () => {
            expect(validateOid()('invalid')).toBe(INVALID_OID_MSG);
        });

        test('should reject a single-segment OID', () => {
            expect(validateOid()('1')).toBe(INVALID_OID_MSG);
        });

        test('should reject OIDs with leading zero in a non-first segment', () => {
            expect(validateOid()('1.01.2')).toBe(INVALID_OID_MSG);
        });
    });

    describe('validateOidCode', () => {
        test('should accept valid OID code', () => {
            expect(validateOidCode()('MyOID')).toBeUndefined();
            expect(validateOidCode()('OID-123')).toBeUndefined();
        });

        test('should reject invalid OID code', () => {
            expect(validateOidCode()('123')).toBe('Value must be a valid OID code');
        });
    });

    describe('validateQuartzCronExpression', () => {
        test('should accept empty value', () => {
            const validator = validateQuartzCronExpression();
            expect(validator('')).toBeUndefined();
        });
        test('should accept valid cron expression', () => {
            const validator = validateQuartzCronExpression();
            expect(validator('0 0 12 * * ?')).toBeUndefined();
        });
        test('should reject invalid cron with a string error message', () => {
            const validator = validateQuartzCronExpression();
            const result = validator('not cron');
            expect(result).toBeTruthy();
            expect(typeof result).toBe('string');
        });
        test('should join array error messages into a single string', () => {
            const validator = validateQuartzCronExpression();
            const result = validator('60 0 * * * ?');
            expect(typeof result).toBe('string');
            expect(result).toContain('Minute and Second');
        });
        test('should return a generic message when the cron validator throws', () => {
            const validator = validateQuartzCronExpression();
            expect(validator({} as unknown as string)).toBe('Unknown error, please check the cron expression.');
        });
        test('should unwrap {label, value} objects before validating the cron expression', () => {
            const validator = validateQuartzCronExpression();
            expect(validator({ label: 'noon', value: { data: '0 0 12 * * ?' } } as unknown as string)).toBeUndefined();
        });
    });

    describe('validatePostgresPosixRegex', () => {
        test('returns empty string for empty value', () => {
            expect(validatePostgresPosixRegex('')).toBe('');
        });

        test('returns empty string for valid simple pattern', () => {
            expect(validatePostgresPosixRegex('^[a-z]+$')).toBe('');
        });

        test('returns error for gross syntax error (stray backslash)', () => {
            const result = validatePostgresPosixRegex('abc\\');
            expect(result).toBeTruthy();
            expect(result).toContain('Invalid regex pattern');
        });

        test('returns empty string for valid pattern with balanced parens', () => {
            expect(validatePostgresPosixRegex('(abc)(def)')).toBe('');
        });

        test('returns error for forbidden lookahead token (?=', () => {
            const result = validatePostgresPosixRegex('abc(?=def)');
            expect(result).toBeTruthy();
            expect(result).toContain(UNSUPPORTED_REGEX_TOKEN_MSG);
        });

        test('returns error for forbidden non-capturing group (?:', () => {
            const result = validatePostgresPosixRegex('(?:abc)');
            expect(result).toBeTruthy();
            expect(result).toContain(UNSUPPORTED_REGEX_TOKEN_MSG);
        });

        test(String.raw`returns error for forbidden backslash sequence \Q`, () => {
            const result = validatePostgresPosixRegex(String.raw`\Qabc\E`);
            expect(result).toBeTruthy();
        });

        test(String.raw`returns error for forbidden single-backslash escape \Z`, () => {
            const result = validatePostgresPosixRegex(String.raw`abc\Z`);
            expect(result).toBeTruthy();
            expect(result).toContain('Unsupported escape sequence');
        });

        test('returns empty string for double-backslash (escaped backslash)', () => {
            expect(validatePostgresPosixRegex(String.raw`abc\\Z`)).toBe('');
        });

        test('returns error for unbalanced closing paren (caught by JS parse)', () => {
            expect(validatePostgresPosixRegex('abc)')).toBeTruthy();
        });

        test('returns error for unbalanced opening paren (caught by JS parse)', () => {
            expect(validatePostgresPosixRegex('(abc')).toBeTruthy();
        });

        test('returns error for unterminated character class (caught by JS parse)', () => {
            expect(validatePostgresPosixRegex('[abc')).toBeTruthy();
        });

        test('returns empty string for valid POSIX character class', () => {
            expect(validatePostgresPosixRegex('[[:alpha:]]')).toBe('');
            expect(validatePostgresPosixRegex('[[:digit:]]+')).toBe('');
        });

        test('returns error for unknown POSIX class', () => {
            const result = validatePostgresPosixRegex('[[:unknown:]]');
            expect(result).toBe('Unknown POSIX class [:unknown:].');
        });

        test('returns error for unterminated POSIX class', () => {
            const result = validatePostgresPosixRegex('[[:alpha]');
            expect(result).toBe('Unterminated POSIX character class.');
        });

        test('returns empty string for valid quantifier {m,n}', () => {
            expect(validatePostgresPosixRegex('a{2,5}')).toBe('');
            expect(validatePostgresPosixRegex('a{3}')).toBe('');
            expect(validatePostgresPosixRegex('a{2,}')).toBe('');
        });

        test('returns error for unterminated quantifier', () => {
            expect(validatePostgresPosixRegex('a{2')).toBe('Unterminated quantifier "{...}".');
        });

        test('returns error for invalid quantifier body', () => {
            const result = validatePostgresPosixRegex('a{m,n}');
            expect(result).toContain('Invalid quantifier');
        });

        test('returns error for invalid quantifier range where m > n (caught by JS parse)', () => {
            expect(validatePostgresPosixRegex('a{5,2}')).toBeTruthy();
        });

        test('returns empty string for valid backreference', () => {
            expect(validatePostgresPosixRegex(String.raw`(abc)\1`)).toBe('');
        });

        test('returns error for backreference to non-existent group', () => {
            const result = validatePostgresPosixRegex(String.raw`abc\1`);
            expect(result).toContain('Backreference');
            expect(result).toContain('non-existent capturing group');
        });

        test('returns empty string for complex valid POSIX pattern', () => {
            expect(validatePostgresPosixRegex(String.raw`^([[:alpha:]]+)\s[[:digit:]]{2,4}$`)).toBe('');
        });

        test('flags forbidden token preceded by an even number of backslashes', () => {
            // String.raw`\\\Q` is 4 chars: \, \, \, Q
            // The first two form an escaped backslash; the trailing \Q is unescaped and forbidden.
            const result = validatePostgresPosixRegex(String.raw`\\\Q`);
            expect(result).toBeTruthy();
            expect(result).toContain(UNSUPPORTED_REGEX_TOKEN_MSG);
        });

        test('ignores forbidden token preceded by an odd number of backslashes (escaped)', () => {
            // String.raw`a\\Q` is 4 chars: a, \, \, Q.
            // The forbidden seq "\Q" is at index 2, preceded by a single backslash -> escaped.
            // The pattern should NOT be flagged for the forbidden "\Q" token.
            expect(validatePostgresPosixRegex(String.raw`a\\Q`)).toBe('');
        });
    });

    describe('validateIso8601Duration', () => {
        test('should accept valid ISO 8601 durations', () => {
            expect(validateIso8601Duration()('PT1H')).toBeUndefined();
            expect(validateIso8601Duration()('P1DT12H')).toBeUndefined();
            expect(validateIso8601Duration()('PT10M30S')).toBeUndefined();
            expect(validateIso8601Duration()('PT0.5S')).toBeUndefined();
            expect(validateIso8601Duration()('PT1.5S')).toBeUndefined();
            expect(validateIso8601Duration()('PT10M0.5S')).toBeUndefined();
        });

        test('should accept empty value', () => {
            expect(validateIso8601Duration()('')).toBeUndefined();
            expect(validateIso8601Duration()(undefined)).toBeUndefined();
        });

        test('should reject invalid ISO 8601 durations', () => {
            expect(validateIso8601Duration()('1H')).toBe('Value must be a valid ISO 8601 duration (e.g., PT1H)');
            expect(validateIso8601Duration()('abc')).toBe('Value must be a valid ISO 8601 duration (e.g., PT1H)');
            expect(validateIso8601Duration()('P1DT')).toBe('Value must be a valid ISO 8601 duration (e.g., PT1H)');
            expect(validateIso8601Duration()('PT')).toBe('Value must be a valid ISO 8601 duration (e.g., PT1H)');
        });
    });

    describe('validateNtpServer', () => {
        test('should accept a valid hostname or IP', () => {
            expect(validateNtpServer()('pool.ntp.org')).toBeUndefined();
            expect(validateNtpServer()('time.google.com')).toBeUndefined();
            expect(validateNtpServer()('ntp')).toBeUndefined();
            expect(validateNtpServer()('127.0.0.1')).toBeUndefined();
        });

        test('should accept empty value', () => {
            expect(validateNtpServer()('')).toBeUndefined();
            expect(validateNtpServer()(undefined)).toBeUndefined();
        });

        test('should trim before validating', () => {
            expect(validateNtpServer()('  pool.ntp.org  ')).toBeUndefined();
        });

        test('should reject invalid values', () => {
            expect(validateNtpServer()('invalid@host')).toBe('Value must be a valid NTP server address (IP or hostname)');
            expect(validateNtpServer()('pool.ntp.org, time.google.com')).toBe('Value must be a valid NTP server address (IP or hostname)');
            expect(validateNtpServer()('999.999.999.999')).toBe('Value must be a valid NTP server address (IP or hostname)');
        });
    });

    describe('validateNtpServers', () => {
        test('should accept valid NTP servers list', () => {
            expect(validateNtpServers()('pool.ntp.org')).toBeUndefined();
            expect(validateNtpServers()('pool.ntp.org, 127.0.0.1, time.google.com')).toBeUndefined();
        });

        test('should accept empty value', () => {
            expect(validateNtpServers()('')).toBeUndefined();
            expect(validateNtpServers()(undefined)).toBeUndefined();
        });

        test('should reject invalid NTP servers', () => {
            expect(validateNtpServers()('invalid@host')).toBe(
                'Value must be a comma-separated list of valid NTP server addresses (IP or hostname)',
            );
            expect(validateNtpServers()('pool.ntp.org, invalid space')).toBe(
                'Value must be a comma-separated list of valid NTP server addresses (IP or hostname)',
            );
        });
    });
});
