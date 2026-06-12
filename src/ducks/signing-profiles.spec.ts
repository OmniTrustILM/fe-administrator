import { describe, expect, test } from 'vitest';

import reducer, { actions, initialState, selectors } from './signing-profiles';

describe('signingProfiles slice', () => {
    test('returns initial state for unknown action', () => {
        expect(reducer(undefined, { type: 'unknown' })).toEqual(initialState);
    });

    test('resetState restores initial values', () => {
        const dirty = {
            ...initialState,
            signingProfile: { uuid: 'p-1' } as any,
            signingProfiles: [{ uuid: 'p-1' } as any],
            tempKey: 'gone',
        } as any;

        const next = reducer(dirty, actions.resetState());

        expect(next).toEqual(initialState);
        expect((next as any).tempKey).toBeUndefined();
    });

    test('clearDeleteErrorMessages clears error fields', () => {
        const next = reducer(
            { ...initialState, deleteErrorMessage: 'some error', bulkDeleteErrorMessages: [{ message: 'err' } as any] },
            actions.clearDeleteErrorMessages(),
        );
        expect(next.deleteErrorMessage).toBe('');
        expect(next.bulkDeleteErrorMessages).toEqual([]);
    });

    test('listSigningProfiles sets isFetchingList', () => {
        const next = reducer(initialState, actions.listSigningProfiles({ itemsPerPage: 10, pageNumber: 1, filters: [] }));
        expect(next.isFetchingList).toBe(true);
    });

    test('listSigningProfilesSuccess updates list and clears isFetchingList', () => {
        const profiles = [{ uuid: 'p-1' }] as any[];
        const next = reducer({ ...initialState, isFetchingList: true }, actions.listSigningProfilesSuccess({ signingProfiles: profiles }));
        expect(next.signingProfiles).toEqual(profiles);
        expect(next.isFetchingList).toBe(false);
    });

    test('listSigningProfilesFailure clears isFetchingList', () => {
        const next = reducer({ ...initialState, isFetchingList: true }, actions.listSigningProfilesFailure({ error: 'err' }));
        expect(next.isFetchingList).toBe(false);
    });

    test('getSigningProfile sets isFetchingDetail', () => {
        const next = reducer(initialState, actions.getSigningProfile({ uuid: 'p-1' }));
        expect(next.isFetchingDetail).toBe(true);
    });

    test('getSigningProfileSuccess sets profile detail', () => {
        const profile = { uuid: 'p-1', name: 'Profile 1' } as any;
        const next = reducer({ ...initialState, isFetchingDetail: true }, actions.getSigningProfileSuccess({ signingProfile: profile }));
        expect(next.isFetchingDetail).toBe(false);
        expect(next.signingProfile).toEqual(profile);
    });

    test('getSigningProfileFailure clears isFetchingDetail', () => {
        const next = reducer({ ...initialState, isFetchingDetail: true }, actions.getSigningProfileFailure({ error: 'err' }));
        expect(next.isFetchingDetail).toBe(false);
    });

    test('listSigningProfileSearchableFields sets isFetchingSearchableFields', () => {
        const next = reducer(initialState, actions.listSigningProfileSearchableFields());
        expect(next.isFetchingSearchableFields).toBe(true);
    });

    test('listSigningProfileSearchableFieldsSuccess sets fields', () => {
        const fields = [{ searchGroupEnum: 'grp' }] as any[];
        const next = reducer(
            { ...initialState, isFetchingSearchableFields: true },
            actions.listSigningProfileSearchableFieldsSuccess({ searchableFields: fields }),
        );
        expect(next.isFetchingSearchableFields).toBe(false);
        expect(next.searchableFields).toEqual(fields);
    });

    test('listSigningProfileSearchableFieldsFailure clears flag', () => {
        const next = reducer(
            { ...initialState, isFetchingSearchableFields: true },
            actions.listSigningProfileSearchableFieldsFailure({ error: 'err' }),
        );
        expect(next.isFetchingSearchableFields).toBe(false);
    });

    test('createSigningProfile sets isCreating', () => {
        const next = reducer(initialState, actions.createSigningProfile({ signingProfileRequestDto: {} as any }));
        expect(next.isCreating).toBe(true);
    });

    test('createSigningProfileSuccess clears isCreating', () => {
        const next = reducer(
            { ...initialState, isCreating: true },
            actions.createSigningProfileSuccess({ signingProfile: { uuid: 'p-1' } as any }),
        );
        expect(next.isCreating).toBe(false);
    });

    test('createSigningProfileFailure clears isCreating', () => {
        const next = reducer({ ...initialState, isCreating: true }, actions.createSigningProfileFailure({ error: 'err' }));
        expect(next.isCreating).toBe(false);
    });

    test('updateSigningProfile sets isUpdating', () => {
        const next = reducer(initialState, actions.updateSigningProfile({ uuid: 'p-1', signingProfileRequestDto: {} as any }));
        expect(next.isUpdating).toBe(true);
    });

    test('updateSigningProfileSuccess updates detail', () => {
        const updated = { uuid: 'p-1', name: 'Updated' } as any;
        const next = reducer({ ...initialState, isUpdating: true }, actions.updateSigningProfileSuccess({ signingProfile: updated }));
        expect(next.isUpdating).toBe(false);
        expect(next.signingProfile).toEqual(updated);
    });

    test('updateSigningProfileFailure clears isUpdating', () => {
        const next = reducer({ ...initialState, isUpdating: true }, actions.updateSigningProfileFailure({ error: 'err' }));
        expect(next.isUpdating).toBe(false);
    });

    test('deleteSigningProfile sets isDeleting and clears deleteErrorMessage', () => {
        const next = reducer({ ...initialState, deleteErrorMessage: 'old error' }, actions.deleteSigningProfile({ uuid: 'p-1' }));
        expect(next.isDeleting).toBe(true);
        expect(next.deleteErrorMessage).toBe('');
    });

    test('deleteSigningProfileSuccess removes from list and clears detail', () => {
        const profile = { uuid: 'p-1' } as any;
        const state = { ...initialState, isDeleting: true, signingProfile: profile, signingProfiles: [profile] };
        const next = reducer(state, actions.deleteSigningProfileSuccess({ uuid: 'p-1' }));
        expect(next.isDeleting).toBe(false);
        expect(next.signingProfiles).toHaveLength(0);
        expect(next.signingProfile).toBeUndefined();
    });

    test('deleteSigningProfileSuccess keeps unrelated detail and list entries', () => {
        const profile = { uuid: 'p-2' } as any;
        const state = { ...initialState, isDeleting: true, signingProfile: profile, signingProfiles: [profile] };
        const next = reducer(state, actions.deleteSigningProfileSuccess({ uuid: 'p-1' }));
        expect(next.signingProfiles).toHaveLength(1);
        expect(next.signingProfile).toEqual(profile);
    });

    test('deleteSigningProfileFailure sets deleteErrorMessage', () => {
        const next = reducer({ ...initialState, isDeleting: true }, actions.deleteSigningProfileFailure({ error: 'delete failed' }));
        expect(next.isDeleting).toBe(false);
        expect(next.deleteErrorMessage).toBe('delete failed');
    });

    test('deleteSigningProfileFailure falls back to Unknown error', () => {
        const next = reducer({ ...initialState, isDeleting: true }, actions.deleteSigningProfileFailure({ error: undefined }));
        expect(next.deleteErrorMessage).toBe('Unknown error');
    });

    test('enableSigningProfile sets isEnabling', () => {
        const next = reducer(initialState, actions.enableSigningProfile({ uuid: 'p-1' }));
        expect(next.isEnabling).toBe(true);
    });

    test('enableSigningProfileSuccess sets enabled=true in list and detail', () => {
        const profile = { uuid: 'p-1', enabled: false } as any;
        const state = { ...initialState, isEnabling: true, signingProfile: profile, signingProfiles: [{ ...profile }] };
        const next = reducer(state, actions.enableSigningProfileSuccess({ uuid: 'p-1' }));
        expect(next.isEnabling).toBe(false);
        expect(next.signingProfiles[0].enabled).toBe(true);
        expect(next.signingProfile?.enabled).toBe(true);
    });

    test('enableSigningProfileFailure clears isEnabling', () => {
        const next = reducer({ ...initialState, isEnabling: true }, actions.enableSigningProfileFailure({ error: 'err' }));
        expect(next.isEnabling).toBe(false);
    });

    test('disableSigningProfile sets isDisabling', () => {
        const next = reducer(initialState, actions.disableSigningProfile({ uuid: 'p-1' }));
        expect(next.isDisabling).toBe(true);
    });

    test('disableSigningProfileSuccess sets enabled=false in list and detail', () => {
        const profile = { uuid: 'p-1', enabled: true } as any;
        const state = { ...initialState, isDisabling: true, signingProfile: profile, signingProfiles: [{ ...profile }] };
        const next = reducer(state, actions.disableSigningProfileSuccess({ uuid: 'p-1' }));
        expect(next.isDisabling).toBe(false);
        expect(next.signingProfiles[0].enabled).toBe(false);
        expect(next.signingProfile?.enabled).toBe(false);
    });

    test('disableSigningProfileFailure clears isDisabling', () => {
        const next = reducer({ ...initialState, isDisabling: true }, actions.disableSigningProfileFailure({ error: 'err' }));
        expect(next.isDisabling).toBe(false);
    });

    test('bulkDeleteSigningProfiles sets isBulkDeleting and clears errors', () => {
        const next = reducer(
            { ...initialState, bulkDeleteErrorMessages: [{ message: 'err' } as any] },
            actions.bulkDeleteSigningProfiles({ uuids: ['p-1'] }),
        );
        expect(next.isBulkDeleting).toBe(true);
        expect(next.bulkDeleteErrorMessages).toEqual([]);
    });

    test('bulkDeleteSigningProfilesSuccess removes items from list and clears matching detail', () => {
        const profiles = [{ uuid: 'p-1' }, { uuid: 'p-2' }] as any[];
        const state = { ...initialState, isBulkDeleting: true, signingProfile: profiles[0], signingProfiles: profiles };
        const next = reducer(state, actions.bulkDeleteSigningProfilesSuccess({ uuids: ['p-1'], errors: [] }));
        expect(next.isBulkDeleting).toBe(false);
        expect(next.signingProfiles).toHaveLength(1);
        expect(next.signingProfiles[0].uuid).toBe('p-2');
        expect(next.signingProfile).toBeUndefined();
    });

    test('bulkDeleteSigningProfilesSuccess with errors sets bulkDeleteErrorMessages', () => {
        const errors = [{ message: 'err', uuid: 'p-1', name: 'Profile 1' }] as any[];
        const profiles = [{ uuid: 'p-1' }] as any[];
        const state = { ...initialState, isBulkDeleting: true, signingProfiles: profiles };
        const next = reducer(state, actions.bulkDeleteSigningProfilesSuccess({ uuids: ['p-1'], errors }));
        expect(next.isBulkDeleting).toBe(false);
        expect(next.bulkDeleteErrorMessages).toEqual(errors);
        expect(next.signingProfiles).toHaveLength(1);
    });

    test('bulkDeleteSigningProfilesFailure clears isBulkDeleting', () => {
        const next = reducer({ ...initialState, isBulkDeleting: true }, actions.bulkDeleteSigningProfilesFailure({ error: 'err' }));
        expect(next.isBulkDeleting).toBe(false);
    });

    test('bulkEnableSigningProfiles sets isBulkEnabling', () => {
        const next = reducer(initialState, actions.bulkEnableSigningProfiles({ uuids: ['p-1'] }));
        expect(next.isBulkEnabling).toBe(true);
    });

    test('bulkEnableSigningProfilesSuccess sets enabled=true for matching uuids and detail', () => {
        const profiles = [
            { uuid: 'p-1', enabled: false },
            { uuid: 'p-2', enabled: false },
        ] as any[];
        const state = { ...initialState, isBulkEnabling: true, signingProfile: profiles[0], signingProfiles: profiles };
        const next = reducer(state, actions.bulkEnableSigningProfilesSuccess({ uuids: ['p-1'] }));
        expect(next.isBulkEnabling).toBe(false);
        expect(next.signingProfiles[0].enabled).toBe(true);
        expect(next.signingProfiles[1].enabled).toBe(false);
        expect(next.signingProfile?.enabled).toBe(true);
    });

    test('bulkEnableSigningProfilesFailure clears isBulkEnabling', () => {
        const next = reducer({ ...initialState, isBulkEnabling: true }, actions.bulkEnableSigningProfilesFailure({ error: 'err' }));
        expect(next.isBulkEnabling).toBe(false);
    });

    test('bulkDisableSigningProfiles sets isBulkDisabling', () => {
        const next = reducer(initialState, actions.bulkDisableSigningProfiles({ uuids: ['p-1'] }));
        expect(next.isBulkDisabling).toBe(true);
    });

    test('bulkDisableSigningProfilesSuccess sets enabled=false for matching uuids and detail', () => {
        const profiles = [
            { uuid: 'p-1', enabled: true },
            { uuid: 'p-2', enabled: true },
        ] as any[];
        const state = { ...initialState, isBulkDisabling: true, signingProfile: profiles[0], signingProfiles: profiles };
        const next = reducer(state, actions.bulkDisableSigningProfilesSuccess({ uuids: ['p-1'] }));
        expect(next.isBulkDisabling).toBe(false);
        expect(next.signingProfiles[0].enabled).toBe(false);
        expect(next.signingProfiles[1].enabled).toBe(true);
        expect(next.signingProfile?.enabled).toBe(false);
    });

    test('bulkDisableSigningProfilesFailure clears isBulkDisabling', () => {
        const next = reducer({ ...initialState, isBulkDisabling: true }, actions.bulkDisableSigningProfilesFailure({ error: 'err' }));
        expect(next.isBulkDisabling).toBe(false);
    });

    test('activateTsp sets isActivatingTsp', () => {
        const next = reducer(initialState, actions.activateTsp({ signingProfileUuid: 'p-1', tspProfileUuid: 'tsp-1' }));
        expect(next.isActivatingTsp).toBe(true);
    });

    test('activateTspSuccess sets tspActivationDetails', () => {
        const details = { uuid: 'tsp-1' } as any;
        const next = reducer({ ...initialState, isActivatingTsp: true }, actions.activateTspSuccess({ tspActivationDetails: details }));
        expect(next.isActivatingTsp).toBe(false);
        expect(next.tspActivationDetails).toEqual(details);
    });

    test('activateTspSuccess adds Tsp to enabledProtocols of detail when missing', () => {
        const details = { uuid: 'tsp-1' } as any;
        const state = { ...initialState, signingProfile: { uuid: 'p-1', enabledProtocols: [] } as any };
        const next = reducer(state, actions.activateTspSuccess({ tspActivationDetails: details }));
        expect(next.signingProfile?.enabledProtocols).toEqual(['tsp']);
    });

    test('activateTspSuccess initializes enabledProtocols when undefined', () => {
        const details = { uuid: 'tsp-1' } as any;
        const state = { ...initialState, signingProfile: { uuid: 'p-1' } as any };
        const next = reducer(state, actions.activateTspSuccess({ tspActivationDetails: details }));
        expect(next.signingProfile?.enabledProtocols).toEqual(['tsp']);
    });

    test('activateTspSuccess does not duplicate Tsp when already present', () => {
        const details = { uuid: 'tsp-1' } as any;
        const state = { ...initialState, signingProfile: { uuid: 'p-1', enabledProtocols: ['tsp'] } as any };
        const next = reducer(state, actions.activateTspSuccess({ tspActivationDetails: details }));
        expect(next.signingProfile?.enabledProtocols).toEqual(['tsp']);
    });

    test('activateTspFailure clears isActivatingTsp', () => {
        const next = reducer({ ...initialState, isActivatingTsp: true }, actions.activateTspFailure({ error: 'err' }));
        expect(next.isActivatingTsp).toBe(false);
    });

    test('deactivateTsp sets isDeactivatingTsp', () => {
        const next = reducer(initialState, actions.deactivateTsp({ uuid: 'p-1' }));
        expect(next.isDeactivatingTsp).toBe(true);
    });

    test('deactivateTspSuccess clears tspActivationDetails and removes Tsp protocol', () => {
        const details = { uuid: 'tsp-1' } as any;
        const next = reducer(
            {
                ...initialState,
                isDeactivatingTsp: true,
                tspActivationDetails: details,
                signingProfile: { uuid: 'p-1', enabledProtocols: ['tsp', 'csc_api'] } as any,
            },
            actions.deactivateTspSuccess({ uuid: 'p-1' }),
        );
        expect(next.isDeactivatingTsp).toBe(false);
        expect(next.tspActivationDetails).toBeUndefined();
        expect(next.signingProfile?.enabledProtocols).toEqual(['csc_api']);
    });

    test('deactivateTspSuccess clears details without a loaded profile', () => {
        const next = reducer(
            { ...initialState, isDeactivatingTsp: true, tspActivationDetails: { uuid: 'tsp-1' } as any },
            actions.deactivateTspSuccess({ uuid: 'p-1' }),
        );
        expect(next.tspActivationDetails).toBeUndefined();
        expect(next.signingProfile).toBeUndefined();
    });

    test('deactivateTspFailure clears isDeactivatingTsp', () => {
        const next = reducer({ ...initialState, isDeactivatingTsp: true }, actions.deactivateTspFailure({ error: 'err' }));
        expect(next.isDeactivatingTsp).toBe(false);
    });

    test('getTspActivationDetails sets isFetchingTspActivationDetails and clears previous details', () => {
        const next = reducer(
            { ...initialState, tspActivationDetails: { uuid: 'old' } as any },
            actions.getTspActivationDetails({ uuid: 'p-1' }),
        );
        expect(next.isFetchingTspActivationDetails).toBe(true);
        expect(next.tspActivationDetails).toBeUndefined();
    });

    test('getTspActivationDetailsSuccess sets tspActivationDetails', () => {
        const details = { uuid: 'tsp-1' } as any;
        const next = reducer(
            { ...initialState, isFetchingTspActivationDetails: true },
            actions.getTspActivationDetailsSuccess({ tspActivationDetails: details }),
        );
        expect(next.isFetchingTspActivationDetails).toBe(false);
        expect(next.tspActivationDetails).toEqual(details);
    });

    test('getTspActivationDetailsFailure clears flag and details', () => {
        const next = reducer(
            { ...initialState, isFetchingTspActivationDetails: true, tspActivationDetails: { uuid: 'x' } as any },
            actions.getTspActivationDetailsFailure({ error: 'err' }),
        );
        expect(next.isFetchingTspActivationDetails).toBe(false);
        expect(next.tspActivationDetails).toBeUndefined();
    });

    test('listSupportedProtocols sets isFetchingSupportedProtocols', () => {
        const next = reducer(initialState, actions.listSupportedProtocols({ workflowType: 'TIMESTAMPING' as any }));
        expect(next.isFetchingSupportedProtocols).toBe(true);
    });

    test('listSupportedProtocolsSuccess sets supportedProtocols', () => {
        const protocols = ['tsp'] as any[];
        const next = reducer(
            { ...initialState, isFetchingSupportedProtocols: true },
            actions.listSupportedProtocolsSuccess({ supportedProtocols: protocols }),
        );
        expect(next.isFetchingSupportedProtocols).toBe(false);
        expect(next.supportedProtocols).toEqual(protocols);
    });

    test('listSupportedProtocolsFailure clears flag', () => {
        const next = reducer(
            { ...initialState, isFetchingSupportedProtocols: true },
            actions.listSupportedProtocolsFailure({ error: 'err' }),
        );
        expect(next.isFetchingSupportedProtocols).toBe(false);
    });

    test('listSigningCertificates sets isFetchingSigningCertificates', () => {
        const next = reducer(initialState, actions.listSigningCertificates({ workflowType: 'TIMESTAMPING' as any }));
        expect(next.isFetchingSigningCertificates).toBe(true);
    });

    test('listSigningCertificatesSuccess sets signingCertificates', () => {
        const certs = [{ uuid: 'c-1' }] as any[];
        const next = reducer(
            { ...initialState, isFetchingSigningCertificates: true },
            actions.listSigningCertificatesSuccess({ signingCertificates: certs }),
        );
        expect(next.isFetchingSigningCertificates).toBe(false);
        expect(next.signingCertificates).toEqual(certs);
    });

    test('listSigningCertificatesFailure clears isFetchingSigningCertificates', () => {
        const next = reducer(
            { ...initialState, isFetchingSigningCertificates: true },
            actions.listSigningCertificatesFailure({ error: 'err' }),
        );
        expect(next.isFetchingSigningCertificates).toBe(false);
    });

    test('listSignatureAttributesForCertificate sets flag and clears previous descriptors', () => {
        const next = reducer(
            { ...initialState, signingOperationAttributeDescriptors: [{ uuid: 'old' } as any] },
            actions.listSignatureAttributesForCertificate({ certificateUuid: 'c-1' }),
        );
        expect(next.isFetchingSignatureAttributes).toBe(true);
        expect(next.signingOperationAttributeDescriptors).toEqual([]);
    });

    test('listSignatureAttributesForCertificateSuccess sets descriptors', () => {
        const descriptors = [{ uuid: 'a-1' }] as any[];
        const next = reducer(
            { ...initialState, isFetchingSignatureAttributes: true },
            actions.listSignatureAttributesForCertificateSuccess({ attributeDescriptors: descriptors }),
        );
        expect(next.isFetchingSignatureAttributes).toBe(false);
        expect(next.signingOperationAttributeDescriptors).toEqual(descriptors);
    });

    test('listSignatureAttributesForCertificateFailure clears flag', () => {
        const next = reducer(
            { ...initialState, isFetchingSignatureAttributes: true },
            actions.listSignatureAttributesForCertificateFailure({ error: 'err' }),
        );
        expect(next.isFetchingSignatureAttributes).toBe(false);
    });

    test('listSignatureFormatterConnectorAttributes sets flag and clears previous descriptors', () => {
        const next = reducer(
            { ...initialState, signatureFormatterConnectorAttributeDescriptors: [{ uuid: 'old' } as any] },
            actions.listSignatureFormatterConnectorAttributes({ connectorUuid: 'cn-1' }),
        );
        expect(next.isFetchingSignatureFormatterConnectorAttributes).toBe(true);
        expect(next.signatureFormatterConnectorAttributeDescriptors).toEqual([]);
    });

    test('listSignatureFormatterConnectorAttributesSuccess sets descriptors', () => {
        const descriptors = [{ uuid: 'a-1' }] as any[];
        const next = reducer(
            { ...initialState, isFetchingSignatureFormatterConnectorAttributes: true },
            actions.listSignatureFormatterConnectorAttributesSuccess({ attributeDescriptors: descriptors }),
        );
        expect(next.isFetchingSignatureFormatterConnectorAttributes).toBe(false);
        expect(next.signatureFormatterConnectorAttributeDescriptors).toEqual(descriptors);
    });

    test('listSignatureFormatterConnectorAttributesFailure clears flag', () => {
        const next = reducer(
            { ...initialState, isFetchingSignatureFormatterConnectorAttributes: true },
            actions.listSignatureFormatterConnectorAttributesFailure({ error: 'err' }),
        );
        expect(next.isFetchingSignatureFormatterConnectorAttributes).toBe(false);
    });

    test('listSignatureFormatterConnectors sets flag and clears previous connectors', () => {
        const next = reducer(
            { ...initialState, signatureFormatterConnectors: [{ uuid: 'old' } as any] },
            actions.listSignatureFormatterConnectors({ workflowType: 'TIMESTAMPING' as any }),
        );
        expect(next.isFetchingSignatureFormatterConnectors).toBe(true);
        expect(next.signatureFormatterConnectors).toEqual([]);
    });

    test('listSignatureFormatterConnectorsSuccess sets connectors', () => {
        const connectors = [{ uuid: 'cn-1' }] as any[];
        const next = reducer(
            { ...initialState, isFetchingSignatureFormatterConnectors: true },
            actions.listSignatureFormatterConnectorsSuccess({ connectors }),
        );
        expect(next.isFetchingSignatureFormatterConnectors).toBe(false);
        expect(next.signatureFormatterConnectors).toEqual(connectors);
    });

    test('listSignatureFormatterConnectorsFailure clears flag', () => {
        const next = reducer(
            { ...initialState, isFetchingSignatureFormatterConnectors: true },
            actions.listSignatureFormatterConnectorsFailure({ error: 'err' }),
        );
        expect(next.isFetchingSignatureFormatterConnectors).toBe(false);
    });

    test('listSigningRecordsForSigningProfile sets isFetchingSigningRecords', () => {
        const next = reducer(initialState, actions.listSigningRecordsForSigningProfile({ uuid: 'p-1' }));
        expect(next.isFetchingSigningRecords).toBe(true);
    });

    test('listSigningRecordsForSigningProfileSuccess sets signingRecords', () => {
        const sigs = { items: [{ uuid: 'ds-1' }], totalItems: 1 } as any;
        const next = reducer(
            { ...initialState, isFetchingSigningRecords: true },
            actions.listSigningRecordsForSigningProfileSuccess({ signingRecords: sigs }),
        );
        expect(next.isFetchingSigningRecords).toBe(false);
        expect(next.signingRecords).toEqual(sigs);
    });

    test('listSigningRecordsForSigningProfileFailure clears isFetchingSigningRecords', () => {
        const next = reducer(
            { ...initialState, isFetchingSigningRecords: true },
            actions.listSigningRecordsForSigningProfileFailure({ error: 'err' }),
        );
        expect(next.isFetchingSigningRecords).toBe(false);
    });
});

describe('signingProfiles selectors', () => {
    test('selectors read all values from state', () => {
        const profile = { uuid: 'p-1' } as any;
        const profiles = [profile];
        const tspDetails = { uuid: 'tsp-1' } as any;
        const protocols = ['tsp'] as any[];
        const signingRecordData = { items: [], totalItems: 0 } as any;
        const fields = [{ searchGroupEnum: 'g-1' }] as any[];
        const bulkErrors = [{ message: 'err' }] as any[];

        const featureState = {
            ...initialState,
            signingProfile: profile,
            signingProfiles: profiles,
            tspActivationDetails: tspDetails,
            supportedProtocols: protocols,
            signingCertificates: [{ uuid: 'c-1' }] as any[],
            signingOperationAttributeDescriptors: [{ uuid: 'a-1' }] as any[],
            signatureFormatterConnectorAttributeDescriptors: [{ uuid: 'a-2' }] as any[],
            signatureFormatterConnectors: [{ uuid: 'cn-1' }] as any[],
            signingRecords: signingRecordData,
            searchableFields: fields,
            deleteErrorMessage: 'del err',
            bulkDeleteErrorMessages: bulkErrors,
            isFetchingList: true,
            isFetchingDetail: true,
            isFetchingSearchableFields: true,
            isFetchingTspActivationDetails: true,
            isFetchingSupportedProtocols: true,
            isFetchingSigningCertificates: true,
            isFetchingSignatureAttributes: true,
            isFetchingSignatureFormatterConnectorAttributes: true,
            isFetchingSignatureFormatterConnectors: true,
            isFetchingSigningRecords: true,
            isCreating: true,
            isDeleting: true,
            isUpdating: true,
            isEnabling: true,
            isDisabling: true,
            isBulkDeleting: true,
            isBulkEnabling: true,
            isBulkDisabling: true,
            isActivatingTsp: true,
            isDeactivatingTsp: true,
        };

        const state = { signingProfiles: featureState } as any;

        expect(selectors.state(state)).toEqual(featureState);
        expect(selectors.signingProfile(state)).toEqual(profile);
        expect(selectors.signingProfiles(state)).toEqual(profiles);
        expect(selectors.tspActivationDetails(state)).toEqual(tspDetails);
        expect(selectors.supportedProtocols(state)).toEqual(protocols);
        expect(selectors.signingCertificates(state)).toEqual([{ uuid: 'c-1' }]);
        expect(selectors.signingOperationAttributeDescriptors(state)).toEqual([{ uuid: 'a-1' }]);
        expect(selectors.signatureFormatterConnectorAttributeDescriptors(state)).toEqual([{ uuid: 'a-2' }]);
        expect(selectors.signatureFormatterConnectors(state)).toEqual([{ uuid: 'cn-1' }]);
        expect(selectors.signingRecords(state)).toEqual(signingRecordData);
        expect(selectors.searchableFields(state)).toEqual(fields);
        expect(selectors.deleteErrorMessage(state)).toBe('del err');
        expect(selectors.bulkDeleteErrorMessages(state)).toEqual(bulkErrors);
        expect(selectors.isFetchingList(state)).toBe(true);
        expect(selectors.isFetchingDetail(state)).toBe(true);
        expect(selectors.isFetchingSearchableFields(state)).toBe(true);
        expect(selectors.isFetchingTspActivationDetails(state)).toBe(true);
        expect(selectors.isFetchingSupportedProtocols(state)).toBe(true);
        expect(selectors.isFetchingSigningCertificates(state)).toBe(true);
        expect(selectors.isFetchingSignatureAttributes(state)).toBe(true);
        expect(selectors.isFetchingSignatureFormatterConnectorAttributes(state)).toBe(true);
        expect(selectors.isFetchingSignatureFormatterConnectors(state)).toBe(true);
        expect(selectors.isFetchingSigningRecords(state)).toBe(true);
        expect(selectors.isCreating(state)).toBe(true);
        expect(selectors.isDeleting(state)).toBe(true);
        expect(selectors.isUpdating(state)).toBe(true);
        expect(selectors.isEnabling(state)).toBe(true);
        expect(selectors.isDisabling(state)).toBe(true);
        expect(selectors.isBulkDeleting(state)).toBe(true);
        expect(selectors.isBulkEnabling(state)).toBe(true);
        expect(selectors.isBulkDisabling(state)).toBe(true);
        expect(selectors.isActivatingTsp(state)).toBe(true);
        expect(selectors.isDeactivatingTsp(state)).toBe(true);
    });
});
