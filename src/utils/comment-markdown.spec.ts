import { describe, expect, test } from 'vitest';
import { COMMENT_BODY_MAX_LENGTH, renderCommentMarkdown } from './comment-markdown';

const render = (source: string) => renderCommentMarkdown(source);

/** Parses the rendered HTML so assertions run against the DOM the browser would build, not against string shapes. */
const toDom = (source: string) => {
    const container = document.createElement('div');
    container.innerHTML = render(source);
    return container;
};

describe('renderCommentMarkdown: allowed subset', () => {
    test('renders paragraphs, line breaks and emphasis', () => {
        const dom = toDom('first line\nsecond line\n\n**bold** _em_ ~~gone~~');
        expect(dom.querySelectorAll('p')).toHaveLength(2);
        expect(dom.querySelector('br')).not.toBeNull();
        expect(dom.querySelector('strong')?.textContent).toBe('bold');
        expect(dom.querySelector('em')?.textContent).toBe('em');
        expect(dom.querySelector('del')?.textContent).toBe('gone');
    });

    test('renders inline and fenced code without a language class', () => {
        const dom = toDom('use `x`\n\n```ts\nconst a = 1;\n```');
        expect(dom.querySelector('p > code')?.textContent).toBe('x');
        const block = dom.querySelector('pre > code');
        expect(block?.textContent).toBe('const a = 1;');
        expect(block?.getAttribute('class')).toBeNull();
    });

    test('renders lists, blockquotes and tables', () => {
        const dom = toDom('- a\n- b\n\n1. one\n\n> quoted\n\n| h1 | h2 |\n| --- | --- |\n| c1 | c2 |');
        expect(dom.querySelectorAll('ul > li')).toHaveLength(2);
        expect(dom.querySelectorAll('ol > li')).toHaveLength(1);
        expect(dom.querySelector('blockquote')?.textContent?.trim()).toBe('quoted');
        expect(dom.querySelector('table thead th')?.textContent).toBe('h1');
        expect(dom.querySelector('table tbody td')?.textContent).toBe('c1');
        expect(dom.querySelector('th')?.getAttribute('align')).toBeNull();
    });

    test.each(['https://example.com/a?b=1', 'http://example.com', 'mailto:someone@example.com'])('keeps %s links', (href) => {
        const link = toDom(`[go](${href})`).querySelector('a');
        expect(link?.getAttribute('href')).toBe(href);
        expect(link?.textContent).toBe('go');
    });

    test('adds rel and target to links from the renderer, never from input', () => {
        const link = toDom('[go](https://example.com)').querySelector('a');
        expect(link?.getAttribute('rel')).toBe('noopener noreferrer nofollow');
        expect(link?.getAttribute('target')).toBe('_blank');
        expect(link?.attributes).toHaveLength(3);
    });

    test('renders autolinks', () => {
        expect(toDom('see https://example.com now').querySelector('a')?.getAttribute('href')).toBe('https://example.com');
    });

    test('exposes the body limit the API enforces', () => {
        expect(COMMENT_BODY_MAX_LENGTH).toBe(65536);
    });
});

describe('renderCommentMarkdown: page structure', () => {
    test('demotes headings by two levels and caps at h6', () => {
        const dom = toDom('# one\n\n## two\n\n### three\n\n#### four\n\n##### five\n\n###### six');
        expect(dom.querySelector('h1, h2')).toBeNull();
        expect(dom.querySelector('h3')?.textContent).toBe('one');
        expect(dom.querySelector('h4')?.textContent).toBe('two');
        expect(dom.querySelector('h5')?.textContent).toBe('three');
        expect(Array.from(dom.querySelectorAll('h6')).map((h) => h.textContent)).toEqual(['four', 'five', 'six']);
    });

    test('does not generate heading anchors or ids', () => {
        const dom = toDom('# Heading with words');
        expect(dom.querySelector('[id]')).toBeNull();
        expect(dom.querySelector('h3 a')).toBeNull();
    });

    test('does not emit id, class or style on any element', () => {
        const dom = toDom('# h\n\n```js\nx\n```\n\n| a |\n|:--|\n| b |\n\n[l](https://e.com)');
        expect(dom.querySelector('[id], [class], [style]')).toBeNull();
    });
});

describe('renderCommentMarkdown: hostile payloads', () => {
    test.each([
        ['<script>alert(1)</script>', 'script'],
        ['<style>body{display:none}</style>', 'style'],
        ['<img src=x onerror=alert(1)>', 'img'],
        ['<iframe src="https://evil.example"></iframe>', 'iframe'],
        ['<object data="https://evil.example"></object>', 'object'],
        ['<embed src="https://evil.example">', 'embed'],
        ['<form action="https://evil.example"><input name=x><button>go</button></form>', 'form, input, button'],
        ['<svg onload=alert(1)><circle r=1/></svg>', 'svg'],
        ['<math><mi xlink:href="javascript:alert(1)">x</mi></math>', 'math'],
        ['<video src="https://evil.example/v.mp4" autoplay></video>', 'video'],
        ['<link rel=stylesheet href="https://evil.example/x.css">', 'link'],
        ['<meta http-equiv=refresh content="0;url=https://evil.example">', 'meta'],
        ['<base href="https://evil.example/">', 'base'],
        ['<a href="https://e.com" onclick="alert(1)">x</a>', 'a[onclick]'],
        ['<div id="main" class="x" style="position:fixed">x</div>', 'div, [id], [class], [style]'],
        ['<details open ontoggle=alert(1)>x</details>', 'details'],
    ])('neutralizes raw HTML %s', (payload, selector) => {
        const dom = toDom(payload);
        expect(dom.querySelector(selector)).toBeNull();
        expect(dom.querySelector('[onerror], [onload], [onclick], [ontoggle]')).toBeNull();
    });

    test('raw HTML does not survive as markup: it is shown as literal text', () => {
        const dom = toDom('before <b>bold</b> <script>alert(1)</script> after');
        expect(dom.querySelector('b, script')).toBeNull();
        expect(dom.textContent).toContain('<b>bold</b>');
    });

    test('inline HTML inside emphasis is inert', () => {
        const dom = toDom('**<img src=x onerror=alert(1)>**');
        expect(dom.querySelector('img')).toBeNull();
        expect(dom.querySelector('strong')?.textContent).toContain('<img');
    });

    test('markdown images are reduced to their alt text', () => {
        const dom = toDom('![tracker](https://evil.example/pixel.gif)');
        expect(dom.querySelector('img')).toBeNull();
        expect(dom.textContent?.trim()).toBe('tracker');
    });

    test.each([
        'javascript:alert(1)',
        'JAVASCRIPT:alert(1)',
        'JaVaScRiPt:alert(1)',
        ' javascript:alert(1)',
        'java\tscript:alert(1)',
        'java\nscript:alert(1)',
        '&#106;avascript:alert(1)',
        '&#x6A;avascript:alert(1)',
        '&#0000106;avascript:alert(1)',
        '&#106avascript:alert(1)',
        'javascript&colon;alert(1)',
        'jav&#x09;ascript:alert(1)',
        'data:text/html;base64,PHNjcmlwdD5hbGVydCgxKTwvc2NyaXB0Pg==',
        'vbscript:msgbox(1)',
        'file:///etc/passwd',
        'ftp://evil.example/x',
        '//evil.example/x',
        'blob:https://evil.example/x',
        'ws://evil.example',
    ])('drops hostile link href %j while keeping the link text', (href) => {
        const dom = toDom(`[click me](${href})`);
        const link = dom.querySelector('a');
        if (link) {
            expect(link.getAttribute('href') ?? '').not.toMatch(/^\s*(javascript|data|vbscript|file|ftp|blob|ws)/i);
            expect(link.getAttribute('href') ?? '').not.toMatch(/^\/\//);
        }
        expect(dom.textContent).toContain('click me');
        expect(dom.innerHTML).not.toMatch(/javascript:/i);
    });

    test('hostile reference-style links are neutralized', () => {
        const dom = toDom('[click][ref]\n\n[ref]: javascript:alert(1)');
        expect(dom.querySelector('a[href^="javascript" i]')).toBeNull();
        expect(dom.innerHTML).not.toMatch(/javascript:/i);
    });

    test('hostile autolinks are neutralized', () => {
        const dom = toDom('<javascript:alert(1)>');
        expect(dom.querySelector('a')).toBeNull();
    });

    test('link title text is not accepted as an attribute', () => {
        const link = toDom('[x](https://e.com "title text")').querySelector('a');
        expect(link?.getAttribute('title')).toBeNull();
    });

    test('rel and target in the source cannot override the renderer', () => {
        const dom = toDom('<a href="https://e.com" target="_top" rel="opener">x</a>');
        expect(dom.querySelector('a')).toBeNull();
    });

    test('a comment cannot break out of the panel with unbalanced markup', () => {
        const dom = toDom('</div></section><section id="hijack">x');
        expect(dom.querySelector('section, div')).toBeNull();
        expect(dom.textContent).toContain('</div>');
    });

    test('code blocks show hostile content verbatim', () => {
        const dom = toDom('```\n<script>alert(1)</script>\n```');
        expect(dom.querySelector('script')).toBeNull();
        expect(dom.querySelector('pre > code')?.textContent).toBe('<script>alert(1)</script>');
    });

    test('tables cannot carry attributes', () => {
        const dom = toDom('| a |\n|:--:|\n| b |');
        expect(dom.querySelector('table [align], table [style], table [width]')).toBeNull();
    });

    test('empty input renders nothing', () => {
        expect(render('')).toBe('');
    });
});
