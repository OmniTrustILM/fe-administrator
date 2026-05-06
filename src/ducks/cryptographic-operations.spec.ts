import { describe, expect, test, vi } from 'vitest';

vi.mock('utils/download', () => ({ downloadFile: vi.fn() }));

import reducer, { actions, initialState, selectors } from './cryptographic-operations';

describe('cryptographicOperations slice', () => {
    test('returns initial state for unknown action', () => {
        expect(reducer(undefined, { type: 'unknown' })).toEqual(initialState);
    });

    test('resetState restores initialState', () => {
        const dirty = { ...initialState, isSigning: true } as any;
        expect(reducer(dirty, actions.resetState())).toEqual(initialState);
    });

    test('clearSignatureAttributeDescriptors (normal)', () => {
        const state = { ...initialState, signatureAttributeDescriptors: [{ uuid: 'a' }] } as any;
        const next = reducer(state, actions.clearSignatureAttributeDescriptors(undefined));
        expect(next.signatureAttributeDescriptors).toEqual([]);
    });

    test('clearSignatureAttributeDescriptors (alt)', () => {
        const state = { ...initialState, altSignatureAttributeDescriptors: [{ uuid: 'b' }] } as any;
        const next = reducer(state, actions.clearSignatureAttributeDescriptors('alt'));
        expect(next.altSignatureAttributeDescriptors).toEqual([]);
    });

    test('clearCipherAttributeDescriptors', () => {
        const state = { ...initialState, cipherAttributeDescriptors: [{ uuid: 'c' }] } as any;
        const next = reducer(state, actions.clearCipherAttributeDescriptors());
        expect(next.cipherAttributeDescriptors).toEqual([]);
    });

    test('clearRandomDataAttributeDescriptors', () => {
        const state = { ...initialState, randomDataAttributeDescriptors: [{ uuid: 'd' }] } as any;
        const next = reducer(state, actions.clearRandomDataAttributeDescriptors());
        expect(next.randomDataAttributeDescriptors).toEqual([]);
    });

    test('listSignatureAttributeDescriptors / success (normal) / failure', () => {
        let next = reducer(
            initialState,
            actions.listSignatureAttributeDescriptors({
                tokenInstanceUuid: 't',
                tokenProfileUuid: 'p',
                uuid: 'u',
                keyItemUuid: 'k',
                algorithm: 'RSA' as any,
            }),
        );
        expect(next.isFetchingSignatureAttributes).toBe(true);

        next = reducer(next, actions.listSignatureAttributeDescriptorsSuccess({ uuid: 'u', attributeDescriptors: [{ uuid: 'x' } as any] }));
        expect(next.isFetchingSignatureAttributes).toBe(false);
        expect(next.signatureAttributeDescriptors).toEqual([{ uuid: 'x' }]);

        next = reducer({ ...next, isFetchingSignatureAttributes: true }, actions.listSignatureAttributesFailure({ error: 'err' }));
        expect(next.isFetchingSignatureAttributes).toBe(false);
    });

    test('listSignatureAttributeDescriptorsSuccess stores in alt when store=alt', () => {
        const next = reducer(
            initialState,
            actions.listSignatureAttributeDescriptorsSuccess({ uuid: 'u', attributeDescriptors: [{ uuid: 'alt' } as any], store: 'alt' }),
        );
        expect(next.altSignatureAttributeDescriptors).toEqual([{ uuid: 'alt' }]);
        expect(next.signatureAttributeDescriptors).toEqual([]);
    });

    test('listCipherAttributeDescriptors / success / failure', () => {
        let next = reducer(
            initialState,
            actions.listCipherAttributeDescriptors({
                tokenInstanceUuid: 't',
                tokenProfileUuid: 'p',
                uuid: 'u',
                keyItemUuid: 'k',
                algorithm: 'RSA' as any,
            }),
        );
        expect(next.isFetchingCipherAttributes).toBe(true);

        next = reducer(next, actions.listCipherAttributeDescriptorsSuccess({ uuid: 'u', attributeDescriptors: [{ uuid: 'c' } as any] }));
        expect(next.isFetchingCipherAttributes).toBe(false);
        expect(next.cipherAttributeDescriptors).toEqual([{ uuid: 'c' }]);

        next = reducer({ ...next, isFetchingCipherAttributes: true }, actions.listCipherAttributesFailure({ error: 'err' }));
        expect(next.isFetchingCipherAttributes).toBe(false);
    });

    test('listRandomAttributeDescriptors / success / failure', () => {
        let next = reducer(initialState, actions.listRandomAttributeDescriptors({ tokenInstanceUuid: 't' }));
        expect(next.isFetchingRandomDataAttributes).toBe(true);

        next = reducer(next, actions.listRandomAttributeDescriptorsSuccess({ uuid: 'u', attributeDescriptors: [{ uuid: 'r' } as any] }));
        expect(next.isFetchingRandomDataAttributes).toBe(false);
        expect(next.randomDataAttributeDescriptors).toEqual([{ uuid: 'r' }]);

        next = reducer({ ...next, isFetchingRandomDataAttributes: true }, actions.listRandomAttributesFailure({ error: 'err' }));
        expect(next.isFetchingRandomDataAttributes).toBe(false);
    });

    test('signData / success / failure', () => {
        let next = reducer(
            initialState,
            actions.signData({ tokenInstanceUuid: 't', tokenProfileUuid: 'p', uuid: 'u', keyItemUuid: 'k', request: {} as any }),
        );
        expect(next.isSigning).toBe(true);

        next = reducer(next, actions.signDataSuccess({ uuid: 'u', signature: { signatures: [{ data: btoa('sig') }] } as any }));
        expect(next.isSigning).toBe(false);

        next = reducer({ ...next, isSigning: true }, actions.signDataFailure({ error: 'err' }));
        expect(next.isSigning).toBe(false);
    });

    test('verifyData / success / failure', () => {
        let next = reducer(
            initialState,
            actions.verifyData({ tokenInstanceUuid: 't', tokenProfileUuid: 'p', uuid: 'u', keyItemUuid: 'k', request: {} as any }),
        );
        expect(next.isVerifying).toBe(true);

        next = reducer(next, actions.verifyDataSuccess({ uuid: 'u', signature: { verified: true } as any }));
        expect(next.isVerifying).toBe(false);

        next = reducer({ ...next, isVerifying: true }, actions.verifyDataFailure({ error: 'err' }));
        expect(next.isVerifying).toBe(false);
    });

    test('generateRandomData / success / failure', () => {
        let next = reducer(initialState, actions.generateRandomData({ tokenInstanceUuid: 't', request: {} as any }));
        expect(next.isGeneratingRandomData).toBe(true);

        next = reducer(next, actions.generateRandomDataSuccess({ uuid: 'u', randomData: { data: btoa('bytes') } as any }));
        expect(next.isGeneratingRandomData).toBe(false);

        next = reducer({ ...next, isGeneratingRandomData: true }, actions.generateRandomDataFailure({ error: 'err' }));
        expect(next.isGeneratingRandomData).toBe(false);
    });
});

describe('cryptographicOperations selectors', () => {
    test('selectors read from state', () => {
        const featureState: any = {
            ...initialState,
            signatureAttributeDescriptors: [{ uuid: 'sa' }],
            altSignatureAttributeDescriptors: [{ uuid: 'asa' }],
            cipherAttributeDescriptors: [{ uuid: 'ca' }],
            randomDataAttributeDescriptors: [{ uuid: 'ra' }],
            isSigning: true,
            isVerifying: true,
            isGeneratingRandomData: true,
            isEncrypting: true,
            isDecrypting: true,
            isFetchingSignatureAttributes: true,
            isFetchingCipherAttributes: true,
            isFetchingRandomDataAttributes: true,
        };
        const state = { cryptographicOperations: featureState } as any;

        expect(selectors.signatureAttributeDescriptors(state)).toEqual([{ uuid: 'sa' }]);
        expect(selectors.altSignatureAttributeDescriptors(state)).toEqual([{ uuid: 'asa' }]);
        expect(selectors.cipherAttributeDescriptors(state)).toEqual([{ uuid: 'ca' }]);
        expect(selectors.randomDataAttributeDescriptors(state)).toEqual([{ uuid: 'ra' }]);
        expect(selectors.isSigning(state)).toBe(true);
        expect(selectors.isVerifying(state)).toBe(true);
        expect(selectors.isGeneratingRandomData(state)).toBe(true);
        expect(selectors.isEncrypting(state)).toBe(true);
        expect(selectors.isDecrypting(state)).toBe(true);
        expect(selectors.isFetchingSignatureAttributes(state)).toBe(true);
        expect(selectors.isFetchingCipherAttributes(state)).toBe(true);
        expect(selectors.isFetchingRandomDataAttributes(state)).toBe(true);
    });
});
