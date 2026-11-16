import { useCallback, useEffect } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import type { AppState } from 'ducks';
import { selectors as authSelectors } from 'ducks/auth';
import { getEnumLabel, selectors as enumSelectors } from 'ducks/enums';
import { actions as resourceActions, objectKey } from 'ducks/resource';
import { PlatformEnum, type Resource, type ResourceAction } from 'types/openapi';
import { type Availability, type ObjectAllowedActionsAnswer, resolveAvailability } from 'utils/availability';

const LOADING_ANSWER: ObjectAllowedActionsAnswer = { status: 'loading' };

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
 * Answers which actions on `resource` are offered. Given `objectUuid`, it asks the server once for the actions allowed
 * on that object, so a page should call it once and pass the uuid it is about to fetch the detail for.
 */
export function useActionAvailability(
    resource: Resource,
    objectUuid?: string,
): (action: ResourceAction, options?: { hideWhenDenied?: boolean }) => Availability {
    const dispatch = useDispatch();
    const profile = useSelector(authSelectors.profile);
    const resourceEnum = useSelector(enumSelectors.platformEnum(PlatformEnum.Resource));
    const actionEnum = useSelector(enumSelectors.platformEnum(PlatformEnum.ResourceAction));
    const stored = useSelector((state: AppState) =>
        objectUuid ? state.resource.objectAllowedActions[objectKey(resource, objectUuid)] : undefined,
    );

    useEffect(() => {
        if (objectUuid) dispatch(resourceActions.listObjectAllowedActions({ resource, uuid: objectUuid }));
    }, [dispatch, resource, objectUuid]);

    const objectAnswer = objectAnswerFor(stored, objectUuid);

    return useCallback(
        (action, options) =>
            resolveAvailability({
                rule: { resource, action, hideWhenDenied: options?.hideWhenDenied },
                profile,
                objectAnswer,
                labels: { resource: getEnumLabel(resourceEnum, resource), action: getEnumLabel(actionEnum, action) },
            }),
        [resource, profile, objectAnswer, resourceEnum, actionEnum],
    );
}
