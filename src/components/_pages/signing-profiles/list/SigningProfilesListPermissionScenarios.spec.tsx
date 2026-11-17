import { test } from '../../../../../playwright/ct-test';
import { expectOnlyOffered } from 'components/_pages/test-utils/permissionScenarioAssertions';
import {
    administrator,
    createOnly,
    objectGrant,
    type OfferedControls,
    offeredTitle,
    readOnly,
} from 'components/_pages/test-utils/permissionScenarios';
import SigningProfilesListWithStore from './SigningProfilesListWithStore';

const onSelection = ['delete', 'check', 'times'] as const;
const controls = ['create', ...onSelection] as const;

// Signing profiles take grants per object, so the server decides every action on the selection and only creating
// follows the profile.
const signingProfileListOffers: OfferedControls<(typeof controls)[number]>[] = [
    { scenario: administrator, offered: [...controls] },
    { scenario: readOnly, offered: [...onSelection] },
    { scenario: createOnly, offered: ['create', ...onSelection] },
    { scenario: objectGrant, offered: [...onSelection] },
];

test.describe('SigningProfilesList actions by permission scenario', () => {
    for (const { scenario, offered } of signingProfileListOffers) {
        test(offeredTitle({ scenario, offered }), async ({ mount }) => {
            const component = await mount(<SigningProfilesListWithStore scenario={scenario.name} />);
            await component
                .getByRole('row', { name: /Signing profile one/ })
                .getByRole('checkbox')
                .check();

            await expectOnlyOffered(component, controls, offered);
        });
    }
});
