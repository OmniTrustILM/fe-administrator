import {
    ConditionType,
    FilterConditionOperator,
    FilterFieldSource,
    Resource,
    type TriggerHistoryObjectTriggerSummaryDto,
} from 'types/openapi';
import { withProviders } from 'utils/test-helpers';
import { test, expect } from '../../../../../../playwright/ct-test';
import EvaluationDetailsDialogRecordingWrapper from './EvaluationDetailsDialogRecordingWrapper';
import EvaluationDetailsDialogWithStore from './EvaluationDetailsDialogWithStore';
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

const expiresAt = new Date(2026, 8, 1).toISOString();
const expiresAtReason = (value: string) => `Condition item 'Property NOT_AFTER greater than ${value}' is false.`;

const unmetDateTrigger = (message: string, resource = Resource.Certificates): TriggerHistoryObjectTriggerSummaryDto => ({
    ...baseTrigger,
    records: [
        {
            message,
            condition: {
                uuid: 'c-2',
                name: 'expires after September',
                type: ConditionType.CheckField,
                resource,
                items: [
                    {
                        fieldSource: FilterFieldSource.Property,
                        fieldIdentifier: 'NOT_AFTER',
                        operator: FilterConditionOperator.Greater,
                        value: expiresAt,
                    },
                ],
            },
        },
    ],
});

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

    test('shows the unmet condition item the way the rule shows it', async ({ mount, page }) => {
        await mount(<EvaluationDetailsDialogWithStore trigger={unmetDateTrigger(expiresAtReason(expiresAt))} />);

        await expect(page.getByTitle("Property Expires At greater than '2026-09-01 00:00:00'")).toBeVisible();
        await expect(page.getByText('Condition item')).toContainText('is false.');
        await expect(page.getByText(expiresAt)).toHaveCount(0);
    });

    test('keeps the reason as recorded when the condition item changed since the evaluation', async ({ mount, page }) => {
        const recorded = expiresAtReason('2026-01-01T00:00:00.000Z');
        await mount(<EvaluationDetailsDialogWithStore trigger={unmetDateTrigger(recorded)} />);

        await expect(page.getByText(recorded)).toBeVisible();
    });

    test('keeps the reason as recorded while the field of the item is not known', async ({ mount, page }) => {
        const recorded = expiresAtReason(expiresAt);
        await mount(<EvaluationDetailsDialogWithStore trigger={unmetDateTrigger(recorded)} hasFilterFields={false} />);

        await expect(page.getByText(recorded)).toBeVisible();
    });

    test('keeps the reason as recorded when only the fields of another resource are loaded', async ({ mount, page }) => {
        const recorded = expiresAtReason(expiresAt);
        await mount(<EvaluationDetailsDialogWithStore trigger={unmetDateTrigger(recorded, Resource.Keys)} />);

        await expect(page.getByText(recorded)).toBeVisible();
    });

    test('asks for the fields once per opening, not again after the read failed', async ({ mount, page }) => {
        await mount(<EvaluationDetailsDialogRecordingWrapper />);
        await expect(page.getByTestId('field-reads')).toHaveText('1');
        await page.waitForTimeout(500);
        await expect(page.getByTestId('field-reads')).toHaveText('1');

        await page.getByRole('button', { name: 'Close', exact: true }).last().click();
        await page.getByRole('button', { name: 'Open again' }).click();
        await expect(page.getByTestId('field-reads')).toHaveText('2');
    });
});
