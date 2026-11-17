import { test, expect } from '../../../../playwright/ct-test';
import {
    administrator,
    createOnly,
    groupMember,
    objectGrant,
    owner,
    type PermissionScenario,
    readOnly,
} from 'components/_pages/test-utils/permissionScenarios';
import { createMockStore, withProviders } from 'utils/test-helpers';
import Sidebar from './index';

const entries = {
    certificates: 'sidebar-certificates',
    keys: 'sidebar-keys',
    secrets: 'sidebar-secrets',
    'RA profiles': 'sidebar-profiles-raprofiles',
    'signing profiles': 'sidebar-profiles-signingprofiles',
} as const;

type Entry = keyof typeof entries;
const owned: Entry[] = ['certificates', 'keys', 'secrets'];
const profiles: Entry[] = ['RA profiles', 'signing profiles'];

const expectations: { scenario: PermissionScenario; shown: Entry[] }[] = [
    { scenario: administrator, shown: [...owned, ...profiles] },
    { scenario: readOnly, shown: [...owned, ...profiles] },
    { scenario: owner, shown: owned },
    { scenario: createOnly, shown: owned },
    { scenario: groupMember, shown: owned },
    { scenario: objectGrant, shown: profiles },
];

test.describe('Sidebar sections by permission scenario', () => {
    for (const { scenario, shown } of expectations) {
        test(`shows ${shown.join(', ')} to a ${scenario.name}`, async ({ mount }) => {
            const component = await mount(
                withProviders(<Sidebar allowedResources={scenario.allowedListings} />, { store: createMockStore(), initialRoute: '/' }),
            );

            for (const [entry, testId] of Object.entries(entries) as [Entry, string][]) {
                await expect(component.getByTestId(testId)).toHaveCount(shown.includes(entry) ? 1 : 0);
            }
        });
    }
});
