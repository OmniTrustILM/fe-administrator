import { testInitialState } from 'ducks/test-reducers';
import { Resource, ResourceAction } from 'types/openapi';

/** The resources the permission scenarios exercise. */
export const SCENARIO_RESOURCES = [
    Resource.Certificates,
    Resource.Keys,
    Resource.Secrets,
    Resource.RaProfiles,
    Resource.SigningProfiles,
] as const;

export type ScenarioResource = (typeof SCENARIO_RESOURCES)[number];

/**
 * What `/v1/resources` reports for every resource the tested pages gate on. The flags describe the resource, so every
 * user gets the same list.
 */
export const SCENARIO_RESOURCES_LIST = [
    { resource: Resource.Certificates, hasObjectAccess: false, hasOwner: true },
    { resource: Resource.Keys, hasObjectAccess: false, hasOwner: true },
    { resource: Resource.Secrets, hasObjectAccess: false, hasOwner: true },
    { resource: Resource.RaProfiles, hasObjectAccess: true, hasOwner: false },
    { resource: Resource.SigningProfiles, hasObjectAccess: true, hasOwner: false },
    { resource: Resource.ComplianceProfiles, hasObjectAccess: true, hasOwner: false },
    { resource: Resource.ApprovalProfiles, hasObjectAccess: false, hasOwner: false },
];

const OWNED_RESOURCES = [Resource.Certificates, Resource.Keys, Resource.Secrets];

/**
 * One kind of user the permission-aware UI must serve. `allowedListings` and `grants` are the profile Core sends at login, and `objectActions`
 * is Core's allowed-actions answer for the one object a page shows. A resource missing from `objectActions` stands for an
 * object Core leaves out of the answer, because the user may neither list nor view it.
 */
export type PermissionScenario = Readonly<{
    name: string;
    allowedListings: Resource[];
    grants: { resource: Resource; actions: ResourceAction[] }[];
    objectActions: Partial<Record<ScenarioResource, ResourceAction[]>>;
}>;

const ALL_ACTIONS = Object.values(ResourceAction);

const grantOnEach = (actions: ResourceAction[]) => SCENARIO_RESOURCES.map((resource) => ({ resource, actions }));

export const administrator: PermissionScenario = {
    name: 'fully privileged administrator',
    allowedListings: [...SCENARIO_RESOURCES],
    grants: Object.values(Resource).map((resource) => ({ resource, actions: ALL_ACTIONS })),
    objectActions: Object.fromEntries(SCENARIO_RESOURCES.map((resource) => [resource, ALL_ACTIONS])),
};

export const readOnly: PermissionScenario = {
    name: 'read-only role',
    allowedListings: [...SCENARIO_RESOURCES],
    grants: grantOnEach([ResourceAction.List, ResourceAction.Detail]),
    objectActions: Object.fromEntries(SCENARIO_RESOURCES.map((resource) => [resource, [ResourceAction.List, ResourceAction.Detail]])),
};

/**
 * Owns one object of each owned resource and holds no grant. Core admits ownership on the actions that check the object,
 * while the key and secret actions also check the resource, which leaves an owner none of them.
 */
export const owner: PermissionScenario = {
    name: 'owner-only user',
    allowedListings: OWNED_RESOURCES,
    grants: [],
    objectActions: {
        [Resource.Certificates]: [ResourceAction.Detail, ResourceAction.Update, ResourceAction.Archive, ResourceAction.Comment],
        [Resource.Keys]: [],
        [Resource.Secrets]: [],
    },
};

/**
 * Holds create on each resource and nothing else. Core lists a section for create alone only on resources with owners,
 * where it then shows no object.
 */
export const createOnly: PermissionScenario = {
    name: 'create-only user',
    allowedListings: OWNED_RESOURCES,
    grants: grantOnEach([ResourceAction.Create]),
    objectActions: {},
};

/**
 * Holds members on one group the owned resources' objects are assigned to, which admits listing and viewing them. The
 * grant names the group, and Core leaves object-scoped grants out of the login profile's resource grants.
 */
export const groupMember: PermissionScenario = {
    name: 'group access through the members permission',
    allowedListings: OWNED_RESOURCES,
    grants: [],
    objectActions: {
        [Resource.Certificates]: [ResourceAction.List, ResourceAction.Detail],
        [Resource.Keys]: [ResourceAction.List],
        [Resource.Secrets]: [ResourceAction.List],
    },
};

/**
 * Holds a grant on one object of each resource with object access, and no resource-level grant. Core lists an RA profile
 * and checks its changes against the parent authority too, so the user also holds list and detail on that authority.
 */
export const objectGrant: PermissionScenario = {
    name: 'object-level grant',
    allowedListings: [Resource.RaProfiles, Resource.SigningProfiles, Resource.Authorities],
    grants: [],
    objectActions: {
        [Resource.RaProfiles]: [ResourceAction.List, ResourceAction.Detail, ResourceAction.Update, ResourceAction.Enable],
        [Resource.SigningProfiles]: [ResourceAction.List, ResourceAction.Detail, ResourceAction.Update, ResourceAction.Enable],
    },
};

export const PERMISSION_SCENARIOS: readonly PermissionScenario[] = [administrator, readOnly, owner, createOnly, groupMember, objectGrant];

/**
 * The `auth` and `resource` state a page sees for the scenario, with the answer for `object` stored when given. Merge it
 * over a harness's own preloaded state.
 */
export function scenarioState(scenario: PermissionScenario, object?: { resource: ScenarioResource; uuid: string }) {
    const answer = object && scenario.objectActions[object.resource];
    return {
        auth: {
            ...testInitialState.auth,
            profile: { username: 'user', permissions: { allowedListings: scenario.allowedListings, allowedActions: scenario.grants } },
        },
        resource: {
            ...testInitialState.resource,
            resourcesList: SCENARIO_RESOURCES_LIST,
            isFetchingResourcesList: false,
            objectAllowedActions: object
                ? { [`${object.resource}/${object.uuid}`]: { status: 'loaded' as const, allowedActions: answer } }
                : {},
        },
    };
}

/** The controls a page offers the scenario's user, every other control being withheld for a missing permission. */
export type OfferedControls<Control extends string> = { scenario: PermissionScenario; offered: Control[] };

export const offeredTitle = ({ scenario, offered }: OfferedControls<string>): string =>
    `offers ${offered.join(', ') || 'no action'} to a ${scenario.name}`;
