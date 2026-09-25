import { describe, expect, test, vi } from 'vitest';
import { firstValueFrom, of, throwError } from 'rxjs';
import { take, toArray } from 'rxjs/operators';

vi.mock('utils/download', () => ({ downloadFile: vi.fn() }));

import reducer, { actions, initialState, selectors } from './cryptographic-operations';
import epics from './cryptographic-operations-epics';

const key = { tokenInstanceUuid: 'token', tokenProfileUuid: 'profile', uuid: 'key', keyItemUuid: 'item' };

async function listSignatureAttributes(operation: 'sign' | 'verify', store?: 'alt' | 'normal') {
    const listSignAttributes = vi.fn(() => of([{ uuid: 'sign-attribute' }]));
    const listVerifyAttributes = vi.fn(() => of([{ uuid: 'verify-attribute' }]));
    const legacyListing = vi.fn(() => throwError(() => new Error('Legacy attribute listing is unavailable for v2 keys')));
    const client = { listSignAttributes, listVerifyAttributes, listSignatureAttributes: legacyListing };
    const action = actions.listSignatureAttributeDescriptors({ ...key, operation, store });
    const epic = epics.find((candidate) => candidate.name === 'getSignatureAttributesDescriptors');
    if (!epic) throw new Error('Signature attribute epic is missing');
    const output$ = epic(of(action), of({}) as any, { apiClients: { cryptographicOperations: client } } as any);
    const emitted = await firstValueFrom(output$.pipe(take(1), toArray()));
    return { emitted, listSignAttributes, listVerifyAttributes, legacyListing };
}

describe('cryptographicOperations attribute epics', () => {
    test('signing loads the sign schema for the normal store', async () => {
        const { emitted, listSignAttributes, listVerifyAttributes, legacyListing } = await listSignatureAttributes('sign');

        expect(listSignAttributes).toHaveBeenCalledWith(key);
        expect(listVerifyAttributes).not.toHaveBeenCalled();
        expect(legacyListing).not.toHaveBeenCalled();
        expect(emitted).toEqual([
            actions.listSignatureAttributeDescriptorsSuccess({
                uuid: key.uuid,
                attributeDescriptors: [{ uuid: 'sign-attribute', content: undefined } as any],
                store: undefined,
            }),
        ]);
    });

    test('verification loads the verify schema', async () => {
        const { emitted, listSignAttributes, listVerifyAttributes, legacyListing } = await listSignatureAttributes('verify');

        expect(listVerifyAttributes).toHaveBeenCalledWith(key);
        expect(listSignAttributes).not.toHaveBeenCalled();
        expect(legacyListing).not.toHaveBeenCalled();
        expect(emitted).toEqual([
            actions.listSignatureAttributeDescriptorsSuccess({
                uuid: key.uuid,
                attributeDescriptors: [{ uuid: 'verify-attribute', content: undefined } as any],
                store: undefined,
            }),
        ]);
    });

    test('alternative signing retains the alternative store', async () => {
        const { emitted } = await listSignatureAttributes('sign', 'alt');
        expect(emitted[0]).toMatchObject({ payload: { store: 'alt' } });
    });
});

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
                operation: 'sign',
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
            randomDataAttributeDescriptors: [{ uuid: 'ra' }],
            isSigning: true,
            isVerifying: true,
            isGeneratingRandomData: true,
            isEncrypting: true,
            isDecrypting: true,
            isFetchingSignatureAttributes: true,
            isFetchingRandomDataAttributes: true,
        };
        const state = { cryptographicOperations: featureState } as any;

        expect(selectors.signatureAttributeDescriptors(state)).toEqual([{ uuid: 'sa' }]);
        expect(selectors.altSignatureAttributeDescriptors(state)).toEqual([{ uuid: 'asa' }]);
        expect(selectors.randomDataAttributeDescriptors(state)).toEqual([{ uuid: 'ra' }]);
        expect(selectors.isSigning(state)).toBe(true);
        expect(selectors.isVerifying(state)).toBe(true);
        expect(selectors.isGeneratingRandomData(state)).toBe(true);
        expect(selectors.isEncrypting(state)).toBe(true);
        expect(selectors.isDecrypting(state)).toBe(true);
        expect(selectors.isFetchingSignatureAttributes(state)).toBe(true);
        expect(selectors.isFetchingRandomDataAttributes(state)).toBe(true);
    });
});
