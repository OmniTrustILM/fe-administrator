import type { UserProfileDetailModel } from 'types/auth';
import { Resource, ResourceAction } from 'types/openapi';
import { hasResourceAction } from 'utils/permissions';

export type ActionRule = {
    resource: Resource;
    action: ResourceAction;
    hideWhenDenied?: boolean;
    /**
     * The action acts on existing objects, such as the rows selected in a list, and core checks it on each object.
     * Leave it unset for an action core checks only on the resource as a whole, even on objects.
     */
    onObjects?: boolean;
};

/**
 * What `POST /v1/resources/{resource}/objects/allowed-actions` said about one object. `allowedActions` is `undefined`
 * when the object was left out of the answer, which the server does for an object the caller may neither list nor view.
 */
export type ObjectAllowedActionsAnswer =
    | { status: 'loading' }
    | { status: 'failed' }
    | { status: 'loaded'; allowedActions: ResourceAction[] | undefined };

export type Availability = {
    available: boolean;
    hidden: boolean;
    loading: boolean;
    reason?: string;
};

export type AvailabilityLabels = {
    resource: string;
    action: string;
};

export const missingPermissionReason = ({ resource, action }: AvailabilityLabels): string =>
    `You need the ${action} permission on ${resource}.`;

const LOADING: Availability = { available: false, hidden: false, loading: true };
const AVAILABLE: Availability = { available: true, hidden: false, loading: false };

/** Combines actions the server checks together: available only when every one is, otherwise the first that is not. */
export function requireAll(first: Availability, ...rest: Availability[]): Availability {
    return [first, ...rest].find((availability) => !availability.available) ?? first;
}

/** Combines alternative actions, any one of which suffices: available when one is, otherwise the first. */
export function requireAny(first: Availability, ...rest: Availability[]): Availability {
    return [first, ...rest].find((availability) => availability.available) ?? first;
}

/**
 * Whether an action on objects may be allowed without a resource grant, through a per-object grant or ownership;
 * `'loading'` until the resource list is in.
 */
export type ObjectAccess = boolean | 'loading';

/** Actions that do not act on an existing object, which the object answer never reports. */
const NOT_ON_AN_OBJECT: ReadonlySet<ResourceAction> = new Set([
    ResourceAction.Create,
    ResourceAction.List,
    ResourceAction.Register,
    ResourceAction.ImportKey,
]);

/** Resource-level actions Core leaves out of the object answer on one resource only. */
const NOT_ON_AN_OBJECT_OF: Partial<Record<Resource, ReadonlySet<ResourceAction>>> = {
    [Resource.Attributes]: new Set([ResourceAction.Members]),
};

const decidedByProfile = ({ resource, action }: ActionRule): boolean =>
    NOT_ON_AN_OBJECT.has(action) || !!NOT_ON_AN_OBJECT_OF[resource]?.has(action);

/**
 * Decides whether one action is offered. An object answer, when there is one, decides on its own, because it already
 * counts ownership, group access and grants on the object, none of which the profile reports. Without one, an action on
 * objects of a resource with object access stays available and the server decides, since the user may hold it on some
 * objects. Otherwise, when the request for the answer failed, or for an action that does not act on an existing object,
 * the resource-level grants in the profile decide.
 */
export function resolveAvailability({
    rule,
    profile,
    objectAnswer,
    objectAccess,
    labels,
}: {
    rule: ActionRule;
    profile: UserProfileDetailModel | undefined;
    objectAnswer?: ObjectAllowedActionsAnswer;
    objectAccess?: ObjectAccess;
    labels: AvailabilityLabels;
}): Availability {
    const answer = decidedByProfile(rule) ? undefined : objectAnswer;
    if (!profile || answer?.status === 'loading') return LOADING;

    if (rule.onObjects && objectAnswer?.status !== 'loaded') {
        if (objectAccess === 'loading') return LOADING;
        if (objectAccess) return AVAILABLE;
    }

    const allowed =
        answer?.status === 'loaded'
            ? !!answer.allowedActions?.includes(rule.action)
            : hasResourceAction(profile, rule.resource, rule.action);

    if (allowed) return AVAILABLE;
    return { available: false, hidden: !!rule.hideWhenDenied, loading: false, reason: missingPermissionReason(labels) };
}
