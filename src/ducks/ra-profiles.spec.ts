import { describe, expect, test } from 'vitest';

import reducer, { actions, initialState, selectors } from './ra-profiles';

describe('raProfiles slice', () => {
    test('returns initial state for unknown action', () => {
        expect(reducer(undefined, { type: 'unknown' })).toEqual(initialState);
    });

    test('resetState restores initial values', () => {
        const dirty = {
            ...initialState,
            raProfile: { uuid: 'ra-1' } as any,
            raProfiles: [{ uuid: 'ra-1' } as any],
            isFetchingList: true,
            tempKey: 'gone',
        } as any;

        const next = reducer(dirty, actions.resetState());

        expect(next).toEqual(initialState);
        expect((next as any).tempKey).toBeUndefined();
    });

    test('setCheckedRows', () => {
        const next = reducer(initialState, actions.setCheckedRows({ checkedRows: ['ra-1', 'ra-2'] }));
        expect(next.checkedRows).toEqual(['ra-1', 'ra-2']);
    });

    test('clearDeleteErrorMessages', () => {
        const next = reducer(
            { ...initialState, deleteErrorMessage: 'err', bulkDeleteErrorMessages: [{ uuid: 'ra-1' } as any] },
            actions.clearDeleteErrorMessages(),
        );
        expect(next.deleteErrorMessage).toBe('');
        expect(next.bulkDeleteErrorMessages).toEqual([]);
    });

    test('clearIssuanceAttributesDescriptors and clearRevocationAttributesDescriptors', () => {
        let next = reducer(
            { ...initialState, issuanceAttributesDescriptors: [{ uuid: 'd-1' } as any] },
            actions.clearIssuanceAttributesDescriptors(),
        );
        expect(next.issuanceAttributesDescriptors).toBeUndefined();

        next = reducer(
            { ...initialState, revocationAttributesDescriptors: [{ uuid: 'd-1' } as any] },
            actions.clearRevocationAttributesDescriptors(),
        );
        expect(next.revocationAttributesDescriptors).toBeUndefined();
    });

    test('listRaProfiles / success / failure', () => {
        let next = reducer(initialState, actions.listRaProfiles());
        expect(next.isFetchingList).toBe(true);
        expect(next.raProfiles).toEqual([]);

        const items = [{ uuid: 'ra-1' }, { uuid: 'ra-2' }] as any[];
        next = reducer(next, actions.listRaProfilesSuccess({ raProfiles: items }));
        expect(next.isFetchingList).toBe(false);
        expect(next.raProfiles).toEqual(items);

        next = reducer({ ...next, isFetchingList: true }, actions.listRaProfilesFailure({ error: 'err' }));
        expect(next.isFetchingList).toBe(false);
    });

    test('getRaProfileDetail / success / failure', () => {
        let next = reducer(initialState, actions.getRaProfileDetail({ authorityUuid: 'a-1', uuid: 'ra-1' }));
        expect(next.isFetchingDetail).toBe(true);
        expect(next.raProfile).toBeUndefined();

        const profile = { uuid: 'ra-1', name: 'RA Profile 1' } as any;
        next = reducer(next, actions.getRaProfileDetailSuccess({ raProfile: profile }));
        expect(next.isFetchingDetail).toBe(false);
        expect(next.raProfile).toEqual(profile);

        next = reducer({ ...next, isFetchingDetail: true }, actions.getRaProfileDetailFailure({ error: 'err' }));
        expect(next.isFetchingDetail).toBe(false);
    });

    test('getRaProfileDetail keeps profile when refetching the same uuid', () => {
        const loaded = { ...initialState, raProfile: { uuid: 'ra-1' } as any };
        const next = reducer(loaded, actions.getRaProfileDetail({ authorityUuid: 'a-1', uuid: 'ra-1' }));
        expect(next.raProfile?.uuid).toBe('ra-1');
        expect(next.isFetchingDetail).toBe(true);
    });

    test('getRaProfileDetail clears profile when uuid differs', () => {
        const loaded = { ...initialState, raProfile: { uuid: 'ra-1' } as any };
        const next = reducer(loaded, actions.getRaProfileDetail({ authorityUuid: 'a-1', uuid: 'ra-2' }));
        expect(next.raProfile).toBeUndefined();
    });

    test('clearRaProfileDetail', () => {
        const next = reducer({ ...initialState, raProfile: { uuid: 'ra-1' } as any }, actions.clearRaProfileDetail());
        expect(next.raProfile).toBeUndefined();
    });

    test('createRaProfile / success / failure', () => {
        let next = reducer(
            initialState,
            actions.createRaProfile({ authorityInstanceUuid: 'a-1', raProfileAddRequest: { name: 'RA1' } as any }),
        );
        expect(next.isCreating).toBe(true);
        expect(next.createRaProfileSucceeded).toBe(false);

        next = reducer(next, actions.createRaProfileSuccess({ uuid: 'ra-1', authorityInstanceUuid: 'a-1' }));
        expect(next.isCreating).toBe(false);
        expect(next.createRaProfileSucceeded).toBe(true);

        next = reducer({ ...next, isCreating: true }, actions.createRaProfileFailure({ error: 'err' }));
        expect(next.isCreating).toBe(false);
        expect(next.createRaProfileSucceeded).toBe(false);
    });

    test('createRaProfile clears any previously created uuid', () => {
        const next = reducer(
            { ...initialState, createdRaProfileUuid: 'old' } as any,
            actions.createRaProfile({ authorityInstanceUuid: 'auth-1', raProfileAddRequest: { name: 'p', attributes: [] } as any }),
        );
        expect(next.isCreating).toBe(true);
        expect(next.createdRaProfileUuid).toBeNull();
    });

    test('createRaProfileSuccess stores the created uuid', () => {
        const next = reducer(initialState, actions.createRaProfileSuccess({ uuid: 'ra-9', authorityInstanceUuid: 'auth-1' }));
        expect(next.createRaProfileSucceeded).toBe(true);
        expect(next.createdRaProfileUuid).toBe('ra-9');
        expect(selectors.createdRaProfileUuid({ raprofiles: next } as any)).toBe('ra-9');
    });

    test('updateRaProfile / success / failure', () => {
        let next = reducer(
            initialState,
            actions.updateRaProfile({
                profileUuid: 'ra-1',
                authorityInstanceUuid: 'a-1',
                raProfileEditRequest: {} as any,
            }),
        );
        expect(next.isUpdating).toBe(true);
        expect(next.updateRaProfileSucceeded).toBe(false);

        const profile = { uuid: 'ra-1', name: 'Updated' } as any;
        next = reducer(next, actions.updateRaProfileSuccess({ raProfile: profile }));
        expect(next.isUpdating).toBe(false);
        expect(next.updateRaProfileSucceeded).toBe(true);
        expect(next.raProfile).toEqual(profile);

        next = reducer({ ...next, isUpdating: true }, actions.updateRaProfileFailure({ error: 'err' }));
        expect(next.isUpdating).toBe(false);
        expect(next.updateRaProfileSucceeded).toBe(false);
    });

    test('updateRaProfileCertificateValidation / success / failure', () => {
        const existingProfile = { uuid: 'ra-1', name: 'RA Profile', attributes: [{ uuid: 'attr-1' }], customAttributes: [] } as any;

        let next = reducer(
            { ...initialState, raProfile: existingProfile },
            actions.updateRaProfileCertificateValidation({
                profileUuid: 'ra-1',
                authorityInstanceUuid: 'a-1',
                validation: {} as any,
            }),
        );
        expect(next.isUpdating).toBe(true);

        const updatedProfile = { uuid: 'ra-1', name: 'RA Profile Updated', attributes: [], customAttributes: [] } as any;
        next = reducer(next, actions.updateRaProfileCertificateValidationSuccess({ raProfile: updatedProfile }));
        expect(next.isUpdating).toBe(false);
        expect(next.raProfile?.name).toBe('RA Profile Updated');
        expect(next.raProfile?.attributes).toEqual([{ uuid: 'attr-1' }]);

        next = reducer({ ...next, isUpdating: true }, actions.updateRaProfileCertificateValidationFailure({ error: 'err' }));
        expect(next.isUpdating).toBe(false);
    });

    test('updateRaProfileRequestAttributes / success / failure', () => {
        const existingProfile = { uuid: 'ra-1', name: 'RA Profile', attributes: [{ uuid: 'attr-1' }], customAttributes: [] } as any;

        let next = reducer(
            { ...initialState, raProfile: existingProfile },
            actions.updateRaProfileRequestAttributes({
                profileUuid: 'ra-1',
                authorityInstanceUuid: 'a-1',
                requestAttributes: { externalCsrValidationStrict: true },
            }),
        );
        expect(next.isUpdating).toBe(true);

        const updatedProfile = {
            uuid: 'ra-1',
            name: 'RA Profile',
            attributes: [],
            customAttributes: [],
            certificateRequestAttributes: { externalCsrValidationStrict: true },
        } as any;
        next = reducer(next, actions.updateRaProfileRequestAttributesSuccess({ raProfile: updatedProfile }));
        expect(next.isUpdating).toBe(false);
        expect(next.raProfile?.certificateRequestAttributes?.externalCsrValidationStrict).toBe(true);
        expect(next.raProfile?.attributes).toEqual([{ uuid: 'attr-1' }]);

        next = reducer({ ...next, isUpdating: true }, actions.updateRaProfileRequestAttributesFailure({ error: 'err' }));
        expect(next.isUpdating).toBe(false);
    });

    test('enableRaProfile / success updates list and detail / failure', () => {
        const items = [{ uuid: 'ra-1', enabled: false } as any];
        const profile = { uuid: 'ra-1', enabled: false } as any;

        let next = reducer(
            { ...initialState, raProfiles: items, raProfile: profile },
            actions.enableRaProfile({ authorityUuid: 'a-1', uuid: 'ra-1' }),
        );
        expect(next.isEnabling).toBe(true);

        next = reducer(next, actions.enableRaProfileSuccess({ uuid: 'ra-1' }));
        expect(next.isEnabling).toBe(false);
        expect(next.raProfiles[0].enabled).toBe(true);
        expect(next.raProfile?.enabled).toBe(true);

        next = reducer({ ...next, isEnabling: true }, actions.enableRaProfileFailure({ error: 'err' }));
        expect(next.isEnabling).toBe(false);
    });

    test('disableRaProfile / success updates list and detail / failure', () => {
        const items = [{ uuid: 'ra-1', enabled: true } as any];
        const profile = { uuid: 'ra-1', enabled: true } as any;

        let next = reducer(
            { ...initialState, raProfiles: items, raProfile: profile },
            actions.disableRaProfile({ authorityUuid: 'a-1', uuid: 'ra-1' }),
        );
        expect(next.isDisabling).toBe(true);

        next = reducer(next, actions.disableRaProfileSuccess({ uuid: 'ra-1' }));
        expect(next.isDisabling).toBe(false);
        expect(next.raProfiles[0].enabled).toBe(false);
        expect(next.raProfile?.enabled).toBe(false);

        next = reducer({ ...next, isDisabling: true }, actions.disableRaProfileFailure({ error: 'err' }));
        expect(next.isDisabling).toBe(false);
    });

    test('deleteRaProfile / success removes from list / failure', () => {
        const items = [{ uuid: 'ra-1' } as any, { uuid: 'ra-2' } as any];
        const profile = { uuid: 'ra-1' } as any;

        let next = reducer(
            { ...initialState, raProfiles: items, raProfile: profile },
            actions.deleteRaProfile({ authorityUuid: 'a-1', uuid: 'ra-1' }),
        );
        expect(next.isDeleting).toBe(true);

        next = reducer(next, actions.deleteRaProfileSuccess({ uuid: 'ra-1' }));
        expect(next.isDeleting).toBe(false);
        expect(next.raProfiles).toEqual([{ uuid: 'ra-2' }]);
        expect(next.raProfile).toBeUndefined();

        next = reducer({ ...next, isDeleting: true }, actions.deleteRaProfileFailure({ error: 'err' }));
        expect(next.isDeleting).toBe(false);
    });

    test('bulkDeleteRaProfiles / success removes items / failure', () => {
        const items = [{ uuid: 'ra-1' } as any, { uuid: 'ra-2' } as any];

        let next = reducer({ ...initialState, raProfiles: items }, actions.bulkDeleteRaProfiles({ uuids: ['ra-1'] }));
        expect(next.isBulkDeleting).toBe(true);

        next = reducer(next, actions.bulkDeleteRaProfilesSuccess({ uuids: ['ra-1'] }));
        expect(next.isBulkDeleting).toBe(false);
        expect(next.raProfiles).toEqual([{ uuid: 'ra-2' }]);

        next = reducer({ ...next, isBulkDeleting: true }, actions.bulkDeleteRaProfilesFailure({ error: 'err' }));
        expect(next.isBulkDeleting).toBe(false);
    });

    test('bulkDeleteRaProfilesSuccess clears raProfile when uuid matches', () => {
        const items = [{ uuid: 'ra-1' } as any, { uuid: 'ra-2' } as any];
        const profile = { uuid: 'ra-1' } as any;

        const next = reducer(
            { ...initialState, raProfiles: items, raProfile: profile },
            actions.bulkDeleteRaProfilesSuccess({ uuids: ['ra-1'] }),
        );
        expect(next.raProfiles).toEqual([{ uuid: 'ra-2' }]);
        expect(next.raProfile).toBeUndefined();
    });

    test('bulkEnableRaProfiles / success / failure', () => {
        const items = [{ uuid: 'ra-1', enabled: false } as any, { uuid: 'ra-2', enabled: false } as any];
        const profile = { uuid: 'ra-1', enabled: false } as any;

        let next = reducer({ ...initialState, raProfiles: items, raProfile: profile }, actions.bulkEnableRaProfiles({ uuids: ['ra-1'] }));
        expect(next.isBulkEnabling).toBe(true);

        next = reducer(next, actions.bulkEnableRaProfilesSuccess({ uuids: ['ra-1'] }));
        expect(next.isBulkEnabling).toBe(false);
        expect(next.raProfiles.find((r) => r.uuid === 'ra-1')?.enabled).toBe(true);
        expect(next.raProfiles.find((r) => r.uuid === 'ra-2')?.enabled).toBe(false);
        expect(next.raProfile?.enabled).toBe(true);

        next = reducer({ ...next, isBulkEnabling: true }, actions.bulkEnableRaProfilesFailure({ error: 'err' }));
        expect(next.isBulkEnabling).toBe(false);
    });

    test('bulkDisableRaProfiles / success / failure', () => {
        const items = [{ uuid: 'ra-1', enabled: true } as any, { uuid: 'ra-2', enabled: true } as any];
        const profile = { uuid: 'ra-1', enabled: true } as any;

        let next = reducer({ ...initialState, raProfiles: items, raProfile: profile }, actions.bulkDisableRaProfiles({ uuids: ['ra-1'] }));
        expect(next.isBulkDisabling).toBe(true);

        next = reducer(next, actions.bulkDisableRaProfilesSuccess({ uuids: ['ra-1'] }));
        expect(next.isBulkDisabling).toBe(false);
        expect(next.raProfiles.find((r) => r.uuid === 'ra-1')?.enabled).toBe(false);
        expect(next.raProfiles.find((r) => r.uuid === 'ra-2')?.enabled).toBe(true);
        expect(next.raProfile?.enabled).toBe(false);

        next = reducer({ ...next, isBulkDisabling: true }, actions.bulkDisableRaProfilesFailure({ error: 'err' }));
        expect(next.isBulkDisabling).toBe(false);
    });

    test('activateAcme / success / failure', () => {
        let next = reducer(
            initialState,
            actions.activateAcme({
                authorityUuid: 'a-1',
                uuid: 'ra-1',
                acmeProfileUuid: 'acme-1',
                raProfileActivateAcmeRequest: {} as any,
            }),
        );
        expect(next.isActivatingAcme).toBe(true);

        const acmeDetails = { directoryUrl: 'https://acme.example.com' } as any;
        next = reducer(next, actions.activateAcmeSuccess({ raProfileAcmeDetailResponse: acmeDetails }));
        expect(next.isActivatingAcme).toBe(false);
        expect(next.acmeDetails).toEqual(acmeDetails);

        next = reducer({ ...next, isActivatingAcme: true }, actions.activateAcmeFailure({ error: 'err' }));
        expect(next.isActivatingAcme).toBe(false);
    });

    test('deactivateAcme / success clears acmeDetails / failure', () => {
        let next = reducer(
            { ...initialState, acmeDetails: { directoryUrl: 'url' } as any },
            actions.deactivateAcme({ authorityUuid: 'a-1', uuid: 'ra-1' }),
        );
        expect(next.isDeactivatingAcme).toBe(true);

        next = reducer(next, actions.deactivateAcmeSuccess({ uuid: 'ra-1' }));
        expect(next.isDeactivatingAcme).toBe(false);
        expect(next.acmeDetails).toBeUndefined();

        next = reducer({ ...next, isDeactivatingAcme: true }, actions.deactivateAcmeFailure({ error: 'err' }));
        expect(next.isDeactivatingAcme).toBe(false);
    });

    test('getAcmeDetails / success / failure', () => {
        let next = reducer(initialState, actions.getAcmeDetails({ authorityUuid: 'a-1', uuid: 'ra-1' }));
        expect(next.isFetchingAcmeDetails).toBe(true);

        const acmeDetails = { directoryUrl: 'https://acme.example.com' } as any;
        next = reducer(next, actions.getAcmeDetailsSuccess({ raAcmeLink: acmeDetails }));
        expect(next.isFetchingAcmeDetails).toBe(false);
        expect(next.acmeDetails).toEqual(acmeDetails);

        next = reducer({ ...next, isFetchingAcmeDetails: true }, actions.getAcmeDetailsFailure({ error: 'err' }));
        expect(next.isFetchingAcmeDetails).toBe(false);
    });

    test('checkCompliance / success / failure', () => {
        let next = reducer(initialState, actions.checkCompliance({ resource: 'raProfiles' as any, uuids: ['ra-1'] }));
        expect(next.isCheckingCompliance).toBe(true);

        next = reducer(next, actions.checkComplianceSuccess());
        expect(next.isCheckingCompliance).toBe(false);

        next = reducer({ ...next, isCheckingCompliance: true }, actions.checkComplianceFailed({ error: 'err' }));
        expect(next.isCheckingCompliance).toBe(false);
    });

    test('listIssuanceAttributeDescriptors / success / failure', () => {
        let next = reducer(initialState, actions.listIssuanceAttributeDescriptors({ authorityUuid: 'a-1', uuid: 'ra-1' }));
        expect(next.isFetchingIssuanceAttributes).toBe(true);

        const descriptors = [{ uuid: 'd-1' }] as any[];
        next = reducer(next, actions.listIssuanceAttributesDescriptorsSuccess({ uuid: 'ra-1', attributesDescriptors: descriptors }));
        expect(next.isFetchingIssuanceAttributes).toBe(false);
        expect(next.issuanceAttributesDescriptors).toEqual(descriptors);

        next = reducer({ ...next, isFetchingIssuanceAttributes: true }, actions.listIssuanceAttributesFailure({ error: 'err' }));
        expect(next.isFetchingIssuanceAttributes).toBe(false);
    });

    test('listRevocationAttributeDescriptors / success / failure', () => {
        let next = reducer(initialState, actions.listRevocationAttributeDescriptors({ authorityUuid: 'a-1', uuid: 'ra-1' }));
        expect(next.isFetchingRevocationAttributes).toBe(true);

        const descriptors = [{ uuid: 'd-1' }] as any[];
        next = reducer(next, actions.listRevocationAttributeDescriptorsSuccess({ uuid: 'ra-1', attributesDescriptors: descriptors }));
        expect(next.isFetchingRevocationAttributes).toBe(false);
        expect(next.revocationAttributesDescriptors).toEqual(descriptors);

        next = reducer(
            { ...next, isFetchingRevocationAttributes: true },
            actions.listRevocationAttributeDescriptorsFailure({ error: 'err' }),
        );
        expect(next.isFetchingRevocationAttributes).toBe(false);
    });

    test('getAssociatedApprovalProfiles / success / failure', () => {
        let next = reducer(initialState, actions.getAssociatedApprovalProfiles({ authorityUuid: 'a-1', raProfileUuid: 'ra-1' }));
        expect(next.isFetchingApprovalProfiles).toBe(true);
        expect(next.associatedApprovalProfiles).toEqual([]);

        const profiles = [{ uuid: 'ap-1' }] as any[];
        next = reducer(next, actions.getAssociatedApprovalProfilesSuccess({ associatedApprovalProfiles: profiles }));
        expect(next.isFetchingApprovalProfiles).toBe(false);
        expect(next.associatedApprovalProfiles).toEqual(profiles);

        next = reducer({ ...next, isFetchingApprovalProfiles: true }, actions.getAssociatedApprovalProfilesFailure({ error: 'err' }));
        expect(next.isFetchingApprovalProfiles).toBe(false);
    });

    test('activateCmp / success / failure', () => {
        let next = reducer(
            initialState,
            actions.activateCmp({ authorityUuid: 'a-1', uuid: 'ra-1', cmpProfileUuid: 'cmp-1', raProfileActivateCmpRequest: {} as any }),
        );
        expect(next.isActivatingCmp).toBe(true);

        const cmpDetails = { cmpUrl: 'https://cmp.example.com' } as any;
        next = reducer(next, actions.activateCmpSuccess({ raProfileCmpDetailResponse: cmpDetails }));
        expect(next.isActivatingCmp).toBe(false);
        expect(next.cmpDetails).toEqual(cmpDetails);

        next = reducer({ ...next, isActivatingCmp: true }, actions.activateCmpFailure({ error: 'err' }));
        expect(next.isActivatingCmp).toBe(false);
    });

    test('deactivateCmp / success clears cmpDetails / failure', () => {
        let next = reducer(
            { ...initialState, cmpDetails: { cmpUrl: 'url' } as any },
            actions.deactivateCmp({ authorityUuid: 'a-1', uuid: 'ra-1' }),
        );
        expect(next.isDeactivatingCmp).toBe(true);

        next = reducer(next, actions.deactivateCmpSuccess({ uuid: 'ra-1' }));
        expect(next.isDeactivatingCmp).toBe(false);
        expect(next.cmpDetails).toBeUndefined();

        next = reducer({ ...next, isDeactivatingCmp: true }, actions.deactivateCmpFailure({ error: 'err' }));
        expect(next.isDeactivatingCmp).toBe(false);
    });

    test('getCmpDetails / success / failure', () => {
        let next = reducer(initialState, actions.getCmpDetails({ authorityUuid: 'a-1', uuid: 'ra-1' }));
        expect(next.isFetchingCmpDetails).toBe(true);

        const cmpDetails = { cmpUrl: 'https://cmp.example.com' } as any;
        next = reducer(next, actions.getCmpDetailsSuccess({ raCmpLink: cmpDetails }));
        expect(next.isFetchingCmpDetails).toBe(false);
        expect(next.cmpDetails).toEqual(cmpDetails);

        next = reducer({ ...next, isFetchingCmpDetails: true }, actions.getCmpDetailsFailure({ error: 'err' }));
        expect(next.isFetchingCmpDetails).toBe(false);
    });

    test('activateScep / success / failure', () => {
        let next = reducer(
            initialState,
            actions.activateScep({
                authorityUuid: 'a-1',
                uuid: 'ra-1',
                scepProfileUuid: 'scep-1',
                raProfileActivateScepRequest: {} as any,
            }),
        );
        expect(next.isActivatingScep).toBe(true);

        const scepDetails = { scepUrl: 'https://scep.example.com' } as any;
        next = reducer(next, actions.activateScepSuccess({ raProfileScepDetailResponse: scepDetails }));
        expect(next.isActivatingScep).toBe(false);
        expect(next.scepDetails).toEqual(scepDetails);

        next = reducer({ ...next, isActivatingScep: true }, actions.activateScepFailure({ error: 'err' }));
        expect(next.isActivatingScep).toBe(false);
    });

    test('deactivateScep / success clears scepDetails / failure', () => {
        let next = reducer(
            { ...initialState, scepDetails: { scepUrl: 'url' } as any },
            actions.deactivateScep({ authorityUuid: 'a-1', uuid: 'ra-1' }),
        );
        expect(next.isDeactivatingScep).toBe(true);

        next = reducer(next, actions.deactivateScepSuccess({ uuid: 'ra-1' }));
        expect(next.isDeactivatingScep).toBe(false);
        expect(next.scepDetails).toBeUndefined();

        next = reducer({ ...next, isDeactivatingScep: true }, actions.deactivateScepFailure({ error: 'err' }));
        expect(next.isDeactivatingScep).toBe(false);
    });

    test('getScepDetails / success / failure', () => {
        let next = reducer(initialState, actions.getScepDetails({ authorityUuid: 'a-1', uuid: 'ra-1' }));
        expect(next.isFetchingScepDetails).toBe(true);

        const scepDetails = { scepUrl: 'https://scep.example.com' } as any;
        next = reducer(next, actions.getScepDetailsSuccess({ raScepLink: scepDetails }));
        expect(next.isFetchingScepDetails).toBe(false);
        expect(next.scepDetails).toEqual(scepDetails);

        next = reducer({ ...next, isFetchingScepDetails: true }, actions.getScepDetailsFailure({ error: 'err' }));
        expect(next.isFetchingScepDetails).toBe(false);
    });

    test('associateRaProfile / success / failure', () => {
        const payload = { uuid: 'ra-1', complianceProfileUuid: 'cp-1', complianceProfileName: 'CP1' };

        let next = reducer(initialState, actions.associateRaProfile(payload));
        expect(next.isAssociatingComplianceProfile).toBe(true);

        next = reducer(next, actions.associateRaProfileSuccess(payload));
        expect(next.isAssociatingComplianceProfile).toBe(false);

        next = reducer({ ...next, isAssociatingComplianceProfile: true }, actions.associateRaProfileFailed({ error: 'err' }));
        expect(next.isAssociatingComplianceProfile).toBe(false);
    });

    test('dissociateRaProfile / success / failure', () => {
        const payload = { uuid: 'ra-1', complianceProfileUuid: 'cp-1', complianceProfileName: 'CP1' };

        let next = reducer(initialState, actions.dissociateRaProfile(payload));
        expect(next.isDissociatingComplianceProfile).toBe(true);

        next = reducer(next, actions.dissociateRaProfileSuccess(payload));
        expect(next.isDissociatingComplianceProfile).toBe(false);

        next = reducer({ ...next, isDissociatingComplianceProfile: true }, actions.dissociateRaProfileFailed({ error: 'err' }));
        expect(next.isDissociatingComplianceProfile).toBe(false);
    });

    test('associateRAProfileWithApprovalProfile / success / failure', () => {
        const payload = { raProfileUuid: 'ra-1', approvalProfileUuid: 'ap-1', authorityUuid: 'a-1' };

        let next = reducer(initialState, actions.associateRAProfileWithApprovalProfile(payload));
        expect(next.isAssociatingApprovalProfile).toBe(true);

        next = reducer(next, actions.associateRAProfileWithApprovalProfileSuccess(payload));
        expect(next.isAssociatingApprovalProfile).toBe(false);

        next = reducer(
            { ...next, isAssociatingApprovalProfile: true },
            actions.associateRAProfileWithApprovalProfileFailure({ error: 'err' }),
        );
        expect(next.isAssociatingApprovalProfile).toBe(false);
    });

    test('disassociateRAProfileFromApprovalProfile / success removes from list / failure', () => {
        const profiles = [{ uuid: 'ap-1' }, { uuid: 'ap-2' }] as any[];
        const payload = { raProfileUuid: 'ra-1', approvalProfileUuid: 'ap-1', authorityUuid: 'a-1' };

        let next = reducer(
            { ...initialState, associatedApprovalProfiles: profiles },
            actions.disassociateRAProfileFromApprovalProfile(payload),
        );
        expect(next.isDissociatingApprovalProfile).toBe(true);

        next = reducer(next, actions.disassociateRAProfileFromApprovalProfileSuccess(payload));
        expect(next.isDissociatingApprovalProfile).toBe(false);
        expect(next.associatedApprovalProfiles).toEqual([{ uuid: 'ap-2' }]);

        next = reducer(
            { ...next, isDissociatingApprovalProfile: true },
            actions.disassociateRAProfileFromApprovalProfileFailure({ error: 'err' }),
        );
        expect(next.isDissociatingApprovalProfile).toBe(false);
    });

    test('disassociateRAProfileFromApprovalProfileSuccess skips splice when associatedApprovalProfiles is falsy', () => {
        const payload = { raProfileUuid: 'ra-1', approvalProfileUuid: 'ap-1', authorityUuid: 'a-1' };

        const state = { ...initialState, associatedApprovalProfiles: undefined as any };
        const next = reducer(state, actions.disassociateRAProfileFromApprovalProfileSuccess(payload));
        expect(next.isDissociatingApprovalProfile).toBe(false);
    });

    test('getRaProfileWithoutAuthority / success / failure', () => {
        let next = reducer(initialState, actions.getRaProfileWithoutAuthority({ uuid: 'ra-1' }));
        expect(next.isFetchingDetail).toBe(true);
        expect(next.raProfile).toBeUndefined();

        const profile = { uuid: 'ra-1', name: 'RA Profile' } as any;
        next = reducer(next, actions.getRaProfileWithoutAuthoritySuccess({ raProfile: profile }));
        expect(next.isFetchingDetail).toBe(false);
        expect(next.raProfile).toEqual(profile);

        next = reducer({ ...next, isFetchingDetail: true }, actions.getRaProfileWithoutAuthorityFailure({ error: 'err' }));
        expect(next.isFetchingDetail).toBe(false);
    });

    test('getRaProfileWithoutAuthority keeps profile when refetching the same uuid', () => {
        const loaded = { ...initialState, raProfile: { uuid: 'ra-1' } as any };
        const next = reducer(loaded, actions.getRaProfileWithoutAuthority({ uuid: 'ra-1' }));
        expect(next.raProfile?.uuid).toBe('ra-1');
        expect(next.isFetchingDetail).toBe(true);
    });

    test('getRaProfileWithoutAuthority clears profile when uuid differs', () => {
        const loaded = { ...initialState, raProfile: { uuid: 'ra-1' } as any };
        const next = reducer(loaded, actions.getRaProfileWithoutAuthority({ uuid: 'ra-2' }));
        expect(next.raProfile).toBeUndefined();
    });

    test('deleteRaProfileWithoutAuthority / success / failure', () => {
        let next = reducer(initialState, actions.deleteRaProfileWithoutAuthority({ uuid: 'ra-1' }));
        expect(next.isDeleting).toBe(true);

        next = reducer(next, actions.deleteRaProfileWithoutAuthoritySuccess({ uuid: 'ra-1' }));
        expect(next.isDeleting).toBe(false);

        next = reducer({ ...next, isDeleting: true }, actions.deleteRaProfileWithoutAuthorityFailure({ error: 'err' }));
        expect(next.isDeleting).toBe(false);
    });
});

describe('raProfiles selectors', () => {
    test('selectors read values from raProfiles state', () => {
        const profile = { uuid: 'ra-1' } as any;
        const approvalProfile = { uuid: 'ap-1' } as any;
        const acmeDetails = { directoryUrl: 'https://acme.example.com' } as any;
        const featureState = {
            ...initialState,
            raProfile: profile,
            raProfiles: [profile],
            associatedApprovalProfiles: [approvalProfile],
            acmeDetails,
            checkedRows: ['ra-1'],
            isFetchingList: true,
            isFetchingDetail: true,
            isCreating: true,
            createRaProfileSucceeded: true,
            isDeleting: true,
            isBulkDeleting: true,
            isUpdating: true,
            updateRaProfileSucceeded: true,
            isEnabling: true,
            isBulkEnabling: true,
            isDisabling: true,
            isBulkDisabling: true,
            isActivatingAcme: true,
            isDeactivatingAcme: true,
            isActivatingCmp: true,
            isDeactivatingCmp: true,
            isActivatingScep: true,
            isDeactivatingScep: true,
        };

        const state = { raprofiles: featureState } as any;

        expect(selectors.raProfile(state)).toEqual(profile);
        expect(selectors.raProfiles(state)).toEqual([profile]);
        expect(selectors.associatedApprovalProfiles(state)).toEqual([approvalProfile]);
        expect(selectors.acmeDetails(state)).toEqual(acmeDetails);
        expect(selectors.checkedRows(state)).toEqual(['ra-1']);
        expect(selectors.isFetchingList(state)).toBe(true);
        expect(selectors.isFetchingDetail(state)).toBe(true);
        expect(selectors.isCreating(state)).toBe(true);
        expect(selectors.createRaProfileSucceeded(state)).toBe(true);
        expect(selectors.isDeleting(state)).toBe(true);
        expect(selectors.isBulkDeleting(state)).toBe(true);
        expect(selectors.isUpdating(state)).toBe(true);
        expect(selectors.updateRaProfileSucceeded(state)).toBe(true);
        expect(selectors.isEnabling(state)).toBe(true);
        expect(selectors.isBulkEnabling(state)).toBe(true);
        expect(selectors.isDisabling(state)).toBe(true);
        expect(selectors.isBulkDisabling(state)).toBe(true);
        expect(selectors.isActivatingAcme(state)).toBe(true);
        expect(selectors.isDeactivatingAcme(state)).toBe(true);
        expect(selectors.isActivatingCmp(state)).toBe(true);
        expect(selectors.isDeactivatingCmp(state)).toBe(true);
        expect(selectors.isActivatingScep(state)).toBe(true);
        expect(selectors.isDeactivatingScep(state)).toBe(true);
    });
});
