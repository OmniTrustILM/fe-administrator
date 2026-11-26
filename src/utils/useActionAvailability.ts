import { useCallback, useEffect, useMemo, useRef } from 'react';
import { shallowEqual, useDispatch, useSelector, useStore } from 'react-redux';
import type { AppState } from 'ducks';
import { getEnumLabel, selectors as enumSelectors } from 'ducks/enums';
import { actions as resourceActions, objectKey } from 'ducks/resource';
import { PlatformEnum, type Resource, type ResourceAction } from 'types/openapi';
import type { ResourceModel } from 'types/resource';
import { type Availability, type ObjectAccess, type ObjectAllowedActionsAnswer, requireAll, resolveAvailability } from 'utils/availability';

const LOADING_ANSWER: ObjectAllowedActionsAnswer = { status: 'loading' };
const NO_RESOURCES: ResourceModel[] = [];

/**
 * Before the first request is dispatched there is no stored answer, and resolving without one would let the profile
 * decide for a moment, flashing a control the object answer then flips. A missing answer for a requested object
 * therefore counts as loading.
 */
export const objectAnswerFor = (
    stored: ObjectAllowedActionsAnswer | undefined,
    objectUuid: string | undefined,
): ObjectAllowedActionsAnswer | undefined => (objectUuid ? (stored ?? LOADING_ANSWER) : undefined);

/**
 * Ownership counts as object access because core lets an owner act without a resource grant on endpoints that take
 * secured UUIDs or a security filter, as the certificate bulk actions do. Secret and key endpoints take plain UUIDs and
 * still check the resource, so their actions must not be marked `onObjects`. A resource missing from a settled list,
 * as after a failed request, has no object access.
 */
export const objectAccessOf = (resourcesList: ResourceModel[], settled: boolean, resource: Resource): ObjectAccess => {
    const found = resourcesList.find((entry) => entry.resource === resource);
    if (found) return found.hasObjectAccess || found.hasOwner;
    return settled ? false : 'loading';
};

export type ActionAvailability = (
    action: ResourceAction,
    options?: { hideWhenDenied?: boolean; onObjects?: boolean; objects?: readonly string[] },
) => Availability;

/**
 * Answers which actions on `resource` are offered. Given `objects`, one uuid or several, it asks the server once for the
 * actions allowed on each, so a page should call it once and pass the uuids it is about to show. An action is then
 * available only when it is on every object; the `objects` option narrows that to a subset, such as the checked rows,
 * and must name only requested objects, since any other counts as loading.
 */
export function useActionAvailability(resource: Resource, objects?: string | readonly string[]): ActionAvailability {
    const dispatch = useDispatch();
    const store = useStore<AppState>();
    const profile = useSelector((state: AppState) => state.auth?.profile);
    const resourceEnum = useSelector(enumSelectors.platformEnum(PlatformEnum.Resource));
    const actionEnum = useSelector(enumSelectors.platformEnum(PlatformEnum.ResourceAction));
    const resourcesList = useSelector((state: AppState) => state.resource?.resourcesList ?? NO_RESOURCES);
    const isFetchingResources = useSelector((state: AppState) => !!state.resource?.isFetchingResourcesList);

    const requestKey = (typeof objects === 'string' ? [objects] : (objects ?? [])).join('\n');
    const requested = useMemo(() => (requestKey ? requestKey.split('\n') : []), [requestKey]);
    const stored = useSelector(
        (state: AppState) => requested.map((uuid) => state.resource?.objectAllowedActions[objectKey(resource, uuid)]),
        shallowEqual,
    );
    const answers = useMemo(() => new Map(requested.map((uuid, index) => [uuid.toLowerCase(), stored[index]])), [requested, stored]);

    useEffect(() => {
        if (requested.length > 0) dispatch(resourceActions.listObjectAllowedActions({ resource, uuids: requested }));
    }, [dispatch, resource, requested]);

    // Once per mount, since the list stays empty after a failed request and retrying on that would loop. The store is
    // read fresh because every row of a list mounts its own hook, and the first one's request must stop the rest.
    useEffect(() => {
        const current = store.getState().resource;
        if (current && current.resourcesList.length === 0 && !current.isFetchingResourcesList) dispatch(resourceActions.listResources());
    }, [store, dispatch]);

    const sawResourcesFetch = useRef(false);
    if (isFetchingResources) sawResourcesFetch.current = true;
    const resourcesSettled = !isFetchingResources && (resourcesList.length > 0 || sawResourcesFetch.current);
    const objectAccess = objectAccessOf(resourcesList, resourcesSettled, resource);

    return useCallback(
        (action, options) => {
            const resolveFor = (objectAnswer?: ObjectAllowedActionsAnswer) =>
                resolveAvailability({
                    rule: { resource, action, hideWhenDenied: options?.hideWhenDenied, onObjects: options?.onObjects },
                    profile,
                    objectAnswer,
                    objectAccess,
                    labels: { resource: getEnumLabel(resourceEnum, resource), action: getEnumLabel(actionEnum, action) },
                });
            const [first, ...rest] = (options?.objects ?? requested).map((uuid) =>
                resolveFor(objectAnswerFor(answers.get(uuid.toLowerCase()), uuid)),
            );
            return first ? requireAll(first, ...rest) : resolveFor();
        },
        [resource, profile, requested, answers, objectAccess, resourceEnum, actionEnum],
    );
}
