import type { Locator } from '@playwright/test';
import { test } from '../../../../../playwright/ct-test';
import { expectOffered, expectOnlyOffered } from 'components/_pages/test-utils/permissionScenarioAssertions';
import { administrator, createOnly, type OfferedControls, offeredTitle, readOnly } from 'components/_pages/test-utils/permissionScenarios';
import SecretDetailWithStore from './SecretDetailWithStore';

const byTestId = (id: string) => (root: Locator) => root.getByTestId(`${id}-button`);
const byName = (name: string) => (root: Locator) => root.getByRole('button', { name, exact: true });

const controls = {
    eye: byTestId('eye'),
    times: byTestId('times'),
    gavel: byTestId('gavel'),
    pencil: byTestId('pencil'),
    trash: byTestId('trash'),
    plus: byTestId('plus'),
    'Update Owner': byName('Update Owner'),
    'Update Groups': byName('Update Groups'),
    'Update Source Vault Profile': byName('Update Source Vault Profile'),
} as const;

type Control = keyof typeof controls;
const allControls = Object.keys(controls) as Control[];

// Core checks the secret detail against the resource alone, so it never shows the page to an owner or group member
// without a grant; the list specs cover them.
const expectations: OfferedControls<Control>[] = [
    { scenario: administrator, offered: allControls },
    { scenario: readOnly, offered: [] },
    { scenario: createOnly, offered: [] },
];

test.describe('SecretDetail actions by permission scenario', () => {
    for (const { scenario, offered } of expectations) {
        test(offeredTitle({ scenario, offered }), async ({ mount }) => {
            const component = await mount(<SecretDetailWithStore scenario={scenario.name} />);

            await expectOnlyOffered(component, allControls, offered, (root, control) => controls[control](root));
        });
    }

    for (const { scenario, offered } of [
        { scenario: administrator, offered: true },
        { scenario: readOnly, offered: false },
    ]) {
        test(`${offered ? 'offers' : 'withholds'} enabling a disabled secret to a ${scenario.name}`, async ({ mount }) => {
            const component = await mount(<SecretDetailWithStore scenario={scenario.name} variant="disabled" />);

            await expectOffered(component.getByTestId('check-button'), offered);
        });
    }
});
