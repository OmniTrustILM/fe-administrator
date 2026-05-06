import { describe, expect, test } from 'vitest';

import reducer, { actions, initialState, selectors } from './compliance-profiles';

describe('complianceProfiles slice', () => {
    test('returns initial state for unknown action', () => {
        expect(reducer(undefined, { type: 'unknown' })).toEqual(initialState);
    });

    test('resetState restores initial values', () => {
        const dirty = {
            ...initialState,
            complianceProfile: { uuid: 'cp-1' } as any,
            complianceProfiles: [{ uuid: 'cp-1' } as any],
            isFetchingList: true,
            tempKey: 'gone',
        } as any;

        const next = reducer(dirty, actions.resetState());

        expect(next).toEqual(initialState);
        expect((next as any).tempKey).toBeUndefined();
    });

    test('setCheckedRows', () => {
        const next = reducer(initialState, actions.setCheckedRows({ checkedRows: ['cp-1'] }));
        expect(next.checkedRows).toEqual(['cp-1']);
    });

    test('clearDeleteErrorMessages', () => {
        const next = reducer(
            { ...initialState, deleteErrorMessage: 'err', bulkDeleteErrorMessages: [{ uuid: 'cp-1' } as any] },
            actions.clearDeleteErrorMessages(),
        );
        expect(next.deleteErrorMessage).toBe('');
        expect(next.bulkDeleteErrorMessages).toEqual([]);
    });

    test('getComplianceProfile / success / failure', () => {
        let next = reducer(initialState, actions.getComplianceProfile({ uuid: 'cp-1' }));
        expect(next.isFetchingDetail).toBe(true);

        const profile = { uuid: 'cp-1', name: 'Profile 1' } as any;
        next = reducer(next, actions.getComplianceProfileSuccess({ complianceProfile: profile }));
        expect(next.isFetchingDetail).toBe(false);
        expect(next.complianceProfile).toEqual(profile);

        next = reducer({ ...next, isFetchingDetail: true }, actions.getComplianceProfileFailed({ error: 'err' }));
        expect(next.isFetchingDetail).toBe(false);
    });

    test('createComplianceProfile / success / failure', () => {
        let next = reducer(initialState, actions.createComplianceProfile({ name: 'P1' } as any));
        expect(next.isCreating).toBe(true);
        expect(next.createComplianceProfileSucceeded).toBe(false);

        next = reducer(next, actions.createComplianceProfileSuccess({ uuid: 'cp-1' }));
        expect(next.isCreating).toBe(false);
        expect(next.createComplianceProfileSucceeded).toBe(true);

        next = reducer({ ...next, isCreating: true }, actions.createComplianceProfileFailed({ error: 'err' }));
        expect(next.isCreating).toBe(false);
        expect(next.createComplianceProfileSucceeded).toBe(false);
    });

    test('deleteComplianceProfile / success removes from list / failure sets error', () => {
        const items = [{ uuid: 'cp-1' } as any, { uuid: 'cp-2' } as any];
        const profile = { uuid: 'cp-1', name: 'P1' } as any;

        let next = reducer(
            { ...initialState, complianceProfiles: items, complianceProfile: profile },
            actions.deleteComplianceProfile({ uuid: 'cp-1' }),
        );
        expect(next.isDeleting).toBe(true);
        expect(next.deleteErrorMessage).toBe('');

        next = reducer(next, actions.deleteComplianceProfileSuccess({ uuid: 'cp-1' }));
        expect(next.isDeleting).toBe(false);
        expect(next.complianceProfiles).toEqual([{ uuid: 'cp-2' }]);
        expect(next.complianceProfile).toBeUndefined();

        next = reducer({ ...next, isDeleting: true }, actions.deleteComplianceProfileFailed({ error: 'delete failed' }));
        expect(next.isDeleting).toBe(false);
        expect(next.deleteErrorMessage).toBe('delete failed');
    });

    test('bulkDeleteComplianceProfiles / success with errors / success without errors / failure', () => {
        const items = [{ uuid: 'cp-1' } as any, { uuid: 'cp-2' } as any];

        let next = reducer({ ...initialState, complianceProfiles: items }, actions.bulkDeleteComplianceProfiles({ uuids: ['cp-1'] }));
        expect(next.isBulkDeleting).toBe(true);

        // With errors - does not remove
        const errors = [{ uuid: 'cp-1', message: 'In use' }] as any[];
        next = reducer(next, actions.bulkDeleteComplianceProfilesSuccess({ uuids: ['cp-1'], errors }));
        expect(next.isBulkDeleting).toBe(false);
        expect(next.bulkDeleteErrorMessages).toEqual(errors);
        expect(next.complianceProfiles).toEqual(items);

        // Without errors - removes
        next = reducer(
            { ...initialState, complianceProfiles: items },
            actions.bulkDeleteComplianceProfilesSuccess({ uuids: ['cp-1'], errors: [] }),
        );
        expect(next.complianceProfiles).toEqual([{ uuid: 'cp-2' }]);

        next = reducer({ ...next, isBulkDeleting: true }, actions.bulkDeleteComplianceProfilesFailed({ error: 'err' }));
        expect(next.isBulkDeleting).toBe(false);
    });

    test('bulkForceDeleteComplianceProfiles / success removes items / failure', () => {
        const items = [{ uuid: 'cp-1' } as any, { uuid: 'cp-2' } as any];

        let next = reducer({ ...initialState, complianceProfiles: items }, actions.bulkForceDeleteComplianceProfiles({ uuids: ['cp-1'] }));
        expect(next.isBulkForceDeleting).toBe(true);

        next = reducer(next, actions.bulkForceDeleteComplianceProfilesSuccess({ uuids: ['cp-1'] }));
        expect(next.isBulkForceDeleting).toBe(false);
        expect(next.complianceProfiles).toEqual([{ uuid: 'cp-2' }]);

        next = reducer({ ...next, isBulkForceDeleting: true }, actions.bulkForceDeleteComplianceProfilesFailed({ error: 'err' }));
        expect(next.isBulkForceDeleting).toBe(false);
    });

    test('getListComplianceProfiles / success / failure', () => {
        let next = reducer(initialState, actions.getListComplianceProfiles());
        expect(next.isFetchingList).toBe(true);

        const items = [{ uuid: 'cp-1' }] as any[];
        next = reducer(next, actions.getListComplianceProfilesSuccess({ complianceProfileList: items }));
        expect(next.isFetchingList).toBe(false);
        expect(next.complianceProfiles).toEqual(items);

        next = reducer({ ...next, isFetchingList: true }, actions.getListComplianceProfilesFailed({ error: 'err' }));
        expect(next.isFetchingList).toBe(false);
    });

    test('associateComplianceProfile / success adds to associations / failure', () => {
        const profile = { uuid: 'cp-1', name: 'P1' } as any;

        let next = reducer(
            { ...initialState, complianceProfile: profile },
            actions.associateComplianceProfile({
                uuid: 'cp-1',
                resource: 'raProfiles' as any,
                associationObjectUuid: 'ra-1',
                associationObjectName: 'RA Profile 1',
            }),
        );
        expect(next.isAssociatingComplianceProfile).toBe(true);

        next = reducer(
            next,
            actions.associateComplianceProfileSuccess({
                uuid: 'cp-1',
                resource: 'raProfiles' as any,
                associationObjectUuid: 'ra-1',
                associationObjectName: 'RA Profile 1',
            }),
        );
        expect(next.isAssociatingComplianceProfile).toBe(false);
        expect(next.associationsOfComplianceProfile).toContainEqual({
            objectUuid: 'ra-1',
            resource: 'raProfiles',
            name: 'RA Profile 1',
        });

        next = reducer({ ...next, isAssociatingComplianceProfile: true }, actions.associateComplianceProfileFailed({ error: 'err' }));
        expect(next.isAssociatingComplianceProfile).toBe(false);
    });

    test('dissociateComplianceProfile / success removes from associations / failure', () => {
        const assocs = [{ objectUuid: 'ra-1', resource: 'raProfiles', name: 'RA1' }] as any[];

        let next = reducer(
            { ...initialState, associationsOfComplianceProfile: assocs },
            actions.dissociateComplianceProfile({ uuid: 'cp-1', resource: 'raProfiles' as any, associationObjectUuid: 'ra-1' }),
        );
        expect(next.isDissociatingComplianceProfile).toBe(true);

        next = reducer(
            next,
            actions.dissociateComplianceProfileSuccess({ uuid: 'cp-1', resource: 'raProfiles' as any, associationObjectUuid: 'ra-1' }),
        );
        expect(next.isDissociatingComplianceProfile).toBe(false);
        expect(next.associationsOfComplianceProfile).toEqual([]);

        next = reducer({ ...next, isDissociatingComplianceProfile: true }, actions.dissociateComplianceProfileFailed({ error: 'err' }));
        expect(next.isDissociatingComplianceProfile).toBe(false);
    });

    test('getAssociatedComplianceProfiles / success / failure', () => {
        let next = reducer(
            initialState,
            actions.getAssociatedComplianceProfiles({ resource: 'raProfiles' as any, associationObjectUuid: 'ra-1' }),
        );
        expect(next.isFetchingAssociatedComplianceProfiles).toBe(true);

        const profiles = [{ uuid: 'cp-1' }] as any[];
        next = reducer(next, actions.getAssociatedComplianceProfilesSuccess({ complianceProfiles: profiles }));
        expect(next.isFetchingAssociatedComplianceProfiles).toBe(false);
        expect(next.associatedComplianceProfiles).toEqual(profiles);

        next = reducer(
            { ...next, isFetchingAssociatedComplianceProfiles: true },
            actions.getAssociatedComplianceProfilesFailed({ error: 'err' }),
        );
        expect(next.isFetchingAssociatedComplianceProfiles).toBe(false);
    });

    test('getListComplianceRules / success / failure / clearRules', () => {
        let next = reducer(initialState, actions.getListComplianceRules({}));
        expect(next.isFetchingRules).toBe(true);

        const rules = [{ uuid: 'r-1' }] as any[];
        next = reducer(next, actions.getListComplianceRulesSuccess({ rules }));
        expect(next.isFetchingRules).toBe(false);
        expect(next.rules).toEqual(rules);

        next = reducer({ ...next, isFetchingRules: true }, actions.getListComplianceRulesFailed({ error: 'err' }));
        expect(next.isFetchingRules).toBe(false);

        next = reducer(next, actions.clearRules());
        expect(next.rules).toEqual([]);
    });

    test('getListComplianceGroups / success / failure / clearGroups', () => {
        let next = reducer(initialState, actions.getListComplianceGroups({ connectorUuid: 'c-1', kind: 'x509' }));
        expect(next.isFetchingGroups).toBe(true);

        const groups = [{ uuid: 'g-1' }] as any[];
        next = reducer(next, actions.getListComplianceGroupsSuccess({ groups }));
        expect(next.isFetchingGroups).toBe(false);
        expect(next.groups).toEqual(groups);

        next = reducer({ ...next, isFetchingGroups: true }, actions.getListComplianceGroupsFailed({ error: 'err' }));
        expect(next.isFetchingGroups).toBe(false);

        next = reducer(next, actions.clearGroups());
        expect(next.groups).toEqual([]);
    });

    test('getListComplianceGroupRules / success / failure', () => {
        let next = reducer(initialState, actions.getListComplianceGroupRules({ groupUuid: 'g-1', connectorUuid: 'c-1', kind: 'x509' }));
        expect(next.isFetchingGroupRules).toBe(true);

        const rules = [{ uuid: 'r-1' }] as any[];
        next = reducer(next, actions.getListComplianceGroupRulesSuccess({ rules }));
        expect(next.isFetchingGroupRules).toBe(false);
        expect(next.groupRules).toEqual(rules);

        next = reducer({ ...next, isFetchingGroupRules: true }, actions.getListComplianceGroupRulesFailed({ error: 'err' }));
        expect(next.isFetchingGroupRules).toBe(false);
    });

    test('getAssociationsOfComplianceProfile / success / failure', () => {
        let next = reducer(initialState, actions.getAssociationsOfComplianceProfile({ uuid: 'cp-1' }));
        expect(next.isFetchingAssociationsOfComplianceProfile).toBe(true);

        const associations = [{ objectUuid: 'ra-1', resource: 'raProfiles', name: 'RA1' }] as any[];
        next = reducer(next, actions.getAssociationsOfComplianceProfileSuccess({ associations }));
        expect(next.isFetchingAssociationsOfComplianceProfile).toBe(false);
        expect(next.associationsOfComplianceProfile).toEqual(associations);

        next = reducer(
            { ...next, isFetchingAssociationsOfComplianceProfile: true },
            actions.getAssociationsOfComplianceProfileFailed({ error: 'err' }),
        );
        expect(next.isFetchingAssociationsOfComplianceProfile).toBe(false);
    });

    test('updateRule / success / failure', () => {
        let next = reducer(initialState, actions.updateRule({ uuid: 'cp-1', complianceProfileRulesPatchRequestDto: {} as any }));
        expect(next.isUpdatingRule).toBe(true);

        next = reducer(next, actions.updateRuleSuccess({ uuid: 'cp-1' }));
        expect(next.isUpdatingRule).toBe(false);

        next = reducer({ ...next, isUpdatingRule: true }, actions.updateRuleFailed({ error: 'err' }));
        expect(next.isUpdatingRule).toBe(false);
    });

    test('updateGroup / success / failure', () => {
        let next = reducer(initialState, actions.updateGroup({ uuid: 'cp-1', complianceProfileGroupsPatchRequestDto: {} as any }));
        expect(next.isUpdatingGroup).toBe(true);

        next = reducer(next, actions.updateGroupSuccess({ uuid: 'cp-1' }));
        expect(next.isUpdatingGroup).toBe(false);

        next = reducer({ ...next, isUpdatingGroup: true }, actions.updateGroupFailed({ error: 'err' }));
        expect(next.isUpdatingGroup).toBe(false);
    });

    test('checkComplianceForProfiles / success / failure', () => {
        let next = reducer(initialState, actions.checkComplianceForProfiles({ requestBody: ['cp-1'] }));
        expect(next.isCheckingCompliance).toBe(true);

        next = reducer(next, actions.checkComplianceForProfilesSuccess());
        expect(next.isCheckingCompliance).toBe(false);

        next = reducer({ ...next, isCheckingCompliance: true }, actions.checkComplianceForProfilesFailed({ error: 'err' }));
        expect(next.isCheckingCompliance).toBe(false);
    });

    test('bulkDeleteComplianceProfilesSuccess clears complianceProfile when uuid matches', () => {
        const profile = { uuid: 'cp-1', name: 'P1' } as any;
        const items = [{ uuid: 'cp-1' } as any, { uuid: 'cp-2' } as any];

        const next = reducer(
            { ...initialState, complianceProfiles: items, complianceProfile: profile },
            actions.bulkDeleteComplianceProfilesSuccess({ uuids: ['cp-1'], errors: [] }),
        );
        expect(next.complianceProfiles).toEqual([{ uuid: 'cp-2' }]);
        expect(next.complianceProfile).toBeUndefined();
    });

    test('bulkForceDeleteComplianceProfilesSuccess clears complianceProfile when uuid matches', () => {
        const profile = { uuid: 'cp-1', name: 'P1' } as any;
        const items = [{ uuid: 'cp-1' } as any, { uuid: 'cp-2' } as any];

        const next = reducer(
            { ...initialState, complianceProfiles: items, complianceProfile: profile },
            actions.bulkForceDeleteComplianceProfilesSuccess({ uuids: ['cp-1'] }),
        );
        expect(next.complianceProfiles).toEqual([{ uuid: 'cp-2' }]);
        expect(next.complianceProfile).toBeUndefined();
    });

    test('associateComplianceProfileSuccess returns early when complianceProfile is undefined', () => {
        const next = reducer(
            { ...initialState, complianceProfile: undefined, associationsOfComplianceProfile: [] },
            actions.associateComplianceProfileSuccess({
                uuid: 'cp-1',
                resource: 'raProfiles' as any,
                associationObjectUuid: 'ra-1',
                associationObjectName: 'RA Profile 1',
            }),
        );
        expect(next.isAssociatingComplianceProfile).toBe(false);
        expect(next.associationsOfComplianceProfile).toEqual([]);
    });

    test('createComplianceInternalRule / success / failure', () => {
        let next = reducer(
            initialState,
            actions.createComplianceInternalRule({ complianceInternalRuleRequestDto: { name: 'rule-1' } as any }),
        );
        expect(next.isCreatingComplienceInternalRule).toBe(true);

        next = reducer(next, actions.createComplianceInternalRuleSuccess());
        expect(next.isCreatingComplienceInternalRule).toBe(false);

        next = reducer({ ...next, isCreatingComplienceInternalRule: true }, actions.createComplianceInternalRuleFailed({ error: 'err' }));
        expect(next.isCreatingComplienceInternalRule).toBe(false);
    });

    test('updateComplienceInternalRule / success / failure', () => {
        let next = reducer(
            initialState,
            actions.updateComplienceInternalRule({
                internalRuleUuid: 'rule-1',
                complianceInternalRuleRequestDto: { name: 'rule-updated' } as any,
            }),
        );
        expect(next.isUpdatingComplienceInternalRule).toBe(true);

        next = reducer(next, actions.updateComplienceInternalRuleSuccess());
        expect(next.isUpdatingComplienceInternalRule).toBe(false);

        next = reducer({ ...next, isUpdatingComplienceInternalRule: true }, actions.updateComplienceInternalRuleFailed({ error: 'err' }));
        expect(next.isUpdatingComplienceInternalRule).toBe(false);
    });

    test('getComplianceCheckResult / success / failure', () => {
        let next = reducer(initialState, actions.getComplianceCheckResult({ resource: 'certificates' as any, objectUuid: 'cert-1' }));
        expect(next.isFetchingComplianceCheckResultByKey['certificates:cert-1']).toBe(true);

        const result = { status: 'ok', rules: [] } as any;
        next = reducer(
            next,
            actions.getComplianceCheckResultSuccess({
                resource: 'certificates' as any,
                objectUuid: 'cert-1',
                complianceCheckResult: result,
            }),
        );
        expect(next.isFetchingComplianceCheckResultByKey['certificates:cert-1']).toBe(false);
        expect(next.complianceCheckResultByKey['certificates:cert-1']).toEqual(result);

        next = reducer(
            { ...next, isFetchingComplianceCheckResultByKey: { 'certificates:cert-1': true } },
            actions.getComplianceCheckResultFailed({ resource: 'certificates' as any, objectUuid: 'cert-1', error: 'err' }),
        );
        expect(next.isFetchingComplianceCheckResultByKey['certificates:cert-1']).toBe(false);
    });

    test('deleteComplienceInternalRule / success / failure', () => {
        let next = reducer(initialState, actions.deleteComplienceInternalRule({ internalRuleUuid: 'rule-1' }));
        expect(next.isDeletingComplienceInternalRule).toBe(true);

        next = reducer(next, actions.deleteComplienceInternalRuleSuccess({ uuid: 'rule-1' }));
        expect(next.isDeletingComplienceInternalRule).toBe(false);

        next = reducer({ ...next, isDeletingComplienceInternalRule: true }, actions.deleteComplienceInternalRuleFailed({ error: 'err' }));
        expect(next.isDeletingComplienceInternalRule).toBe(false);
    });

    test('checkComplianceForResourceObjects / success / failure', () => {
        let next = reducer(
            initialState,
            actions.checkComplianceForResourceObjects({ resource: 'certificates' as any, requestBody: ['cert-1'] }),
        );
        expect(next.isCheckingCompliance).toBe(true);

        next = reducer(next, actions.checkComplianceForResourceObjectsSuccess());
        expect(next.isCheckingCompliance).toBe(false);

        next = reducer({ ...next, isCheckingCompliance: true }, actions.checkComplianceForResourceObjectsFailed({ error: 'err' }));
        expect(next.isCheckingCompliance).toBe(false);
    });
});

describe('complianceProfiles selectors', () => {
    test('selectors read values from complianceProfiles state', () => {
        const profile = { uuid: 'cp-1', name: 'P1' } as any;
        const featureState = {
            ...initialState,
            complianceProfile: profile,
            complianceProfiles: [profile],
            checkedRows: ['cp-1'],
            isFetchingList: true,
            isFetchingDetail: true,
            isCreating: true,
            createComplianceProfileSucceeded: true,
            isDeleting: true,
            isBulkDeleting: true,
            isBulkForceDeleting: true,
            isAssociatingComplianceProfile: true,
            isDissociatingComplianceProfile: true,
        };

        const state = { complianceProfiles: featureState } as any;

        expect(selectors.complianceProfile(state)).toEqual(profile);
        expect(selectors.complianceProfiles(state)).toEqual([profile]);
        expect(selectors.checkedRows(state)).toEqual(['cp-1']);
        expect(selectors.isFetchingList(state)).toBe(true);
        expect(selectors.isFetchingDetail(state)).toBe(true);
        expect(selectors.isCreating(state)).toBe(true);
        expect(selectors.createComplianceProfileSucceeded(state)).toBe(true);
        expect(selectors.isDeleting(state)).toBe(true);
        expect(selectors.isBulkDeleting(state)).toBe(true);
        expect(selectors.isBulkForceDeleting(state)).toBe(true);
        expect(selectors.isAssociatingComplianceProfile(state)).toBe(true);
        expect(selectors.isDissociatingComplianceProfile(state)).toBe(true);
    });

    test('parameterized selectors isFetchingComplianceCheckResultBy and complianceCheckResultBy', () => {
        const result = { status: 'ok' } as any;
        const featureState = {
            ...initialState,
            isFetchingComplianceCheckResultByKey: { 'certificates:cert-1': true },
            complianceCheckResultByKey: { 'certificates:cert-1': result },
        };

        const state = { complianceProfiles: featureState } as any;

        expect(selectors.isFetchingComplianceCheckResultBy(state, 'certificates' as any, 'cert-1')).toBe(true);
        expect(selectors.complianceCheckResultBy(state, 'certificates' as any, 'cert-1')).toEqual(result);
        expect(selectors.isFetchingComplianceCheckResultBy(state, 'certificates' as any, 'other')).toBe(false);
        expect(selectors.complianceCheckResultBy(state, 'certificates' as any, 'other')).toBeUndefined();
    });
});
