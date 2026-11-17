import { test } from '../../../../../playwright/ct-test';
import { expectOffered } from 'components/_pages/test-utils/permissionScenarioAssertions';
import { administrator, objectGrant, type PermissionScenario, readOnly } from 'components/_pages/test-utils/permissionScenarios';
import SigningProfileDetailWithStore from './SigningProfileDetailWithStore';

const controls = ['edit', 'delete', 'disable'] as const;

const expectations: { scenario: PermissionScenario; offered: (typeof controls)[number][] }[] = [
    { scenario: administrator, offered: [...controls] },
    { scenario: readOnly, offered: [] },
    { scenario: objectGrant, offered: ['edit', 'disable'] },
];

test.describe('SigningProfileDetail actions by permission scenario', () => {
    for (const { scenario, offered } of expectations) {
        test(`offers ${offered.join(', ') || 'no action'} to a ${scenario.name}`, async ({ mount }) => {
            const component = await mount(<SigningProfileDetailWithStore scenario={scenario.name} />);

            for (const control of controls) {
                await expectOffered(component.getByTestId(`${control}-button`), offered.includes(control));
            }
        });
    }
});

const permitted = [administrator, objectGrant];

test.describe('SigningProfileDetail state-gated actions by permission scenario', () => {
    for (const scenario of expectations.map(({ scenario }) => scenario)) {
        const offered = permitted.includes(scenario);

        test(`${offered ? 'offers' : 'withholds'} enabling a disabled profile to a ${scenario.name}`, async ({ mount }) => {
            const component = await mount(<SigningProfileDetailWithStore scenario={scenario.name} variant="disabled" />);

            await expectOffered(component.getByTestId('enable-button'), offered);
        });

        test(`${offered ? 'offers' : 'withholds'} activating a protocol to a ${scenario.name}`, async ({ mount, page }) => {
            const component = await mount(<SigningProfileDetailWithStore scenario={scenario.name} />);
            await page.getByRole('tab', { name: 'Protocols' }).click();

            await expectOffered(component.getByRole('button', { name: 'Activate', exact: true }), offered);
        });
    }
});
