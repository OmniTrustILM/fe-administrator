import { describe, expect, test } from 'vitest';

import reducer, { actions, initialState, selectors } from './locations';

describe('locations slice', () => {
    test('returns initial state for unknown action', () => {
        expect(reducer(undefined, { type: 'unknown' })).toEqual(initialState);
    });

    test('resetState restores initial values', () => {
        const dirty = {
            ...initialState,
            location: { uuid: 'l-1' } as any,
            locations: [{ uuid: 'l-1' } as any],
            isFetchingDetail: true,
            tempKey: 'gone',
        } as any;

        const next = reducer(dirty, actions.resetState());

        expect(next).toEqual(initialState);
        expect((next as any).tempKey).toBeUndefined();
    });

    test('clearPushAttributeDescriptors', () => {
        const next = reducer(
            { ...initialState, pushAttributeDescriptors: [{ uuid: 'd-1' } as any] },
            actions.clearPushAttributeDescriptors(),
        );
        expect(next.pushAttributeDescriptors).toBeUndefined();
    });

    test('listLocations / listLocationsSuccess', () => {
        const items = [{ uuid: 'l-1' }, { uuid: 'l-2' }] as any[];
        const next = reducer(initialState, actions.listLocationsSuccess(items));
        expect(next.locations).toEqual(items);
    });

    test('getLocationDetail / success / failure', () => {
        let next = reducer(initialState, actions.getLocationDetail({ entityUuid: 'e-1', uuid: 'l-1' }));
        expect(next.isFetchingDetail).toBe(true);
        expect(next.location).toBeUndefined();

        const location = { uuid: 'l-1', name: 'Loc 1', enabled: true } as any;
        next = reducer(next, actions.getLocationDetailSuccess({ location }));
        expect(next.isFetchingDetail).toBe(false);
        expect(next.location).toEqual(location);

        next = reducer({ ...next, isFetchingDetail: true }, actions.getLocationDetailFailure({ error: 'err' }));
        expect(next.isFetchingDetail).toBe(false);
    });

    test('addLocation / success / failure', () => {
        let next = reducer(initialState, actions.addLocation({ entityUuid: 'e-1', addLocationRequest: { name: 'L1' } as any }));
        expect(next.isCreating).toBe(true);
        expect(next.createLocationSucceeded).toBe(false);

        const location = { uuid: 'l-1', name: 'L1' } as any;
        next = reducer(next, actions.addLocationSuccess({ location, entityUuid: 'e-1' }));
        expect(next.isCreating).toBe(false);
        expect(next.createLocationSucceeded).toBe(true);
        expect(next.locations).toContainEqual(location);

        next = reducer({ ...next, isCreating: true }, actions.addLocationFailure({ error: 'err' }));
        expect(next.isCreating).toBe(false);
        expect(next.createLocationSucceeded).toBe(false);
    });

    test('editLocation / success / failure', () => {
        let next = reducer(initialState, actions.editLocation({ uuid: 'l-1', entityUuid: 'e-1', editLocationRequest: {} as any }));
        expect(next.isUpdating).toBe(true);
        expect(next.updateLocationSucceeded).toBe(false);

        const location = { uuid: 'l-1', name: 'Updated' } as any;
        next = reducer(next, actions.editLocationSuccess({ location }));
        expect(next.isUpdating).toBe(false);
        expect(next.updateLocationSucceeded).toBe(true);

        next = reducer({ ...next, isUpdating: true }, actions.editLocationFailure({ error: 'err' }));
        expect(next.isUpdating).toBe(false);
        expect(next.updateLocationSucceeded).toBe(false);
    });

    test('deleteLocation / success / failure', () => {
        const items = [{ uuid: 'l-1' } as any, { uuid: 'l-2' } as any];

        let next = reducer({ ...initialState, locations: items }, actions.deleteLocation({ entityUuid: 'e-1', uuid: 'l-1' }));
        expect(next.isDeleting).toBe(true);

        next = reducer(next, actions.deleteLocationSuccess({ uuid: 'l-1' }));
        expect(next.isDeleting).toBe(false);

        next = reducer({ ...next, isDeleting: true }, actions.deleteLocationFailure({ error: 'err' }));
        expect(next.isDeleting).toBe(false);
    });

    test('bulkDeleteLocations / success removes only deleted locations / failure', () => {
        const items = [{ uuid: 'l-1' } as any, { uuid: 'l-2' } as any, { uuid: 'l-3' } as any];
        const selected = { uuid: 'l-2' } as any;

        let next = reducer(
            { ...initialState, locations: items, location: selected },
            actions.bulkDeleteLocations({
                locations: [
                    { entityUuid: 'e-1', uuid: 'l-1' },
                    { entityUuid: 'e-1', uuid: 'l-2' },
                ],
            }),
        );
        expect(next.isDeleting).toBe(true);

        next = reducer(next, actions.bulkDeleteLocationsSuccess({ uuids: ['l-1'] }));
        expect(next.isDeleting).toBe(false);
        expect(next.locations).toEqual([{ uuid: 'l-2' }, { uuid: 'l-3' }]);
        expect(next.location).toEqual(selected);

        next = reducer({ ...next, isDeleting: true }, actions.bulkDeleteLocationsFailure({ error: 'err' }));
        expect(next.isDeleting).toBe(false);
    });

    test('enableLocation / success updates list and detail / failure', () => {
        const loc = { uuid: 'l-1', enabled: false } as any;

        let next = reducer(
            { ...initialState, locations: [loc], location: loc },
            actions.enableLocation({ entityUuid: 'e-1', uuid: 'l-1' }),
        );
        expect(next.isEnabling).toBe(true);

        next = reducer(next, actions.enableLocationSuccess({ uuid: 'l-1' }));
        expect(next.isEnabling).toBe(false);
        expect(next.locations.find((l) => l.uuid === 'l-1')?.enabled).toBe(true);
        expect(next.location?.enabled).toBe(true);

        next = reducer({ ...next, isEnabling: true }, actions.enableLocationFailure({ error: 'err' }));
        expect(next.isEnabling).toBe(false);
    });

    test('disableLocation / success updates list and detail / failure', () => {
        const loc = { uuid: 'l-1', enabled: true } as any;

        let next = reducer(
            { ...initialState, locations: [loc], location: loc },
            actions.disableLocation({ entityUuid: 'e-1', uuid: 'l-1' }),
        );
        expect(next.isDisabling).toBe(true);

        next = reducer(next, actions.disableLocationSuccess({ uuid: 'l-1' }));
        expect(next.isDisabling).toBe(false);
        expect(next.locations.find((l) => l.uuid === 'l-1')?.enabled).toBe(false);
        expect(next.location?.enabled).toBe(false);

        next = reducer({ ...next, isDisabling: true }, actions.disableLocationFailure({ error: 'err' }));
        expect(next.isDisabling).toBe(false);
    });

    test('syncLocation / success / failure', () => {
        let next = reducer(initialState, actions.syncLocation({ entityUuid: 'e-1', uuid: 'l-1' }));
        expect(next.isSyncing).toBe(true);

        const location = { uuid: 'l-1', name: 'Synced' } as any;
        next = reducer(next, actions.syncLocationSuccess({ location }));
        expect(next.isSyncing).toBe(false);

        next = reducer({ ...next, isSyncing: true }, actions.syncLocationFailure({ error: 'err' }));
        expect(next.isSyncing).toBe(false);
    });

    test('getPushAttributes / success / failure', () => {
        let next = reducer(initialState, actions.getPushAttributes({ entityUuid: 'e-1', uuid: 'l-1' }));
        expect(next.isFetchingPushAttributeDescriptors).toBe(true);

        const attributes = [{ uuid: 'a-1' }] as any[];
        next = reducer(next, actions.getPushAttributesSuccess({ attributes }));
        expect(next.isFetchingPushAttributeDescriptors).toBe(false);
        expect(next.pushAttributeDescriptors).toEqual(attributes);

        next = reducer({ ...next, isFetchingPushAttributeDescriptors: true }, actions.getPushAttributesFailure({ error: 'err' }));
        expect(next.isFetchingPushAttributeDescriptors).toBe(false);
    });

    test('getCSRAttributes / success / failure', () => {
        let next = reducer(initialState, actions.getCSRAttributes({ entityUuid: 'e-1', uuid: 'l-1' }));
        expect(next.isFetchingCSRAttributeDescriptors).toBe(true);

        const attributes = [{ uuid: 'a-1' }] as any[];
        next = reducer(next, actions.getCSRAttributesSuccess({ attributes }));
        expect(next.isFetchingCSRAttributeDescriptors).toBe(false);
        expect(next.csrAttributeDescriptors).toEqual(attributes);

        next = reducer({ ...next, isFetchingCSRAttributeDescriptors: true }, actions.getCSRAttributesFailure({ error: 'err' }));
        expect(next.isFetchingCSRAttributeDescriptors).toBe(false);
    });

    test('pushCertificate / success / failure', () => {
        let next = reducer(
            initialState,
            actions.pushCertificate({ entityUuid: 'e-1', locationUuid: 'l-1', certificateUuid: 'c-1', pushRequest: {} as any }),
        );
        expect(next.isPushingCertificate).toBe(true);

        const location = { uuid: 'l-1', name: 'Loc 1' } as any;
        next = reducer(next, actions.pushCertificateSuccess({ location, certificateUuid: 'c-1' }));
        expect(next.isPushingCertificate).toBe(false);

        next = reducer({ ...next, isPushingCertificate: true }, actions.pushCertificateFailure({ error: 'err' }));
        expect(next.isPushingCertificate).toBe(false);
    });

    test('issueCertificate / success / failure', () => {
        let next = reducer(initialState, actions.issueCertificate({ entityUuid: 'e-1', locationUuid: 'l-1', issueRequest: {} as any }));
        expect(next.isIssuingCertificate).toBe(true);

        const location = { uuid: 'l-1', name: 'Loc 1' } as any;
        next = reducer(next, actions.issueCertificateSuccess({ location }));
        expect(next.isIssuingCertificate).toBe(false);

        next = reducer({ ...next, isIssuingCertificate: true }, actions.issueCertificateFailure({ error: 'err' }));
        expect(next.isIssuingCertificate).toBe(false);
    });

    test('autoRenewCertificate / success / failure', () => {
        let next = reducer(initialState, actions.autoRenewCertificate({ entityUuid: 'e-1', locationUuid: 'l-1', certificateUuid: 'c-1' }));
        expect(next.isAutoRenewingCertificate).toBe(true);

        const location = { uuid: 'l-1', name: 'Loc 1' } as any;
        next = reducer(next, actions.autoRenewCertificateSuccess({ location, certificateUuid: 'c-1' }));
        expect(next.isAutoRenewingCertificate).toBe(false);

        next = reducer({ ...next, isAutoRenewingCertificate: true }, actions.autoRenewCertificateFailure({ error: 'err' }));
        expect(next.isAutoRenewingCertificate).toBe(false);
    });

    test('removeCertificate / success / failure', () => {
        let next = reducer(initialState, actions.removeCertificate({ entityUuid: 'e-1', locationUuid: 'l-1', certificateUuid: 'c-1' }));
        expect(next.isRemovingCertificate).toBe(true);

        const location = { uuid: 'l-1', name: 'Loc 1' } as any;
        next = reducer(next, actions.removeCertificateSuccess({ location, certificateUuid: 'c-1' }));
        expect(next.isRemovingCertificate).toBe(false);

        next = reducer({ ...next, isRemovingCertificate: true }, actions.removeCertificateFailure({ error: 'err' }));
        expect(next.isRemovingCertificate).toBe(false);
    });

    test('editLocationSuccess updates location in list when found at non-zero index', () => {
        const original = { uuid: 'l-2', name: 'Old' } as any;
        const updated = { uuid: 'l-2', name: 'Updated' } as any;
        const items = [{ uuid: 'l-1' } as any, original];

        const next = reducer({ ...initialState, locations: items }, actions.editLocationSuccess({ location: updated }));
        expect(next.locations[1]).toEqual(updated);
        expect(next.updateLocationSucceeded).toBe(true);
    });

    test('deleteLocationSuccess removes location when found at non-zero index', () => {
        const items = [{ uuid: 'l-1' } as any, { uuid: 'l-2' } as any, { uuid: 'l-3' } as any];

        const next = reducer({ ...initialState, locations: items }, actions.deleteLocationSuccess({ uuid: 'l-2' }));
        expect(next.isDeleting).toBe(false);
        expect(next.locations.find((l) => l.uuid === 'l-2')).toBeUndefined();
        expect(next.locations).toHaveLength(2);
    });

    test('bulkDeleteLocationsSuccess clears state.location when its uuid is in the deleted list', () => {
        const items = [{ uuid: 'l-1' } as any, { uuid: 'l-2' } as any];
        const selected = { uuid: 'l-1' } as any;

        const next = reducer(
            { ...initialState, locations: items, location: selected },
            actions.bulkDeleteLocationsSuccess({ uuids: ['l-1', 'l-2'] }),
        );
        expect(next.location).toBeUndefined();
        expect(next.locations).toHaveLength(0);
    });

    test('syncLocationSuccess updates location in list when found at non-zero index', () => {
        const original = { uuid: 'l-2', name: 'Old' } as any;
        const synced = { uuid: 'l-2', name: 'Synced' } as any;
        const items = [{ uuid: 'l-1' } as any, original];

        const next = reducer({ ...initialState, locations: items }, actions.syncLocationSuccess({ location: synced }));
        expect(next.isSyncing).toBe(false);
        expect(next.locations[1]).toEqual(synced);
    });
});

describe('locations selectors', () => {
    test('selectors read values from locations state', () => {
        const location = { uuid: 'l-1' } as any;
        const attrs = [{ uuid: 'a-1' }] as any[];
        const featureState = {
            ...initialState,
            location,
            locations: [location],
            pushAttributeDescriptors: attrs,
            csrAttributeDescriptors: attrs,
            isFetchingDetail: true,
            isCreating: true,
            createLocationSucceeded: true,
            isUpdating: true,
            updateLocationSucceeded: true,
            isDeleting: true,
            isEnabling: true,
            isDisabling: true,
            isSyncing: true,
            isPushingCertificate: true,
            isIssuingCertificate: true,
            isAutoRenewingCertificate: true,
            isRemovingCertificate: true,
            isFetchingPushAttributeDescriptors: true,
            isFetchingCSRAttributeDescriptors: true,
        };

        const state = { locations: featureState } as any;

        expect(selectors.location(state)).toEqual(location);
        expect(selectors.locations(state)).toEqual([location]);
        expect(selectors.pushAttributeDescriptors(state)).toEqual(attrs);
        expect(selectors.csrAttributeDescriptors(state)).toEqual(attrs);
        expect(selectors.isFetchingDetail(state)).toBe(true);
        expect(selectors.isCreating(state)).toBe(true);
        expect(selectors.createLocationSucceeded(state)).toBe(true);
        expect(selectors.isUpdating(state)).toBe(true);
        expect(selectors.updateLocationSucceeded(state)).toBe(true);
        expect(selectors.isDeleting(state)).toBe(true);
        expect(selectors.isEnabling(state)).toBe(true);
        expect(selectors.isDisabling(state)).toBe(true);
        expect(selectors.isSyncing(state)).toBe(true);
        expect(selectors.isPushingCertificate(state)).toBe(true);
        expect(selectors.isIssuingCertificate(state)).toBe(true);
        expect(selectors.isAutoRenewingCertificate(state)).toBe(true);
        expect(selectors.isRemovingCertificate(state)).toBe(true);
    });
});
