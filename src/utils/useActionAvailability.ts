import { useCallback, useEffect, useRef } from 'react';
import { useDispatch, useSelector, useStore } from 'react-redux';
import type { AppState } from 'ducks';
import { getEnumLabel, selectors as enumSelectors } from 'ducks/enums';
import { actions as resourceActions, objectKey } from 'ducks/resource';
import { PlatformEnum, type Resource, type ResourceAction } from 'types/openapi';
import type { ResourceModel } from 'types/resource';
import { type Availability, type ObjectAccess, type ObjectAllowedActionsAnswer, resolveAvailability } from 'utils/availability';

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
 * Ownership is left out: every action core runs on the owned resources (certificates, keys, secrets) also checks the
 * resource as a whole. A resource missing from a settled list, as after a failed request, has no object access.
 */
export const objectAccessOf = (resourcesList: ResourceModel[], settled: boolean, resource: Resource): ObjectAccess => {
    const found = resourcesList.find((entry) => entry.resource === resource);
    if (found) return found.hasObjectAccess;
    return settled ? false : 'loading';
};

/**
 * Answers which actions on `resource` are offered. Given `objectUuid`, it asks the server once for the actions allowed
 * on that object, so a page should call it once and pass the uuid it is about to fetch the detail for.
 */
export function useActionAvailability(
    resource: Resource,
    objectUuid?: string,
): (action: ResourceAction, options?: { hideWhenDenied?: boolean; onObjects?: boolean }) => Availability {
    const dispatch = useDispatch();
    const store = useStore<AppState>();
    const profile = useSelector((state: AppState) => state.auth?.profile);
    const resourceEnum = useSelector(enumSelectors.platformEnum(PlatformEnum.Resource));
    const actionEnum = useSelector(enumSelectors.platformEnum(PlatformEnum.ResourceAction));
    const resourcesList = useSelector((state: AppState) => state.resource?.resourcesList ?? NO_RESOURCES);
    const isFetchingResources = useSelector((state: AppState) => !!state.resource?.isFetchingResourcesList);
    const stored = useSelector((state: AppState) =>
        objectUuid ? state.resource?.objectAllowedActions[objectKey(resource, objectUuid)] : undefined,
    );

    useEffect(() => {
        if (objectUuid) dispatch(resourceActions.listObjectAllowedActions({ resource, uuid: objectUuid }));
    }, [dispatch, resource, objectUuid]);

    // Once per mount, since the list stays empty after a failed request and retrying on that would loop. The store is
    // read fresh because every row of a list mounts its own hook, and the first one's request must stop the rest.
    useEffect(() => {
        const current = store.getState().resource;
        if (current && current.resourcesList.length === 0 && !current.isFetchingResourcesList) dispatch(resourceActions.listResources());
    }, [store, dispatch]);

    const objectAnswer = objectAnswerFor(stored, objectUuid);
    const sawResourcesFetch = useRef(false);
    if (isFetchingResources) sawResourcesFetch.current = true;
    const resourcesSettled = !isFetchingResources && (resourcesList.length > 0 || sawResourcesFetch.current);
    const objectAccess = objectAccessOf(resourcesList, resourcesSettled, resource);

    return useCallback(
        (action, options) =>
            resolveAvailability({
                rule: { resource, action, hideWhenDenied: options?.hideWhenDenied, onObjects: options?.onObjects },
                profile,
                objectAnswer,
                objectAccess,
                labels: { resource: getEnumLabel(resourceEnum, resource), action: getEnumLabel(actionEnum, action) },
            }),
        [resource, profile, objectAnswer, objectAccess, resourceEnum, actionEnum],
    );
}
