import { describe, expect, test } from 'vitest';

import reducer, { actions, initialState, selectors } from './notifications';

describe('notifications slice', () => {
    test('returns initial state for unknown action', () => {
        expect(reducer(undefined, { type: 'unknown' })).toEqual(initialState);
    });

    test('listOverviewNotifications is a no-op', () => {
        const next = reducer(initialState, actions.listOverviewNotifications());
        expect(next).toEqual(initialState);
    });

    test('listOverviewNotificationsStarted sets isFetchingOverview', () => {
        const next = reducer(initialState, actions.listOverviewNotificationsStarted());
        expect(next.isFetchingOverview).toBe(true);
    });

    test('resetFailedFetchingCount resets count to MAX (10)', () => {
        const pre = { ...initialState, failedFetchingOverviewRemainingCount: 3 };
        const next = reducer(pre, actions.resetFailedFetchingCount());
        expect(next.failedFetchingOverviewRemainingCount).toBe(10);
    });

    test('listOverviewNotificationsSuccess sets notifications and resets count', () => {
        const pre = { ...initialState, isFetchingOverview: true, failedFetchingOverviewRemainingCount: 5 };
        const items = [{ uuid: 'n-1' } as any];
        const next = reducer(pre, actions.listOverviewNotificationsSuccess(items));
        expect(next.isFetchingOverview).toBe(false);
        expect(next.overviewNotifications).toEqual(items);
        expect(next.failedFetchingOverviewRemainingCount).toBe(10);
    });

    test('listOverviewNotificationsFailure decrements count', () => {
        const pre = { ...initialState, isFetchingOverview: true, failedFetchingOverviewRemainingCount: 5 };
        const next = reducer(pre, actions.listOverviewNotificationsFailure({ error: 'err' }));
        expect(next.isFetchingOverview).toBe(false);
        expect(next.failedFetchingOverviewRemainingCount).toBe(4);
    });

    test('listNotifications clears notifications list', () => {
        const pre = { ...initialState, notifications: [{ uuid: 'n-1' } as any] };
        const next = reducer(pre, actions.listNotifications({ unread: false, pagination: {} as any }));
        expect(next.notifications).toEqual([]);
    });

    test('listNotificationsSuccess populates notifications', () => {
        const items = [{ uuid: 'n-1' } as any, { uuid: 'n-2' } as any];
        const next = reducer(initialState, actions.listNotificationsSuccess(items));
        expect(next.notifications).toEqual(items);
    });

    test('deleteNotification / success removes item / failure', () => {
        const pre = {
            ...initialState,
            notifications: [{ uuid: 'n-1' } as any, { uuid: 'n-2' } as any],
        };

        let next = reducer(pre, actions.deleteNotification({ uuid: 'n-1' }));
        expect(next.isDeleting).toBe(true);

        next = reducer(next, actions.deleteNotificationSuccess({ uuid: 'n-1' }));
        expect(next.isDeleting).toBe(false);
        expect(next.notifications).toHaveLength(1);
        expect(next.notifications[0].uuid).toBe('n-2');

        next = reducer({ ...next, isDeleting: true }, actions.deleteNotificationFailure({ error: 'err' }));
        expect(next.isDeleting).toBe(false);
    });

    test('deleteNotificationSuccess does nothing when uuid not in list', () => {
        const pre = { ...initialState, notifications: [{ uuid: 'n-2' } as any] };
        const next = reducer(pre, actions.deleteNotificationSuccess({ uuid: 'n-99' }));
        expect(next.notifications).toHaveLength(1);
    });

    test('markAsReadNotification / success sets readAt / failure', () => {
        const pre = {
            ...initialState,
            notifications: [{ uuid: 'n-1', readAt: undefined } as any],
        };

        let next = reducer(pre, actions.markAsReadNotification({ uuid: 'n-1' }));
        expect(next.isMarking).toBe(true);

        next = reducer(next, actions.markAsReadNotificationSuccess({ uuid: 'n-1' }));
        expect(next.isMarking).toBe(false);
        expect(next.notifications[0].readAt).toBeDefined();

        next = reducer({ ...next, isMarking: true }, actions.markAsReadNotificationFailure({ error: 'err' }));
        expect(next.isMarking).toBe(false);
    });

    test('markAsReadNotificationSuccess does nothing when uuid not in list', () => {
        const pre = { ...initialState, notifications: [{ uuid: 'n-2', readAt: undefined } as any] };
        const next = reducer(pre, actions.markAsReadNotificationSuccess({ uuid: 'n-99' }));
        expect(next.notifications[0].readAt).toBeUndefined();
    });

    test('listNotificationInstances / success / failure', () => {
        const pre = { ...initialState, notificationInstances: [{ uuid: 'ni-1' } as any] };

        let next = reducer(pre, actions.listNotificationInstances());
        expect(next.isFetchingNotificationInstances).toBe(true);
        expect(next.notificationInstances).toEqual([]);

        const instances = [{ uuid: 'ni-1' } as any, { uuid: 'ni-2' } as any];
        next = reducer(next, actions.listNotificationInstancesSuccess(instances));
        expect(next.notificationInstances).toEqual(instances);
        expect(next.isFetchingNotificationInstances).toBe(false);

        next = reducer({ ...next, isFetchingNotificationInstances: true }, actions.listNotificationInstancesFailure({ error: 'err' }));
        expect(next.isFetchingNotificationInstances).toBe(false);
    });

    test('listNotificationProviders / success / failure', () => {
        let next = reducer(initialState, actions.listNotificationProviders());
        expect(next.isFetchingNotificationProviders).toBe(true);

        const providers = [{ uuid: 'p-1' } as any];
        next = reducer(next, actions.listNotificationProvidersSuccess({ providers }));
        expect(next.isFetchingNotificationProviders).toBe(false);
        expect(next.notificationInstanceProviders).toEqual(providers);

        next = reducer({ ...next, isFetchingNotificationProviders: true }, actions.listNotificationProvidersFailure({ error: 'err' }));
        expect(next.isFetchingNotificationProviders).toBe(false);
    });

    test('getNotificationAttributesDescriptors / success / failure', () => {
        let next = reducer(initialState, actions.getNotificationAttributesDescriptors({ uuid: 'p-1', kind: 'test' }));
        expect(next.notificationProviderAttributesDescriptors).toEqual([]);
        expect(next.isFetchingNotificationProviderAttributesDescriptors).toBe(true);

        const descriptors = [{ uuid: 'attr-1' } as any];
        next = reducer(next, actions.getNotificationAttributesDescriptorsSuccess({ attributeDescriptor: descriptors }));
        expect(next.notificationProviderAttributesDescriptors).toEqual(descriptors);
        expect(next.isFetchingNotificationProviderAttributesDescriptors).toBe(false);

        next = reducer(
            { ...next, isFetchingNotificationProviderAttributesDescriptors: true },
            actions.getNotificationAttributeDescriptorsFailure({ error: 'err' }),
        );
        expect(next.isFetchingNotificationProviderAttributesDescriptors).toBe(false);
    });

    test('getNotificationInstance / success / failure', () => {
        let next = reducer(initialState, actions.getNotificationInstance({ uuid: 'ni-1' }));
        expect(next.isFetchingNotificationInstanceDetail).toBe(true);

        const detail = { uuid: 'ni-1', name: 'My Instance' } as any;
        next = reducer(next, actions.getNotificationInstanceSuccess(detail));
        expect(next.notificationInstanceDetail).toEqual(detail);
        expect(next.isFetchingNotificationInstanceDetail).toBe(false);

        next = reducer({ ...next, isFetchingNotificationInstanceDetail: true }, actions.getNotificationInstanceFailure({ error: 'err' }));
        expect(next.isFetchingNotificationInstanceDetail).toBe(false);
    });

    test('createNotificationInstance / success / failure', () => {
        let next = reducer(initialState, actions.createNotificationInstance({} as any));
        expect(next.isCreatingNotificationInstance).toBe(true);
        expect(next.createNotificationInstanceSucceeded).toBe(false);

        next = reducer(next, actions.createNotificationInstanceSuccess());
        expect(next.isCreatingNotificationInstance).toBe(false);
        expect(next.createNotificationInstanceSucceeded).toBe(true);

        next = reducer({ ...next, isCreatingNotificationInstance: true }, actions.createNotificationInstanceFailure({ error: 'err' }));
        expect(next.isCreatingNotificationInstance).toBe(false);
        expect(next.createNotificationInstanceSucceeded).toBe(false);
    });

    test('editNotificationInstance / success / failure', () => {
        let next = reducer(initialState, actions.editNotificationInstance({ uuid: 'ni-1', notificationInstance: {} as any }));
        expect(next.isEditingNotificationInstance).toBe(true);
        expect(next.updateNotificationInstanceSucceeded).toBe(false);

        next = reducer(next, actions.editNotificationInstanceSuccess());
        expect(next.isEditingNotificationInstance).toBe(false);
        expect(next.updateNotificationInstanceSucceeded).toBe(true);

        next = reducer({ ...next, isEditingNotificationInstance: true }, actions.editNotificationInstanceFailure({ error: 'err' }));
        expect(next.isEditingNotificationInstance).toBe(false);
        expect(next.updateNotificationInstanceSucceeded).toBe(false);
    });

    test('deleteNotificationInstance / success removes item / failure sets error', () => {
        const pre = {
            ...initialState,
            notificationInstances: [{ uuid: 'ni-1' } as any, { uuid: 'ni-2' } as any],
        };

        let next = reducer(pre, actions.deleteNotificationInstance({ uuid: 'ni-1' }));
        expect(next.isDeletingNotificationInstance).toBe(true);
        expect(next.deleteErrorMessage).toBeUndefined();

        next = reducer(next, actions.deleteNotificationInstanceSuccess({ uuid: 'ni-1' }));
        expect(next.isDeletingNotificationInstance).toBe(false);
        expect(next.notificationInstances).toHaveLength(1);
        expect(next.notificationInstances[0].uuid).toBe('ni-2');
        expect(next.deleteErrorMessage).toBeUndefined();

        next = reducer(
            { ...next, isDeletingNotificationInstance: true },
            actions.deleteNotificationInstanceFailure({ error: 'some error' }),
        );
        expect(next.isDeletingNotificationInstance).toBe(false);
        expect(next.deleteErrorMessage).toBe('some error');
    });

    test('deleteNotificationInstanceSuccess does nothing when uuid not in list', () => {
        const pre = { ...initialState, notificationInstances: [{ uuid: 'ni-2' } as any] };
        const next = reducer(pre, actions.deleteNotificationInstanceSuccess({ uuid: 'ni-99' }));
        expect(next.notificationInstances).toHaveLength(1);
    });

    test('clearDeleteErrorMessages clears deleteErrorMessage', () => {
        const pre = { ...initialState, deleteErrorMessage: 'some error' };
        const next = reducer(pre, actions.clearDeleteErrorMessages());
        expect(next.deleteErrorMessage).toBeUndefined();
    });

    test('clearNotificationInstanceDetail clears detail', () => {
        const pre = { ...initialState, notificationInstanceDetail: { uuid: 'ni-1' } as any };
        const next = reducer(pre, actions.clearNotificationInstanceDetail());
        expect(next.notificationInstanceDetail).toBeUndefined();
    });

    test('listMappingAttributes / success / failure', () => {
        let next = reducer(initialState, actions.listMappingAttributes({} as any));
        expect(next.isFetchingMappingAttributes).toBe(true);

        const attrs = [{ uuid: 'ma-1' } as any];
        next = reducer(next, actions.listMappingAttributesSuccess({ mappingAttributes: attrs }));
        expect(next.isFetchingMappingAttributes).toBe(false);
        expect(next.mappingAttributes).toEqual(attrs);

        next = reducer({ ...next, isFetchingMappingAttributes: true }, actions.listMappingAttributesFailure({ error: 'err' }));
        expect(next.isFetchingMappingAttributes).toBe(false);
    });

    test('bulkDeleteNotification / success filters list / failure sets error', () => {
        const pre = {
            ...initialState,
            notifications: [{ uuid: 'n-1' } as any, { uuid: 'n-2' } as any, { uuid: 'n-3' } as any],
        };

        let next = reducer(pre, actions.bulkDeleteNotification({ uuids: ['n-1', 'n-2'] }));
        expect(next.isBulkDeleting).toBe(true);

        next = reducer(next, actions.bulkDeleteNotificationSuccess({ deletedNotificationUuids: ['n-1', 'n-2'] }));
        expect(next.isBulkDeleting).toBe(false);
        expect(next.notifications).toHaveLength(1);
        expect(next.notifications[0].uuid).toBe('n-3');
        expect(next.deleteErrorMessage).toBeUndefined();

        next = reducer({ ...next, isBulkDeleting: true }, actions.bulkDeleteNotificationFailure({ error: 'bulk error' }));
        expect(next.isBulkDeleting).toBe(false);
        expect(next.deleteErrorMessage).toBe('bulk error');
    });

    test('bulkMarkNotificationAsRead / success marks readAt / failure', () => {
        const pre = {
            ...initialState,
            notifications: [{ uuid: 'n-1', readAt: undefined } as any, { uuid: 'n-2', readAt: undefined } as any],
        };

        let next = reducer(pre, actions.bulkMarkNotificationAsRead({ uuids: ['n-1'] }));
        expect(next.isBulkMarking).toBe(true);

        next = reducer(next, actions.bulkMarkNotificationAsReadSuccess({ markedNotificationUuids: ['n-1'] }));
        expect(next.isBulkMarking).toBe(false);
        expect(next.notifications[0].readAt).toBeDefined();
        expect(next.notifications[1].readAt).toBeUndefined();

        next = reducer({ ...next, isBulkMarking: true }, actions.bulkMarkNotificationAsReadFailure({ error: 'err' }));
        expect(next.isBulkMarking).toBe(false);
    });

    test('initial state sets all flags to false and count to 10', () => {
        expect(initialState.createNotificationInstanceSucceeded).toBe(false);
        expect(initialState.updateNotificationInstanceSucceeded).toBe(false);
        expect(initialState.failedFetchingOverviewRemainingCount).toBe(10);
    });
});

describe('notifications selectors', () => {
    test('all selectors read correct values from store', () => {
        const featureState = {
            ...initialState,
            overviewNotifications: [{ uuid: 'on-1' }],
            notifications: [{ uuid: 'n-1' }, { uuid: 'n-2' }],
            notificationInstances: [{ uuid: 'ni-1' }],
            notificationInstanceDetail: { uuid: 'ni-1' },
            notificationInstanceProviders: [{ uuid: 'p-1' }],
            notificationProviderAttributesDescriptors: [{ uuid: 'attr-1' }],
            mappingAttributes: [{ uuid: 'ma-1' }],
            deleteErrorMessage: 'some error',
            isFetchingMappingAttributes: true,
            isFetchingNotificationProviders: true,
            isCreatingNotificationInstance: true,
            createNotificationInstanceSucceeded: true,
            isEditingNotificationInstance: true,
            updateNotificationInstanceSucceeded: true,
            isFetchingNotificationInstanceDetail: true,
            isFetchingNotificationInstances: true,
            isFetchingOverview: true,
            isDeleting: true,
            isBulkDeleting: true,
            isMarking: true,
            isBulkMarking: true,
        } as any;

        const state = { notifications: featureState } as any;

        expect(selectors.overviewNotifications(state)).toHaveLength(1);
        expect(selectors.notifications(state)).toHaveLength(2);
        expect(selectors.notificationInstances(state)).toHaveLength(1);
        expect(selectors.notificationInstanceDetail(state)).toEqual({ uuid: 'ni-1' });
        expect(selectors.notificationInstanceProviders(state)).toHaveLength(1);
        expect(selectors.notificationProviderAttributesDescriptors(state)).toHaveLength(1);
        expect(selectors.mappingAttributes(state)).toHaveLength(1);
        expect(selectors.deleteErrorMessage(state)).toBe('some error');
        expect(selectors.isFetchingMappingAttributes(state)).toBe(true);
        expect(selectors.isFetchingNotificationProviders(state)).toBe(true);
        expect(selectors.isCreatingNotificationInstance(state)).toBe(true);
        expect(selectors.createNotificationInstanceSucceeded(state)).toBe(true);
        expect(selectors.isEditingNotificationInstance(state)).toBe(true);
        expect(selectors.updateNotificationInstanceSucceeded(state)).toBe(true);
        expect(selectors.isFetchingNotificationInstanceDetail(state)).toBe(true);
        expect(selectors.isFetchingNotificationInstances(state)).toBe(true);
        expect(selectors.isFetchingOverview(state)).toBe(true);
        expect(selectors.isDeleting(state)).toBe(true);
        expect(selectors.isBulkDeleting(state)).toBe(true);
        expect(selectors.isMarking(state)).toBe(true);
        expect(selectors.isBulkMarking(state)).toBe(true);
        expect(selectors.state(state)).toBe(featureState);
    });
});
