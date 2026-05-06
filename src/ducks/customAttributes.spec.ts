import { describe, expect, test } from 'vitest';
import { runCommonSliceTests } from './__tests__/common-slice-tests';
import reducer, { actions, initialState, selectors } from './customAttributes';
import { Resource } from '../types/openapi';

describe('customAttributes slice', () => {
    test('returns initial state for unknown action', () => {
        expect(reducer(undefined, { type: 'unknown' })).toEqual(initialState);
    });

    runCommonSliceTests({
        reducer,
        actions,
        initialState,
        dirtyOverrides: { isCreating: true, isFetchingList: true } as any,
    });

    test('listCustomAttributes / Success / Failure', () => {
        let next = reducer(initialState, actions.listCustomAttributes({} as any));
        expect(next.isFetchingList).toBe(true);
        expect(next.customAttributes).toHaveLength(0);

        next = reducer(next, actions.listCustomAttributesSuccess([{ uuid: 'ca-1' }] as any));
        expect(next.isFetchingList).toBe(false);
        expect(next.customAttributes).toHaveLength(1);

        const failing = reducer({ ...initialState, isFetchingList: true }, actions.listCustomAttributesFailure({ error: 'err' }));
        expect(failing.isFetchingList).toBe(false);
    });

    test('listResources / Success / Failure', () => {
        let next = reducer(initialState, actions.listResources());
        expect(next.isFetchingResources).toBe(true);
        expect(next.resources).toHaveLength(0);

        next = reducer(next, actions.listResourcesSuccess([Resource.Certificates]));
        expect(next.isFetchingResources).toBe(false);
        expect(next.resources).toHaveLength(1);

        const failing = reducer({ ...initialState, isFetchingResources: true }, actions.listResourcesFailure({ error: 'err' }));
        expect(failing.isFetchingResources).toBe(false);
    });

    test('listResourceCustomAttributes / Success / Failure', () => {
        let next = reducer(initialState, actions.listResourceCustomAttributes(Resource.Certificates));
        expect(next.isFetchingResourceCustomAttributes).toBe(true);
        expect(next.resourceCustomAttributes).toHaveLength(0);

        next = reducer(next, actions.listResourceCustomAttributesSuccess([{ uuid: 'rca-1' }] as any));
        expect(next.isFetchingResourceCustomAttributes).toBe(false);
        expect(next.resourceCustomAttributes).toHaveLength(1);

        const failing = reducer(
            { ...initialState, isFetchingResourceCustomAttributes: true },
            actions.listResourceCustomAttributesFailure({ error: 'err' }),
        );
        expect(failing.isFetchingResourceCustomAttributes).toBe(false);
    });

    test('listSecondaryResourceCustomAttributes / Success / Failure', () => {
        let next = reducer(initialState, actions.listSecondaryResourceCustomAttributes(Resource.Certificates));
        expect(next.isFetchingResourceSecondaryCustomAttributes).toBe(true);
        expect(next.secondaryResourceCustomAttributes).toHaveLength(0);

        next = reducer(next, actions.listSecondaryResourceCustomAttributesSuccess([{ uuid: 'srca-1' }] as any));
        expect(next.isFetchingResourceSecondaryCustomAttributes).toBe(false);
        expect(next.secondaryResourceCustomAttributes).toHaveLength(1);

        const failing = reducer(
            { ...initialState, isFetchingResourceSecondaryCustomAttributes: true },
            actions.listSecondaryResourceCustomAttributesFailure({ error: 'err' }),
        );
        expect(failing.isFetchingResourceSecondaryCustomAttributes).toBe(false);
    });

    test('createCustomAttribute / Success / Failure', () => {
        let next = reducer(initialState, actions.createCustomAttribute({} as any));
        expect(next.isCreating).toBe(true);
        expect(next.createCustomAttributeSucceeded).toBe(false);

        next = reducer(next, actions.createCustomAttributeSuccess({ uuid: 'new-uuid' }));
        expect(next.isCreating).toBe(false);
        expect(next.createCustomAttributeSucceeded).toBe(true);

        const failing = reducer({ ...initialState, isCreating: true }, actions.createCustomAttributeFailure({ error: 'err' }));
        expect(failing.isCreating).toBe(false);
        expect(failing.createCustomAttributeSucceeded).toBe(false);
    });

    test('updateCustomAttribute / Success / Failure', () => {
        let next = reducer(initialState, actions.updateCustomAttribute({ uuid: 'u1', customAttributeUpdateRequest: {} as any }));
        expect(next.isUpdating).toBe(true);
        expect(next.updateCustomAttributeSucceeded).toBe(false);

        next = reducer(next, actions.updateCustomAttributeSuccess({ uuid: 'u1' } as any));
        expect(next.isUpdating).toBe(false);
        expect(next.updateCustomAttributeSucceeded).toBe(true);

        const failing = reducer({ ...initialState, isUpdating: true }, actions.updateCustomAttributeFailure({ error: 'err' }));
        expect(failing.isUpdating).toBe(false);
        expect(failing.updateCustomAttributeSucceeded).toBe(false);
    });

    test('updateCustomAttributeContent / Success pushes new entry / Failure', () => {
        let next = reducer(
            initialState,
            actions.updateCustomAttributeContent({
                resource: Resource.Certificates,
                resourceUuid: 'r1',
                attributeUuid: 'a1',
                content: [],
            }),
        );
        expect(next.isUpdatingContent).toBe(true);

        const payload = { resource: Resource.Certificates, resourceUuid: 'r1', customAttributes: [{ uuid: 'attr-1' }] as any };
        next = reducer(next, actions.updateCustomAttributeContentSuccess(payload));
        expect(next.isUpdatingContent).toBe(false);
        expect(next.resourceCustomAttributesContents).toHaveLength(1);
        expect(next.resourceCustomAttributesContents[0].customAttributes).toHaveLength(1);

        const failing = reducer(
            { ...initialState, isUpdatingContent: true },
            actions.updateCustomAttributeContentFailure({ resource: Resource.Certificates, resourceUuid: 'r1', error: 'err' }),
        );
        expect(failing.isUpdatingContent).toBe(false);
    });

    test('updateCustomAttributeContentSuccess updates existing entry in-place', () => {
        const existing = {
            ...initialState,
            resourceCustomAttributesContents: [
                { resource: Resource.Certificates, resourceUuid: 'r1', customAttributes: [{ uuid: 'old' }] as any },
            ],
        };
        const payload = { resource: Resource.Certificates, resourceUuid: 'r1', customAttributes: [{ uuid: 'new' }] as any };
        const next = reducer(existing, actions.updateCustomAttributeContentSuccess(payload));
        expect(next.resourceCustomAttributesContents).toHaveLength(1);
        expect(next.resourceCustomAttributesContents[0].customAttributes[0].uuid).toBe('new');
    });

    test('removeCustomAttributeContent / Success / Failure', () => {
        let next = reducer(
            initialState,
            actions.removeCustomAttributeContent({ resource: Resource.Certificates, resourceUuid: 'r1', attributeUuid: 'a1' }),
        );
        expect(next.isUpdatingContent).toBe(true);

        const payload = { resource: Resource.Certificates, resourceUuid: 'r1', customAttributes: [] as any };
        next = reducer(next, actions.removeCustomAttributeContentSuccess(payload));
        expect(next.isUpdatingContent).toBe(false);

        const failing = reducer(
            { ...initialState, isUpdatingContent: true },
            actions.removeCustomAttributeContentFailure({ resource: Resource.Certificates, resourceUuid: 'r1', error: 'err' }),
        );
        expect(failing.isUpdatingContent).toBe(false);
    });

    test('loadCustomAttributeContent inserts new entry and updates existing', () => {
        const payload = { resource: Resource.Certificates, resourceUuid: 'r1', customAttributes: [{ uuid: 'attr-1' }] as any };
        let next = reducer(initialState, actions.loadCustomAttributeContent(payload));
        expect(next.resourceCustomAttributesContents).toHaveLength(1);

        const updated = { ...payload, customAttributes: [{ uuid: 'attr-2' }] as any };
        next = reducer(next, actions.loadCustomAttributeContent(updated));
        expect(next.resourceCustomAttributesContents).toHaveLength(1);
        expect(next.resourceCustomAttributesContents[0].customAttributes[0].uuid).toBe('attr-2');
    });

    test('getCustomAttribute / Success / Failure', () => {
        let next = reducer(initialState, actions.getCustomAttribute('u1'));
        expect(next.isFetchingDetail).toBe(true);
        expect(next.customAttribute).toBeUndefined();

        next = reducer(next, actions.getCustomAttributeSuccess({ uuid: 'u1' } as any));
        expect(next.isFetchingDetail).toBe(false);
        expect(next.customAttribute?.uuid).toBe('u1');

        const failing = reducer({ ...initialState, isFetchingDetail: true }, actions.getCustomAttributeFailure({ error: 'err' }));
        expect(failing.isFetchingDetail).toBe(false);
    });

    test('deleteCustomAttribute / Success removes entry / Failure', () => {
        const withData = { ...initialState, customAttributes: [{ uuid: 'del-1' }] as any };

        let next = reducer(withData, actions.deleteCustomAttribute('del-1'));
        expect(next.isDeleting).toBe(true);

        next = reducer(next, actions.deleteCustomAttributeSuccess('del-1'));
        expect(next.isDeleting).toBe(false);
        expect(next.customAttributes).toHaveLength(0);

        const failing = reducer({ ...initialState, isDeleting: true }, actions.deleteCustomAttributeFailure({ error: 'err' }));
        expect(failing.isDeleting).toBe(false);
    });

    test('bulkDeleteCustomAttributes / Success removes entries and clears checkedRows / Failure', () => {
        const withData = {
            ...initialState,
            customAttributes: [{ uuid: 'b1' }, { uuid: 'b2' }] as any,
            customAttribute: { uuid: 'b1' } as any,
            checkedRows: ['b1'],
        };

        let next = reducer(withData, actions.bulkDeleteCustomAttributes(['b1', 'b2']));
        expect(next.isBulkDeleting).toBe(true);

        next = reducer(next, actions.bulkDeleteCustomAttributesSuccess(['b1', 'b2']));
        expect(next.isBulkDeleting).toBe(false);
        expect(next.customAttributes).toHaveLength(0);
        expect(next.customAttribute).toBeUndefined();
        expect(next.checkedRows).toHaveLength(0);

        const failing = reducer({ ...initialState, isBulkDeleting: true }, actions.bulkDeleteCustomAttributesFailure({ error: 'err' }));
        expect(failing.isBulkDeleting).toBe(false);
    });

    test('bulkEnableCustomAttributes / Success enables entries / Failure', () => {
        const withData = {
            ...initialState,
            customAttributes: [{ uuid: 'e1', enabled: false }] as any,
            customAttribute: { uuid: 'e1', enabled: false } as any,
        };

        let next = reducer(withData, actions.bulkEnableCustomAttributes(['e1']));
        expect(next.isBulkEnabling).toBe(true);

        next = reducer(next, actions.bulkEnableCustomAttributesSuccess(['e1']));
        expect(next.isBulkEnabling).toBe(false);
        expect(next.customAttributes[0].enabled).toBe(true);
        expect(next.customAttribute?.enabled).toBe(true);

        const failing = reducer({ ...initialState, isBulkEnabling: true }, actions.bulkEnableCustomAttributesFailure({ error: 'err' }));
        expect(failing.isBulkEnabling).toBe(false);
    });

    test('bulkDisableCustomAttributes / Success disables entries / Failure', () => {
        const withData = {
            ...initialState,
            customAttributes: [{ uuid: 'd1', enabled: true }] as any,
            customAttribute: { uuid: 'd1', enabled: true } as any,
        };

        let next = reducer(withData, actions.bulkDisableCustomAttributes(['d1']));
        expect(next.isBulkDisabling).toBe(true);

        next = reducer(next, actions.bulkDisableCustomAttributesSuccess(['d1']));
        expect(next.isBulkDisabling).toBe(false);
        expect(next.customAttributes[0].enabled).toBe(false);
        expect(next.customAttribute?.enabled).toBe(false);

        const failing = reducer({ ...initialState, isBulkDisabling: true }, actions.bulkDisableCustomAttributesFailure({ error: 'err' }));
        expect(failing.isBulkDisabling).toBe(false);
    });

    test('enableCustomAttribute / Success enables entry / Failure', () => {
        const withData = {
            ...initialState,
            customAttributes: [{ uuid: 'en1', enabled: false }] as any,
            customAttribute: { uuid: 'en1', enabled: false } as any,
        };

        let next = reducer(withData, actions.enableCustomAttribute('en1'));
        expect(next.isEnabling).toBe(true);

        next = reducer(next, actions.enableCustomAttributeSuccess('en1'));
        expect(next.isEnabling).toBe(false);
        expect(next.customAttributes[0].enabled).toBe(true);
        expect(next.customAttribute?.enabled).toBe(true);

        const failing = reducer({ ...initialState, isEnabling: true }, actions.enableCustomAttributeFailure({ error: 'err' }));
        expect(failing.isEnabling).toBe(false);
    });

    test('disableCustomAttribute / Success disables entry / Failure', () => {
        const withData = {
            ...initialState,
            customAttributes: [{ uuid: 'dis1', enabled: true }] as any,
            customAttribute: { uuid: 'dis1', enabled: true } as any,
        };

        let next = reducer(withData, actions.disableCustomAttribute('dis1'));
        expect(next.isDisabling).toBe(true);

        next = reducer(next, actions.disableCustomAttributeSuccess('dis1'));
        expect(next.isDisabling).toBe(false);
        expect(next.customAttributes[0].enabled).toBe(false);
        expect(next.customAttribute?.enabled).toBe(false);

        const failing = reducer({ ...initialState, isDisabling: true }, actions.disableCustomAttributeFailure({ error: 'err' }));
        expect(failing.isDisabling).toBe(false);
    });

    test('resetState removes extra keys not present in initialState', () => {
        const dirty = { ...initialState, extraKey: 'should-be-removed' } as any;
        const next = reducer(dirty, actions.resetState()) as any;
        expect(next.extraKey).toBeUndefined();
        expect(next.isFetchingList).toBe(false);
    });

    test('removeCustomAttributeContentSuccess updates existing entry in-place', () => {
        const existing = {
            ...initialState,
            resourceCustomAttributesContents: [
                { resource: Resource.Certificates, resourceUuid: 'r1', customAttributes: [{ uuid: 'old-attr' }] as any },
            ],
        };
        const payload = { resource: Resource.Certificates, resourceUuid: 'r1', customAttributes: [] as any };
        const next = reducer(existing, actions.removeCustomAttributeContentSuccess(payload));
        expect(next.resourceCustomAttributesContents).toHaveLength(1);
        expect(next.resourceCustomAttributesContents[0].customAttributes).toHaveLength(0);
    });

    test('receiveMultipleResourceCustomAttributes pushes new entry when not found', () => {
        const payload = [{ resource: Resource.Certificates, customAttributes: [{ uuid: 'mc1', name: 'attr1', version: 2 }] as any }];
        const next = reducer(initialState, actions.receiveMultipleResourceCustomAttributes(payload));
        expect(next.resourceCustomAttributesContents).toHaveLength(1);
        expect(next.resourceCustomAttributesContents[0].resource).toBe(Resource.Certificates);
        expect(next.resourceCustomAttributesContents[0].resourceUuid).toBe('');
    });

    test('receiveMultipleResourceCustomAttributes updates existing entry when found', () => {
        const existing = {
            ...initialState,
            resourceCustomAttributesContents: [
                {
                    resource: Resource.Certificates,
                    resourceUuid: '',
                    customAttributes: [{ uuid: 'old', label: 'old', version: 'v2' }] as any,
                },
            ],
        };
        const payload = [{ resource: Resource.Certificates, customAttributes: [{ uuid: 'new', name: 'new-attr', version: 3 }] as any }];
        const next = reducer(existing, actions.receiveMultipleResourceCustomAttributes(payload));
        expect(next.resourceCustomAttributesContents).toHaveLength(1);
        expect(next.resourceCustomAttributesContents[0].customAttributes[0].uuid).toBe('new');
    });
});

describe('customAttributes selectors', () => {
    test('selectors return values from state', () => {
        const featureState = {
            ...initialState,
            customAttributes: [{ uuid: 'ca-1' }],
            customAttribute: { uuid: 'ca-detail' },
            resources: [Resource.Certificates],
            resourceCustomAttributes: [{ uuid: 'rca-1' }],
            secondaryResourceCustomAttributes: [{ uuid: 'srca-1' }],
            resourceCustomAttributesContents: [
                { resource: Resource.Certificates, resourceUuid: 'r1', customAttributes: [{ uuid: 'content-attr' }] },
            ],
            checkedRows: ['row-1'],
            isCreating: true,
            isFetchingList: true,
            isFetchingDetail: true,
            isFetchingResources: true,
            isFetchingResourceCustomAttributes: true,
            isFetchingResourceSecondaryCustomAttributes: true,
            isDeleting: true,
            isBulkDeleting: true,
            isBulkEnabling: true,
            isEnabling: true,
            isBulkDisabling: true,
            isDisabling: true,
            isUpdating: true,
            createCustomAttributeSucceeded: true,
            updateCustomAttributeSucceeded: true,
            isUpdatingContent: true,
        } as any;
        const state = { customAttributes: featureState } as any;

        expect(selectors.customAttributes(state)).toHaveLength(1);
        expect(selectors.customAttribute(state)?.uuid).toBe('ca-detail');
        expect(selectors.resources(state)).toHaveLength(1);
        expect(selectors.resourceCustomAttributes(state)).toHaveLength(1);
        expect(selectors.secondaryResourceCustomAttributes(state)).toHaveLength(1);
        expect(selectors.checkedRows(state)).toEqual(['row-1']);
        expect(selectors.isCreating(state)).toBe(true);
        expect(selectors.isFetchingList(state)).toBe(true);
        expect(selectors.isFetchingDetail(state)).toBe(true);
        expect(selectors.isFetchingResources(state)).toBe(true);
        expect(selectors.isFetchingResourceCustomAttributes(state)).toBe(true);
        expect(selectors.isFetchingResourceSecondaryCustomAttributes(state)).toBe(true);
        expect(selectors.isDeleting(state)).toBe(true);
        expect(selectors.isBulkDeleting(state)).toBe(true);
        expect(selectors.isBulkEnabling(state)).toBe(true);
        expect(selectors.isEnabling(state)).toBe(true);
        expect(selectors.isBulkDisabling(state)).toBe(true);
        expect(selectors.isDisabling(state)).toBe(true);
        expect(selectors.isUpdating(state)).toBe(true);
        expect(selectors.createCustomAttributeSucceeded(state)).toBe(true);
        expect(selectors.updateCustomAttributeSucceeded(state)).toBe(true);
        expect(selectors.isUpdatingContent(state)).toBe(true);
    });

    test('resourceCustomAttributesContents selector returns matching entry', () => {
        const featureState = {
            ...initialState,
            resourceCustomAttributesContents: [{ resource: Resource.Certificates, resourceUuid: 'r1', customAttributes: [{ uuid: 'c1' }] }],
        } as any;
        const state = { customAttributes: featureState } as any;

        const result = selectors.resourceCustomAttributesContents(Resource.Certificates, 'r1')(state);
        expect(result).toHaveLength(1);
        expect((result as any)[0].uuid).toBe('c1');
    });

    test('resourceCustomAttributesContents selector returns undefined for missing entry', () => {
        const state = { customAttributes: { ...initialState } } as any;
        const result = selectors.resourceCustomAttributesContents(Resource.Certificates, 'missing')(state);
        expect(result).toBeUndefined();
    });

    test('multipleResourceCustomAttributes selector returns grouped attributes', () => {
        const featureState = {
            ...initialState,
            resourceCustomAttributesContents: [{ resource: Resource.Certificates, resourceUuid: '', customAttributes: [{ uuid: 'mc1' }] }],
        } as any;
        const state = { customAttributes: featureState } as any;

        const result = selectors.multipleResourceCustomAttributes([Resource.Certificates])(state);
        expect(result[Resource.Certificates]).toHaveLength(1);
    });
});
