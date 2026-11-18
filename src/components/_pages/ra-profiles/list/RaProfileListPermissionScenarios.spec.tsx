import { test } from '../../../../../playwright/ct-test';
import { expectOnlyOffered } from 'components/_pages/test-utils/permissionScenarioAssertions';
import {
    administrator,
    createOnly,
    objectGrant,
    type OfferedControls,
    offeredTitle,
    type PermissionScenario,
    readOnly,
} from 'components/_pages/test-utils/permissionScenarios';
import { Resource, ResourceAction } from 'types/openapi';
import RaProfileListWithStore from './RaProfileListWithStore';

const onSelection = ['trash', 'check', 'times'] as const;
const controls = ['plus', ...onSelection, 'gavel'] as const;

const readGrant = [ResourceAction.List, ResourceAction.Detail];

// RA profiles take grants per object, so the server decides delete, enable and disable on the selection, while creating
// follows the profile and the compliance check follows the compliance profile grant, as on the detail page. Core lists an
// RA profile only to a user who may read it and its authority, so both users hold that besides their compliance grant.
const complianceGrantOn = (resource: Resource): PermissionScenario => ({
    name: `reader of RA profiles allowed to check compliance on ${resource}`,
    allowedListings: [Resource.RaProfiles, Resource.Authorities],
    grants: [
        {
            resource: Resource.RaProfiles,
            actions: resource === Resource.RaProfiles ? [...readGrant, ResourceAction.CheckCompliance] : readGrant,
        },
        { resource: Resource.Authorities, actions: readGrant },
        ...(resource === Resource.RaProfiles ? [] : [{ resource, actions: [ResourceAction.CheckCompliance] }]),
    ],
    objectActions: {},
});

const raProfileListOffers: OfferedControls<(typeof controls)[number]>[] = [
    { scenario: administrator, offered: [...controls] },
    { scenario: readOnly, offered: [...onSelection] },
    { scenario: createOnly, offered: ['plus', ...onSelection] },
    { scenario: objectGrant, offered: [...onSelection] },
    { scenario: complianceGrantOn(Resource.ComplianceProfiles), offered: [...onSelection, 'gavel'] },
    { scenario: complianceGrantOn(Resource.RaProfiles), offered: [...onSelection] },
];

test.describe('RaProfileList actions by permission scenario', () => {
    for (const { scenario, offered } of raProfileListOffers) {
        test(offeredTitle({ scenario, offered }), async ({ mount }) => {
            const component = await mount(<RaProfileListWithStore scenario={scenario} />);

            await expectOnlyOffered(component, controls, offered);
        });
    }
});
