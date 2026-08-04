import { describe, expect, test } from 'vitest';

import { escapeUnsupportedMarkup } from './alertMessage';

// Only the escaping pass is asserted here: happy-dom's HTML parser mangles input that a browser
// handles correctly, so DOMPurify's half of sanitizeAlertMessage is covered by Alerts.spec.tsx.
describe('escapeUnsupportedMarkup', () => {
    test('escapes angle-bracketed identifiers that are not markup', () => {
        expect(escapeUnsupportedMarkup('Certificate not imported, alias <cert-alias> already exists')).toBe(
            'Certificate not imported, alias &lt;cert-alias> already exists',
        );
        expect(escapeUnsupportedMarkup('Push failed to <host.example.com>: timeout')).toBe('Push failed to &lt;host.example.com>: timeout');
    });

    test('leaves supported formatting tags untouched', () => {
        expect(escapeUnsupportedMarkup('Value <b>bold</b> kept')).toBe('Value <b>bold</b> kept');
        expect(escapeUnsupportedMarkup('First<br />second')).toBe('First<br />second');
        expect(escapeUnsupportedMarkup('<p>One</p><ul><li>Two</li></ul>')).toBe('<p>One</p><ul><li>Two</li></ul>');
        expect(escapeUnsupportedMarkup('<SPAN>Upper</SPAN>')).toBe('<SPAN>Upper</SPAN>');
    });

    test('leaves attributes on supported tags for the sanitizer to strip', () => {
        expect(escapeUnsupportedMarkup('<span onclick="steal()">Critical</span>')).toBe('<span onclick="steal()">Critical</span>');
    });

    test('escapes tags whose name only starts like a supported one', () => {
        expect(escapeUnsupportedMarkup('<b-tag>')).toBe('&lt;b-tag>');
        expect(escapeUnsupportedMarkup('<i.e. something>')).toBe('&lt;i.e. something>');
        expect(escapeUnsupportedMarkup('<pre>kept</pre>')).toBe('<pre>kept</pre>');
    });

    test('escapes hostile markup instead of leaving it for the parser to swallow', () => {
        expect(escapeUnsupportedMarkup('<script>window.__xss=true</script>Visible text')).toBe(
            '&lt;script>window.__xss=true&lt;/script>Visible text',
        );
        expect(escapeUnsupportedMarkup('<img src=x onerror=alert(1)>')).toBe('&lt;img src=x onerror=alert(1)>');
    });

    test('escapes a lone comparison operator', () => {
        expect(escapeUnsupportedMarkup('Compare a < b and c > d')).toBe('Compare a &lt; b and c > d');
    });

    test('escapes a trailing unclosed bracket', () => {
        expect(escapeUnsupportedMarkup('Truncated message <')).toBe('Truncated message &lt;');
    });

    test('returns text without brackets unchanged', () => {
        expect(escapeUnsupportedMarkup('')).toBe('');
        expect(escapeUnsupportedMarkup('Plain message')).toBe('Plain message');
    });
});
