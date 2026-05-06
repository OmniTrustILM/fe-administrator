import { describe, expect, test } from 'vitest';

import reducer, { actions, initialState, selectors } from './vault-profiles';

describe('vaultProfiles slice', () => {
    test('returns initial state for unknown action', () => {
        expect(reducer(undefined, { type: 'unknown' })).toEqual(initialState);
    });

    test('resetState restores initial values and clears extra keys', () => {
        const dirtyState = {
            ...initialState,
            vaultProfiles: [{ uuid: 'vp-1' } as any],
            vaultProfile: { uuid: 'vp-1', name: 'P', vaultInstance: { uuid: 'v-1', name: 'V' }, enabled: true },
            isFetchingList: true,
            isFetchingDetail: true,
            isCreating: true,
            isDeleting: true,
            vaultProfileAttributeDescriptors: [{ uuid: 'a-1' } as any],
            vaultProfileAttributesVaultUuid: 'v-1',
            isFetchingVaultProfileAttributes: true,
            tempOnlyKey: 'to-be-removed',
        } as any;

        const next = reducer(dirtyState, actions.resetState());

        expect(next).toEqual(initialState);
        expect((next as any).tempOnlyKey).toBeUndefined();
    });

    test('listVaultProfiles / success / failure update list flags and data', () => {
        let next = reducer(initialState, actions.listVaultProfiles());
        expect(next.isFetchingList).toBe(true);
        expect(next.vaultProfiles).toEqual([]);

        const items = [{ uuid: 'vp-1' }, { uuid: 'vp-2' }] as any[];
        next = reducer(next, actions.listVaultProfilesSuccess({ items }));
        expect(next.isFetchingList).toBe(false);
        expect(next.vaultProfiles).toEqual(items);

        next = reducer({ ...next, isFetchingList: true }, actions.listVaultProfilesFailure({ error: 'err' }));
        expect(next.isFetchingList).toBe(false);
    });

    test('createVaultProfile / success / failure update flags and list', () => {
        const request = {
            name: 'Profile 1',
            description: 'desc',
            attributes: [],
        } as any;

        let next = reducer(initialState, actions.createVaultProfile({ vaultUuid: 'v-1', request }));
        expect(next.isCreating).toBe(true);

        const profile = { uuid: 'vp-1', name: 'Profile 1' } as any;
        next = reducer(next, actions.createVaultProfileSuccess({ profile }));
        expect(next.isCreating).toBe(false);
        expect(next.vaultProfiles).toEqual([profile]);

        next = reducer({ ...next, isCreating: true }, actions.createVaultProfileFailure({ error: 'failed' }));
        expect(next.isCreating).toBe(false);
    });

    test('deleteVaultProfile / success / failure update flags and list', () => {
        const items = [{ uuid: 'vp-1' } as any, { uuid: 'vp-2' } as any];

        let next = reducer(
            { ...initialState, vaultProfiles: items },
            actions.deleteVaultProfile({ vaultUuid: 'v-1', vaultProfileUuid: 'vp-1' }),
        );
        expect(next.isDeleting).toBe(true);

        next = reducer(next, actions.deleteVaultProfileSuccess({ vaultProfileUuid: 'vp-1' }));
        expect(next.isDeleting).toBe(false);
        expect(next.vaultProfiles).toEqual([{ uuid: 'vp-2' }]);

        next = reducer({ ...next, isDeleting: true }, actions.deleteVaultProfileFailure({ error: 'failed' }));
        expect(next.isDeleting).toBe(false);
    });

    test('getVaultProfileDetail / success / failure update detail and flags', () => {
        let next = reducer(initialState, actions.getVaultProfileDetail({ vaultUuid: 'v-1', vaultProfileUuid: 'vp-1' }));
        expect(next.isFetchingDetail).toBe(true);
        expect(next.vaultProfile).toBeNull();

        const profile = { uuid: 'vp-1', name: 'P1', vaultInstance: { uuid: 'v-1', name: 'V1' }, enabled: true } as any;
        next = reducer(next, actions.getVaultProfileDetailSuccess({ profile }));
        expect(next.isFetchingDetail).toBe(false);
        expect(next.vaultProfile).toEqual(profile);

        next = reducer({ ...next, isFetchingDetail: true }, actions.getVaultProfileDetailFailure({ error: 'err' }));
        expect(next.isFetchingDetail).toBe(false);
    });

    test('getVaultProfileAttributes / success / failure update descriptors and flags', () => {
        let next = reducer(initialState, actions.getVaultProfileAttributes({ vaultUuid: 'v-1' }));
        expect(next.isFetchingVaultProfileAttributes).toBe(true);
        expect(next.vaultProfileAttributesVaultUuid).toBe('v-1');

        const attrs = [{ uuid: 'a-1', name: 'Attr1' }] as any[];
        next = reducer(next, actions.getVaultProfileAttributesSuccess({ vaultUuid: 'v-1', attributes: attrs }));
        expect(next.isFetchingVaultProfileAttributes).toBe(false);
        expect(next.vaultProfileAttributeDescriptors).toEqual(attrs);
        expect(next.vaultProfileAttributesVaultUuid).toBe('v-1');

        next = reducer(
            { ...next, vaultProfileAttributesVaultUuid: 'v-1', vaultProfileAttributeDescriptors: attrs },
            actions.getVaultProfileAttributesFailure({ vaultUuid: 'v-1', error: 'err' }),
        );
        expect(next.vaultProfileAttributeDescriptors).toEqual([]);
        expect(next.vaultProfileAttributesVaultUuid).toBeNull();
        expect(next.isFetchingVaultProfileAttributes).toBe(false);
    });

    test('getVaultProfileAttributesSuccess ignores result when vaultUuid does not match', () => {
        const attrs = [{ uuid: 'a-1' }] as any[];
        const next = reducer(
            { ...initialState, vaultProfileAttributesVaultUuid: 'v-other', isFetchingVaultProfileAttributes: true },
            actions.getVaultProfileAttributesSuccess({ vaultUuid: 'v-1', attributes: attrs }),
        );
        expect(next.vaultProfileAttributeDescriptors).toEqual([]);
        expect(next.vaultProfileAttributesVaultUuid).toBe('v-other');
        expect(next.isFetchingVaultProfileAttributes).toBe(true);
    });

    test('getVaultProfileAttributesFailure clears descriptors only when vaultUuid matches', () => {
        const attrs = [{ uuid: 'a-1' }] as any[];
        const next = reducer(
            {
                ...initialState,
                vaultProfileAttributesVaultUuid: 'v-1',
                vaultProfileAttributeDescriptors: attrs,
                isFetchingVaultProfileAttributes: true,
            },
            actions.getVaultProfileAttributesFailure({ vaultUuid: 'v-other', error: 'err' }),
        );
        expect(next.vaultProfileAttributeDescriptors).toEqual(attrs);
        expect(next.vaultProfileAttributesVaultUuid).toBe('v-1');
        expect(next.isFetchingVaultProfileAttributes).toBe(true);
    });

    test('enableVaultProfile / success / failure update isEnabling flag', () => {
        let next = reducer(initialState, actions.enableVaultProfile({ vaultUuid: 'v-1', vaultProfileUuid: 'vp-1' }));
        expect(next.isEnabling).toBe(true);

        const profile = { uuid: 'vp-1', name: 'P', vaultInstance: { uuid: 'v-1', name: 'V' }, enabled: true } as any;
        next = reducer({ ...next, vaultProfile: profile }, actions.enableVaultProfileSuccess({ profile }));
        expect(next.isEnabling).toBe(false);
        expect(next.vaultProfile).toEqual(profile);

        next = reducer({ ...next, isEnabling: true }, actions.enableVaultProfileFailure({ error: 'err' }));
        expect(next.isEnabling).toBe(false);
    });

    test('enableVaultProfileSuccess does not update vaultProfile when uuid does not match', () => {
        const stored = { uuid: 'vp-other', name: 'Other', vaultInstance: { uuid: 'v-1', name: 'V' }, enabled: false } as any;
        const incoming = { uuid: 'vp-1', name: 'P', vaultInstance: { uuid: 'v-1', name: 'V' }, enabled: true } as any;
        const next = reducer(
            { ...initialState, isEnabling: true, vaultProfile: stored },
            actions.enableVaultProfileSuccess({ profile: incoming }),
        );
        expect(next.isEnabling).toBe(false);
        expect(next.vaultProfile).toEqual(stored);
    });

    test('disableVaultProfile / success / failure update isDisabling flag', () => {
        let next = reducer(initialState, actions.disableVaultProfile({ vaultUuid: 'v-1', vaultProfileUuid: 'vp-1' }));
        expect(next.isDisabling).toBe(true);

        const profile = { uuid: 'vp-1', name: 'P', vaultInstance: { uuid: 'v-1', name: 'V' }, enabled: false } as any;
        next = reducer({ ...next, vaultProfile: profile }, actions.disableVaultProfileSuccess({ profile }));
        expect(next.isDisabling).toBe(false);
        expect(next.vaultProfile).toEqual(profile);

        next = reducer({ ...next, isDisabling: true }, actions.disableVaultProfileFailure({ error: 'err' }));
        expect(next.isDisabling).toBe(false);
    });

    test('disableVaultProfileSuccess does not update vaultProfile when uuid does not match', () => {
        const stored = { uuid: 'vp-other', name: 'Other', vaultInstance: { uuid: 'v-1', name: 'V' }, enabled: true } as any;
        const incoming = { uuid: 'vp-1', name: 'P', vaultInstance: { uuid: 'v-1', name: 'V' }, enabled: false } as any;
        const next = reducer(
            { ...initialState, isDisabling: true, vaultProfile: stored },
            actions.disableVaultProfileSuccess({ profile: incoming }),
        );
        expect(next.isDisabling).toBe(false);
        expect(next.vaultProfile).toEqual(stored);
    });

    test('updateVaultProfile / success / failure update isUpdating and updateVaultProfileSucceeded', () => {
        const request = { name: 'Updated', description: 'desc', attributes: [] } as any;

        let next = reducer(initialState, actions.updateVaultProfile({ vaultUuid: 'v-1', vaultProfileUuid: 'vp-1', request }));
        expect(next.isUpdating).toBe(true);
        expect(next.updateVaultProfileSucceeded).toBe(false);

        const profile = { uuid: 'vp-1', name: 'Updated', vaultInstance: { uuid: 'v-1', name: 'V' }, enabled: true } as any;
        next = reducer({ ...next, vaultProfile: profile }, actions.updateVaultProfileSuccess({ profile }));
        expect(next.isUpdating).toBe(false);
        expect(next.updateVaultProfileSucceeded).toBe(true);
        expect(next.vaultProfile).toEqual(profile);

        next = reducer(
            { ...next, isUpdating: true, updateVaultProfileSucceeded: true },
            actions.updateVaultProfileFailure({ error: 'err' }),
        );
        expect(next.isUpdating).toBe(false);
        expect(next.updateVaultProfileSucceeded).toBe(false);
    });

    test('updateVaultProfileSuccess does not update vaultProfile when uuid does not match', () => {
        const stored = { uuid: 'vp-other', name: 'Other', vaultInstance: { uuid: 'v-1', name: 'V' }, enabled: true } as any;
        const incoming = { uuid: 'vp-1', name: 'Updated', vaultInstance: { uuid: 'v-1', name: 'V' }, enabled: true } as any;
        const next = reducer(
            { ...initialState, isUpdating: true, vaultProfile: stored },
            actions.updateVaultProfileSuccess({ profile: incoming }),
        );
        expect(next.isUpdating).toBe(false);
        expect(next.updateVaultProfileSucceeded).toBe(true);
        expect(next.vaultProfile).toEqual(stored);
    });
});

describe('vaultProfiles selectors', () => {
    test('selectors read values from vaultProfiles state', () => {
        const profile = { uuid: 'vp-1', name: 'P', vaultInstance: { uuid: 'v-1', name: 'V' }, enabled: true } as any;
        const attrs = [{ uuid: 'a-1' }] as any[];
        const vpState = {
            ...initialState,
            vaultProfiles: [profile],
            vaultProfile: profile,
            isFetchingList: true,
            isFetchingDetail: true,
            isCreating: true,
            createVaultProfileSucceeded: true,
            isDeleting: true,
            isEnabling: true,
            isDisabling: true,
            isUpdating: true,
            updateVaultProfileSucceeded: true,
            vaultProfileAttributeDescriptors: attrs,
            vaultProfileAttributesVaultUuid: 'v-1',
            isFetchingVaultProfileAttributes: true,
        };

        const state = { vaultProfiles: vpState } as any;

        expect(selectors.vaultProfiles(state)).toEqual(vpState.vaultProfiles);
        expect(selectors.vaultProfile(state)).toEqual(profile);
        expect(selectors.isFetchingList(state)).toBe(true);
        expect(selectors.isFetchingDetail(state)).toBe(true);
        expect(selectors.isCreating(state)).toBe(true);
        expect(selectors.createVaultProfileSucceeded(state)).toBe(true);
        expect(selectors.isDeleting(state)).toBe(true);
        expect(selectors.isEnabling(state)).toBe(true);
        expect(selectors.isDisabling(state)).toBe(true);
        expect(selectors.isUpdating(state)).toBe(true);
        expect(selectors.updateVaultProfileSucceeded(state)).toBe(true);
        expect(selectors.vaultProfileAttributeDescriptors(state)).toEqual(attrs);
        expect(selectors.vaultProfileAttributesVaultUuid(state)).toBe('v-1');
        expect(selectors.isFetchingVaultProfileAttributes(state)).toBe(true);
    });
});
