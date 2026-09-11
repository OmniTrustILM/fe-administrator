import type { Page } from '@playwright/test';
import { LockTypeEnum } from 'types/user-interface';
import { expect, test } from '../../../playwright/ct-test';
import CommentPanelWithStore from './CommentPanelWithStore';

const KEY = 'certificates/obj-1';

const comment = (uuid: string, body: string, overrides: Record<string, unknown> = {}) => ({
    uuid,
    resource: 'certificates',
    objectUuid: 'obj-1',
    author: { uuid: 'user-1', name: 'alice' },
    createdAt: '2026-08-27T10:00:00Z',
    body,
    ...overrides,
});

const threadsPage = (comments: Array<{ uuid: string }>, overrides: Record<string, unknown> = {}) => ({
    comments,
    totalItems: comments.length,
    totalPages: 1,
    pageNumber: 1,
    itemsPerPage: 10,
    firstPage: 1,
    sortDirection: 'asc',
    isFetching: false,
    isPosting: false,
    ...overrides,
});

/** A page as the API would answer it, for delivering to the store through the wrapper's controls. */
const apiPage = (comments: Array<{ uuid: string }>, overrides: Record<string, unknown> = {}) => ({
    comments,
    totalItems: comments.length,
    totalPages: 1,
    pageNumber: 1,
    itemsPerPage: 10,
    ...overrides,
});

const dispatched = async (page: Page) => {
    const raw = await page.getByTestId('comments-dispatch-probe').getAttribute('data-actions');
    return JSON.parse(raw ?? '[]') as Array<{ type: string; payload?: Record<string, unknown> }>;
};

test.describe('CommentPanel', () => {
    test('lists threads on mount and shows the empty state', async ({ mount, page }) => {
        await mount(<CommentPanelWithStore />);

        await expect(page.getByText('Comments', { exact: true })).toBeVisible();
        await expect(page.getByTestId('comment-panel-obj-1-empty')).toContainText('No comments yet');

        const actions = await dispatched(page);
        expect(actions[0]).toMatchObject({
            type: 'comments/listThreads',
            payload: { resource: 'certificates', objectUuid: 'obj-1', pageNumber: 1 },
        });
    });

    test('renders roots with author, date, rendered body and a resolution line', async ({ mount, page }) => {
        await mount(
            <CommentPanelWithStore
                comments={{
                    threads: {
                        [KEY]: threadsPage([
                            comment('r1', '**bold** and a [link](https://example.com)', { replyCount: 2 }),
                            comment('r2', 'done', {
                                resolved: true,
                                resolvedBy: { uuid: 'user-2', name: 'bob' },
                                resolvedAt: '2026-08-27T11:00:00Z',
                            }),
                        ]),
                    },
                }}
            />,
        );

        await expect(page.getByTestId('comment-r1-author')).toHaveText('alice');
        await expect(page.getByTestId('comment-r1-body').locator('strong')).toHaveText('bold');
        const link = page.getByTestId('comment-r1-body').locator('a');
        await expect(link).toHaveAttribute('href', 'https://example.com');
        await expect(link).toHaveAttribute('rel', 'noopener noreferrer nofollow');
        await expect(link).toHaveAttribute('target', '_blank');
        await expect(page.getByTestId('thread-r1-toggle-replies')).toContainText('2 replies');

        await expect(page.getByTestId('comment-r2-resolution')).toContainText('Resolved by bob');
        await expect(page.getByTestId('comment-r2-unresolve')).toBeVisible();
        await expect(page.getByTestId('comment-r2-resolve')).toHaveCount(0);
        await expect(page.getByTestId('comment-r1-resolve')).toBeVisible();
        await expect(page.getByTestId('comment-r1-unresolve')).toHaveCount(0);
    });

    test('neutralizes hostile Markdown in the real browser', async ({ mount, page }) => {
        const errors: string[] = [];
        page.on('pageerror', (error) => errors.push(error.message));
        page.on('dialog', async (dialog) => {
            errors.push(`dialog: ${dialog.message()}`);
            await dialog.dismiss();
        });

        const hostile = [
            '# Top heading',
            '<script>window.__pwned = true</script>',
            '<img src=x onerror="window.__pwned = true">',
            '<iframe src="https://evil.example"></iframe>',
            '[js](javascript:window.__pwned=true)',
            '[enc](&#106;avascript:window.__pwned=true)',
            '![px](https://evil.example/pixel.gif)',
            '<a href="https://e.com" target="_top" onclick="window.__pwned = true">raw</a>',
            '<style>body{display:none}</style>',
            '<form action="https://evil.example"><input name="q"></form>',
            '| a | b |\n| --- | --- |\n| ' + 'wide '.repeat(120) + ' | x |',
        ].join('\n\n');

        await mount(<CommentPanelWithStore comments={{ threads: { [KEY]: threadsPage([comment('h1', hostile)]) } }} />);

        const body = page.getByTestId('comment-h1-body');
        await expect(body).toBeVisible();
        await expect(body.locator('script, img, iframe, style, form, input, h1, h2')).toHaveCount(0);
        await expect(body.locator('[onclick], [onerror], [id]')).toHaveCount(0);
        await expect(body.locator('a[href^="javascript" i]')).toHaveCount(0);
        await expect(body.locator('h3')).toHaveText('Top heading');
        expect(await page.evaluate(() => (globalThis as { __pwned?: boolean }).__pwned)).toBeUndefined();
        expect(await page.evaluate(() => document.getElementById('Top heading') ?? document.getElementById('top-heading'))).toBeNull();
        expect(await page.evaluate(() => getComputedStyle(document.body).display)).not.toBe('none');
        expect(errors).toEqual([]);

        // The wide table scrolls inside the body: the page itself never grows a horizontal scrollbar.
        expect(await page.evaluate(() => document.documentElement.scrollWidth <= document.documentElement.clientWidth)).toBe(true);
        expect(await body.evaluate((node) => node.scrollWidth > node.clientWidth || getComputedStyle(node).overflowX === 'auto')).toBe(
            true,
        );
    });

    test('posts a root comment and supports preview', async ({ mount, page }) => {
        await mount(<CommentPanelWithStore />);

        const submit = page.getByTestId('comment-panel-obj-1-composer-submit');
        await expect(submit).toBeDisabled();

        await page.getByPlaceholder('Write a comment…').fill('   ');
        await expect(submit).toBeDisabled();

        await page.getByPlaceholder('Write a comment…').fill('# Hello *there*');
        await page.getByTestId('comment-panel-obj-1-composer-toggle-preview').click();
        const preview = page.getByTestId('comment-panel-obj-1-composer-preview');
        await expect(preview.locator('h3')).toHaveText('Hello there');
        await expect(preview.locator('em')).toHaveText('there');
        await page.getByTestId('comment-panel-obj-1-composer-toggle-write').click();

        await expect(submit).toBeEnabled();
        await submit.click();

        const actions = await dispatched(page);
        expect(actions.at(-1)).toEqual({
            type: 'comments/createComment',
            payload: { resource: 'certificates', objectUuid: 'obj-1', body: '# Hello *there*' },
        });
        // The draft survives until the store reports success, so a failed post loses nothing.
        await expect(page.getByPlaceholder('Write a comment…')).toHaveValue('# Hello *there*');
    });

    test('the formatting bar inserts Markdown at the selection and keeps the source plain', async ({ mount, page }) => {
        await mount(<CommentPanelWithStore />);
        const tid = 'comment-panel-obj-1-composer';
        const textarea = page.getByPlaceholder('Write a comment…');

        await textarea.fill('hello world');
        await textarea.evaluate((node: HTMLTextAreaElement) => node.setSelectionRange(6, 11));
        await page.getByTestId(`${tid}-tool-bold`).click();
        await expect(textarea).toHaveValue('hello **world**');
        await expect(textarea).toBeFocused();
        expect(await textarea.evaluate((node: HTMLTextAreaElement) => [node.selectionStart, node.selectionEnd])).toEqual([8, 13]);

        await page.getByTestId(`${tid}-tool-bold`).click();
        await expect(textarea).toHaveValue('hello world');

        await textarea.evaluate((node: HTMLTextAreaElement) => node.setSelectionRange(0, 0));
        await page.getByTestId(`${tid}-tool-heading`).click();
        await expect(textarea).toHaveValue('# hello world');

        await textarea.evaluate((node: HTMLTextAreaElement) => node.setSelectionRange(2, 7));
        await page.getByTestId(`${tid}-tool-link`).click();
        await expect(textarea).toHaveValue('# [hello](https://) world');
        expect(await textarea.evaluate((node: HTMLTextAreaElement) => node.value.slice(node.selectionStart, node.selectionEnd))).toBe(
            'https://',
        );

        await textarea.evaluate((node: HTMLTextAreaElement) => node.setSelectionRange(20, 25));
        await textarea.press('ControlOrMeta+i');
        await expect(textarea).toHaveValue('# [hello](https://) _world_');

        await page.getByTestId(`${tid}-toggle-preview`).click();
        await expect(page.getByTestId(`${tid}-tool-bold`)).toBeDisabled();
        await expect(page.getByTestId(`${tid}-preview`).locator('h3 a')).toHaveText('hello');
        await expect(page.getByTestId(`${tid}-preview`).locator('h3 em')).toHaveText('world');
        await expect(page.getByTestId(`${tid}-preview`).locator('img, script')).toHaveCount(0);
    });

    test('list, quote and code buttons work on whole lines and multi-line selections', async ({ mount, page }) => {
        await mount(<CommentPanelWithStore />);
        const tid = 'comment-panel-obj-1-composer';
        const textarea = page.getByPlaceholder('Write a comment…');

        await textarea.fill('a\nb');
        await textarea.evaluate((node: HTMLTextAreaElement) => node.setSelectionRange(0, 3));
        await page.getByTestId(`${tid}-tool-bulletList`).click();
        await expect(textarea).toHaveValue('- a\n- b');
        await page.getByTestId(`${tid}-tool-bulletList`).click();
        await expect(textarea).toHaveValue('a\nb');
        await page.getByTestId(`${tid}-tool-numberedList`).click();
        await expect(textarea).toHaveValue('1. a\n2. b');
        await page.getByTestId(`${tid}-tool-numberedList`).click();
        await page.getByTestId(`${tid}-tool-quote`).click();
        await expect(textarea).toHaveValue('> a\n> b');
        await page.getByTestId(`${tid}-tool-quote`).click();
        await page.getByTestId(`${tid}-tool-code`).click();
        await expect(textarea).toHaveValue('```\na\nb\n```');
    });

    test('the textarea grows with its content and stops at a ceiling', async ({ mount, page }) => {
        await mount(<CommentPanelWithStore />);
        const textarea = page.getByPlaceholder('Write a comment…');
        const height = () => textarea.evaluate((node) => node.getBoundingClientRect().height);

        const initial = await height();
        await textarea.fill(Array.from({ length: 8 }, (_, i) => `line ${i}`).join('\n'));
        const grown = await height();
        expect(grown).toBeGreaterThan(initial);

        await textarea.fill(Array.from({ length: 80 }, (_, i) => `line ${i}`).join('\n'));
        const capped = await height();
        expect(capped).toBeGreaterThan(grown);
        expect(capped).toBeLessThanOrEqual(400);
        expect(await textarea.evaluate((node) => node.scrollHeight > node.clientHeight)).toBe(true);

        // Formatting the first line of a capped textarea must not throw the view to the bottom.
        await textarea.evaluate((node: HTMLTextAreaElement) => {
            node.scrollTop = 0;
            node.setSelectionRange(0, 0);
        });
        await page.getByTestId('comment-panel-obj-1-composer-tool-heading').click();
        await expect(textarea).toHaveValue(/^# line 0/);
        expect(await textarea.evaluate((node) => node.scrollTop)).toBe(0);
    });

    test('the counter appears only over the limit and blocks posting', async ({ mount, page }) => {
        await mount(<CommentPanelWithStore />);
        const tid = 'comment-panel-obj-1-composer';
        const textarea = page.getByPlaceholder('Write a comment…');

        await textarea.fill('short');
        await expect(page.getByTestId(`${tid}-counter`)).toHaveText('');
        await expect(page.getByTestId(`${tid}-submit`)).toBeEnabled();

        await textarea.evaluate((node: HTMLTextAreaElement) => {
            const setter = Object.getOwnPropertyDescriptor(HTMLTextAreaElement.prototype, 'value')?.set;
            setter?.call(node, 'x'.repeat(65537));
            node.dispatchEvent(new Event('input', { bubbles: true }));
        });
        await expect(page.getByTestId(`${tid}-counter`)).toHaveText('65537/65536');
        await expect(page.getByTestId(`${tid}-submit`)).toBeDisabled();
    });

    test('the API denial is shown above the box, which keeps the text and re-arms once it is edited', async ({ mount, page }) => {
        await mount(
            <CommentPanelWithStore comments={{ threads: { [KEY]: threadsPage([], { postingDenied: 'No comment permission' }) } }} />,
        );

        const tid = 'comment-panel-obj-1-composer';
        await expect(page.getByTestId(`${tid}-denied`)).toHaveText('No comment permission');
        // The box stays: a denied post must never take the text away with it.
        const textarea = page.getByPlaceholder('Write a comment…');
        await expect(textarea).toBeVisible();
        await expect(page.getByTestId(`${tid}-submit`)).toBeDisabled();

        await textarea.fill('let me try again');
        await expect(page.getByTestId(`${tid}-denied`)).toHaveCount(0);
        await expect(page.getByTestId(`${tid}-submit`)).toBeEnabled();
    });

    test('the draft clears only once the store reports the post committed, every time', async ({ mount, page }) => {
        await mount(<CommentPanelWithStore />);
        const textarea = page.getByPlaceholder('Write a comment…');
        const submit = page.getByTestId('comment-panel-obj-1-composer-submit');

        await textarea.fill('first');
        await submit.click();
        await expect(textarea).toHaveValue('first');

        await page.getByTestId('commit-post').click();
        await expect(textarea).toHaveValue('');

        await textarea.fill('second');
        await submit.click();
        await expect(textarea).toHaveValue('second');
        await page.getByTestId('commit-post').click();
        await expect(textarea).toHaveValue('');
    });

    test('a panel lock renders through the widget lock, and its refresh is the retry', async ({ mount, page }) => {
        await mount(
            <CommentPanelWithStore
                comments={{
                    threads: {
                        [KEY]: threadsPage([], {
                            lock: { lockTitle: 'Access Denied', lockText: 'Denied', lockType: LockTypeEnum.PERMISSION },
                        }),
                    },
                }}
            />,
        );

        const lock = page.getByTestId('widget-lock');
        await expect(lock).toBeVisible();
        await expect(lock).toContainText('Access Denied');
        await expect(page.getByPlaceholder('Write a comment…')).toHaveCount(0);

        // The lock is the panel's own state, so the refresh button stays live: it is the only way back.
        const refresh = page.getByTestId('refresh-icon');
        await expect(refresh).toBeEnabled();
        await refresh.click();
        expect((await dispatched(page)).at(-1)).toEqual({
            type: 'comments/refreshPanel',
            payload: { resource: 'certificates', objectUuid: 'obj-1' },
        });
    });

    test('expanding a thread loads its replies and a reply can be posted', async ({ mount, page }) => {
        await mount(
            <CommentPanelWithStore
                comments={{
                    threads: { [KEY]: threadsPage([comment('r1', 'root', { replyCount: 1 })]) },
                    replies: { r1: threadsPage([comment('c1', 'a reply')], { itemsPerPage: 20 }) },
                }}
            />,
        );

        await expect(page.getByTestId('comment-c1-body')).toHaveCount(0);
        await page.getByTestId('thread-r1-toggle-replies').click();
        await expect(page.getByTestId('comment-c1-body')).toHaveText('a reply');
        // Replies are only requested when the thread has none cached, so the preloaded page is used as is.
        expect((await dispatched(page)).filter((action) => action.type === 'comments/listReplies')).toHaveLength(0);

        // A reply has no thread-level affordances.
        await expect(page.getByTestId('comment-c1-reply')).toHaveCount(0);
        await expect(page.getByTestId('comment-c1-resolve')).toHaveCount(0);
        await expect(page.getByTestId('comment-c1-delete')).toBeVisible();

        await page.getByTestId('thread-r1-toggle-replies').click();
        await expect(page.getByTestId('comment-c1-body')).toHaveCount(0);
        await page.getByTestId('comment-r1-reply').click();
        // Replying opens the thread, and the box sits after the last reply, where the new one will land.
        await expect(page.getByTestId('comment-c1-body')).toBeVisible();
        expect(
            await page.evaluate(() => {
                const reply = document.querySelector('[data-testid="comment-c1"]');
                const box = document.querySelector('[data-testid="thread-r1-reply-composer"]');
                return reply && box ? Boolean(reply.compareDocumentPosition(box) & Node.DOCUMENT_POSITION_FOLLOWING) : false;
            }),
        ).toBe(true);
        await expect(page.getByPlaceholder('Write a reply…')).toBeFocused();
        await expect(page.getByTestId('thread-r1-reply-composer-submit')).toBeInViewport();
        await page.getByPlaceholder('Write a reply…').fill('thanks');
        await page.getByTestId('thread-r1-reply-composer-submit').click();

        expect((await dispatched(page)).at(-1)).toEqual({
            type: 'comments/createComment',
            payload: { resource: 'certificates', objectUuid: 'obj-1', body: 'thanks', parentUuid: 'r1' },
        });
    });

    test('expanding a thread without cached replies requests them', async ({ mount, page }) => {
        await mount(<CommentPanelWithStore comments={{ threads: { [KEY]: threadsPage([comment('r1', 'root', { replyCount: 3 })]) } }} />);

        await page.getByTestId('thread-r1-toggle-replies').click();

        expect((await dispatched(page)).at(-1)).toEqual({ type: 'comments/listReplies', payload: { rootUuid: 'r1', pageNumber: 1 } });
    });

    test('replies load incrementally with a Load more button', async ({ mount, page }) => {
        await mount(
            <CommentPanelWithStore
                comments={{
                    threads: { [KEY]: threadsPage([comment('r1', 'root', { replyCount: 45 })]) },
                    replies: {
                        r1: threadsPage([comment('c1', 'first')], { itemsPerPage: 20, totalItems: 45, totalPages: 3, pageNumber: 2 }),
                    },
                }}
            />,
        );

        await page.getByTestId('thread-r1-toggle-replies').click();
        const loadMore = page.getByTestId('thread-r1-load-more');
        await expect(loadMore).toHaveText('Load more (44 remaining)');
        await loadMore.click();

        expect((await dispatched(page)).at(-1)).toEqual({
            type: 'comments/listReplies',
            payload: { rootUuid: 'r1', pageNumber: 3, itemsPerPage: 20 },
        });
    });

    test('a fully loaded thread has no Load more button', async ({ mount, page }) => {
        await mount(
            <CommentPanelWithStore
                comments={{
                    threads: { [KEY]: threadsPage([comment('r1', 'root', { replyCount: 1 })]) },
                    replies: { r1: threadsPage([comment('c1', 'only')], { itemsPerPage: 20 }) },
                }}
            />,
        );

        await page.getByTestId('thread-r1-toggle-replies').click();
        await expect(page.getByTestId('comment-c1-body')).toBeVisible();
        await expect(page.getByTestId('thread-r1-load-more')).toHaveCount(0);
    });

    test('re-expanding a thread whose replies failed to load requests them again', async ({ mount, page }) => {
        await mount(
            <CommentPanelWithStore
                comments={{
                    threads: { [KEY]: threadsPage([comment('r1', 'root', { replyCount: 2 })]) },
                    // What a failed first load leaves behind: an entry that exists but holds nothing.
                    replies: { r1: threadsPage([], { itemsPerPage: 20 }) },
                }}
            />,
        );

        await page.getByTestId('thread-r1-toggle-replies').click();
        expect((await dispatched(page)).filter((action) => action.type === 'comments/listReplies')).toHaveLength(1);

        await page.getByTestId('thread-r1-toggle-replies').click();
        await page.getByTestId('thread-r1-toggle-replies').click();
        expect((await dispatched(page)).filter((action) => action.type === 'comments/listReplies')).toHaveLength(2);
    });

    test('resolve, reopen and delete dispatch against the comment uuid', async ({ mount, page }) => {
        await mount(
            <CommentPanelWithStore
                comments={{
                    threads: {
                        [KEY]: threadsPage([
                            comment('r1', 'open', { replyCount: 2 }),
                            comment('r2', 'closed', { resolved: true, resolvedBy: { uuid: 'u', name: 'bob' } }),
                        ]),
                    },
                }}
            />,
        );

        await page.getByTestId('comment-r1-resolve').click();
        expect((await dispatched(page)).at(-1)).toEqual({
            type: 'comments/resolveComment',
            payload: { uuid: 'r1', resource: 'certificates', objectUuid: 'obj-1' },
        });

        await page.getByTestId('comment-r2-unresolve').click();
        expect((await dispatched(page)).at(-1)).toEqual({
            type: 'comments/unresolveComment',
            payload: { uuid: 'r2', resource: 'certificates', objectUuid: 'obj-1' },
        });

        await page.getByTestId('comment-r1-delete').click();
        const dialog = page.getByTestId('comment-panel-obj-1-delete-dialog');
        await expect(dialog).toContainText('also deletes all of its replies');
        await dialog.getByRole('button', { name: 'Cancel' }).click();
        expect((await dispatched(page)).at(-1)?.type).not.toBe('comments/deleteComment');

        await page.getByTestId('comment-r1-delete').click();
        await dialog.getByRole('button', { name: 'Delete' }).click();
        expect((await dispatched(page)).at(-1)).toEqual({
            type: 'comments/deleteComment',
            payload: { uuid: 'r1', resource: 'certificates', objectUuid: 'obj-1' },
        });
    });

    test('loads more thread roots incrementally', async ({ mount, page }) => {
        await mount(
            <CommentPanelWithStore
                comments={{ threads: { [KEY]: threadsPage([comment('r1', 'x')], { totalPages: 3, totalItems: 25 }) } }}
            />,
        );

        const loadMore = page.getByTestId('comment-panel-obj-1-load-more');
        await expect(loadMore).toHaveText('Load more (24 remaining)');
        await loadMore.click();

        expect((await dispatched(page)).at(-1)).toEqual({
            type: 'comments/listThreads',
            payload: { resource: 'certificates', objectUuid: 'obj-1', pageNumber: 2, itemsPerPage: 10, sortDirection: 'asc' },
        });
    });

    test('loading a later page keeps the direction the list was loaded in', async ({ mount, page }) => {
        await mount(
            <CommentPanelWithStore
                comments={{
                    threads: { [KEY]: threadsPage([comment('r25', 'newest')], { totalPages: 3, totalItems: 25, sortDirection: 'desc' }) },
                }}
            />,
        );

        await expect(page.getByTestId('comment-panel-obj-1-sort')).toHaveText('Newest first');
        await page.getByTestId('comment-panel-obj-1-load-more').click();

        expect((await dispatched(page)).at(-1)).toEqual({
            type: 'comments/listThreads',
            payload: { resource: 'certificates', objectUuid: 'obj-1', pageNumber: 2, itemsPerPage: 10, sortDirection: 'desc' },
        });
    });

    test('switching direction re-reads the first page the other way round and replaces what was loaded', async ({ mount, page }) => {
        await mount(
            <CommentPanelWithStore
                comments={{
                    threads: {
                        [KEY]: threadsPage([comment('r1', 'one'), comment('r2', 'two'), comment('r3', 'three')], {
                            pageNumber: 2,
                            itemsPerPage: 2,
                            totalItems: 3,
                            totalPages: 2,
                        }),
                    },
                }}
                deliver={[
                    {
                        testId: 'deliver-desc',
                        type: 'comments/listThreadsSuccess',
                        payload: {
                            key: KEY,
                            page: apiPage([comment('r3', 'three'), comment('r2', 'two')], {
                                itemsPerPage: 2,
                                totalItems: 3,
                                totalPages: 2,
                            }),
                            sortDirection: 'desc',
                        },
                    },
                ]}
            />,
        );

        const sort = page.getByTestId('comment-panel-obj-1-sort');
        await expect(sort).toHaveText('Oldest first');
        await sort.click();

        expect((await dispatched(page)).at(-1)).toEqual({
            type: 'comments/listThreads',
            payload: { resource: 'certificates', objectUuid: 'obj-1', pageNumber: 1, sortDirection: 'desc' },
        });

        // The reversed page lands on a list that already holds r2 and r3: they must not appear twice.
        await page.getByTestId('deliver-desc').click();
        await expect(sort).toHaveText('Newest first');
        const bodies = page.getByTestId('comment-panel-obj-1-threads').locator('[data-testid^="comment-"][data-testid$="-body"]');
        await expect(bodies).toHaveText(['three', 'two']);
        await expect(page.getByTestId('comment-panel-obj-1-load-more')).toHaveText('Load more (1 remaining)');

        await sort.click();
        expect((await dispatched(page)).at(-1)).toMatchObject({
            type: 'comments/listThreads',
            payload: { pageNumber: 1, sortDirection: 'asc' },
        });
    });

    test('a comment notification anchors the roots listing on its thread and adopts the page that comes back', async ({ mount, page }) => {
        await mount(
            <CommentPanelWithStore
                search="?tab=comments&comment=r21"
                deliver={[
                    {
                        testId: 'deliver-anchored',
                        type: 'comments/listThreadsSuccess',
                        payload: {
                            key: KEY,
                            page: apiPage([comment('r21', 'the one'), comment('r22', 'after it')], {
                                pageNumber: 3,
                                totalItems: 22,
                                totalPages: 3,
                            }),
                            sortDirection: 'asc',
                            anchorUuid: 'r21',
                        },
                    },
                ]}
            />,
        );

        expect((await dispatched(page))[0]).toEqual({
            type: 'comments/listThreads',
            payload: { resource: 'certificates', objectUuid: 'obj-1', pageNumber: 1, anchorUuid: 'r21' },
        });

        await page.getByTestId('deliver-anchored').click();
        await expect(page.getByTestId('comment-r21')).toHaveAttribute('data-highlighted', 'true');
        await expect(page.getByTestId('comment-r21')).toBeInViewport();
        await expect(page.getByTestId('comment-r22')).not.toHaveAttribute('data-highlighted', 'true');
        await expect(page.getByTestId('comment-panel-obj-1-missing-anchor')).toHaveCount(0);
        await expect(page.getByTestId('comment-panel-obj-1-load-more')).toHaveCount(0);

        // Twenty roots sit on the two pages before the adopted one; showing them re-reads the window from the first page.
        const earlier = page.getByTestId('comment-panel-obj-1-load-earlier');
        await expect(earlier).toHaveText('Show earlier comments (20)');
        await earlier.click();
        expect((await dispatched(page)).at(-1)).toEqual({
            type: 'comments/listThreads',
            payload: { resource: 'certificates', objectUuid: 'obj-1', pageNumber: 1, itemsPerPage: 30, sortDirection: 'asc' },
        });
    });

    test('a reply notification anchors the thread and its replies in parallel, expands the thread and highlights the reply', async ({
        mount,
        page,
    }) => {
        await mount(
            <CommentPanelWithStore
                search="?tab=comments&comment=c41&thread=r1"
                comments={{
                    threads: { [KEY]: threadsPage([comment('r1', 'root', { replyCount: 41 })]) },
                    replies: {
                        r1: threadsPage([comment('c41', 'the reply')], {
                            pageNumber: 3,
                            itemsPerPage: 20,
                            totalItems: 41,
                            totalPages: 3,
                            firstPage: 3,
                        }),
                    },
                }}
            />,
        );

        const first = (await dispatched(page)).slice(0, 2);
        expect(first).toContainEqual({
            type: 'comments/listThreads',
            payload: { resource: 'certificates', objectUuid: 'obj-1', pageNumber: 1, anchorUuid: 'r1' },
        });
        expect(first).toContainEqual({ type: 'comments/listReplies', payload: { rootUuid: 'r1', pageNumber: 1, anchorUuid: 'c41' } });

        await expect(page.getByTestId('thread-r1-replies')).toBeVisible();
        await expect(page.getByTestId('comment-c41')).toHaveAttribute('data-highlighted', 'true');
        await expect(page.getByTestId('comment-c41')).toBeInViewport();
        await expect(page.getByTestId('comment-r1')).not.toHaveAttribute('data-highlighted', 'true');
        await expect(page.getByTestId('thread-r1-load-more')).toHaveCount(0);

        const earlier = page.getByTestId('thread-r1-load-earlier');
        await expect(earlier).toHaveText('Show earlier replies (40)');
        await earlier.click();
        expect((await dispatched(page)).at(-1)).toEqual({
            type: 'comments/listReplies',
            payload: { rootUuid: 'r1', pageNumber: 1, itemsPerPage: 60 },
        });
    });

    test('following a notification about another comment on the object already open re-anchors the panel', async ({ mount, page }) => {
        await mount(
            <CommentPanelWithStore
                search="?tab=comments"
                comments={{
                    threads: { [KEY]: threadsPage([comment('r1', 'one', { replyCount: 1 }), comment('r2', 'two')]) },
                    replies: { r1: threadsPage([comment('c1', 'the reply')], { itemsPerPage: 20 }) },
                }}
                navigateTo={[
                    { testId: 'go-root', search: '?tab=comments&comment=r2' },
                    { testId: 'go-reply', search: '?tab=comments&comment=c1&thread=r1' },
                    { testId: 'go-tab-only', search: '?tab=comments&comment=c1&thread=r1&other=x' },
                ]}
            />,
        );
        expect((await dispatched(page)).filter((action) => action.type === 'comments/listThreads')).toHaveLength(1);

        await page.getByTestId('go-root').click();
        await expect(page.getByTestId('comment-r2')).toHaveAttribute('data-highlighted', 'true');
        expect((await dispatched(page)).at(-1)).toEqual({
            type: 'comments/listThreads',
            payload: { resource: 'certificates', objectUuid: 'obj-1', pageNumber: 1, anchorUuid: 'r2' },
        });

        await page.getByTestId('go-reply').click();
        await expect(page.getByTestId('comment-c1')).toHaveAttribute('data-highlighted', 'true');
        await expect(page.getByTestId('comment-r2')).not.toHaveAttribute('data-highlighted', 'true');
        const latest = (await dispatched(page)).slice(-2);
        expect(latest).toContainEqual({
            type: 'comments/listThreads',
            payload: { resource: 'certificates', objectUuid: 'obj-1', pageNumber: 1, anchorUuid: 'r1' },
        });
        expect(latest).toContainEqual({ type: 'comments/listReplies', payload: { rootUuid: 'r1', pageNumber: 1, anchorUuid: 'c1' } });

        // A query change that leaves the anchor alone does not list again.
        const before = (await dispatched(page)).length;
        await page.getByTestId('go-tab-only').click();
        await expect(page.getByTestId('comment-c1')).toHaveAttribute('data-highlighted', 'true');
        expect(await dispatched(page)).toHaveLength(before);
    });

    test('re-anchoring on the object already open keeps the panel state, so the chosen direction survives', async ({ mount, page }) => {
        await mount(
            <CommentPanelWithStore
                search="?tab=comments"
                comments={{ threads: { [KEY]: threadsPage([comment('r2', 'two'), comment('r1', 'one')], { sortDirection: 'desc' }) } }}
                navigateTo={[{ testId: 'go-root', search: '?tab=comments&comment=r1' }]}
            />,
        );
        await expect(page.getByTestId('comment-panel-obj-1-sort')).toHaveText('Newest first');

        await page.getByTestId('go-root').click();
        await expect(page.getByTestId('comment-r1')).toHaveAttribute('data-highlighted', 'true');
        await expect(page.getByTestId('comment-panel-obj-1-sort')).toHaveText('Newest first');
        expect((await dispatched(page)).map((action) => action.type)).not.toContain('comments/clearPanel');
    });

    test('a notification whose comment is gone shows an error and leaves the panel on the first page', async ({ mount, page }) => {
        await mount(
            <CommentPanelWithStore
                search="?tab=comments&comment=gone"
                deliver={[
                    {
                        testId: 'deliver-first-page',
                        type: 'comments/listThreadsSuccess',
                        payload: { key: KEY, page: apiPage([comment('r1', 'still here')]), sortDirection: 'asc', anchorUuid: 'gone' },
                    },
                ]}
            />,
        );

        await page.getByTestId('deliver-first-page').click();

        await expect(page.getByTestId('comment-panel-obj-1-missing-anchor')).toHaveText('The comment you followed no longer exists.');
        await expect(page.getByTestId('comment-r1-body')).toHaveText('still here');
        await expect(page.getByTestId('comment-panel-obj-1-load-earlier')).toHaveCount(0);
        await expect(page.locator('[data-highlighted]')).toHaveCount(0);
    });

    test('a reply notification whose thread is gone shows the same error', async ({ mount, page }) => {
        await mount(
            <CommentPanelWithStore
                search="?tab=comments&comment=c1&thread=gone"
                comments={{ threads: { [KEY]: threadsPage([comment('r1', 'other thread')]) } }}
                deliver={[
                    {
                        testId: 'deliver-404',
                        type: 'comments/listRepliesFailure',
                        payload: { rootUuid: 'gone', missingAnchor: 'c1' },
                    },
                ]}
            />,
        );

        await expect(page.getByTestId('comment-panel-obj-1-missing-anchor')).toHaveCount(0);
        await page.getByTestId('deliver-404').click();
        await expect(page.getByTestId('comment-panel-obj-1-missing-anchor')).toBeVisible();
        await expect(page.getByTestId('comment-r1-body')).toHaveText('other thread');
    });

    test('a fully loaded root list has no Load more button', async ({ mount, page }) => {
        await mount(<CommentPanelWithStore comments={{ threads: { [KEY]: threadsPage([comment('r1', 'x'), comment('r2', 'y')]) } }} />);

        await expect(page.getByTestId('comment-r1-body')).toBeVisible();
        await expect(page.getByTestId('comment-panel-obj-1-load-more')).toHaveCount(0);
    });

    test('two panels on one page do not interfere', async ({ mount, page }) => {
        await mount(
            <CommentPanelWithStore
                secondObjectUuid="obj-2"
                comments={{
                    threads: {
                        [KEY]: threadsPage([comment('r1', 'first object')]),
                        'certificates/obj-2': threadsPage([], {
                            lock: { lockTitle: 'Access Denied', lockText: 'Denied', lockType: LockTypeEnum.PERMISSION },
                        }),
                    },
                }}
            />,
        );

        await expect(page.getByTestId('comment-panel-obj-1').getByTestId('comment-r1-body')).toHaveText('first object');
        await expect(page.getByTestId('comment-panel-obj-1').getByTestId('widget-lock')).toHaveCount(0);
        await expect(page.getByTestId('comment-panel-obj-2').getByTestId('widget-lock')).toBeVisible();

        const lists = (await dispatched(page)).filter((action) => action.type === 'comments/listThreads');
        expect(lists.map((action) => action.payload?.objectUuid).sort()).toEqual(['obj-1', 'obj-2']);
    });
});
