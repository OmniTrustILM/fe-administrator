import { expect, test } from '../../../../../playwright/ct-test';
import { actions as certificateActions } from 'ducks/certificates';
import { actions as raProfilesActions } from 'ducks/ra-profiles';
import type { Locator } from '@playwright/test';
import { EarlyRenewalDialogTestWrapper } from './EarlyRenewalDialogTestWrapper';

const raTarget = { kind: 'raProfile', authorityUuid: 'auth-1', raProfileUuid: 'ra-1', name: 'Web' } as const;
const selectionTarget = { kind: 'selection', uuids: ['c-1', 'c-2'] } as const;

// The input is read-only until focused, so it is clicked before it is filled.
async function fillField(field: Locator, value: string) {
    await field.click();
    await field.fill(value);
}

test.describe('EarlyRenewalDialog', () => {
    test('states the effect and defaults the spread to 24 hours', async ({ mount }) => {
        const component = await mount(<EarlyRenewalDialogTestWrapper target={raTarget} />);

        await expect(component.getByTestId('text-input-spreadHours')).toHaveValue('24');
        await expect(component.getByTestId('early-renewal-effect')).toContainText('nothing is revoked');
        await expect(component.getByTestId('early-renewal-effect')).toContainText('now + 24 h');
    });

    test('sends the RA profile request with the spread converted to seconds', async ({ mount }) => {
        const dispatched: { type: string; payload: unknown }[] = [];
        const component = await mount(<EarlyRenewalDialogTestWrapper target={raTarget} onDispatched={(a) => dispatched.push(a)} />);

        await fillField(component.getByTestId('text-input-spreadHours'), '2');
        await fillField(component.getByTestId('text-input-explanationUrl'), 'https://example.com/why');
        await component.getByRole('button', { name: 'Request early renewal' }).click();

        expect(dispatched).toEqual([
            {
                type: raProfilesActions.requestRaProfileEarlyRenewal.type,
                payload: {
                    authorityUuid: 'auth-1',
                    raProfileUuid: 'ra-1',
                    request: { spreadSeconds: 7200, explanationUrl: 'https://example.com/why' },
                },
            },
        ]);
    });

    test('sends the bulk request without an explanation URL when left empty', async ({ mount }) => {
        const dispatched: { type: string; payload: unknown }[] = [];
        const component = await mount(<EarlyRenewalDialogTestWrapper target={selectionTarget} onDispatched={(a) => dispatched.push(a)} />);

        await component.getByRole('button', { name: 'Request early renewal' }).click();

        expect(dispatched).toEqual([
            {
                type: certificateActions.bulkRequestEarlyRenewal.type,
                payload: { uuids: ['c-1', 'c-2'], spreadSeconds: 86400 },
            },
        ]);
    });

    for (const value of ['0', '721', '1.5', '']) {
        test(`refuses a spread of "${value}" hours`, async ({ mount }) => {
            const dispatched: unknown[] = [];
            const component = await mount(
                <EarlyRenewalDialogTestWrapper target={selectionTarget} onDispatched={(a) => dispatched.push(a)} />,
            );

            await fillField(component.getByTestId('text-input-spreadHours'), value);
            await component.getByRole('button', { name: 'Request early renewal' }).click();

            await expect(component.getByText(/Required Field|between 1 and 720|positive integer/).first()).toBeVisible();
            expect(dispatched).toHaveLength(0);
        });
    }

    for (const value of ['720', '1']) {
        test(`accepts a spread of ${value} hours`, async ({ mount }) => {
            const dispatched: { payload: any }[] = [];
            const component = await mount(
                <EarlyRenewalDialogTestWrapper target={selectionTarget} onDispatched={(a) => dispatched.push(a as any)} />,
            );

            await fillField(component.getByTestId('text-input-spreadHours'), value);
            await component.getByRole('button', { name: 'Request early renewal' }).click();

            expect(dispatched[0].payload.spreadSeconds).toBe(Number(value) * 3600);
        });
    }

    for (const url of ['ftp://example.com/x', 'example.com/x', 'javascript:alert(1)']) {
        test(`refuses the explanation URL "${url}"`, async ({ mount }) => {
            const dispatched: unknown[] = [];
            const component = await mount(
                <EarlyRenewalDialogTestWrapper target={selectionTarget} onDispatched={(a) => dispatched.push(a)} />,
            );

            await fillField(component.getByTestId('text-input-explanationUrl'), url);
            await component.getByRole('button', { name: 'Request early renewal' }).click();

            await expect(component.getByText('Value must be an absolute http or https URL')).toBeVisible();
            expect(dispatched).toHaveLength(0);
        });
    }
});
