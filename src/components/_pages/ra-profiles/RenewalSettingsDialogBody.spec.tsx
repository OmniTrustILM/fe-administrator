import type { JSX } from 'react';
import type { Locator } from '@playwright/test';

import type { RaProfileResponseModel } from 'types/ra-profiles';
import { expect, test } from '../../../../playwright/ct-test';
import {
    RenewalSettingsDialogBodyTestWrapper,
    type RenewalSettingsDialogBodyTestWrapperProps,
} from './RenewalSettingsDialogBodyTestWrapper';

function buildRaProfile(overrides: Partial<NonNullable<RaProfileResponseModel['renewalSettings']>> = {}): RaProfileResponseModel {
    return {
        uuid: 'ra-uuid-1',
        name: 'Test RA Profile',
        authorityInstanceUuid: 'authority-uuid-1',
        enabled: true,
        attributes: [],
        certificateValidationSettings: { usePlatformSettings: true, enabled: false },
        renewalSettings: {
            windowEnabled: false,
            windowStartPercent: 67,
            windowEndPercent: 80,
            useAuthorityRenewalInfo: false,
            authorityRenewalInfoSupported: true,
            autoRenewalEnabled: true,
            autoRenewalMaxAttempts: 9,
            ...overrides,
        },
    } as RaProfileResponseModel;
}

async function setField(component: Locator, id: string, value: string) {
    const input = component.getByTestId(`text-input-${id}`);
    await input.click();
    await input.fill(value);
}

function mountDialog(
    mount: (component: JSX.Element) => Promise<Locator>,
    props: Partial<RenewalSettingsDialogBodyTestWrapperProps> = {},
): Promise<Locator> {
    return mount(<RenewalSettingsDialogBodyTestWrapper {...{ raProfile: buildRaProfile(), ...props }} />);
}

test.describe('RenewalSettingsDialogBody', () => {
    test('renders nothing without an RA profile', async ({ mount }) => {
        const component = await mountDialog(mount, { raProfile: undefined });

        await expect(component.getByRole('button', { name: 'Save' })).not.toBeVisible();
    });

    test('Save is disabled until something changes', async ({ mount }) => {
        const component = await mountDialog(mount);

        await expect(component.getByRole('button', { name: 'Save' })).toBeDisabled();

        await component.getByText('Enable Renewal Window').click();

        await expect(component.getByRole('button', { name: 'Save' })).toBeEnabled();
    });

    test('refuses a window whose start equals its end and does not submit', async ({ mount }) => {
        const payloads: unknown[] = [];
        const component = await mountDialog(mount, {
            raProfile: buildRaProfile({ windowEnabled: true }),
            onUpdateRenewalSettings: (payload) => payloads.push(payload),
        });

        await setField(component, 'windowStartPercent', '80');
        await setField(component, 'windowEndPercent', '80');
        await component.getByRole('button', { name: 'Save' }).click();

        await expect(component.getByText('End must be greater than start')).toBeVisible();
        expect(payloads).toHaveLength(0);
    });

    test('refuses percentages outside 1 to 99', async ({ mount }) => {
        const payloads: unknown[] = [];
        const component = await mountDialog(mount, {
            raProfile: buildRaProfile({ windowEnabled: true }),
            onUpdateRenewalSettings: (payload) => payloads.push(payload),
        });

        await setField(component, 'windowStartPercent', '0');
        await setField(component, 'windowEndPercent', '100');
        await component.getByRole('button', { name: 'Save' }).click();

        await expect(component.getByText('Value must be between 1 and 99')).toHaveCount(2);
        expect(payloads).toHaveLength(0);
    });

    test('disables the authority switch and explains why when the authority does not support renewal information', async ({ mount }) => {
        const component = await mountDialog(mount, { raProfile: buildRaProfile({ authorityRenewalInfoSupported: false }) });

        await expect(component.locator('#useAuthorityRenewalInfo')).toBeDisabled();
        await expect(component.getByTestId('authority-renewal-info-unsupported')).toBeVisible();
    });

    test('keeps the authority switch usable while it is on, so an unsupported setting can be cleared', async ({ mount }) => {
        const payloads: unknown[] = [];
        const component = await mountDialog(mount, {
            raProfile: buildRaProfile({ authorityRenewalInfoSupported: false, useAuthorityRenewalInfo: true }),
            onUpdateRenewalSettings: (payload) => payloads.push(payload),
        });

        await expect(component.locator('#useAuthorityRenewalInfo')).toBeEnabled();
        await component.getByText('Use Renewal Window From Certificate Authority').click();
        await expect(component.getByTestId('authority-renewal-info-unsupported')).toBeVisible();
        await expect(component.locator('#useAuthorityRenewalInfo')).toBeDisabled();
        await component.getByRole('button', { name: 'Save' }).click();

        await expect.poll(() => payloads.length).toBe(1);
        expect((payloads[0] as any).renewalSettings.useAuthorityRenewalInfo).toBe(false);
    });

    test('enables the authority switch without a hint when the authority supports renewal information', async ({ mount }) => {
        const component = await mountDialog(mount);

        await expect(component.locator('#useAuthorityRenewalInfo')).toBeEnabled();
        await expect(component.getByTestId('authority-renewal-info-unsupported')).not.toBeVisible();
    });

    test('submits the edited window together with the stored automatic renewal values', async ({ mount }) => {
        const payloads: unknown[] = [];
        let closed = false;
        const component = await mountDialog(mount, {
            onUpdateRenewalSettings: (payload) => payloads.push(payload),
            onClose: () => {
                closed = true;
            },
        });

        await component.getByText('Enable Renewal Window').click();
        await setField(component, 'windowStartPercent', '60');
        await setField(component, 'windowEndPercent', '85');
        await component.getByText('Use Renewal Window From Certificate Authority').click();
        await component.getByRole('button', { name: 'Save' }).click();

        await expect.poll(() => payloads.length).toBe(1);
        expect(payloads[0]).toEqual({
            profileUuid: 'ra-uuid-1',
            authorityInstanceUuid: 'authority-uuid-1',
            renewalSettings: {
                windowEnabled: true,
                windowStartPercent: 60,
                windowEndPercent: 85,
                useAuthorityRenewalInfo: true,
                autoRenewalEnabled: true,
                autoRenewalMaxAttempts: 9,
            },
        });
        expect(closed).toBe(true);
    });

    test('shows the stored automatic renewal values', async ({ mount }) => {
        const component = await mountDialog(mount);

        await expect(component.locator('#autoRenewalEnabled')).toBeChecked();
        await expect(component.getByTestId('text-input-autoRenewalMaxAttempts')).toHaveValue('9');
    });

    test('disables the maximum attempts while automatic renewal is off', async ({ mount }) => {
        const component = await mountDialog(mount, { raProfile: buildRaProfile({ autoRenewalEnabled: false }) });

        await expect(component.getByTestId('text-input-autoRenewalMaxAttempts')).toBeDisabled();
    });

    test('submits the edited automatic renewal settings', async ({ mount }) => {
        const payloads: unknown[] = [];
        const component = await mountDialog(mount, {
            raProfile: buildRaProfile({ autoRenewalEnabled: false, autoRenewalMaxAttempts: 5 }),
            onUpdateRenewalSettings: (payload) => payloads.push(payload),
        });

        await component.getByText('Enable Automatic Renewal').click();
        await setField(component, 'autoRenewalMaxAttempts', '12');
        await component.getByRole('button', { name: 'Save' }).click();

        await expect.poll(() => payloads.length).toBe(1);
        expect((payloads[0] as any).renewalSettings).toMatchObject({ autoRenewalEnabled: true, autoRenewalMaxAttempts: 12 });
    });

    test('submits the stored maximum attempts when automatic renewal is switched off with an invalid value', async ({ mount }) => {
        const payloads: unknown[] = [];
        const component = await mountDialog(mount, { onUpdateRenewalSettings: (payload) => payloads.push(payload) });

        await setField(component, 'autoRenewalMaxAttempts', '25');
        await component.getByText('Enable Automatic Renewal').click();
        await component.getByRole('button', { name: 'Save' }).click();

        await expect.poll(() => payloads.length).toBe(1);
        expect((payloads[0] as any).renewalSettings).toMatchObject({ autoRenewalEnabled: false, autoRenewalMaxAttempts: 9 });
    });

    test('submits the stored window percentages when the window is switched off with invalid values', async ({ mount }) => {
        const payloads: unknown[] = [];
        const component = await mountDialog(mount, {
            raProfile: buildRaProfile({ windowEnabled: true }),
            onUpdateRenewalSettings: (payload) => payloads.push(payload),
        });

        await setField(component, 'windowStartPercent', '150');
        await component.getByText('Enable Renewal Window').click();
        await component.getByRole('button', { name: 'Save' }).click();

        await expect.poll(() => payloads.length).toBe(1);
        expect((payloads[0] as any).renewalSettings).toMatchObject({
            windowEnabled: false,
            windowStartPercent: 67,
            windowEndPercent: 80,
        });
    });

    for (const value of ['0', '21', '2.5']) {
        test(`refuses ${value} as the maximum attempts`, async ({ mount }) => {
            const payloads: unknown[] = [];
            const component = await mountDialog(mount, { onUpdateRenewalSettings: (payload) => payloads.push(payload) });

            await setField(component, 'autoRenewalMaxAttempts', value);
            await component.getByRole('button', { name: 'Save' }).click();

            await expect(component.getByTestId('text-input-autoRenewalMaxAttempts')).toHaveAttribute('aria-invalid', 'true');
            expect(payloads).toHaveLength(0);
        });
    }
});
