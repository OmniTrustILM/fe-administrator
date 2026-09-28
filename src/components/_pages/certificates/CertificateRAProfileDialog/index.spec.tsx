import type { Page } from '@playwright/test';
import { testInitialState } from 'ducks/test-reducers';
import type { AttributeDescriptorModel } from 'types/attributes';
import { AttributeContentType, AttributeType } from 'types/openapi';
import { expect, test } from '../../../../../playwright/ct-test';
import { CertificateRAProfileDialogTestWrapper } from './CertificateRAProfileDialogTestWrapper';

const identifyDescriptor: AttributeDescriptorModel = {
    type: AttributeType.Data,
    name: 'identifyField',
    uuid: 'identify-data-uuid-1',
    contentType: AttributeContentType.String,
    properties: { label: 'Identify Field', required: false, readOnly: false, visible: true, list: false, multiSelect: false },
} as AttributeDescriptorModel;

const withIdentifySchema = { certificates: { ...testInitialState.certificates, identifyAttributes: [identifyDescriptor] } };

const dispatched = async (page: Page): Promise<{ type: string; payload?: unknown }[]> =>
    JSON.parse((await page.getByTestId('dispatched').textContent()) ?? '[]');

const pickRaProfile = async (page: Page, name: string) => {
    await page.getByTestId('select-raProfile-trigger').click();
    await page.getByRole('option', { name }).click();
};

test.describe('CertificateRAProfileDialog', () => {
    test('a certificate opens on its current profile and asks for no schema until another one is picked', async ({ mount, page }) => {
        await mount(<CertificateRAProfileDialogTestWrapper preloadedState={withIdentifySchema} />);

        await expect(page.getByTestId('select-raProfile-input')).toHaveValue('ra-1:#auth-1');
        await expect(page.getByRole('button', { name: 'Remove' })).toHaveCount(0);
        await expect(page.getByText('Identify Attributes')).toHaveCount(0);
        expect((await dispatched(page)).filter((a) => a.type === 'certificates/getIdentifyAttributes')).toEqual([]);
    });

    test('picking another profile asks for its identify schema and sends the entered values with the update', async ({ mount, page }) => {
        await mount(<CertificateRAProfileDialogTestWrapper preloadedState={withIdentifySchema} />);

        await pickRaProfile(page, 'RA Two');

        await expect
            .poll(() => dispatched(page))
            .toContainEqual({ type: 'certificates/getIdentifyAttributes', payload: { raProfileUuid: 'ra-2', authorityUuid: 'auth-2' } });
        await expect(page.getByText('Identify Attributes')).toBeVisible();
        const field = page.getByTestId('text-input-__attributes__identify__.identifyField');
        await field.click();
        await field.fill('id-value');
        await page.getByTestId('raProfileSubmit').click();

        await expect(page.getByTestId('closed')).toHaveText('update');
        const update = (await dispatched(page)).find((a) => a.type === 'certificates/updateRaProfile');
        expect(update?.payload).toMatchObject({
            uuid: 'certificate-uuid',
            authorityUuid: 'auth-2',
            updateRaProfileRequest: { raProfileUuid: 'ra-2', attributes: [{ name: 'identifyField', content: [{ data: 'id-value' }] }] },
        });
    });

    test('an empty identify schema shows no section and the update carries no attributes', async ({ mount, page }) => {
        await mount(<CertificateRAProfileDialogTestWrapper />);

        await pickRaProfile(page, 'RA Two');
        await expect(page.getByText('Identify Attributes')).toHaveCount(0);
        await page.getByTestId('raProfileSubmit').click();

        await expect(page.getByTestId('closed')).toHaveText('update');
        const update = (await dispatched(page)).find((a) => a.type === 'certificates/updateRaProfile');
        expect(update?.payload).toMatchObject({ updateRaProfileRequest: { raProfileUuid: 'ra-2', attributes: [] } });
    });

    test('a selection starts empty, offers Remove, and one identify set goes out with the whole batch', async ({ mount, page }) => {
        await mount(
            <CertificateRAProfileDialogTestWrapper
                target={{ kind: 'selection', uuids: ['c-1', 'c-2'] }}
                preloadedState={withIdentifySchema}
            />,
        );

        await expect(page.getByTestId('raProfileSubmit')).toBeDisabled();
        await expect(page.getByRole('button', { name: 'Remove' })).toBeVisible();
        await expect(page.getByText('Identify Attributes')).toHaveCount(0);

        await pickRaProfile(page, 'RA One');
        await expect(page.getByText('Identify Attributes')).toBeVisible();
        const field = page.getByTestId('text-input-__attributes__identify__.identifyField');
        await field.click();
        await field.fill('batch-value');
        await page.getByTestId('raProfileSubmit').click();

        await expect(page.getByTestId('closed')).toHaveText('update');
        const update = (await dispatched(page)).find((a) => a.type === 'certificates/bulkUpdateRaProfile');
        expect(update?.payload).toMatchObject({
            authorityUuid: 'auth-1',
            raProfileRequest: {
                certificateUuids: ['c-1', 'c-2'],
                raProfileUuid: 'ra-1',
                attributes: [{ name: 'identifyField', content: [{ data: 'batch-value' }] }],
            },
        });
    });

    test('Remove clears the profile of the selection without an update', async ({ mount, page }) => {
        await mount(<CertificateRAProfileDialogTestWrapper target={{ kind: 'selection', uuids: ['c-1'] }} />);

        await page.getByRole('button', { name: 'Remove' }).click();

        await expect(page.getByTestId('closed')).toHaveText('update');
        const types = (await dispatched(page)).map((a) => a.type);
        expect(types).toContain('certificates/bulkDeleteRaProfile');
        expect(types).not.toContain('certificates/bulkUpdateRaProfile');
    });
});
