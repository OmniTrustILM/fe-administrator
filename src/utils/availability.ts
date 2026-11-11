import type { UserProfileDetailModel } from 'types/auth';
import type { Resource, ResourceAction } from 'types/openapi';
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

/** Whether the resource's objects can be granted one by one; `'loading'` until the resource list is in. */
export type ObjectAccess = boolean | 'loading';

/**
 * Decides whether one action is offered. An object answer, when there is one, decides on its own, because it already
 * counts ownership, group access and grants on the object, none of which the profile reports. Without one, an action on
 * objects of a resource with object access stays available and the server decides, since the user may hold it on some
 * objects. Otherwise, or when the request for the answer failed, the resource-level grants in the profile decide.
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
    if (!profile || objectAnswer?.status === 'loading') return LOADING;

    if (rule.onObjects && objectAnswer?.status !== 'loaded') {
        if (objectAccess === 'loading') return LOADING;
        if (objectAccess) return AVAILABLE;
    }

    const allowed =
        objectAnswer?.status === 'loaded'
            ? !!objectAnswer.allowedActions?.includes(rule.action)
            : hasResourceAction(profile, rule.resource, rule.action);

    if (allowed) return AVAILABLE;
    return { available: false, hidden: !!rule.hideWhenDenied, loading: false, reason: missingPermissionReason(labels) };
}
