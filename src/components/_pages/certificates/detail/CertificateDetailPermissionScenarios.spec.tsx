import type { Locator } from '@playwright/test';
import { test } from '../../../../../playwright/ct-test';
import { expectOffered, expectOnlyOffered } from 'components/_pages/test-utils/permissionScenarioAssertions';
import {
    administrator,
    createOnly,
    groupMember,
    owner,
    type OfferedControls,
    offeredTitle,
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
const expectations: OfferedControls<Control>[] = [
    { scenario: administrator, offered: allControls },
    { scenario: readOnly, offered: [] },
    { scenario: owner, offered: ['archive', 'Update Owner', 'Update Group', 'Update RA Profile'] },
    { scenario: createOnly, offered: [] },
    { scenario: groupMember, offered: [] },
];

test.describe('CertificateDetail actions by permission scenario', () => {
    for (const { scenario, offered } of expectations) {
        test(offeredTitle({ scenario, offered }), async ({ mount }) => {
            const component = await mount(<CertificateDetailScenarioWithStore scenario={scenario.name} />);

            await expectOnlyOffered(component, allControls, offered, (root, control) => controls[control](root));
        });
    }
});

// An owner holds archive but not issue, so it may unarchive its certificate but neither issue nor complete it.
const stateGated = [
    { variant: 'requested', control: 'cubes', permitted: [administrator] },
    { variant: 'registered', control: 'check', permitted: [administrator] },
    { variant: 'archived', control: 'unarchive', permitted: [administrator, owner] },
] as const;

test.describe('CertificateDetail state-gated actions by permission scenario', () => {
    for (const { variant, control, permitted } of stateGated) {
        for (const scenario of [administrator, readOnly, owner]) {
            const offered = (permitted as readonly PermissionScenario[]).includes(scenario);
            test(`${offered ? 'offers' : 'withholds'} ${control} on a ${variant} certificate to a ${scenario.name}`, async ({ mount }) => {
                const component = await mount(<CertificateDetailScenarioWithStore scenario={scenario.name} variant={variant} />);

                await expectOffered(component.getByTestId(`${control}-button`), offered);
            });
        }
    }
});
