import { EventStatus, type EventHistoryDto, Resource } from 'types/openapi';
import { withProviders } from 'utils/test-helpers';
import { test, expect } from '../../../../../../playwright/ct-test';
import EventFiringDetailsDialog from './index';

const buildEntry = (): EventHistoryDto => ({
    startedAt: '2026-05-14T10:24:12Z',
    finishedAt: '2026-05-14T10:24:13Z',
    status: EventStatus.Finished,
    resource: Resource.Certificates,
    objectsEvaluated: 3,
    objectsMatched: 2,
    objectsIgnored: 1,
    objectHistories: {
        items: [
            {
                objectUuid: 'google.cz',
                matched: true,
                ignored: false,
                triggers: [
                    {
                        triggerUuid: 't-1',
                        triggerName: 'cert_status_trigger',
                        triggeredAt: '2026-05-14T10:24:13Z',
                        message: 'OK',
                        records: [],
                    },
                ],
            },
            {
                objectUuid: 'yahoo.com',
                matched: false,
                ignored: false,
                triggers: [
                    {
                        triggerUuid: 't-1',
                        triggerName: 'cert_status_trigger',
                        triggeredAt: '2026-05-14T10:24:13Z',
                        message: 'Action failed',
                        records: [
                            {
                                message: 'Condition not met',
                                condition: { uuid: 'c-1', name: 'common_name ends with ".cz"' } as any,
                            },
                        ],
                    },
                ],
            },
            {
                objectUuid: 'example.cz',
                matched: true,
                ignored: false,
                triggers: [
                    {
                        triggerUuid: 't-1',
                        triggerName: 'cert_status_trigger',
                        triggeredAt: '2026-05-14T10:24:13Z',
                        message: 'Execution failed',
                        records: [
                            {
                                message: 'Action execution error',
                                execution: { uuid: 'e-1', name: 'send_notification' } as any,
                            },
                        ],
                    },
                ],
            },
        ],
        totalItems: 3,
        itemsPerPage: 10,
        pageNumber: 1,
        totalPages: 1,
    } as any,
});

const buildCommentEntry = (): EventHistoryDto => ({
    ...buildEntry(),
    resource: Resource.Comments,
    objectHistories: {
        items: [
            {
                objectUuid: 'comment-with-host',
                matched: true,
                ignored: false,
                hostObject: { resource: Resource.Certificates, objectUuid: 'cert-1', name: 'CN=host.example.com' },
                triggers: [{ triggerUuid: 't-1', triggerName: 'comment_trigger', triggeredAt: '2026-05-14T10:24:13Z', records: [] }],
            },
            {
                objectUuid: 'deleted-comment',
                matched: true,
                ignored: false,
                triggers: [{ triggerUuid: 't-1', triggerName: 'comment_trigger', triggeredAt: '2026-05-14T10:24:13Z', records: [] }],
            },
            {
                objectUuid: 'comment-on-ra-profile',
                matched: true,
                ignored: false,
                hostObject: { resource: Resource.RaProfiles, objectUuid: 'ra-1', name: 'RA One' },
                triggers: [{ triggerUuid: 't-1', triggerName: 'comment_trigger', triggeredAt: '2026-05-14T10:24:13Z', records: [] }],
            },
        ],
        totalItems: 3,
        itemsPerPage: 10,
        pageNumber: 1,
        totalPages: 1,
    } as any,
});

const mountDialog = (mount: any, onClose: () => void = () => {}) =>
    mount(withProviders(<EventFiringDetailsDialog isOpen={true} onClose={onClose} entry={buildEntry()} />));

const expectRowIcons = async (page: any, rowText: string, conditionIcon: 'check' | 'x', actionIcon: 'check' | 'x') => {
    const row = page.getByRole('row').filter({ hasText: rowText });
    await expect(row.locator('td').nth(2).locator(`svg.lucide-${conditionIcon}`)).toBeVisible();
    await expect(row.locator('td').nth(3).locator(`svg.lucide-${actionIcon}`)).toBeVisible();
};

test.describe('EventFiringDetailsDialog', () => {
    test('does not render when closed', async ({ mount }) => {
        const component = await mount(withProviders(<EventFiringDetailsDialog isOpen={false} onClose={() => {}} entry={buildEntry()} />));
        await expect(component.getByText('Event firing details')).not.toBeVisible();
    });

    test('renders header and one row per object/trigger combination', async ({ mount, page }) => {
        await mountDialog(mount);
        await expect(page.getByText('Event firing details')).toBeVisible();
        await expect(page.getByText('google.cz')).toBeVisible();
        await expect(page.getByText('yahoo.com')).toBeVisible();
        await expect(page.getByText('OK', { exact: true })).toBeVisible();
        await expect(page.getByText('Action failed')).toBeVisible();
    });

    test('Trigger column is a link to trigger detail', async ({ mount, page }) => {
        await mountDialog(mount);
        const link = page.getByRole('link', { name: 'cert_status_trigger' }).first();
        await expect(link).toBeVisible();
        await expect(link).toHaveAttribute('href', /\/triggers\/detail\/t-1$/);
    });

    test('Object column is a link to the resource detail page', async ({ mount, page }) => {
        await mount(withProviders(<EventFiringDetailsDialog isOpen={true} onClose={() => {}} entry={buildEntry()} />));
        const link = page.getByRole('link', { name: 'google.cz' });
        await expect(link).toBeVisible();
        await expect(link).toHaveAttribute('href', /\/certificates\/detail\/google\.cz$/);
    });

    test('Object with a host object links to the host detail page and shows the host name', async ({ mount, page }) => {
        await mount(withProviders(<EventFiringDetailsDialog isOpen={true} onClose={() => {}} entry={buildCommentEntry()} />));
        const link = page.getByRole('link', { name: 'comment-with-host' });
        await expect(link).toHaveAttribute('href', /\/certificates\/detail\/cert-1$/);
        const row = page.getByRole('row').filter({ hasText: 'comment-with-host' });
        await expect(row.getByText('(CN=host.example.com)')).toBeVisible();
    });

    test('Comment object without a host object is plain text, not a link', async ({ mount, page }) => {
        await mount(withProviders(<EventFiringDetailsDialog isOpen={true} onClose={() => {}} entry={buildCommentEntry()} />));
        await expect(page.getByText('deleted-comment')).toBeVisible();
        await expect(page.getByRole('link', { name: 'deleted-comment' })).toHaveCount(0);
    });

    test('A host whose detail route needs more than its uuid is named in plain text, not linked', async ({ mount, page }) => {
        await mount(withProviders(<EventFiringDetailsDialog isOpen={true} onClose={() => {}} entry={buildCommentEntry()} />));
        const row = page.getByRole('row').filter({ hasText: 'comment-on-ra-profile' });
        await expect(row.getByText('(RA One)')).toBeVisible();
        await expect(row.getByRole('link', { name: 'comment-on-ra-profile' })).toHaveCount(0);
    });

    test('clicking Details opens evaluation details dialog', async ({ mount, page }) => {
        await mountDialog(mount);
        const yahooRow = page.getByRole('row').filter({ hasText: 'yahoo.com' });
        await yahooRow.getByRole('button').click();
        await expect(page.getByText('Evaluation details')).toBeVisible();
        await expect(page.getByText('common_name ends with ".cz"')).toBeVisible();
    });

    test('row with no failure records shows success icons for both Conditions and Actions', async ({ mount, page }) => {
        await mountDialog(mount);
        await expectRowIcons(page, 'google.cz', 'check', 'check');
    });

    test('row with condition failure shows failure icons for both Conditions and Actions (actions skipped)', async ({ mount, page }) => {
        await mountDialog(mount);
        await expectRowIcons(page, 'yahoo.com', 'x', 'x');
    });

    test('row with execution failure shows success for Conditions and failure for Actions', async ({ mount, page }) => {
        await mountDialog(mount);
        await expectRowIcons(page, 'example.cz', 'check', 'x');
    });

    test('Close button triggers onClose', async ({ mount, page }) => {
        let closed = false;
        await mountDialog(mount, () => {
            closed = true;
        });
        await page.getByRole('button', { name: 'Close', exact: true }).last().click();
        expect(closed).toBe(true);
    });
});
