import type { JSX } from 'react';
import type { Locator } from '@playwright/test';

import type { RaProfileResponseModel } from 'types/ra-profiles';
import type { SettingsPlatformModel } from 'types/settings';
import { AttributeSetMergeMode } from 'types/openapi';
import { expect, test } from '../../../../playwright/ct-test';
import {
    RequestValidationDialogBodyTestWrapper,
    type RequestValidationDialogBodyTestWrapperProps,
} from './RequestValidationDialogBodyTestWrapper';

// ── fixtures ──────────────────────────────────────────────────────────────────

function buildRaProfile(externalCsrValidationStrict?: boolean | null): RaProfileResponseModel {
    return {
        uuid: 'ra-uuid-1',
        name: 'Test RA Profile',
        authorityInstanceUuid: 'authority-uuid-1',
        authorityInstanceName: 'Test Authority',
        enabled: true,
        attributes: [],
        certificateValidationSettings: { usePlatformSettings: true, enabled: false },
        certificateRequestAttributes: {
            mergeMode: AttributeSetMergeMode.Merge,
            externalCsrValidationStrict: externalCsrValidationStrict as boolean | undefined,
        },
    } as RaProfileResponseModel;
}

const PLATFORM_SETTINGS: SettingsPlatformModel = {
    certificates: {
        requestAttributes: {
            externalCsrValidationStrict: false,
        },
    },
} as SettingsPlatformModel;

// ── helpers ───────────────────────────────────────────────────────────────────

function mountDialog(
    mount: (component: JSX.Element) => Promise<Locator>,
    props: Partial<RequestValidationDialogBodyTestWrapperProps> = {},
): Promise<Locator> {
    return mount(
        <RequestValidationDialogBodyTestWrapper {...{ raProfile: buildRaProfile(), platformSettings: PLATFORM_SETTINGS, ...props }} />,
    );
}

// ── tests ─────────────────────────────────────────────────────────────────────

test.describe('RequestValidationDialogBody', () => {
    test('renders nothing without an RA profile', async ({ mount }) => {
        const component = await mountDialog(mount, { raProfile: undefined });

        await expect(component.getByRole('button', { name: 'Save' })).not.toBeVisible();
    });

    test('inherited strictness: platform switch is on and current platform mode is shown', async ({ mount }) => {
        const component = await mountDialog(mount, { raProfile: buildRaProfile(undefined) });

        await expect(component.getByText('Use Platform Request Validation Settings')).toBeVisible();
        await expect(component.getByText('Current Platform Settings')).toBeVisible();
        await expect(component.getByText('Lenient')).toBeVisible();
    });

    test('explicit strictness: platform switch is off and the profile mode is preselected', async ({ mount }) => {
        const component = await mountDialog(mount, { raProfile: buildRaProfile(true) });

        await expect(component.getByTestId('request-validation-strict')).toBeVisible();
        await expect(component.locator('input[type="radio"]').first()).toBeChecked();
        await expect(component.locator('input[type="radio"]').nth(1)).not.toBeChecked();
    });

    test('Save is disabled until something changes', async ({ mount }) => {
        const component = await mountDialog(mount, { raProfile: buildRaProfile(true) });

        await expect(component.getByRole('button', { name: 'Save' })).toBeDisabled();

        await component.getByTestId('request-validation-lenient').click();

        await expect(component.getByRole('button', { name: 'Save' })).toBeEnabled();
    });

    test('turning platform settings off and saving dispatches an explicit strict flag', async ({ mount }) => {
        const updates: any[] = [];
        let closed = false;
        const component = await mountDialog(mount, {
            raProfile: buildRaProfile(undefined),
            onUpdateRequestAttributes: (payload) => updates.push(payload),
            onClose: () => {
                closed = true;
            },
        });

        await component.getByText('Use Platform Request Validation Settings').click();
        await component.getByTestId('request-validation-strict').click();
        await component.getByRole('button', { name: 'Save' }).click();

        await expect.poll(() => updates.length, { timeout: 3000 }).toBe(1);
        expect(updates[0]).toMatchObject({
            profileUuid: 'ra-uuid-1',
            authorityInstanceUuid: 'authority-uuid-1',
            requestAttributes: { externalCsrValidationStrict: true, mergeMode: AttributeSetMergeMode.Merge },
        });
        expect(closed).toBe(true);
    });

    test('turning platform settings on and saving dispatches null (inherit)', async ({ mount }) => {
        const updates: any[] = [];
        const component = await mountDialog(mount, {
            raProfile: buildRaProfile(true),
            onUpdateRequestAttributes: (payload) => updates.push(payload),
        });

        await component.getByText('Use Platform Request Validation Settings').click();
        await component.getByRole('button', { name: 'Save' }).click();

        await expect.poll(() => updates.length, { timeout: 3000 }).toBe(1);
        expect(updates[0].requestAttributes.externalCsrValidationStrict).toBeNull();
    });

    test('calls onClose when Cancel is clicked without dispatching an update', async ({ mount }) => {
        const updates: any[] = [];
        let closed = false;
        const component = await mountDialog(mount, {
            onUpdateRequestAttributes: (payload) => updates.push(payload),
            onClose: () => {
                closed = true;
            },
        });

        await component.getByRole('button', { name: 'Cancel' }).click();

        expect(closed).toBe(true);
        expect(updates).toHaveLength(0);
    });

    test('Save is disabled while an update is in progress', async ({ mount }) => {
        const component = await mountDialog(mount, { raProfile: buildRaProfile(true), isUpdating: true });

        await expect(component.getByRole('button', { name: /Saving|Save/ })).toBeDisabled();
    });
});
