import type { Locator } from '@playwright/test';
import { test } from '../../../../../playwright/ct-test';
import { expectOffered } from 'components/_pages/test-utils/permissionScenarioAssertions';
import {
    administrator,
    createOnly,
    groupMember,
    owner,
    type PermissionScenario,
    readOnly,
} from 'components/_pages/test-utils/permissionScenarios';
import CertificateDetailScenarioWithStore from './CertificateDetailScenarioWithStore';

const byTestId = (id: string) => (root: Locator) => root.getByTestId(`${id}-button`);
const byName = (name: string) => (root: Locator) => root.getByRole('button', { name, exact: true });

const controls = {
    trash: byTestId('trash'),
    retweet: byTestId('retweet'),
    rekey: byTestId('rekey'),
    'minus-square': byTestId('minus-square'),
    gavel: byTestId('gavel'),
    archive: byTestId('archive'),
    'Update Owner': byName('Update Owner'),
    'Update Group': byName('Update Group'),
    'Update RA Profile': byName('Update RA Profile'),
} as const;

type Control = keyof typeof controls;
const allControls = Object.keys(controls) as Control[];

// An owner holds update and archive on the certificate it owns, but deleting, renewing, revoking and the compliance check
// still need a grant.
const expectations: { scenario: PermissionScenario; offered: Control[] }[] = [
    { scenario: administrator, offered: allControls },
    { scenario: readOnly, offered: [] },
    { scenario: owner, offered: ['archive', 'Update Owner', 'Update Group', 'Update RA Profile'] },
    { scenario: createOnly, offered: [] },
    { scenario: groupMember, offered: [] },
];

test.describe('CertificateDetail actions by permission scenario', () => {
    for (const { scenario, offered } of expectations) {
        test(`offers ${offered.join(', ') || 'no action'} to a ${scenario.name}`, async ({ mount }) => {
            const component = await mount(<CertificateDetailScenarioWithStore scenario={scenario.name} />);

            for (const control of allControls) {
                await expectOffered(controls[control](component), offered.includes(control));
            }
        });
    }
});
