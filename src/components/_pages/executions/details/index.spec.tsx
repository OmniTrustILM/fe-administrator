import type { ExecutionModel } from 'types/rules';
import { ExecutionType, Resource } from 'types/openapi';

import { expect, test } from '../../../../../playwright/ct-test';
import { ExecutionDetailsTestWrapper } from './ExecutionDetailsTestWrapper';

const renewExecution = {
    uuid: 'exec-1',
    name: 'renewDue',
    description: '',
    type: ExecutionType.RenewCertificate,
    resource: Resource.Certificates,
    items: [],
} as unknown as ExecutionModel;

test.describe('ExecutionDetails', () => {
    test('describes a renew certificate execution instead of showing items', async ({ mount }) => {
        const component = await mount(<ExecutionDetailsTestWrapper execution={renewExecution} />);

        await expect(component.getByText('Renew certificate')).toBeVisible();
        await expect(component.getByText('Type', { exact: true })).toBeVisible();
        await expect(component.getByText('Items', { exact: true })).toHaveCount(0);
    });
});
