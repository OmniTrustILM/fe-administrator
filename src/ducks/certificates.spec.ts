import { describe, expect, test, vi } from 'vitest';
import reducer, { actions, initialState, selectors } from './certificates';

vi.mock('utils/download', () => ({
    downloadFileZip: vi.fn(),
}));

describe('certificates slice', () => {
    test('returns initial state for unknown action', () => {
        expect(reducer(undefined, { type: 'unknown' })).toEqual(initialState);
    });

    test('resetState returns initialState', () => {
        const modified = {
            ...initialState,
            isFetchingDetail: true,
            certificates: [{ uuid: 'cert-1' }] as any,
            deleteErrorMessage: 'some error',
        };
        const next = reducer(modified as any, actions.resetState());
        expect(next).toEqual(initialState);
    });

    test('clearDeleteErrorMessages clears deleteErrorMessage', () => {
        const state = { ...initialState, deleteErrorMessage: 'some error' };
        const next = reducer(state, actions.clearDeleteErrorMessages());
        expect(next.deleteErrorMessage).toBe('');
    });

    test('clearCertificateDetail clears certificateDetail', () => {
        const state = { ...initialState, certificateDetail: { uuid: 'cert-1' } as any };
        const next = reducer(state, actions.clearCertificateDetail());
        expect(next.certificateDetail).toBeUndefined();
    });

    test('setIncludeArchived sets isIncludeArchived', () => {
        let next = reducer(initialState, actions.setIncludeArchived(true));
        expect(next.isIncludeArchived).toBe(true);
        next = reducer(next, actions.setIncludeArchived(false));
        expect(next.isIncludeArchived).toBe(false);
    });

    test('listCertificates clears certificates list', () => {
        const state = { ...initialState, certificates: [{ uuid: 'cert-1' }] as any };
        const next = reducer(state, actions.listCertificates({} as any));
        expect(next.certificates).toEqual([]);
    });

    test('listCertificatesSuccess stores certificates', () => {
        const certs = [{ uuid: 'cert-1' }, { uuid: 'cert-2' }] as any;
        const next = reducer(initialState, actions.listCertificatesSuccess(certs));
        expect(next.certificates).toEqual(certs);
    });

    test('getCertificateDetail / success / failure update detail flags and data', () => {
        let next = reducer(initialState, actions.getCertificateDetail({ uuid: 'cert-1' }));
        expect(next.isFetchingDetail).toBe(true);
        expect(next.certificateDetail).toBeUndefined();

        const cert = { uuid: 'cert-1', commonName: 'Test' } as any;
        next = reducer(next, actions.getCertificateDetailSuccess({ certificate: cert }));
        expect(next.isFetchingDetail).toBe(false);
        expect(next.certificateDetail).toEqual(cert);

        next = reducer({ ...next, isFetchingDetail: true }, actions.getCertificateDetailFailure({ error: 'err' }));
        expect(next.isFetchingDetail).toBe(false);
    });

    test('getCertificateRelations / success / failure update relations flags and data', () => {
        let next = reducer(initialState, actions.getCertificateRelations({ uuid: 'cert-1' }));
        expect(next.isFetchingRelations).toBe(true);
        expect(next.certificateRelations).toBeUndefined();

        const relations = { uuid: 'cert-1' } as any;
        next = reducer(next, actions.getCertificateRelationsSuccess({ certificateRelations: relations }));
        expect(next.isFetchingRelations).toBe(false);
        expect(next.certificateRelations).toEqual(relations);

        next = reducer({ ...next, isFetchingRelations: true }, actions.getCertificateRelationsFailure({ error: 'err' }));
        expect(next.isFetchingRelations).toBe(false);
    });

    test('associateCertificate / success / failure update isAssociating', () => {
        let next = reducer(initialState, actions.associateCertificate({ uuid: 'loc-1', certificateUuid: 'cert-1' }));
        expect(next.isAssociating).toBe(true);

        next = reducer(next, actions.associateCertificateSuccess({ uuid: 'loc-1', certificateUuid: 'cert-1' }));
        expect(next.isAssociating).toBe(false);

        next = reducer({ ...next, isAssociating: true }, actions.associateCertificateFailure({ error: 'err' }));
        expect(next.isAssociating).toBe(false);
    });

    test('deassociateCertificate / success / failure update isDeassociating', () => {
        let next = reducer(initialState, actions.deassociateCertificate({ uuid: 'loc-1', certificateUuid: 'cert-1' }));
        expect(next.isDeassociating).toBe(true);

        next = reducer(next, actions.deassociateCertificateSuccess({ uuid: 'loc-1', certificateUuid: 'cert-1' }));
        expect(next.isDeassociating).toBe(false);

        next = reducer({ ...next, isDeassociating: true }, actions.deassociateCertificateFailure({ error: 'err' }));
        expect(next.isDeassociating).toBe(false);
    });

    test('getCertificateValidationResult / success / failure update validation flags and data', () => {
        let next = reducer(initialState, actions.getCertificateValidationResult({ uuid: 'cert-1' }));
        expect(next.isFetchingValidationResult).toBe(true);
        expect(next.validationResult).toBeUndefined();

        const result = { status: 'valid' } as any;
        next = reducer(next, actions.getCertificateValidationResultSuccess(result));
        expect(next.isFetchingValidationResult).toBe(false);
        expect(next.validationResult).toEqual(result);

        next = reducer({ ...next, isFetchingValidationResult: true }, actions.getCertificateValidationResultFailure({ error: 'err' }));
        expect(next.isFetchingValidationResult).toBe(false);
    });

    test('issueCertificate / issueCertificateNew / success / failure update isIssuing', () => {
        let next = reducer(
            initialState,
            actions.issueCertificate({ authorityUuid: 'auth-1', raProfileUuid: 'ra-1', signRequest: {} as any }),
        );
        expect(next.isIssuing).toBe(true);

        next = reducer(
            initialState,
            actions.issueCertificateNew({ authorityUuid: 'auth-1', raProfileUuid: 'ra-1', certificateUuid: 'c-1' }),
        );
        expect(next.isIssuing).toBe(true);

        next = reducer(next, actions.issueCertificateSuccess({ uuid: 'cert-1' }));
        expect(next.isIssuing).toBe(false);

        next = reducer({ ...next, isIssuing: true }, actions.issueCertificateFailure({ error: 'err' }));
        expect(next.isIssuing).toBe(false);
    });

    test('revokeCertificate / success / failure update isRevoking and remove from list', () => {
        let next = reducer(
            initialState,
            actions.revokeCertificate({
                authorityUuid: 'auth-1',
                raProfileUuid: 'ra-1',
                uuid: 'cert-1',
                revokeRequest: {} as any,
            }),
        );
        expect(next.isRevoking).toBe(true);

        const stateWithCerts = {
            ...initialState,
            isRevoking: true,
            certificates: [{ uuid: 'cert-1' }, { uuid: 'cert-2' }] as any,
        };
        next = reducer(stateWithCerts, actions.revokeCertificateSuccess({ uuid: 'cert-1' }));
        expect(next.isRevoking).toBe(false);
        expect(next.certificates.length).toBe(1);
        expect(next.certificates[0].uuid).toBe('cert-2');

        next = reducer({ ...next, isRevoking: true }, actions.revokeCertificateFailure({ error: 'err' }));
        expect(next.isRevoking).toBe(false);
    });

    test('renewCertificate / success / failure update isRenewing', () => {
        let next = reducer(
            initialState,
            actions.renewCertificate({
                authorityUuid: 'auth-1',
                raProfileUuid: 'ra-1',
                uuid: 'cert-1',
                renewRequest: {} as any,
            }),
        );
        expect(next.isRenewing).toBe(true);

        next = reducer(next, actions.renewCertificateSuccess({ uuid: 'cert-1' }));
        expect(next.isRenewing).toBe(false);

        next = reducer({ ...next, isRenewing: true }, actions.renewCertificateFailure({ error: 'err' }));
        expect(next.isRenewing).toBe(false);
    });

    test('rekeyCertificate / success / failure update isRekeying', () => {
        let next = reducer(
            initialState,
            actions.rekeyCertificate({
                authorityUuid: 'auth-1',
                raProfileUuid: 'ra-1',
                uuid: 'cert-1',
                rekey: {} as any,
            }),
        );
        expect(next.isRekeying).toBe(true);

        next = reducer(next, actions.rekeyCertificateSuccess({ uuid: 'cert-1' }));
        expect(next.isRekeying).toBe(false);

        next = reducer({ ...next, isRekeying: true }, actions.rekeyCertificateFailure({ error: 'err' }));
        expect(next.isRekeying).toBe(false);
    });

    test('getCertificateHistory / success / failure update history flags and data', () => {
        const stateWithHistory = { ...initialState, certificateHistory: [{ uuid: 'h-1' }] as any };
        let next = reducer(stateWithHistory, actions.getCertificateHistory({ uuid: 'cert-1' }));
        expect(next.isFetchingHistory).toBe(true);
        expect(next.certificateHistory).toEqual([]);

        const history = [{ uuid: 'h-2' }] as any;
        next = reducer(next, actions.getCertificateHistorySuccess({ certificateHistory: history }));
        expect(next.isFetchingHistory).toBe(false);
        expect(next.certificateHistory).toEqual(history);

        next = reducer({ ...next, isFetchingHistory: true }, actions.getCertificateHistoryFailure({ error: 'err' }));
        expect(next.isFetchingHistory).toBe(false);
    });

    test('listCertificateLocations / success / failure update location flags and data', () => {
        let next = reducer(initialState, actions.listCertificateLocations({ uuid: 'cert-1' }));
        expect(next.isFetchingLocations).toBe(true);
        expect(next.certificateLocations).toEqual([]);

        const locations = [{ uuid: 'loc-1' }] as any;
        next = reducer(next, actions.listCertificateLocationsSuccess({ certificateLocations: locations }));
        expect(next.isFetchingLocations).toBe(false);
        expect(next.certificateLocations).toEqual(locations);

        next = reducer({ ...next, isFetchingLocations: true }, actions.listCertificateLocationsFailure({ error: 'err' }));
        expect(next.isFetchingLocations).toBe(false);
    });

    test('deleteCertificate / success / failure update delete flags and remove from list', () => {
        let next = reducer(initialState, actions.deleteCertificate({ uuid: 'cert-1' }));
        expect(next.isDeleting).toBe(true);
        expect(next.deleteErrorMessage).toBe('');

        const stateWithCerts = {
            ...initialState,
            isDeleting: true,
            certificates: [{ uuid: 'cert-1' }, { uuid: 'cert-2' }] as any,
            certificateDetail: { uuid: 'cert-1' } as any,
        };
        next = reducer(stateWithCerts, actions.deleteCertificateSuccess({ uuid: 'cert-1' }));
        expect(next.isDeleting).toBe(false);
        expect(next.certificates.length).toBe(1);
        expect(next.certificates[0].uuid).toBe('cert-2');
        expect(next.certificateDetail).toBeUndefined();

        next = reducer({ ...next, isDeleting: true }, actions.deleteCertificateFailure({ error: 'delete failed' }));
        expect(next.isDeleting).toBe(false);
        expect(next.deleteErrorMessage).toBe('delete failed');
    });

    test('deleteCertificateFailure with undefined error uses Unknown error', () => {
        const next = reducer({ ...initialState, isDeleting: true }, actions.deleteCertificateFailure({ error: undefined }));
        expect(next.deleteErrorMessage).toBe('Unknown error');
    });

    test('updateGroup / success / failure update isUpdatingGroup', () => {
        let next = reducer(initialState, actions.updateGroup({ uuid: 'cert-1', updateGroupRequest: {} as any }));
        expect(next.isUpdatingGroup).toBe(true);

        next = reducer(next, actions.updateGroupSuccess({ uuid: 'cert-1' }));
        expect(next.isUpdatingGroup).toBe(false);

        next = reducer({ ...next, isUpdatingGroup: true }, actions.updateGroupFailure({ error: 'err' }));
        expect(next.isUpdatingGroup).toBe(false);
    });

    test('deleteGroups / success / failure update isUpdatingGroup', () => {
        let next = reducer(initialState, actions.deleteGroups({ uuid: 'cert-1' }));
        expect(next.isUpdatingGroup).toBe(true);

        next = reducer(next, actions.deleteGroupsSuccess({ uuid: 'cert-1' }));
        expect(next.isUpdatingGroup).toBe(false);

        next = reducer({ ...next, isUpdatingGroup: true }, actions.deleteGroupsFailure({ error: 'err' }));
        expect(next.isUpdatingGroup).toBe(false);
    });

    test('updateCertificateTrustedStatus / success / failure update trusted status', () => {
        let next = reducer(
            initialState,
            actions.updateCertificateTrustedStatus({ uuid: 'cert-1', updateCertificateTrustedStatusRequest: {} as any }),
        );
        expect(next.isUpdatingTrustedStatus).toBe(true);

        const stateWithCerts = {
            ...initialState,
            isUpdatingTrustedStatus: true,
            certificates: [{ uuid: 'cert-1', trustedCa: false }] as any,
            certificateDetail: { uuid: 'cert-1', trustedCa: false } as any,
        };
        next = reducer(stateWithCerts, actions.updateCertificateTrustedStatusSuccess({ uuid: 'cert-1', trustedCa: true }));
        expect(next.isUpdatingTrustedStatus).toBe(false);
        expect(next.certificates[0].trustedCa).toBe(true);
        expect(next.certificateDetail?.trustedCa).toBe(true);

        next = reducer({ ...next, isUpdatingTrustedStatus: true }, actions.updateCertificateTrustedStatusFailure({ error: 'err' }));
        expect(next.isUpdatingTrustedStatus).toBe(false);
    });

    test('updateRaProfile / success / failure update raProfile in certificates and detail', () => {
        let next = reducer(
            initialState,
            actions.updateRaProfile({ uuid: 'cert-1', authorityUuid: 'auth-1', updateRaProfileRequest: {} as any }),
        );
        expect(next.isUpdatingRaProfile).toBe(true);

        const raProfile = { uuid: 'ra-1', name: 'RA Profile' } as any;
        const stateWithCerts = {
            ...initialState,
            isUpdatingRaProfile: true,
            certificates: [{ uuid: 'cert-1', raProfile: undefined }] as any,
            certificateDetail: { uuid: 'cert-1', raProfile: undefined } as any,
        };
        next = reducer(stateWithCerts, actions.updateRaProfileSuccess({ uuid: 'cert-1', raProfileUuid: 'ra-1', raProfile }));
        expect(next.isUpdatingRaProfile).toBe(false);
        expect(next.certificates[0].raProfile).toEqual(raProfile);
        expect(next.certificateDetail?.raProfile).toEqual(raProfile);

        next = reducer({ ...next, isUpdatingRaProfile: true }, actions.updateRaProfileFailure({ error: 'err' }));
        expect(next.isUpdatingRaProfile).toBe(false);
    });

    test('deleteRaProfile / success / failure remove raProfile from certificates and detail', () => {
        let next = reducer(initialState, actions.deleteRaProfile({ uuid: 'cert-1' }));
        expect(next.isUpdatingRaProfile).toBe(true);

        const stateWithCerts = {
            ...initialState,
            isUpdatingRaProfile: true,
            certificates: [{ uuid: 'cert-1', raProfile: { uuid: 'ra-1' } }] as any,
            certificateDetail: { uuid: 'cert-1', raProfile: { uuid: 'ra-1' } } as any,
        };
        next = reducer(stateWithCerts, actions.deleteRaProfileSuccess({ uuid: 'cert-1' }));
        expect(next.isUpdatingRaProfile).toBe(false);
        expect(next.certificates[0].raProfile).toBeUndefined();
        expect(next.certificateDetail?.raProfile).toBeUndefined();

        next = reducer({ ...next, isUpdatingRaProfile: true }, actions.deleteRaProfileFailure({ error: 'err' }));
        expect(next.isUpdatingRaProfile).toBe(false);
    });

    test('updateOwner / success / failure update owner in certificates and detail', () => {
        let next = reducer(
            initialState,
            actions.updateOwner({ uuid: 'cert-1', user: { uuid: 'u-1', username: 'alice' } as any, updateOwnerRequest: {} as any }),
        );
        expect(next.isUpdatingOwner).toBe(true);

        const stateWithCerts = {
            ...initialState,
            isUpdatingOwner: true,
            certificates: [{ uuid: 'cert-1', owner: undefined, ownerUuid: undefined }] as any,
            certificateDetail: { uuid: 'cert-1', owner: undefined, ownerUuid: undefined } as any,
        };
        next = reducer(stateWithCerts, actions.updateOwnerSuccess({ uuid: 'cert-1', user: { uuid: 'u-1', username: 'alice' } as any }));
        expect(next.isUpdatingOwner).toBe(false);
        expect(next.certificates[0].owner).toBe('alice');
        expect(next.certificateDetail?.owner).toBe('alice');
        expect(next.certificateDetail?.ownerUuid).toBe('u-1');

        next = reducer({ ...next, isUpdatingOwner: true }, actions.updateOwnerFailure({ error: 'err' }));
        expect(next.isUpdatingOwner).toBe(false);
    });

    test('deleteOwner / success / failure clear owner from certificates and detail', () => {
        let next = reducer(initialState, actions.deleteOwner({ uuid: 'cert-1' }));
        expect(next.isUpdatingOwner).toBe(true);

        const stateWithCerts = {
            ...initialState,
            isUpdatingOwner: true,
            certificates: [{ uuid: 'cert-1', owner: 'alice', ownerUuid: 'u-1' }] as any,
            certificateDetail: { uuid: 'cert-1', owner: 'alice', ownerUuid: 'u-1' } as any,
        };
        next = reducer(stateWithCerts, actions.deleteOwnerSuccess({ uuid: 'cert-1' }));
        expect(next.isUpdatingOwner).toBe(false);
        expect(next.certificates[0].owner).toBeUndefined();
        expect(next.certificates[0].ownerUuid).toBeUndefined();
        expect(next.certificateDetail?.owner).toBeUndefined();
        expect(next.certificateDetail?.ownerUuid).toBeUndefined();

        next = reducer({ ...next, isUpdatingOwner: true }, actions.deleteOwnerFailure({ error: 'err' }));
        expect(next.isUpdatingOwner).toBe(false);
    });

    test('bulkUpdateGroup / success / failure update isBulkUpdatingGroup', () => {
        let next = reducer(initialState, actions.bulkUpdateGroup({} as any));
        expect(next.isBulkUpdatingGroup).toBe(true);

        next = reducer(next, actions.bulkUpdateGroupSuccess({ uuids: ['cert-1'] }));
        expect(next.isBulkUpdatingGroup).toBe(false);

        next = reducer({ ...next, isBulkUpdatingGroup: true }, actions.bulkUpdateGroupFailure({ error: 'err' }));
        expect(next.isBulkUpdatingGroup).toBe(false);
    });

    test('bulkDeleteGroup / success update isBulkUpdatingGroup', () => {
        let next = reducer(initialState, actions.bulkDeleteGroup({ certificateUuids: ['cert-1'] }));
        expect(next.isBulkUpdatingGroup).toBe(true);

        next = reducer(next, actions.bulkDeleteGroupSuccess({ uuids: ['cert-1'] }));
        expect(next.isBulkUpdatingGroup).toBe(false);
    });

    test('bulkUpdateRaProfile / success / failure update raProfile in list and detail', () => {
        let next = reducer(initialState, actions.bulkUpdateRaProfile({ authorityUuid: 'auth-1', raProfileRequest: {} as any }));
        expect(next.isBulkUpdatingRaProfile).toBe(true);

        const raProfile = { uuid: 'ra-1', name: 'RA' } as any;
        const stateWithCerts = {
            ...initialState,
            isBulkUpdatingRaProfile: true,
            certificates: [
                { uuid: 'cert-1', raProfile: undefined },
                { uuid: 'cert-2', raProfile: undefined },
            ] as any,
            certificateDetail: { uuid: 'cert-1', raProfile: undefined } as any,
        };
        next = reducer(stateWithCerts, actions.bulkUpdateRaProfileSuccess({ uuids: ['cert-1', 'cert-2'], raProfile }));
        expect(next.isBulkUpdatingRaProfile).toBe(false);
        expect(next.certificates[0].raProfile).toEqual(raProfile);
        expect(next.certificates[1].raProfile).toEqual(raProfile);
        expect(next.certificateDetail?.raProfile).toEqual(raProfile);

        next = reducer({ ...next, isBulkUpdatingRaProfile: true }, actions.bulkUpdateRaProfileFailure({ error: 'err' }));
        expect(next.isBulkUpdatingRaProfile).toBe(false);
    });

    test('bulkDeleteRaProfile / success / failure remove raProfile from list and detail', () => {
        let next = reducer(initialState, actions.bulkDeleteRaProfile({ certificateUuids: ['cert-1'] }));
        expect(next.isBulkUpdatingRaProfile).toBe(true);

        const stateWithCerts = {
            ...initialState,
            isBulkUpdatingRaProfile: true,
            certificates: [{ uuid: 'cert-1', raProfile: { uuid: 'ra-1' } }] as any,
            certificateDetail: { uuid: 'cert-1', raProfile: { uuid: 'ra-1' } } as any,
        };
        next = reducer(stateWithCerts, actions.bulkDeleteRaProfileSuccess({ uuids: ['cert-1'] }));
        expect(next.isBulkUpdatingRaProfile).toBe(false);
        expect(next.certificates[0].raProfile).toBeUndefined();
        expect(next.certificateDetail?.raProfile).toBeUndefined();

        next = reducer({ ...next, isBulkUpdatingRaProfile: true }, actions.bulkDeleteRaProfileFailure({ error: 'err' }));
        expect(next.isBulkUpdatingRaProfile).toBe(false);
    });

    test('bulkUpdateOwner / success / failure update owner in list and detail', () => {
        let next = reducer(initialState, actions.bulkUpdateOwner({ user: { uuid: 'u-1', username: 'alice' } as any, request: {} as any }));
        expect(next.isBulkUpdatingOwner).toBe(true);

        const stateWithCerts = {
            ...initialState,
            isBulkUpdatingOwner: true,
            certificates: [{ uuid: 'cert-1', owner: undefined, ownerUuid: undefined }] as any,
            certificateDetail: { uuid: 'cert-1', owner: undefined, ownerUuid: undefined } as any,
        };
        next = reducer(
            stateWithCerts,
            actions.bulkUpdateOwnerSuccess({ uuids: ['cert-1'], user: { uuid: 'u-1', username: 'alice' } as any }),
        );
        expect(next.isBulkUpdatingOwner).toBe(false);
        expect(next.certificates[0].owner).toBe('alice');
        expect(next.certificates[0].ownerUuid).toBe('u-1');
        expect(next.certificateDetail?.owner).toBe('alice');
        expect(next.certificateDetail?.ownerUuid).toBe('u-1');

        next = reducer({ ...next, isBulkUpdatingOwner: true }, actions.bulkUpdateOwnerFailure({ error: 'err' }));
        expect(next.isBulkUpdatingOwner).toBe(false);
    });

    test('bulkDeleteOwner / success / failure clear owner from list and detail', () => {
        let next = reducer(initialState, actions.bulkDeleteOwner({ certificateUuids: ['cert-1'] }));
        expect(next.isBulkUpdatingOwner).toBe(true);

        const stateWithCerts = {
            ...initialState,
            isBulkUpdatingOwner: true,
            certificates: [{ uuid: 'cert-1', owner: 'alice', ownerUuid: 'u-1' }] as any,
            certificateDetail: { uuid: 'cert-1', owner: 'alice', ownerUuid: 'u-1' } as any,
        };
        next = reducer(stateWithCerts, actions.bulkDeleteOwnerSuccess({ uuids: ['cert-1'] }));
        expect(next.isBulkUpdatingOwner).toBe(false);
        expect(next.certificates[0].owner).toBeUndefined();
        expect(next.certificates[0].ownerUuid).toBeUndefined();
        expect(next.certificateDetail?.owner).toBeUndefined();
        expect(next.certificateDetail?.ownerUuid).toBeUndefined();

        next = reducer({ ...next, isBulkUpdatingOwner: true }, actions.bulkDeleteOwnerFailure({ error: 'err' }));
        expect(next.isBulkUpdatingOwner).toBe(false);
    });

    test('bulkDelete / success / failure update isBulkDeleting', () => {
        let next = reducer(initialState, actions.bulkDelete({} as any));
        expect(next.isBulkDeleting).toBe(true);
        expect(next.deleteErrorMessage).toBe('');

        next = reducer(next, actions.bulkDeleteSuccess({ response: {} as any }));
        expect(next.isBulkDeleting).toBe(false);

        next = reducer({ ...next, isBulkDeleting: true }, actions.bulkDeleteFailure({ error: 'bulk delete failed' }));
        expect(next.isBulkDeleting).toBe(false);
        expect(next.deleteErrorMessage).toBe('bulk delete failed');
    });

    test('bulkDeleteFailure with undefined error uses Unknown error', () => {
        const next = reducer({ ...initialState, isBulkDeleting: true }, actions.bulkDeleteFailure({ error: undefined }));
        expect(next.deleteErrorMessage).toBe('Unknown error');
    });

    test('uploadCertificate / success / failure update isUploading and push to list', () => {
        let next = reducer(initialState, actions.uploadCertificate({} as any));
        expect(next.isUploading).toBe(true);

        const cert = { uuid: 'cert-new', commonName: 'New Cert' } as any;
        next = reducer(next, actions.uploadCertificateSuccess({ uuid: 'cert-new', certificate: cert }));
        expect(next.isUploading).toBe(false);
        expect(next.certificates).toContainEqual(cert);

        next = reducer({ ...next, isUploading: true }, actions.uploadCertificateFailure({ error: 'err' }));
        expect(next.isUploading).toBe(false);
    });

    test('getIssuanceAttributes / success / failure update issuanceAttributes', () => {
        let next = reducer(initialState, actions.getIssuanceAttributes({ raProfileUuid: 'ra-1', authorityUuid: 'auth-1' }));
        expect(next.isFetchingIssuanceAttributes).toBe(true);

        const attrs = [{ uuid: 'attr-1' }] as any;
        next = reducer(next, actions.getIssuanceAttributesSuccess({ raProfileUuid: 'ra-1', issuanceAttributes: attrs }));
        expect(next.isFetchingIssuanceAttributes).toBe(false);
        expect(next.issuanceAttributes['ra-1']).toEqual(attrs);

        next = reducer({ ...next, isFetchingIssuanceAttributes: true }, actions.getIssuanceAttributesFailure({ error: 'err' }));
        expect(next.isFetchingIssuanceAttributes).toBe(false);
    });

    test('getRevocationAttributes / success / failure update revocationAttributes', () => {
        let next = reducer(initialState, actions.getRevocationAttributes({ raProfileUuid: 'ra-1', authorityUuid: 'auth-1' }));
        expect(next.isFetchingRevocationAttributes).toBe(true);

        const attrs = [{ uuid: 'attr-2' }] as any;
        next = reducer(next, actions.getRevocationAttributesSuccess({ raProfileUuid: 'ra-1', revocationAttributes: attrs }));
        expect(next.isFetchingRevocationAttributes).toBe(false);
        expect(next.revocationAttributes).toEqual(attrs);

        next = reducer({ ...next, isFetchingRevocationAttributes: true }, actions.getRevocationAttributesFailure({ error: 'err' }));
        expect(next.isFetchingRevocationAttributes).toBe(false);
    });

    test('checkCompliance / success / failure update isCheckingCompliance', () => {
        let next = reducer(initialState, actions.checkCompliance({} as any));
        expect(next.isCheckingCompliance).toBe(true);

        next = reducer(next, actions.checkComplianceSuccess());
        expect(next.isCheckingCompliance).toBe(false);

        next = reducer({ ...next, isCheckingCompliance: true }, actions.checkComplianceFailed({ error: 'err' }));
        expect(next.isCheckingCompliance).toBe(false);
    });

    test('getCsrAttributes / success / failure update csrAttributeDescriptors', () => {
        let next = reducer(initialState, actions.getCsrAttributes());
        expect(next.isFetchingCsrAttributes).toBe(true);

        const attrs = [{ uuid: 'csr-attr-1' }] as any;
        next = reducer(next, actions.getCsrAttributesSuccess({ csrAttributes: attrs }));
        expect(next.isFetchingCsrAttributes).toBe(false);
        expect(next.csrAttributeDescriptors).toEqual(attrs);

        next = reducer({ ...next, isFetchingCsrAttributes: true }, actions.getCsrAttributesFailure({ error: 'err' }));
        expect(next.isFetchingCsrAttributes).toBe(false);
    });

    test('getCertificateContents / success / failure update isFetchingContents', () => {
        let next = reducer(initialState, actions.getCertificateContents({ uuids: ['cert-1'], format: 'pem' }));
        expect(next.isFetchingContents).toBe(true);

        next = reducer(next, actions.getCertificateContentsSuccess({ uuids: ['cert-1'], format: 'pem', contents: [] as any }));
        expect(next.isFetchingContents).toBe(false);

        next = reducer({ ...next, isFetchingContents: true }, actions.getCertificateContentsFailure({ error: 'err' }));
        expect(next.isFetchingContents).toBe(false);
    });

    test('listCertificateApprovals / success / failure update approvals', () => {
        let next = reducer(initialState, actions.listCertificateApprovals({} as any));
        expect(next.isFetchingApprovals).toBe(true);

        const approvals = [{ uuid: 'appr-1' }] as any;
        next = reducer(next, actions.listCertificateApprovalsSuccess({ approvals }));
        expect(next.isFetchingApprovals).toBe(false);
        expect(next.approvals).toEqual(approvals);

        next = reducer({ ...next, isFetchingApprovals: true }, actions.listCertificateApprovalsFailure({ error: 'err' }));
        expect(next.isFetchingApprovals).toBe(false);
    });

    test('getCertificateChain / success / failure update certificateChain', () => {
        let next = reducer(initialState, actions.getCertificateChain({ uuid: 'cert-1', withEndCertificate: true }));
        expect(next.isFetchingCertificateChain).toBe(true);

        const chain = { certificates: [{ uuid: 'cert-1' }] } as any;
        next = reducer(next, actions.getCertificateChainSuccess({ certificateChain: chain }));
        expect(next.isFetchingCertificateChain).toBe(false);
        expect(next.certificateChain).toEqual(chain);

        next = reducer({ ...next, isFetchingCertificateChain: true }, actions.getCertificateChainFailure({ error: 'err' }));
        expect(next.isFetchingCertificateChain).toBe(false);
    });

    test('downloadCertificateChain / success / failure update certificateChainDownloadContent', () => {
        let next = reducer(initialState, actions.downloadCertificateChain({} as any));
        expect(next.isFetchingCertificateChainDownloadContent).toBe(true);
        expect(next.certificateChainDownloadContent).toBeUndefined();

        const content = { content: 'chain-data' } as any;
        next = reducer(next, actions.downloadCertificateChainSuccess({ certificateChainDownloadContent: content }));
        expect(next.isFetchingCertificateChainDownloadContent).toBe(false);
        expect(next.certificateChainDownloadContent).toEqual(content);

        next = reducer(
            { ...next, isFetchingCertificateChainDownloadContent: true },
            actions.downloadCertificateChainFailure({ error: 'err' }),
        );
        expect(next.isFetchingCertificateChainDownloadContent).toBe(false);
    });

    test('downloadCertificate / success / failure update certificateDownloadContent', () => {
        let next = reducer(initialState, actions.downloadCertificate({} as any));
        expect(next.isFetchingCertificateDownloadContent).toBe(true);
        expect(next.certificateDownloadContent).toBeUndefined();

        const content = { content: 'cert-data' } as any;
        next = reducer(next, actions.downloadCertificateSuccess({ certificateDownloadContent: content }));
        expect(next.isFetchingCertificateDownloadContent).toBe(false);
        expect(next.certificateDownloadContent).toEqual(content);

        next = reducer({ ...next, isFetchingCertificateDownloadContent: true }, actions.downloadCertificateFailure({ error: 'err' }));
        expect(next.isFetchingCertificateDownloadContent).toBe(false);
        expect(next.certificateDownloadContent).toBeUndefined();
    });

    test('archiveCertificate / success / failure update archive flags and archived field', () => {
        let next = reducer(initialState, actions.archiveCertificate({ uuid: 'cert-1' }));
        expect(next.isArchiving).toBe(true);

        const stateWithCerts = {
            ...initialState,
            isArchiving: true,
            certificates: [{ uuid: 'cert-1', archived: false }] as any,
            certificateDetail: { uuid: 'cert-1', archived: false } as any,
        };
        next = reducer(stateWithCerts, actions.archiveCertificateSuccess({ uuid: 'cert-1' }));
        expect(next.isArchiving).toBe(false);
        expect(next.certificates[0].archived).toBe(true);
        expect(next.certificateDetail?.archived).toBe(true);

        next = reducer({ ...next, isArchiving: true }, actions.archiveCertificateFailure({ error: 'err' }));
        expect(next.isArchiving).toBe(false);
    });

    test('unarchiveCertificate / success / failure update archive flags and archived field', () => {
        let next = reducer(initialState, actions.unarchiveCertificate({ uuid: 'cert-1' }));
        expect(next.isArchiving).toBe(true);

        const stateWithCerts = {
            ...initialState,
            isArchiving: true,
            certificates: [{ uuid: 'cert-1', archived: true }] as any,
            certificateDetail: { uuid: 'cert-1', archived: true } as any,
        };
        next = reducer(stateWithCerts, actions.unarchiveCertificateSuccess({ uuid: 'cert-1' }));
        expect(next.isArchiving).toBe(false);
        expect(next.certificates[0].archived).toBe(false);
        expect(next.certificateDetail?.archived).toBe(false);

        next = reducer({ ...next, isArchiving: true }, actions.unarchiveCertificateFailure({ error: 'err' }));
        expect(next.isArchiving).toBe(false);
    });

    test('bulkArchiveCertificate / success / failure update isBulkArchiving', () => {
        let next = reducer(initialState, actions.bulkArchiveCertificate({ uuids: ['cert-1'], filters: undefined }));
        expect(next.isBulkArchiving).toBe(true);

        next = reducer(next, actions.bulkArchiveCertificateSuccess({ uuids: ['cert-1'] }));
        expect(next.isBulkArchiving).toBe(false);

        next = reducer({ ...next, isBulkArchiving: true }, actions.bulkArchiveCertificateFailure({ error: 'err' }));
        expect(next.isBulkArchiving).toBe(false);
    });

    test('bulkUnarchiveCertificate / success / failure update isBulkUnarchiving', () => {
        let next = reducer(initialState, actions.bulkUnarchiveCertificate({ uuids: ['cert-1'], filters: undefined }));
        expect(next.isBulkUnarchiving).toBe(true);

        next = reducer(next, actions.bulkUnarchiveCertificateSuccess({ uuids: ['cert-1'] }));
        expect(next.isBulkUnarchiving).toBe(false);

        next = reducer({ ...next, isBulkUnarchiving: true }, actions.bulkUnarchiveCertificateFailure({ error: 'err' }));
        expect(next.isBulkUnarchiving).toBe(false);
    });
});

describe('certificates selectors', () => {
    const featureState = {
        ...initialState,
        deleteErrorMessage: 'del error',
        certificates: [{ uuid: 'cert-1' }] as any,
        certificateDetail: { uuid: 'cert-1' } as any,
        certificateRelations: { uuid: 'cert-1' } as any,
        certificateHistory: [{ uuid: 'h-1' }] as any,
        certificateLocations: [{ uuid: 'loc-1' }] as any,
        certificateChain: { certificates: [] } as any,
        certificateChainDownloadContent: { content: 'chain' } as any,
        certificateDownloadContent: { content: 'cert' } as any,
        issuanceAttributes: { 'ra-1': [{ uuid: 'attr-1' }] } as any,
        revocationAttributes: [{ uuid: 'attr-2' }] as any,
        approvals: [{ uuid: 'appr-1' }] as any,
        validationResult: { status: 'valid' } as any,
        csrAttributeDescriptors: [{ uuid: 'csr-1' }] as any,
        isFetchingDetail: true,
        isFetchingRelations: true,
        isAssociating: true,
        isDeassociating: true,
        isFetchingHistory: true,
        isFetchingLocations: true,
        isFetchingApprovals: true,
        isFetchingCertificateChain: true,
        isFetchingCertificateDownloadContent: true,
        isFetchingCertificateChainDownloadContent: true,
        isFetchingValidationResult: true,
        isIssuing: true,
        isRevoking: true,
        isRenewing: true,
        isRekeying: true,
        isDeleting: true,
        isBulkDeleting: true,
        isUpdatingGroup: true,
        isUpdatingRaProfile: true,
        isUpdatingOwner: true,
        isUpdatingTrustedStatus: true,
        isBulkUpdatingGroup: true,
        isBulkUpdatingRaProfile: true,
        isBulkUpdatingOwner: true,
        isUploading: true,
        isFetchingIssuanceAttributes: true,
        isFetchingRevocationAttributes: true,
        isFetchingCsrAttributes: true,
        isFetchingContents: true,
        isIncludeArchived: true,
        isArchiving: true,
        isBulkArchiving: true,
        isBulkUnarchiving: true,
    };
    const state = { certificates: featureState } as any;

    test('selectors return correct values from state', () => {
        expect(selectors.deleteErrorMessage(state)).toBe('del error');
        expect(selectors.certificates(state)).toEqual([{ uuid: 'cert-1' }]);
        expect(selectors.certificateDetail(state)).toEqual({ uuid: 'cert-1' });
        expect(selectors.certificateRelations(state)).toEqual({ uuid: 'cert-1' });
        expect(selectors.certificateHistory(state)).toEqual([{ uuid: 'h-1' }]);
        expect(selectors.certificateLocations(state)).toEqual([{ uuid: 'loc-1' }]);
        expect(selectors.certificateChain(state)).toEqual({ certificates: [] });
        expect(selectors.certificateChainDownloadContent(state)).toEqual({ content: 'chain' });
        expect(selectors.certificateDownloadContent(state)).toEqual({ content: 'cert' });
        expect(selectors.issuanceAttributes(state)).toEqual({ 'ra-1': [{ uuid: 'attr-1' }] });
        expect(selectors.revocationAttributes(state)).toEqual([{ uuid: 'attr-2' }]);
        expect(selectors.approvals(state)).toEqual([{ uuid: 'appr-1' }]);
        expect(selectors.validationResult(state)).toEqual({ status: 'valid' });
        expect(selectors.csrAttributeDescriptors(state)).toEqual([{ uuid: 'csr-1' }]);
    });

    test('boolean selectors return correct flags from state', () => {
        expect(selectors.isFetchingDetail(state)).toBe(true);
        expect(selectors.isFetchingRelations(state)).toBe(true);
        expect(selectors.isAssociating(state)).toBe(true);
        expect(selectors.isDeassociating(state)).toBe(true);
        expect(selectors.isFetchingHistory(state)).toBe(true);
        expect(selectors.isFetchingLocations(state)).toBe(true);
        expect(selectors.isFetchingApprovals(state)).toBe(true);
        expect(selectors.isFetchingCertificateChain(state)).toBe(true);
        expect(selectors.isFetchingCertificateDownloadContent(state)).toBe(true);
        expect(selectors.isFetchingCertificateChainDownloadContent(state)).toBe(true);
        expect(selectors.isFetchingValidationResult(state)).toBe(true);
        expect(selectors.isIssuing(state)).toBe(true);
        expect(selectors.isRevoking(state)).toBe(true);
        expect(selectors.isRenewing(state)).toBe(true);
        expect(selectors.isRekeying(state)).toBe(true);
        expect(selectors.isDeleting(state)).toBe(true);
        expect(selectors.isBulkDeleting(state)).toBe(true);
        expect(selectors.isUpdatingGroup(state)).toBe(true);
        expect(selectors.isUpdatingRaProfile(state)).toBe(true);
        expect(selectors.isUpdatingOwner(state)).toBe(true);
        expect(selectors.isUpdatingTrustedStatus(state)).toBe(true);
        expect(selectors.isBulkUpdatingGroup(state)).toBe(true);
        expect(selectors.isBulkUpdatingRaProfile(state)).toBe(true);
        expect(selectors.isBulkUpdatingOwner(state)).toBe(true);
        expect(selectors.isUploading(state)).toBe(true);
        expect(selectors.isFetchingIssuanceAttributes(state)).toBe(true);
        expect(selectors.isFetchingRevocationAttributes(state)).toBe(true);
        expect(selectors.isFetchingCsrAttributes(state)).toBe(true);
        expect(selectors.isFetchingContents(state)).toBe(true);
        expect(selectors.isIncludeArchived(state)).toBe(true);
        expect(selectors.isArchiving(state)).toBe(true);
    });
});
