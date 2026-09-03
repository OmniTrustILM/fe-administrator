/**
 * Strict JSON parsing for values Core parses stricter than `JSON.parse`. Two well-formedness
 * defects `JSON.parse` accepts silently are rejected here because the backend rejects them at
 * submit, and one of them corrupts the value before it is even sent:
 *
 *  - duplicate object keys — `{"integer":1,"integer":2}` collapses to one key and would encode `2`;
 *  - trailing content after the value.
 *
 * The parser is a plain recursive descent over the JSON grammar, so the error messages can point at
 * the offending position instead of rethrowing an engine-specific `JSON.parse` message.
 */

const WHITESPACE = new Set([' ', '\t', '\n', '\r']);

class StrictJsonError extends Error {}

class Parser {
    private pos = 0;

    constructor(private readonly text: string) {}

    parse(): unknown {
        this.skipWhitespace();
        const value = this.parseValue();
        this.skipWhitespace();
        if (this.pos < this.text.length) {
            throw new StrictJsonError(`Unexpected trailing content after the value at position ${this.pos + 1}.`);
        }
        return value;
    }

    private fail(message: string): never {
        throw new StrictJsonError(`${message} at position ${this.pos + 1}.`);
    }

    private skipWhitespace(): void {
        while (this.pos < this.text.length && WHITESPACE.has(this.text[this.pos])) this.pos++;
    }

    private peek(): string | undefined {
        return this.text[this.pos];
    }

    private expect(char: string): void {
        if (this.text[this.pos] !== char) {
            this.fail(`Expected "${char}"`);
        }
        this.pos++;
    }

    private parseValue(): unknown {
        const c = this.peek();
        switch (c) {
            case undefined:
                return this.fail('Unexpected end of input');
            case '{':
                return this.parseObject();
            case '[':
                return this.parseArray();
            case '"':
                return this.parseString();
            case 't':
                return this.parseLiteral('true', true);
            case 'f':
                return this.parseLiteral('false', false);
            case 'n':
                return this.parseLiteral('null', null);
            default:
                return this.parseNumber();
        }
    }

    private parseObject(): Record<string, unknown> {
        this.expect('{');
        // Null prototype: on a plain object a "__proto__" key would go through the prototype setter
        // instead of becoming an own property — bypassing the duplicate-key check and hiding its
        // value from Object.entries (e.g. a remote $ref nested under it).
        const result: Record<string, unknown> = Object.create(null);
        this.skipWhitespace();
        if (this.peek() === '}') {
            this.pos++;
            return result;
        }
        while (true) {
            this.skipWhitespace();
            if (this.peek() !== '"') this.fail('Expected a string key');
            const keyStart = this.pos;
            const key = this.parseString();
            if (Object.hasOwn(result, key)) {
                throw new StrictJsonError(`Duplicate key "${key}" at position ${keyStart + 1}.`);
            }
            this.skipWhitespace();
            this.expect(':');
            this.skipWhitespace();
            result[key] = this.parseValue();
            this.skipWhitespace();
            const next = this.peek();
            if (next === ',') {
                this.pos++;
                continue;
            }
            if (next === '}') {
                this.pos++;
                return result;
            }
            this.fail('Expected "," or "}"');
        }
    }

    private parseArray(): unknown[] {
        this.expect('[');
        const result: unknown[] = [];
        this.skipWhitespace();
        if (this.peek() === ']') {
            this.pos++;
            return result;
        }
        while (true) {
            this.skipWhitespace();
            result.push(this.parseValue());
            this.skipWhitespace();
            const next = this.peek();
            if (next === ',') {
                this.pos++;
                continue;
            }
            if (next === ']') {
                this.pos++;
                return result;
            }
            this.fail('Expected "," or "]"');
        }
    }

    private parseString(): string {
        this.expect('"');
        let result = '';
        while (true) {
            const c = this.text[this.pos];
            if (c === undefined) this.fail('Unterminated string');
            if (c === '"') {
                this.pos++;
                return result;
            }
            if (c === '\\') {
                this.pos++;
                const esc = this.text[this.pos];
                switch (esc) {
                    case '"':
                    case '\\':
                    case '/':
                        result += esc;
                        break;
                    case 'b':
                        result += '\b';
                        break;
                    case 'f':
                        result += '\f';
                        break;
                    case 'n':
                        result += '\n';
                        break;
                    case 'r':
                        result += '\r';
                        break;
                    case 't':
                        result += '\t';
                        break;
                    case 'u': {
                        const hex = this.text.slice(this.pos + 1, this.pos + 5);
                        if (!/^[0-9a-fA-F]{4}$/.test(hex)) this.fail('Invalid unicode escape');
                        result += String.fromCodePoint(Number.parseInt(hex, 16));
                        this.pos += 4;
                        break;
                    }
                    default:
                        this.fail('Invalid escape sequence');
                }
                this.pos++;
                continue;
            }
            // JSON forbids raw control characters inside strings.
            if ((c.codePointAt(0) ?? 0) < 0x20) this.fail('Unescaped control character in string');
            result += c;
            this.pos++;
        }
    }

    private parseNumber(): number {
        const match = /^-?(?:0|[1-9]\d*)(?:\.\d+)?(?:[eE][+-]?\d+)?/.exec(this.text.slice(this.pos));
        if (!match) this.fail('Unexpected character');
        this.pos += match[0].length;
        return Number(match[0]);
    }

    private parseLiteral<T>(literal: string, value: T): T {
        if (this.text.startsWith(literal, this.pos)) {
            this.pos += literal.length;
            return value;
        }
        this.fail('Unexpected character');
    }
}

export interface StrictJsonResult {
    value?: unknown;
    error?: string;
}

/** Parse `text` as a single strict JSON document; `error` is set when it is not one. */
export function parseStrictJson(text: string): StrictJsonResult {
    try {
        return { value: new Parser(text).parse() };
    } catch (error) {
        if (error instanceof StrictJsonError) return { error: error.message };
        throw error;
    }
}

/**
 * Well-formedness error for a structural ASN.1 JSON tree entered as an extension value (a value
 * starting with `{` after trimming). Schema conformance is Core's job; this only catches what would
 * otherwise be rejected at submit with no field-level feedback.
 */
export function getExtensionJsonTreeError(text: string): string | undefined {
    const { error } = parseStrictJson(text.trim());
    return error;
}

/** A `$ref` pointing outside the document — Core refuses remote references in an inline schema. */
function findRemoteRef(value: unknown): string | undefined {
    if (Array.isArray(value)) {
        for (const item of value) {
            const found = findRemoteRef(item);
            if (found) return found;
        }
        return undefined;
    }
    if (value && typeof value === 'object') {
        for (const [key, entry] of Object.entries(value)) {
            if (key === '$ref' && typeof entry === 'string' && !entry.startsWith('#')) {
                return entry;
            }
            const found = findRemoteRef(entry);
            if (found) return found;
        }
    }
    return undefined;
}

export const JSON_SCHEMA_2020_12_DIALECT = 'https://json-schema.org/draft/2020-12/schema';

/**
 * Client-side validity of an inline JSON Schema document (draft 2020-12), mirroring the rules Core
 * enforces at save so the rejection is caught in the form: the document must be well-formed JSON, an
 * object (or a boolean schema), carry no `$schema` other than draft 2020-12, and no remote `$ref`.
 * An empty string is not an error here — required-ness is the caller's rule.
 */
export function getJsonSchemaDocumentError(text: string): string | undefined {
    const trimmed = text.trim();
    if (!trimmed) return undefined;
    const { value, error } = parseStrictJson(trimmed);
    if (error) return error;
    if (typeof value === 'boolean') return undefined;
    if (value === null || typeof value !== 'object' || Array.isArray(value)) {
        return 'A JSON Schema document must be an object (or a boolean schema).';
    }
    const dialect = (value as Record<string, unknown>).$schema;
    if (dialect !== undefined && dialect !== JSON_SCHEMA_2020_12_DIALECT) {
        return `Only JSON Schema draft 2020-12 is supported; leave $schema out or set it to ${JSON_SCHEMA_2020_12_DIALECT}.`;
    }
    const remoteRef = findRemoteRef(value);
    if (remoteRef) {
        return `Remote $ref is not allowed in an inline schema (found "${remoteRef}"); only local "#/..." references are supported.`;
    }
    return undefined;
}
