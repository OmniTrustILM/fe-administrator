import { expect, test } from 'playwright/ct-test';
import AuditDelegationTestHarness from './AuditDelegationTestHarness';
import FilterWidgetTestWrapper from 'components/FilterWidget/FilterWidgetTestWrapper';
import { EntityType } from 'ducks/filters';
import { FilterConditionOperator, FilterFieldSource, FilterFieldType } from 'types/openapi';

test('a delegated record shows the system after the actor and keeps it separate from the user link', async ({ mount, page }) => {
    await mount(<AuditDelegationTestHarness delegate={{ identifier: 'automation', subject: 'service-account-42' }} />);

    const actorCell = page.getByRole('row').nth(1).getByRole('cell').nth(3);
    await expect(actorCell).toHaveText('User Alice via automation');
    await expect(actorCell.getByRole('link')).toHaveCount(1);
    await expect(actorCell.getByRole('link', { name: 'Alice' })).toHaveAttribute('href', '/users/detail/user-42');
    await page.getByRole('row').nth(1).getByRole('cell').last().getByRole('button').click();
    const detail = page.getByRole('region', { name: 'Audit log detail' });
    await expect(detail.getByRole('row').filter({ hasText: 'Delegate identifier' })).toHaveText('Delegate identifierautomation');
    await expect(detail.getByRole('row').filter({ hasText: 'Delegate subject' })).toHaveText('Delegate subjectservice-account-42');
});

test('a delegate without a subject is shown without an empty subject row', async ({ mount, page }) => {
    await mount(<AuditDelegationTestHarness delegate={{ identifier: 'automation' }} />);

    await expect(page.getByRole('row').nth(1).getByRole('cell').nth(3)).toHaveText('User Alice via automation');
    await page.getByRole('row').nth(1).getByRole('cell').last().getByRole('button').click();
    const detail = page.getByRole('region', { name: 'Audit log detail' });
    await expect(detail.getByRole('row').filter({ hasText: 'Delegate identifier' })).toHaveText('Delegate identifierautomation');
    await expect(detail.getByText('Delegate subject', { exact: true })).toHaveCount(0);
});

test('historical and direct records retain the existing actor and detail rendering', async ({ mount, page }) => {
    await mount(<AuditDelegationTestHarness />);

    await expect(page.getByRole('row').nth(1).getByRole('cell').nth(3)).toHaveText('User Alice');
    await expect(page.getByText('via ', { exact: false })).toHaveCount(0);
    await page.getByRole('row').nth(1).getByRole('cell').last().getByRole('button').click();
    const detail = page.getByRole('region', { name: 'Audit log detail' });
    await expect(detail.getByText('Delegate identifier', { exact: true })).toHaveCount(0);
    await expect(detail.getByText('Delegate subject', { exact: true })).toHaveCount(0);
    await expect(detail.getByText('Timestamp', { exact: true })).toBeVisible();
});

test('the audit search accepts the Delegate field supplied by the backend', async ({ mount, page }) => {
    let filters: unknown[] = [];
    await mount(
        <FilterWidgetTestWrapper
            entity={EntityType.AUDIT_LOG}
            availableFilters={[
                {
                    filterFieldSource: FilterFieldSource.Property,
                    searchFieldData: [
                        {
                            fieldIdentifier: 'AUDIT_LOG_ACTOR_DELEGATE_IDENTIFIER',
                            fieldLabel: 'Delegate',
                            type: FilterFieldType.String,
                            conditions: [FilterConditionOperator.Equals],
                        },
                    ],
                },
            ]}
            onFilterUpdate={(updated) => {
                filters = updated;
            }}
        />,
    );
    await page.getByTestId('select-group-trigger').click();
    await page.getByRole('option', { name: 'Property', exact: true }).click();
    await page.getByTestId('select-field-trigger').click();
    await page.getByRole('option', { name: 'Delegate', exact: true }).click();
    await page.getByTestId('select-conditions-trigger').click();
    await page.getByRole('option', { name: 'Equals', exact: true }).click();
    await page.getByPlaceholder('Enter filter value').focus();
    await page.getByPlaceholder('Enter filter value').fill('automation');
    await page.getByRole('button', { name: 'Add', exact: true }).click();

    await expect
        .poll(() => filters)
        .toEqual([
            {
                fieldSource: FilterFieldSource.Property,
                fieldIdentifier: 'AUDIT_LOG_ACTOR_DELEGATE_IDENTIFIER',
                condition: FilterConditionOperator.Equals,
                value: 'automation',
            },
        ]);
    await expect(page.getByTestId('badge')).toContainText("'Delegate'");
});
