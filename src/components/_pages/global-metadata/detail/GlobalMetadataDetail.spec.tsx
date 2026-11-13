import { ResourceAction } from 'types/openapi';
import { expect, test } from '../../../../../playwright/ct-test';
import GlobalMetadataDetailWithStore from './GlobalMetadataDetailWithStore';

test.describe('GlobalMetadataDetail actions by permission', () => {
    test('disables Edit and Delete for a user who may only view the metadata', async ({ mount, page }) => {
        await mount(<GlobalMetadataDetailWithStore allowedActions={[ResourceAction.Detail]} />);

        await expect(page.getByTestId('pencil-button')).toBeDisabled();
        await expect(page.getByTestId('trash-button')).toBeDisabled();
    });

    test('offers Delete on update, which core never reports as delete for metadata', async ({ mount, page }) => {
        await mount(<GlobalMetadataDetailWithStore allowedActions={[ResourceAction.Detail, ResourceAction.Update]} />);

        await expect(page.getByTestId('pencil-button')).toBeEnabled();
        await expect(page.getByTestId('trash-button')).toBeEnabled();
    });
});
