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

const sections = ['certificates', 'keys', 'secrets'] as const;

const expectations: { scenario: PermissionScenario; shown: (typeof sections)[number][] }[] = [
    { scenario: administrator, shown: ['certificates', 'keys', 'secrets'] },
    { scenario: readOnly, shown: ['certificates', 'keys', 'secrets'] },
    { scenario: owner, shown: ['certificates', 'keys', 'secrets'] },
    { scenario: createOnly, shown: ['certificates', 'keys', 'secrets'] },
    { scenario: groupMember, shown: ['certificates', 'keys', 'secrets'] },
    { scenario: objectGrant, shown: [] },
];

test.describe('Sidebar sections by permission scenario', () => {
    for (const { scenario, shown } of expectations) {
        test(`shows ${shown.join(', ') || 'none of certificates, keys and secrets'} to a ${scenario.name}`, async ({ mount }) => {
            const component = await mount(
                withProviders(<Sidebar allowedResources={scenario.allowedListings} />, { store: createMockStore(), initialRoute: '/' }),
            );

            for (const section of sections) {
                await expect(component.getByTestId(`sidebar-${section}`)).toHaveCount(shown.includes(section) ? 1 : 0);
            }
        });
    }
});
