import type { TriggerHistoryObjectTriggerSummaryDto } from 'types/openapi';
import { withProviders } from 'utils/test-helpers';
import { test, expect } from '../../../../../../playwright/ct-test';
import EvaluationDetailsDialog from './index';

const baseTrigger: TriggerHistoryObjectTriggerSummaryDto = {
    triggerUuid: 't-1',
    triggerName: 'cert_status_trigger',
    triggeredAt: '2026-05-14T10:24:13Z',
    message: 'Action failed',
    records: [
        {
            message: 'Reason message A',
            condition: { uuid: 'c-1', name: 'common_name ends with ".cz"' } as any,
        },
        {
            message: 'Reason message B',
            execution: { uuid: 'e-1', name: 'set custom attribute "department"' } as any,
        },
    ],
};

test.describe('EvaluationDetailsDialog', () => {
    test('does not render when closed', async ({ mount }) => {
        const component = await mount(
            withProviders(<EvaluationDetailsDialog isOpen={false} onClose={() => {}} objectLabel="yahoo.com" trigger={baseTrigger} />),
        );
        await expect(component.getByText('Evaluation details')).not.toBeVisible();
    });

    test('renders header rows with object and trigger', async ({ mount, page }) => {
        await mount(
            withProviders(<EvaluationDetailsDialog isOpen={true} onClose={() => {}} objectLabel="yahoo.com" trigger={baseTrigger} />),
        );
        await expect(page.getByText('Evaluation details')).toBeVisible();
        await expect(page.getByText('yahoo.com')).toBeVisible();
        await expect(page.getByText('cert_status_trigger')).toBeVisible();
    });

    test('renders condition record with Not met result', async ({ mount, page }) => {
        await mount(
            withProviders(<EvaluationDetailsDialog isOpen={true} onClose={() => {}} objectLabel="yahoo.com" trigger={baseTrigger} />),
        );
        await expect(page.getByText('common_name ends with ".cz"')).toBeVisible();
        await expect(page.getByText('Not met', { exact: true })).toBeVisible();
        await expect(page.getByText('Reason message A')).toBeVisible();
    });

    test('renders execution record with Failed result and reason', async ({ mount, page }) => {
        await mount(
            withProviders(<EvaluationDetailsDialog isOpen={true} onClose={() => {}} objectLabel="yahoo.com" trigger={baseTrigger} />),
        );
        await expect(page.getByText('set custom attribute "department"')).toBeVisible();
        await expect(page.getByText('Failed', { exact: true })).toBeVisible();
        await expect(page.getByText('Reason message B')).toBeVisible();
    });

    test('Close button triggers onClose', async ({ mount, page }) => {
        let closed = false;
        await mount(
            withProviders(
                <EvaluationDetailsDialog
                    isOpen={true}
                    onClose={() => {
                        closed = true;
                    }}
                    objectLabel="yahoo.com"
                    trigger={baseTrigger}
                />,
            ),
        );
        await page.getByRole('button', { name: 'Close', exact: true }).last().click();
        expect(closed).toBe(true);
    });
});
