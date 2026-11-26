import { describe, expect, test } from 'vitest';

import { SignatureLevel, SigningProtocol, SigningWorkflowType } from 'types/openapi';
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

    test('bulkDeleteSigningProfilesSuccess clears isBulkDeleting without optimistically mutating the list', () => {
        // The epic re-fetches the list from the server on success, so the reducer must NOT splice
        // items locally (doing so is the "contradictory optimistic-delete tracking" removed from the twin).
        const profiles = [{ uuid: 'p-1' }, { uuid: 'p-2' }] as any[];
        const state = { ...initialState, isBulkDeleting: true, signingProfile: profiles[0], signingProfiles: profiles };
        const next = reducer(state, actions.bulkDeleteSigningProfilesSuccess({ uuids: ['p-1'], errors: [] }));
        expect(next.isBulkDeleting).toBe(false);
        expect(next.signingProfiles).toHaveLength(2);
        expect(next.bulkDeleteErrorMessages).toEqual([]);
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

    test('listSupportedProtocols drops the stored list and records the workflow it asks for', () => {
        const next = reducer(
            {
                ...initialState,
                supportedProtocols: [SigningProtocol.Tsp],
                supportedProtocolsWorkflowType: SigningWorkflowType.Timestamping,
            },
            actions.listSupportedProtocols({ workflowType: SigningWorkflowType.ContentSigning }),
        );
        expect(next.supportedProtocols).toEqual([]);
        expect(next.supportedProtocolsWorkflowType).toBe(SigningWorkflowType.ContentSigning);
    });

    test('supportedProtocolListFor returns only the list of the workflow it was fetched for', () => {
        const store = {
            signingProfiles: {
                ...initialState,
                supportedProtocols: [SigningProtocol.IlmNative],
                supportedProtocolsWorkflowType: SigningWorkflowType.ContentSigning,
            },
        } as any;
        expect(selectors.supportedProtocolListFor(SigningWorkflowType.ContentSigning)(store).protocols).toEqual([
            SigningProtocol.IlmNative,
        ]);
        expect(selectors.supportedProtocolListFor(SigningWorkflowType.Timestamping)(store).protocols).toEqual([]);
        expect(selectors.supportedProtocolListFor(undefined)(store).protocols).toEqual([]);
    });

    test('supportedProtocolListFor carries the listing failure of its workflow', () => {
        const failed = reducer(
            reducer(initialState, actions.listSupportedProtocols({ workflowType: SigningWorkflowType.ContentSigning })),
            actions.listSupportedProtocolsFailure({ error: 'Core unavailable' }),
        );
        const store = { signingProfiles: failed } as any;
        expect(selectors.supportedProtocolListFor(SigningWorkflowType.ContentSigning)(store).failure).toEqual({
            reason: 'Core unavailable',
        });
        expect(selectors.supportedProtocolListFor(SigningWorkflowType.Timestamping)(store).failure).toBeUndefined();
    });

    test('listSupportedProtocols clears the previous failure', () => {
        const next = reducer(
            { ...initialState, failedSupportedProtocolsFetch: { reason: 'Core unavailable' } },
            actions.listSupportedProtocols({ workflowType: SigningWorkflowType.ContentSigning }),
        );
        expect(next.failedSupportedProtocolsFetch).toBeUndefined();
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

    test('listSigningCertificatesFailure clears the certificates and leaves them unlisted', () => {
        const listing = reducer(
            { ...initialState, signingCertificates: [{ uuid: 'c-1' } as any], signingCertificatesListed: true },
            actions.listSigningCertificates({ workflowType: SigningWorkflowType.ContentSigning }),
        );
        expect(selectors.signingCertificatesListed({ signingProfiles: listing } as any)).toBe(false);

        const next = reducer(listing, actions.listSigningCertificatesFailure({ error: 'err' }));

        expect(next.isFetchingSigningCertificates).toBe(false);
        expect(next.signingCertificates).toEqual([]);
        expect(selectors.signingCertificatesListed({ signingProfiles: next } as any)).toBe(false);
        expect(selectors.failedSigningCertificatesFetch({ signingProfiles: next } as any)).toEqual({ reason: 'err' });
    });

    test('listSigningCertificates clears the failure of the previous listing', () => {
        const failed = reducer(initialState, actions.listSigningCertificatesFailure({ error: 'err' }));

        const next = reducer(failed, actions.listSigningCertificates({ workflowType: SigningWorkflowType.ContentSigning }));

        expect(selectors.failedSigningCertificatesFetch({ signingProfiles: next } as any)).toBeUndefined();
    });

    describe('contentSigningAttributesListedFor', () => {
        const selection = { connectorUuid: 'c-pades', family: 'pades', level: SignatureLevel.Timestamped };
        const listedFor = (signingProfiles: typeof initialState) => selectors.contentSigningAttributesListedFor({ signingProfiles } as any);
        const listing = reducer(initialState, actions.listContentSigningProfileAttributes(selection));

        test('names nothing while the listing is pending', () => {
            expect(listedFor(listing)).toBeUndefined();
        });

        test('names the selection Core listed', () => {
            const next = reducer(
                listing,
                actions.listContentSigningProfileAttributesSuccess({ profileAttributes: [], requestAttributes: [] }),
            );

            expect(listedFor(next)).toEqual(selection);
        });

        test('names nothing after the listing failed', () => {
            const next = reducer(listing, actions.listContentSigningProfileAttributesFailure({ reason: 'connector unavailable' }));

            expect(listedFor(next)).toBeUndefined();
        });
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

    test('listSignatureFormattingConnectorAttributes sets flag and clears previous descriptors', () => {
        const next = reducer(
            { ...initialState, signatureFormattingConnectorAttributeDescriptors: [{ uuid: 'old' } as any] },
            actions.listSignatureFormattingConnectorAttributes({ connectorUuid: 'cn-1' }),
        );
        expect(next.isFetchingSignatureFormattingConnectorAttributes).toBe(true);
        expect(next.signatureFormattingConnectorAttributeDescriptors).toEqual([]);
    });

    test('listSignatureFormattingConnectorAttributesSuccess sets descriptors', () => {
        const descriptors = [{ uuid: 'a-1' }] as any[];
        const next = reducer(
            { ...initialState, isFetchingSignatureFormattingConnectorAttributes: true },
            actions.listSignatureFormattingConnectorAttributesSuccess({ attributeDescriptors: descriptors }),
        );
        expect(next.isFetchingSignatureFormattingConnectorAttributes).toBe(false);
        expect(next.signatureFormattingConnectorAttributeDescriptors).toEqual(descriptors);
    });

    test('listSignatureFormattingConnectorAttributesFailure clears flag', () => {
        const next = reducer(
            { ...initialState, isFetchingSignatureFormattingConnectorAttributes: true },
            actions.listSignatureFormattingConnectorAttributesFailure({ error: 'err' }),
        );
        expect(next.isFetchingSignatureFormattingConnectorAttributes).toBe(false);
    });

    test('listSignatureFormattingConnectors sets flag and clears previous connectors', () => {
        const next = reducer(
            { ...initialState, signatureFormattingConnectors: [{ uuid: 'old' } as any] },
            actions.listSignatureFormattingConnectors({ workflowType: 'TIMESTAMPING' as any }),
        );
        expect(next.isFetchingSignatureFormattingConnectors).toBe(true);
        expect(next.signatureFormattingConnectors).toEqual([]);
    });

    test('listSignatureFormattingConnectorsSuccess sets connectors', () => {
        const connectors = [{ uuid: 'cn-1' }] as any[];
        const next = reducer(
            { ...initialState, isFetchingSignatureFormattingConnectors: true },
            actions.listSignatureFormattingConnectorsSuccess({ connectors }),
        );
        expect(next.isFetchingSignatureFormattingConnectors).toBe(false);
        expect(next.signatureFormattingConnectors).toEqual(connectors);
    });

    test('listSignatureFormattingConnectorsSuccess keeps the workflow the list was searched for', () => {
        const connectors = [{ uuid: 'cn-1' }] as any[];
        const requested = reducer(
            initialState,
            actions.listSignatureFormattingConnectors({ workflowType: SigningWorkflowType.ContentSigning }),
        );
        const next = reducer(requested, actions.listSignatureFormattingConnectorsSuccess({ connectors }));
        const rootState = { signingProfiles: next } as any;

        expect(selectors.signatureFormattingConnectorListFor(SigningWorkflowType.ContentSigning)(rootState)).toEqual({
            connectors,
            isFetching: false,
            failure: undefined,
        });
        expect(selectors.signatureFormattingConnectorListFor(SigningWorkflowType.Timestamping)(rootState)).toEqual({
            connectors: [],
            isFetching: false,
        });
    });

    test('a failed connector search shows only for the workflow it was searched for', () => {
        const requested = reducer(
            initialState,
            actions.listSignatureFormattingConnectors({ workflowType: SigningWorkflowType.ContentSigning }),
        );
        const next = reducer(requested, actions.listSignatureFormattingConnectorsFailure({ reason: 'Core unreachable' }));
        const rootState = { signingProfiles: next } as any;

        expect(selectors.signatureFormattingConnectorListFor(SigningWorkflowType.ContentSigning)(rootState).failure).toEqual({
            reason: 'Core unreachable',
        });
        expect(selectors.signatureFormattingConnectorListFor(SigningWorkflowType.Timestamping)(rootState).failure).toBeUndefined();
    });

    test('listSignatureFormattingConnectorsFailure clears the flag and records the reason', () => {
        const next = reducer(
            { ...initialState, isFetchingSignatureFormattingConnectors: true },
            actions.listSignatureFormattingConnectorsFailure({ reason: 'err' }),
        );
        expect(next.isFetchingSignatureFormattingConnectors).toBe(false);
        expect(next.failedSignatureFormattingConnectorsFetch).toEqual({ reason: 'err' });
    });

    test('listSignatureFormattingConnectors clears the previous failure', () => {
        const next = reducer(
            { ...initialState, failedSignatureFormattingConnectorsFetch: { reason: 'err' } },
            actions.listSignatureFormattingConnectors({ workflowType: SigningWorkflowType.ContentSigning }),
        );
        expect(next.failedSignatureFormattingConnectorsFetch).toBeUndefined();
    });

    test('listSignatureFormattingConnectorDeclarations sets the flag and clears the previous answer', () => {
        const next = reducer(
            {
                ...initialState,
                signatureFormattingConnectorDeclarations: { connectorUuid: 'cn-old', declarations: [{ code: 'old' } as any] },
                failedSignatureFormattingConnectorDeclarationsFetch: { connectorUuid: 'cn-old', reason: 'err' },
            },
            actions.listSignatureFormattingConnectorDeclarations({ connectorUuid: 'cn-1' }),
        );
        expect(next.isFetchingSignatureFormattingConnectorDeclarations).toBe(true);
        expect(next.signatureFormattingConnectorDeclarations).toBeUndefined();
        expect(next.failedSignatureFormattingConnectorDeclarationsFetch).toBeUndefined();
    });

    test('listSignatureFormattingConnectorDeclarationsSuccess sets declarations and their connector', () => {
        const declarations = [{ code: 'pades' }] as any[];
        const next = reducer(
            { ...initialState, isFetchingSignatureFormattingConnectorDeclarations: true },
            actions.listSignatureFormattingConnectorDeclarationsSuccess({ connectorUuid: 'cn-1', declarations }),
        );
        expect(next.isFetchingSignatureFormattingConnectorDeclarations).toBe(false);
        expect(next.signatureFormattingConnectorDeclarations).toEqual({ connectorUuid: 'cn-1', declarations });
    });

    test('listSignatureFormattingConnectorDeclarationsFailure records the failed connector and its reason', () => {
        const next = reducer(
            { ...initialState, isFetchingSignatureFormattingConnectorDeclarations: true },
            actions.listSignatureFormattingConnectorDeclarationsFailure({ connectorUuid: 'cn-1', reason: 'err' }),
        );
        expect(next.isFetchingSignatureFormattingConnectorDeclarations).toBe(false);
        expect(next.failedSignatureFormattingConnectorDeclarationsFetch).toEqual({ connectorUuid: 'cn-1', reason: 'err' });
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
            supportedProtocolsWorkflowType: SigningWorkflowType.Timestamping,
            signingCertificates: [{ uuid: 'c-1' }] as any[],
            signingOperationAttributeDescriptors: [{ uuid: 'a-1' }] as any[],
            signatureFormattingConnectorAttributeDescriptors: [{ uuid: 'a-2' }] as any[],
            signatureFormattingConnectors: [{ uuid: 'cn-1' }] as any[],
            signatureFormattingConnectorsWorkflowType: SigningWorkflowType.Timestamping,
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
            isFetchingSignatureFormattingConnectorAttributes: true,
            isFetchingSignatureFormattingConnectors: true,
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
        expect(selectors.supportedProtocolListFor(SigningWorkflowType.Timestamping)(state).protocols).toEqual(protocols);
        expect(selectors.signingCertificates(state)).toEqual([{ uuid: 'c-1' }]);
        expect(selectors.signingOperationAttributeDescriptors(state)).toEqual([{ uuid: 'a-1' }]);
        expect(selectors.signatureFormattingConnectorAttributeDescriptors(state)).toEqual([{ uuid: 'a-2' }]);
        expect(selectors.signatureFormattingConnectorListFor(SigningWorkflowType.Timestamping)(state).connectors).toEqual([
            { uuid: 'cn-1' },
        ]);
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
        expect(selectors.isFetchingSignatureFormattingConnectorAttributes(state)).toBe(true);
        expect(selectors.signatureFormattingConnectorListFor(SigningWorkflowType.Timestamping)(state).isFetching).toBe(true);
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

    describe('ILM_NATIVE activation', () => {
        const profile = { uuid: 'p-1', enabledProtocols: [SigningProtocol.Tsp] } as any;

        test('a response for another profile leaves the loaded profile untouched', () => {
            const next = reducer({ ...initialState, signingProfile: profile }, actions.activateIlmNativeSuccess({ uuid: 'p-other' }));

            expect(next.signingProfile?.enabledProtocols).toEqual([SigningProtocol.Tsp]);
        });

        test('activateIlmNativeSuccess adds ILM_NATIVE to the profile once', () => {
            const activating = reducer({ ...initialState, signingProfile: profile }, actions.activateIlmNative({ uuid: 'p-1' }));
            expect(activating.isActivatingIlmNative).toBe(true);

            const once = reducer(activating, actions.activateIlmNativeSuccess({ uuid: 'p-1' }));
            const twice = reducer(once, actions.activateIlmNativeSuccess({ uuid: 'p-1' }));

            expect(twice.isActivatingIlmNative).toBe(false);
            expect(twice.signingProfile?.enabledProtocols).toEqual([SigningProtocol.Tsp, SigningProtocol.IlmNative]);
        });

        test('deactivateIlmNativeSuccess removes ILM_NATIVE and keeps the other protocols', () => {
            const active = { ...profile, enabledProtocols: [SigningProtocol.Tsp, SigningProtocol.IlmNative] };
            const deactivating = reducer({ ...initialState, signingProfile: active }, actions.deactivateIlmNative({ uuid: 'p-1' }));
            expect(deactivating.isDeactivatingIlmNative).toBe(true);

            const next = reducer(deactivating, actions.deactivateIlmNativeSuccess({ uuid: 'p-1' }));

            expect(next.isDeactivatingIlmNative).toBe(false);
            expect(next.signingProfile?.enabledProtocols).toEqual([SigningProtocol.Tsp]);
        });

        test('a deactivation for another profile leaves the loaded profile untouched', () => {
            const active = { ...profile, enabledProtocols: [SigningProtocol.IlmNative] };
            const next = reducer({ ...initialState, signingProfile: active }, actions.deactivateIlmNativeSuccess({ uuid: 'p-other' }));

            expect(next.signingProfile?.enabledProtocols).toEqual([SigningProtocol.IlmNative]);
        });

        test('a failure clears the in-progress flag and keeps the protocols', () => {
            const activating = reducer({ ...initialState, signingProfile: profile }, actions.activateIlmNative({ uuid: 'p-1' }));
            const next = reducer(activating, actions.activateIlmNativeFailure({ error: 'forbidden' }));

            expect(next.isActivatingIlmNative).toBe(false);
            expect(next.signingProfile?.enabledProtocols).toEqual([SigningProtocol.Tsp]);
        });
    });
});
