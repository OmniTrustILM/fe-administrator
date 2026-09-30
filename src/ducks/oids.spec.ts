import { describe, expect, test, vi } from 'vitest';
import { delay, of, Subject, throwError } from 'rxjs';

// Break the oid-epics → ../App → ../store → ducks/index → oid-epics cycle by
// stubbing the App module. Epic logic doesn't need the real store in unit tests.
vi.mock('../App', () => ({ store: { dispatch: () => {} } }));

// Stub the transform module (it is a .tsx file that pulls in unrelated React
// components through its transitive imports). The function under test is a
// pure passthrough, so an identity mock is faithful to the real behavior.
vi.mock('./transform/certificates', () => ({
    transformSearchRequestModelToDto: (req: unknown) => req,
}));

import reducer, { actions, initialState, selectors } from './oids';
import epics from './oid-epics';
import { actions as appRedirectActions } from './app-redirect';
import { FilterConditionOperator, FilterFieldSource, OidCategory } from 'types/openapi';

const reducerKey = () => 'oids';

describe('oids slice', () => {
    test('returns initial state for unknown action', () => {
        expect(reducer(undefined, { type: 'unknown' })).toEqual(initialState);
    });

    test('resetState restores initial values', () => {
        const dirty = {
            ...initialState,
            oid: { oid: '1.2.3' } as any,
            oids: [{ oid: '1.2.3' } as any],
            isFetching: true,
            tempKey: 'gone',
        } as any;

        const next = reducer(dirty, actions.resetState());

        expect(next).toEqual(initialState);
        expect((next as any).tempKey).toBeUndefined();
    });

    test('listOIDs / success / failure', () => {
        let next = reducer(initialState, actions.listOIDs({ filters: [] } as any));
        expect(next.isFetching).toBe(true);
        expect(next.oids).toEqual([]);

        const items = [{ oid: '1.2.3' }, { oid: '1.2.4' }] as any[];
        next = reducer(next, actions.listOIDsSuccess({ oids: items }));
        expect(next.isFetching).toBe(false);
        expect(next.oids).toEqual(items);

        next = reducer({ ...next, isFetching: true }, actions.listOIDsFailure({ error: 'err' }));
        expect(next.isFetching).toBe(false);
    });

    test('getOID / success / failure', () => {
        let next = reducer(initialState, actions.getOID({ oid: '1.2.3' }));
        expect(next.isFetching).toBe(true);

        const oid = { oid: '1.2.3', description: 'Test' } as any;
        next = reducer(next, actions.getOIDSuccess({ oid }));
        expect(next.isFetching).toBe(false);
        expect(next.oid).toEqual(oid);

        next = reducer({ ...next, isFetching: true }, actions.getOIDFailure({ error: 'err' }));
        expect(next.isFetching).toBe(false);
    });

    test('createOID / success / failure', () => {
        let next = reducer(initialState, actions.createOID({ oid: { oid: '1.2.3', description: 'New' } as any }));
        expect(next.isCreating).toBe(true);
        expect(next.createOidSucceeded).toBe(false);

        const oid = { oid: '1.2.3', description: 'New' } as any;
        next = reducer(next, actions.createOIDSuccess({ oid }));
        expect(next.isCreating).toBe(false);
        expect(next.createOidSucceeded).toBe(true);
        expect(next.oid).toEqual(oid);

        next = reducer({ ...next, isCreating: true }, actions.createOIDFailure({ error: 'err' }));
        expect(next.isCreating).toBe(false);
        expect(next.createOidSucceeded).toBe(false);
    });

    test('a refused module is stored from the failure and cleared by the next submission or on request', () => {
        const refusal = "The extension's ASN.1 module is empty";
        let next = reducer(initialState, actions.createOIDFailure({ error: 'err', valueSchemaError: refusal }));
        expect(next.valueSchemaError).toBe(refusal);
        next = reducer(next, actions.createOID({ oid: { oid: '1.2.3' } as any }));
        expect(next.valueSchemaError).toBeUndefined();

        next = reducer(next, actions.updateOIDFailure({ error: 'err', valueSchemaError: refusal }));
        expect(next.valueSchemaError).toBe(refusal);
        next = reducer(next, actions.updateOID({ oid: '1.2.3', data: {} as any }));
        expect(next.valueSchemaError).toBeUndefined();

        next = reducer(next, actions.createOIDFailure({ error: 'err', valueSchemaError: refusal }));
        next = reducer(next, actions.clearValueSchemaError());
        expect(next.valueSchemaError).toBeUndefined();
        expect(selectors.valueSchemaError({ oids: next } as any)).toBeUndefined();
    });

    test('getExtensionOidDetailSuccess keeps each custom extension detail by OID', () => {
        const detail = { oid: '1.2.3', additionalProperties: { valueEncoding: 'DER', valueSchema: 'M' } } as any;
        const next = reducer(initialState, actions.getExtensionOidDetailSuccess({ oid: detail }));
        expect(next.extensionOidDetails).toEqual({ '1.2.3': detail });
        expect(selectors.extensionOidDetails({ oids: next } as any)).toEqual({ '1.2.3': detail });
    });

    test('a failed extension detail keeps the OID requested and records the reason until it is asked for again', () => {
        let next = reducer(initialState, actions.getExtensionOidDetail({ oid: '1.2.3' }));
        expect(next.extensionOidDetailsRequested).toEqual({ '1.2.3': true });
        expect(selectors.extensionOidDetailsRequested({ oids: next } as any)).toEqual({ '1.2.3': true });

        next = reducer(next, actions.getExtensionOidDetailFailure({ oid: '1.2.3', error: 'err' }));
        expect(next.extensionOidDetailsRequested).toEqual({ '1.2.3': true });
        expect(next.extensionOidDetails).toEqual({});
        expect(selectors.extensionOidDetailsFailed({ oids: next } as any)).toEqual({ '1.2.3': 'err' });

        next = reducer(next, actions.getExtensionOidDetail({ oid: '1.2.3' }));
        expect(next.extensionOidDetailsFailed).toEqual({});
    });

    test('a reloaded custom extension list drops the cached details and the requested set', () => {
        const detail = { oid: '1.2.3', additionalProperties: { valueEncoding: 'DER', valueSchema: 'M' } } as any;
        let next = reducer(initialState, actions.getExtensionOidDetail({ oid: '1.2.3' }));
        next = reducer(next, actions.getExtensionOidDetailSuccess({ oid: detail }));
        next = reducer(next, actions.getExtensionOidDetailFailure({ oid: '4.5.6', error: 'err' }));

        next = reducer(next, actions.listOidsByCategorySuccess({ category: OidCategory.RdnAttributeType, oids: [] }));
        expect(next.extensionOidDetails).toEqual({ '1.2.3': detail });
        expect(next.extensionOidDetailsRequested).toEqual({ '1.2.3': true });
        expect(next.extensionOidDetailsFailed).toEqual({ '4.5.6': 'err' });

        next = reducer(next, actions.listOidsByCategorySuccess({ category: OidCategory.CertificateExtension, oids: [] }));
        expect(next.extensionOidDetails).toEqual({});
        expect(next.extensionOidDetailsRequested).toEqual({});
        expect(next.extensionOidDetailsFailed).toEqual({});
    });

    test('updateOID / success / failure', () => {
        let next = reducer(initialState, actions.updateOID({ oid: '1.2.3', data: { description: 'Updated' } as any }));
        expect(next.isUpdating).toBe(true);
        expect(next.updateOidSucceeded).toBe(false);

        const oid = { oid: '1.2.3', description: 'Updated' } as any;
        next = reducer(next, actions.updateOIDSuccess({ oid }));
        expect(next.isUpdating).toBe(false);
        expect(next.updateOidSucceeded).toBe(true);
        expect(next.oid).toEqual(oid);

        next = reducer({ ...next, isUpdating: true }, actions.updateOIDFailure({ error: 'err' }));
        expect(next.isUpdating).toBe(false);
        expect(next.updateOidSucceeded).toBe(false);
    });

    test('deleteOID / success removes from list / failure', () => {
        const items = [{ oid: '1.2.3' } as any, { oid: '1.2.4' } as any];

        let next = reducer({ ...initialState, oids: items }, actions.deleteOID({ oid: '1.2.3' }));
        expect(next.isDeleting).toBe(true);

        next = reducer(next, actions.deleteOIDSuccess({ oid: '1.2.3' }));
        expect(next.isDeleting).toBe(false);
        expect(next.oids).toEqual([{ oid: '1.2.4' }]);

        next = reducer({ ...next, isDeleting: true }, actions.deleteOIDFailure({ error: 'err' }));
        expect(next.isDeleting).toBe(false);
    });

    test('bulkDeleteOIDs / success removes multiple / failure', () => {
        const items = [{ oid: '1.2.3' } as any, { oid: '1.2.4' } as any, { oid: '1.2.5' } as any];

        let next = reducer({ ...initialState, oids: items }, actions.bulkDeleteOIDs({ oids: ['1.2.3', '1.2.4'] }));
        expect(next.isDeleting).toBe(true);

        next = reducer(next, actions.bulkDeleteOIDsSuccess({ oids: ['1.2.3', '1.2.4'] }));
        expect(next.isDeleting).toBe(false);
        expect(next.oids).toEqual([{ oid: '1.2.5' }]);

        next = reducer({ ...next, isDeleting: true }, actions.bulkDeleteOIDsFailure({ error: 'err' }));
        expect(next.isDeleting).toBe(false);
    });

    test('listOidsByCategory success stores per-category without clobbering', () => {
        let next = reducer(initialState, actions.listOidsByCategory({ category: OidCategory.RdnAttributeType }));
        expect(next.oidsByCategory).toEqual({});

        const rdns = [{ oid: '2.5.4.3', displayName: 'CN', category: OidCategory.RdnAttributeType }] as any[];
        next = reducer(next, actions.listOidsByCategorySuccess({ category: OidCategory.RdnAttributeType, oids: rdns }));
        expect(next.oidsByCategory[OidCategory.RdnAttributeType]).toEqual(rdns);

        const exts = [{ oid: '2.5.29.17', displayName: 'SAN', category: OidCategory.CertificateExtension }] as any[];
        next = reducer(next, actions.listOidsByCategorySuccess({ category: OidCategory.CertificateExtension, oids: exts }));
        // First category survives the second fetch.
        expect(next.oidsByCategory[OidCategory.RdnAttributeType]).toEqual(rdns);
        expect(next.oidsByCategory[OidCategory.CertificateExtension]).toEqual(exts);

        expect(selectors.oidsByCategory({ [reducerKey()]: next } as any)).toEqual(next.oidsByCategory);
    });

    test('listOidsByCategoryFailure marks the category as errored, a fresh success clears it', () => {
        let next = reducer(initialState, actions.listOidsByCategory({ category: OidCategory.RdnAttributeType }));
        expect(next.oidsByCategoryError[OidCategory.RdnAttributeType]).toBe(false);

        next = reducer(next, actions.listOidsByCategoryFailure({ category: OidCategory.RdnAttributeType, error: 'err' }));
        expect(next.oidsByCategoryError[OidCategory.RdnAttributeType]).toBe(true);
        expect(selectors.oidsByCategoryError({ [reducerKey()]: next } as any)).toEqual(next.oidsByCategoryError);

        const rdns = [{ oid: '2.5.4.3', displayName: 'CN', category: OidCategory.RdnAttributeType }] as any[];
        next = reducer(next, actions.listOidsByCategorySuccess({ category: OidCategory.RdnAttributeType, oids: rdns }));
        expect(next.oidsByCategoryError[OidCategory.RdnAttributeType]).toBe(false);
    });

    test('listOidsByCategory tracks a per-category loaded flag distinguishing in-flight from empty', () => {
        let next = reducer(initialState, actions.listOidsByCategory({ category: OidCategory.RdnAttributeType }));
        // In flight: not yet loaded, so consumers can suppress the "empty" hint.
        expect(next.oidsByCategoryLoaded[OidCategory.RdnAttributeType]).toBeFalsy();

        next = reducer(next, actions.listOidsByCategorySuccess({ category: OidCategory.RdnAttributeType, oids: [] }));
        expect(next.oidsByCategoryLoaded[OidCategory.RdnAttributeType]).toBe(true);
        expect(selectors.oidsByCategoryLoaded({ [reducerKey()]: next } as any)).toEqual(next.oidsByCategoryLoaded);

        // A failed fetch also counts as resolved.
        const failed = reducer(
            initialState,
            actions.listOidsByCategoryFailure({ category: OidCategory.CertificateExtension, error: 'err' }),
        );
        expect(failed.oidsByCategoryLoaded[OidCategory.CertificateExtension]).toBe(true);
    });

    test('a retry after failure resets loaded so the empty hint is suppressed while the retry is in flight', () => {
        let next = reducer(initialState, actions.listOidsByCategory({ category: OidCategory.RdnAttributeType }));
        next = reducer(next, actions.listOidsByCategoryFailure({ category: OidCategory.RdnAttributeType, error: 'err' }));
        expect(next.oidsByCategoryLoaded[OidCategory.RdnAttributeType]).toBe(true);
        expect(next.oidsByCategoryError[OidCategory.RdnAttributeType]).toBe(true);

        // Retrying flips loaded back to false (and clears the error) so the UI shows a loading state
        // rather than flashing "No … defined" over the still-empty list.
        next = reducer(next, actions.listOidsByCategory({ category: OidCategory.RdnAttributeType }));
        expect(next.oidsByCategoryLoaded[OidCategory.RdnAttributeType]).toBe(false);
        expect(next.oidsByCategoryError[OidCategory.RdnAttributeType]).toBe(false);
    });

    test('listSystemOids / success caches the immutable system list / failure allows a retry', () => {
        // Request only clears a prior error; it must not drop the cached list or the loaded flag,
        // so a repeat dispatch after a successful load stays a cache hit (the epic guard skips it).
        let next = reducer({ ...initialState, systemOidsError: true }, actions.listSystemOids());
        expect(next.systemOidsError).toBe(false);
        expect(next.systemOidsLoaded).toBe(false);

        const system = [
            { oid: '2.5.4.3', displayName: 'Common Name', category: OidCategory.RdnAttributeType },
            { oid: '2.5.29.37', displayName: 'Extended Key Usage', category: OidCategory.ExtendedKeyUsage },
        ] as any[];
        next = reducer(next, actions.listSystemOidsSuccess({ oids: system }));
        expect(next.systemOids).toEqual(system);
        expect(next.systemOidsLoaded).toBe(true);
        expect(next.systemOidsError).toBe(false);

        // Failure leaves loaded false so a later mount can retry, and flags the error for the hint.
        const failed = reducer(initialState, actions.listSystemOidsFailure({ error: 'err' }));
        expect(failed.systemOidsLoaded).toBe(false);
        expect(failed.systemOidsError).toBe(true);
    });

    test('systemOidsByCategory selector groups the cached system list by category', () => {
        const system = [
            { oid: '2.5.4.3', displayName: 'Common Name', category: OidCategory.RdnAttributeType },
            { oid: '2.5.4.10', displayName: 'Organization', category: OidCategory.RdnAttributeType },
            { oid: '2.5.29.37', displayName: 'Extended Key Usage', category: OidCategory.ExtendedKeyUsage },
        ] as any[];
        const next = reducer(initialState, actions.listSystemOidsSuccess({ oids: system }));

        const grouped = selectors.systemOidsByCategory({ [reducerKey()]: next } as any);
        expect(grouped[OidCategory.RdnAttributeType]).toEqual([system[0], system[1]]);
        expect(grouped[OidCategory.ExtendedKeyUsage]).toEqual([system[2]]);
        expect(grouped[OidCategory.CertificateExtension]).toBeUndefined();
    });
});

describe('oids selectors', () => {
    test('selectors read values from oids state', () => {
        const oid = { oid: '1.2.3', description: 'Test' } as any;
        const featureState = {
            ...initialState,
            oid,
            oids: [oid],
            isFetching: true,
            isCreating: true,
            createOidSucceeded: true,
            isUpdating: true,
            updateOidSucceeded: true,
            isDeleting: true,
        };

        const state = { oids: featureState } as any;

        expect(selectors.oid(state)).toEqual(oid);
        expect(selectors.oids(state)).toEqual([oid]);
        expect(selectors.isFetching(state)).toBe(true);
        expect(selectors.isCreating(state)).toBe(true);
        expect(selectors.createOidSucceeded(state)).toBe(true);
        expect(selectors.isUpdating(state)).toBe(true);
        expect(selectors.updateOidSucceeded(state)).toBe(true);
        expect(selectors.isDeleting(state)).toBe(true);
    });
});

describe('oid-epics', () => {
    test('listOidsByCategory epic filters on OID_ENTRY_CATEGORY and maps entries', async () => {
        const entries = [{ oid: '2.5.4.3', displayName: 'CN', category: OidCategory.RdnAttributeType }];
        const listCustomOidEntries = vi.fn().mockReturnValue(of({ oidEntries: entries, totalItems: 1 }));
        const action$ = of(actions.listOidsByCategory({ category: OidCategory.RdnAttributeType }));
        const listEpic = epics.find((e) => e.name === 'listOidsByCategory')!;
        const out: any[] = [];
        await new Promise<void>((resolve) => {
            listEpic(action$ as any, {} as any, { apiClients: { oids: { listCustomOidEntries } } } as any).subscribe({
                next: (a) => out.push(a),
                complete: () => resolve(),
            });
        });

        const body = listCustomOidEntries.mock.calls[0][0].searchRequestDto;
        expect(body.filters[0]).toMatchObject({
            fieldSource: FilterFieldSource.Property,
            fieldIdentifier: 'OID_ENTRY_CATEGORY',
            condition: FilterConditionOperator.Equals,
            // Property enum EQUALS filters take the value as an array (repo convention).
            value: [OidCategory.RdnAttributeType],
        });
        expect(out).toContainEqual(actions.listOidsByCategorySuccess({ category: OidCategory.RdnAttributeType, oids: entries }));
    });

    test('listOidsByCategory epic resolves both concurrent category fetches (regression: switchMap dropped the RDN fetch)', async () => {
        // Both consumer pages dispatch these two actions back-to-back synchronously in one useEffect.
        // The inner API call MUST be asynchronous here: a synchronous `of(...)` inner would complete
        // before the second outer action arrives, masking the switchMap bug. With an async inner,
        // switchMap tears down the still-in-flight RDN request when the Extension action arrives,
        // so the RDN success never fires; mergeMap lets both complete independently.
        const rdnEntries = [{ oid: '2.5.4.3', displayName: 'CN', category: OidCategory.RdnAttributeType }];
        const extEntries = [{ oid: '2.5.29.17', displayName: 'SAN', category: OidCategory.CertificateExtension }];
        const listCustomOidEntries = vi.fn().mockImplementation(({ searchRequestDto }) => {
            const category = searchRequestDto.filters[0].value[0];
            const entries = category === OidCategory.RdnAttributeType ? rdnEntries : extEntries;
            return of({ oidEntries: entries, totalItems: entries.length }).pipe(delay(1));
        });
        const action$ = of(
            actions.listOidsByCategory({ category: OidCategory.RdnAttributeType }),
            actions.listOidsByCategory({ category: OidCategory.CertificateExtension }),
        );
        const listEpic = epics.find((e) => e.name === 'listOidsByCategory')!;
        const out: any[] = [];
        await new Promise<void>((resolve) => {
            listEpic(action$ as any, {} as any, { apiClients: { oids: { listCustomOidEntries } } } as any).subscribe({
                next: (a) => out.push(a),
                complete: () => resolve(),
            });
        });

        expect(out).toContainEqual(actions.listOidsByCategorySuccess({ category: OidCategory.RdnAttributeType, oids: rdnEntries }));
        expect(out).toContainEqual(actions.listOidsByCategorySuccess({ category: OidCategory.CertificateExtension, oids: extEntries }));
    });

    test('listOidsByCategory epic cancels an older same-category request so it cannot overwrite a newer one', async () => {
        // Two dispatches of the SAME category where the first (older) request resolves slower than the
        // second (newer). switchMap-per-category tears down the older in-flight request, so only the
        // newer result is emitted. A flat mergeMap would let both resolve and end on the stale one.
        const stale = [{ oid: '1.3.6.1.4.1.111.1', displayName: 'stale', category: OidCategory.RdnAttributeType }];
        const fresh = [{ oid: '1.3.6.1.4.1.111.2', displayName: 'fresh', category: OidCategory.RdnAttributeType }];
        let call = 0;
        const listCustomOidEntries = vi.fn().mockImplementation(() => {
            call += 1;
            return call === 1
                ? of({ oidEntries: stale, totalItems: 1 }).pipe(delay(10))
                : of({ oidEntries: fresh, totalItems: 1 }).pipe(delay(1));
        });
        const action$ = of(
            actions.listOidsByCategory({ category: OidCategory.RdnAttributeType }),
            actions.listOidsByCategory({ category: OidCategory.RdnAttributeType }),
        );
        const listEpic = epics.find((e) => e.name === 'listOidsByCategory')!;
        const out: any[] = [];
        await new Promise<void>((resolve) => {
            listEpic(action$ as any, {} as any, { apiClients: { oids: { listCustomOidEntries } } } as any).subscribe({
                next: (a) => out.push(a),
                complete: () => resolve(),
            });
        });

        const successes = out.filter((a) => a.type === actions.listOidsByCategorySuccess.type);
        expect(successes).toHaveLength(1);
        expect(successes[0]).toEqual(actions.listOidsByCategorySuccess({ category: OidCategory.RdnAttributeType, oids: fresh }));
    });

    test('listSystemOids epic fetches the full system list (no category filter) and maps it to success', async () => {
        const system = [{ oid: '2.5.4.3', displayName: 'Common Name', category: OidCategory.RdnAttributeType }];
        const listSystemOidEntries = vi.fn().mockReturnValue(of(system));
        const action$ = of(actions.listSystemOids());
        const state$ = { value: { oids: initialState } } as any;
        const listEpic = epics.find((e) => e.name === 'listSystemOids')!;
        const out: any[] = [];
        await new Promise<void>((resolve) => {
            listEpic(action$ as any, state$, { apiClients: { oids: { listSystemOidEntries } } } as any).subscribe({
                next: (a) => out.push(a),
                complete: () => resolve(),
            });
        });

        // Fetches every category at once — the request carries no category filter.
        expect(listSystemOidEntries).toHaveBeenCalledWith({});
        expect(out).toContainEqual(actions.listSystemOidsSuccess({ oids: system }));
    });

    test('listSystemOids epic skips the fetch when the immutable list is already cached', async () => {
        const listSystemOidEntries = vi.fn().mockReturnValue(of([]));
        const action$ = of(actions.listSystemOids());
        const state$ = { value: { oids: { ...initialState, systemOidsLoaded: true } } } as any;
        const listEpic = epics.find((e) => e.name === 'listSystemOids')!;
        const out: any[] = [];
        await new Promise<void>((resolve) => {
            listEpic(action$ as any, state$, { apiClients: { oids: { listSystemOidEntries } } } as any).subscribe({
                next: (a) => out.push(a),
                complete: () => resolve(),
            });
        });

        expect(listSystemOidEntries).not.toHaveBeenCalled();
        expect(out).toHaveLength(0);
    });

    test('listSystemOids epic emits a failure (never errors the stream) when the client method is missing', async () => {
        // A synchronous throw inside the epic (e.g. a stale bundle where listSystemOidEntries is
        // undefined) must NOT propagate as an error notification: redux-observable tears down the whole
        // root epic on an uncaught error, which would stop every other epic (all endpoints hang).
        const action$ = of(actions.listSystemOids());
        const state$ = { value: { oids: initialState } } as any;
        const listEpic = epics.find((e) => e.name === 'listSystemOids')!;
        const out: any[] = [];
        let errored = false;
        await new Promise<void>((resolve) => {
            listEpic(action$ as any, state$, { apiClients: { oids: {} } } as any).subscribe({
                next: (a) => out.push(a),
                error: () => {
                    errored = true;
                    resolve();
                },
                complete: () => resolve(),
            });
        });

        expect(errored).toBe(false);
        expect(out.some((a) => a.type === actions.listSystemOidsFailure.type)).toBe(true);
    });

    const runEpic = async (name: string, action: unknown, apiClient: Record<string, unknown>) => {
        const epic = epics.find((e) => e.name === name)!;
        const out: any[] = [];
        await new Promise<void>((resolve) => {
            epic(of(action) as any, {} as any, { apiClients: { oids: apiClient } } as any).subscribe({
                next: (a) => out.push(a),
                complete: () => resolve(),
            });
        });
        return out;
    };
    const moduleRefusal = {
        status: 422,
        response: ["The extension's ASN.1 module uses AUTOMATIC TAGS, which this platform does not support"],
    };

    test('createOID epic hands a refused module to the form instead of the error alert', async () => {
        const createCustomOidEntry = vi.fn().mockReturnValue(throwError(() => moduleRefusal));
        const out = await runEpic('createOID', actions.createOID({ oid: { oid: '1.2.3' } as any }), { createCustomOidEntry });

        expect(out).toHaveLength(1);
        expect(out[0].type).toBe(actions.createOIDFailure.type);
        expect(out[0].payload.valueSchemaError).toBe(moduleRefusal.response[0]);
    });

    test('createOID epic keeps the error alert for any other failure', async () => {
        const createCustomOidEntry = vi.fn().mockReturnValue(throwError(() => ({ status: 422, response: ['OID already exists'] })));
        const out = await runEpic('createOID', actions.createOID({ oid: { oid: '1.2.3' } as any }), { createCustomOidEntry });

        expect(out.map((a) => a.type)).toEqual([actions.createOIDFailure.type, appRedirectActions.fetchError.type]);
        expect(out[0].payload.valueSchemaError).toBeUndefined();
    });

    test('updateOID epic hands a refused module to the form instead of the error alert', async () => {
        const editCustomOidEntry = vi.fn().mockReturnValue(throwError(() => moduleRefusal));
        const out = await runEpic('updateOID', actions.updateOID({ oid: '1.2.3', data: {} as any }), { editCustomOidEntry });

        expect(out).toHaveLength(1);
        expect(out[0].type).toBe(actions.updateOIDFailure.type);
        expect(out[0].payload.valueSchemaError).toBe(moduleRefusal.response[0]);
    });

    test('getExtensionOidDetail epic reads the custom entry detail', async () => {
        const detail = { oid: '1.2.3', additionalProperties: { valueEncoding: 'DER' } };
        const getCustomOidEntry = vi.fn().mockReturnValue(of(detail));
        const out = await runEpic('getExtensionOidDetail', actions.getExtensionOidDetail({ oid: '1.2.3' }), { getCustomOidEntry });

        expect(getCustomOidEntry).toHaveBeenCalledWith({ oid: '1.2.3' });
        expect(out).toEqual([actions.getExtensionOidDetailSuccess({ oid: detail as any })]);
    });

    const detailRequest = actions.getExtensionOidDetail({ oid: '1.2.3' });
    const extensionListReloaded = actions.listOidsByCategorySuccess({ category: OidCategory.CertificateExtension, oids: [] });

    /** Runs the detail epic on a live action stream: a first request, then `later`, which can reach it in flight. */
    const runDetailEpicWith = async (later: unknown[], getCustomOidEntry: ReturnType<typeof vi.fn>) => {
        const action$ = new Subject<unknown>();
        const epic = epics.find((e) => e.name === 'getExtensionOidDetail')!;
        const out: any[] = [];
        const done = new Promise<void>((resolve) => {
            epic(action$ as any, {} as any, { apiClients: { oids: { getCustomOidEntry } } } as any).subscribe({
                next: (a) => out.push(a),
                complete: () => resolve(),
            });
        });
        action$.next(detailRequest);
        for (const action of later) action$.next(action);
        await new Promise((resolve) => setTimeout(resolve, 20));
        action$.complete();
        await done;
        return out;
    };

    test('getExtensionOidDetail epic drops a request in flight when the custom extension list is reloaded', async () => {
        const stale = { oid: '1.2.3', additionalProperties: { valueEncoding: 'DER', valueSchema: 'before edit' } };
        const out = await runDetailEpicWith([extensionListReloaded], vi.fn().mockReturnValue(of(stale).pipe(delay(5))));

        expect(out).toEqual([]);
    });

    test('getExtensionOidDetail epic keeps a request in flight when another category is reloaded', async () => {
        const detail = { oid: '1.2.3', additionalProperties: { valueEncoding: 'DER' } };
        const rdnListReloaded = actions.listOidsByCategorySuccess({ category: OidCategory.RdnAttributeType, oids: [] });
        const out = await runDetailEpicWith([rdnListReloaded], vi.fn().mockReturnValue(of(detail).pipe(delay(5))));

        expect(out).toEqual([actions.getExtensionOidDetailSuccess({ oid: detail as any })]);
    });

    test('getExtensionOidDetail epic serves one request per OID at a time, dropping a duplicate in flight', async () => {
        const detail = { oid: '1.2.3', additionalProperties: { valueEncoding: 'DER' } };
        const getCustomOidEntry = vi.fn().mockReturnValue(of(detail).pipe(delay(5)));
        const out = await runDetailEpicWith([detailRequest], getCustomOidEntry);

        expect(getCustomOidEntry).toHaveBeenCalledTimes(1);
        expect(out).toEqual([actions.getExtensionOidDetailSuccess({ oid: detail as any })]);
    });

    test('getExtensionOidDetail epic serves the request that follows a reload, since the reload ended the one in flight', async () => {
        const stale = { oid: '1.2.3', additionalProperties: { valueEncoding: 'DER', valueSchema: 'before edit' } };
        const fresh = { oid: '1.2.3', additionalProperties: { valueEncoding: 'DER', valueSchema: 'after edit' } };
        const getCustomOidEntry = vi
            .fn()
            .mockReturnValueOnce(of(stale).pipe(delay(5)))
            .mockReturnValueOnce(of(fresh).pipe(delay(5)));
        const out = await runDetailEpicWith([extensionListReloaded, detailRequest], getCustomOidEntry);

        expect(getCustomOidEntry).toHaveBeenCalledTimes(2);
        expect(out).toEqual([actions.getExtensionOidDetailSuccess({ oid: fresh as any })]);
    });

    test('getExtensionOidDetail epic serves a retry once the failed request has settled', async () => {
        const detail = { oid: '1.2.3', additionalProperties: { valueEncoding: 'DER' } };
        const getCustomOidEntry = vi
            .fn()
            .mockReturnValueOnce(throwError(() => new Error('boom')))
            .mockReturnValueOnce(of(detail));
        const out = await runDetailEpicWith([detailRequest], getCustomOidEntry);

        expect(getCustomOidEntry).toHaveBeenCalledTimes(2);
        expect(out.map((a) => a.type)).toEqual([actions.getExtensionOidDetailFailure.type, actions.getExtensionOidDetailSuccess.type]);
    });

    test('getExtensionOidDetail epic maps a failure without an alert', async () => {
        const getCustomOidEntry = vi.fn().mockReturnValue(throwError(() => new Error('boom')));
        const out = await runEpic('getExtensionOidDetail', actions.getExtensionOidDetail({ oid: '1.2.3' }), { getCustomOidEntry });

        expect(out.map((a) => a.type)).toEqual([actions.getExtensionOidDetailFailure.type]);
    });

    test('listSystemOids epic maps a failure to listSystemOidsFailure', async () => {
        const listSystemOidEntries = vi.fn().mockReturnValue(throwError(() => new Error('boom')));
        const action$ = of(actions.listSystemOids());
        const state$ = { value: { oids: initialState } } as any;
        const listEpic = epics.find((e) => e.name === 'listSystemOids')!;
        const out: any[] = [];
        await new Promise<void>((resolve) => {
            listEpic(action$ as any, state$, { apiClients: { oids: { listSystemOidEntries } } } as any).subscribe({
                next: (a) => out.push(a),
                complete: () => resolve(),
            });
        });

        expect(out.some((a) => a.type === actions.listSystemOidsFailure.type)).toBe(true);
    });
});
