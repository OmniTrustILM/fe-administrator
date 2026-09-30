import type { UnknownAction } from '@reduxjs/toolkit';
import type { AppState, EpicDependencies } from 'ducks';
import { combineEpics, StateObservable } from 'redux-observable';
import { EMPTY, firstValueFrom, type Observable, of, Subject, throwError } from 'rxjs';
import { take, toArray } from 'rxjs/operators';
import { describe, expect, onTestFinished, test, vi } from 'vitest';
import { KeyRequestType } from 'types/openapi';
import { AjaxError } from 'rxjs/ajax';
import { triggerBlobDownload } from 'utils/download';
import { extractError } from 'utils/net';
import { actions as alertActions } from 'ducks/alerts';
import { actions as appRedirectActions } from 'ducks/app-redirect';
import { actions, initialState } from 'ducks/cryptographic-keys';
import epics from 'ducks/cryptographic-keys-epics';

vi.mock('../App', () => ({ store: { dispatch: vi.fn() } }));

// Keep the real fileNameFromContentDisposition (exportKey relies on its parsing) and spy on
// triggerBlobDownload only, so the tests can assert what the epic handed it.
vi.mock('utils/download', async (importOriginal) => {
    const actual = await importOriginal<typeof import('utils/download')>();
    return { ...actual, triggerBlobDownload: vi.fn() };
});

// Resolve epics by function name rather than by position — inserting an epic anywhere in the array
// would otherwise silently shift every index below it and break unrelated tests.
function findEpicIndex(name: string) {
    const index = (epics as { name: string }[]).findIndex((epic) => epic.name === name);
    if (index === -1) throw new Error(`Epic "${name}" not found in cryptographic-keys-epics`);
    return index;
}

const EXPORT_KEY_EPIC_INDEX = findEpicIndex('exportKey');
const LIST_IMPORT_KEY_ATTRIBUTE_DESCRIPTORS_EPIC_INDEX = findEpicIndex('listImportKeyAttributeDescriptors');
const LIST_EXPORT_KEY_ATTRIBUTE_DESCRIPTORS_EPIC_INDEX = findEpicIndex('listExportKeyAttributeDescriptors');

type SupportedTypesRequest = ReturnType<typeof actions.listSupportedKeyRequestTypes>['payload'];

function aSupportedTypesRequest() {
    const request: SupportedTypesRequest = { tokenInstanceUuid: 'selected-token', tokenProfileUuid: 'selected-profile' };
    return {
        withProfileUuid(uuid: string) {
            request.tokenProfileUuid = uuid;
            return this;
        },
        build: () => request,
    };
}

function observeSupportedTypes(listSupportedKeyRequestTypes: (request: SupportedTypesRequest) => Observable<KeyRequestType[]>) {
    const action$ = new Subject<UnknownAction>();
    const state$ = new StateObservable<AppState>(EMPTY, { cryptographicKeys: initialState } as AppState);
    const dependencies = { apiClients: { tokenProfiles: { listSupportedKeyRequestTypes } } } as EpicDependencies;
    const emitted: UnknownAction[] = [];
    const subscription = combineEpics(...epics)(action$, state$, dependencies).subscribe((action) => emitted.push(action));
    onTestFinished(() => {
        subscription.unsubscribe();
        action$.complete();
    });
    return { dispatch: (action: UnknownAction) => action$.next(action), emitted };
}

describe('supported key request types epic', () => {
    test.each([{ supportedTypes: [KeyRequestType.Secret, KeyRequestType.KeyPair] }, { supportedTypes: [] }])(
        'listSupportedKeyRequestTypes_emitsReturnedTypes_$supportedTypes',
        ({ supportedTypes }) => {
            // given
            const request = aSupportedTypesRequest().build();
            const listSupportedKeyRequestTypes = vi.fn(() => of(supportedTypes));
            const { dispatch, emitted } = observeSupportedTypes(listSupportedKeyRequestTypes);

            // when
            dispatch(actions.listSupportedKeyRequestTypes(request));

            // then
            expect(listSupportedKeyRequestTypes).toHaveBeenCalledExactlyOnceWith(request);
            expect(emitted).toEqual([actions.listSupportedKeyRequestTypesSuccess(supportedTypes)]);
        },
    );

    test('listSupportedKeyRequestTypes_reportsApiFailureAndAllowsRetry', () => {
        // given
        const request = aSupportedTypesRequest().build();
        const apiError = new Error('Token profile unavailable');
        const recoveredTypes = [KeyRequestType.Secret];
        const listSupportedKeyRequestTypes = vi
            .fn()
            .mockReturnValueOnce(throwError(() => apiError))
            .mockReturnValueOnce(of(recoveredTypes));
        const { dispatch, emitted } = observeSupportedTypes(listSupportedKeyRequestTypes);

        // when
        dispatch(actions.listSupportedKeyRequestTypes(request));
        dispatch(actions.listSupportedKeyRequestTypes(request));

        // then
        expect(emitted).toEqual([
            actions.listSupportedKeyRequestTypesFailure(),
            appRedirectActions.fetchError({ error: apiError, message: 'Failed to get supported Key Types' }),
            actions.listSupportedKeyRequestTypesSuccess(recoveredTypes),
        ]);
    });

    test('listSupportedKeyRequestTypes_reportsSynchronousClientFailure', () => {
        // given
        const request = aSupportedTypesRequest().build();
        const clientError = new TypeError('listSupportedKeyRequestTypes is not a function');
        const { dispatch, emitted } = observeSupportedTypes(() => {
            throw clientError;
        });

        // when
        dispatch(actions.listSupportedKeyRequestTypes(request));

        // then
        expect(emitted).toEqual([
            actions.listSupportedKeyRequestTypesFailure(),
            appRedirectActions.fetchError({ error: clientError, message: 'Failed to get supported Key Types' }),
        ]);
    });

    test('listSupportedKeyRequestTypes_ignoresSupersededProfileResponse', () => {
        // given
        const previousRequest = aSupportedTypesRequest().withProfileUuid('previous-profile').build();
        const currentRequest = aSupportedTypesRequest().withProfileUuid('current-profile').build();
        const previousTypes = [KeyRequestType.Secret];
        const currentTypes = [KeyRequestType.KeyPair];
        const previousResponse = new Subject<KeyRequestType[]>();
        const listSupportedKeyRequestTypes = vi.fn().mockReturnValueOnce(previousResponse).mockReturnValueOnce(of(currentTypes));
        const { dispatch, emitted } = observeSupportedTypes(listSupportedKeyRequestTypes);

        // when
        dispatch(actions.listSupportedKeyRequestTypes(previousRequest));
        dispatch(actions.listSupportedKeyRequestTypes(currentRequest));
        previousResponse.next(previousTypes);
        previousResponse.complete();

        // then
        expect(listSupportedKeyRequestTypes.mock.calls).toEqual([[previousRequest], [currentRequest]]);
        expect(emitted).toEqual([actions.listSupportedKeyRequestTypesSuccess(currentTypes)]);
    });

    test.each([actions.clearSupportedKeyRequestTypes(), actions.resetState()])(
        '$type_cancelsPendingResponseAndAllowsAnotherRequest',
        (cancelAction) => {
            // given
            const request = aSupportedTypesRequest().build();
            const staleTypes = [KeyRequestType.Secret];
            const nextTypes = [KeyRequestType.KeyPair];
            const pendingResponse = new Subject<KeyRequestType[]>();
            const listSupportedKeyRequestTypes = vi.fn().mockReturnValueOnce(pendingResponse).mockReturnValueOnce(of(nextTypes));
            const { dispatch, emitted } = observeSupportedTypes(listSupportedKeyRequestTypes);
            dispatch(actions.listSupportedKeyRequestTypes(request));

            // when
            dispatch(cancelAction);
            pendingResponse.next(staleTypes);
            pendingResponse.error(new Error('Late error from cancelled request'));
            dispatch(actions.listSupportedKeyRequestTypes(request));

            // then
            expect(emitted).toEqual([actions.listSupportedKeyRequestTypesSuccess(nextTypes)]);
        },
    );

    test('listSupportedKeyRequestTypes_keepsPendingRequestForUnrelatedAction', () => {
        // given
        const request = aSupportedTypesRequest().build();
        const supportedTypes = [KeyRequestType.KeyPair];
        const response = new Subject<KeyRequestType[]>();
        const { dispatch, emitted } = observeSupportedTypes(() => response);
        dispatch(actions.listSupportedKeyRequestTypes(request));

        // when
        dispatch(actions.clearKeyAttributeDescriptors());
        response.next(supportedTypes);
        response.complete();

        // then
        expect(emitted).toEqual([actions.listSupportedKeyRequestTypesSuccess(supportedTypes)]);
    });
});

async function runExportKeyEpic(
    action: UnknownAction,
    exportKey: (args: any) => Observable<any>,
    takeCount = 2,
): Promise<{ emitted: UnknownAction[]; calls: any[]; opts: any[] }> {
    const epicFns = epics as ((action$: any, state$: any, deps: any) => Observable<UnknownAction>)[];
    const calls: any[] = [];
    const opts: any[] = [];
    const deps = {
        apiClients: {
            cryptographicKeys: {
                exportKey: (args: any, callOpts?: any) => {
                    calls.push(args);
                    opts.push(callOpts);
                    return exportKey(args);
                },
            },
        },
    };
    const output$ = epicFns[EXPORT_KEY_EPIC_INDEX](of(action), of({}) as any, deps as any);
    const emitted = await firstValueFrom(output$.pipe(take(takeCount), toArray()));
    return { emitted, calls, opts };
}

describe('exportKey', () => {
    const uuid = 'key-1';
    const keyItemUuid = 'item-1';
    const keyExportRequestDto = { passphrase: 'a-very-long-passphrase' };
    const exportAction = actions.exportKey({ uuid, keyItemUuid, keyExportRequestDto, fallbackName: 'fallback.pem' });

    test('requests a raw blob response, saves it under the header name and emits success with an alert', async () => {
        const blob = new Blob(['bytes']);
        const { emitted, calls, opts } = await runExportKeyEpic(exportAction, () =>
            of({ response: blob, responseHeaders: { 'content-disposition': 'attachment; filename="key-01.pem"' } }),
        );

        expect(calls[0]).toEqual({ uuid, keyItemUuid, keyExportRequestDto });
        expect(opts[0]).toEqual({ responseOpts: { response: 'raw' } });
        expect(triggerBlobDownload).toHaveBeenCalledWith(blob, 'key-01.pem');
        expect(emitted[0]).toEqual(actions.exportKeySuccess());
        expect(emitted[1]).toEqual(alertActions.success('Key exported.'));
    });

    test('with no content-disposition, saves as fallbackName', async () => {
        const blob = new Blob(['bytes']);
        await runExportKeyEpic(exportAction, () => of({ response: blob, responseHeaders: {} }));

        expect(triggerBlobDownload).toHaveBeenCalledWith(blob, 'fallback.pem');
    });

    test('failure emits Failure and fetchError', async () => {
        const { emitted } = await runExportKeyEpic(exportAction, () => throwError(() => new Error('boom')));

        expect(emitted[0]).toEqual(actions.exportKeyFailure({ error: 'Failed to export the key. boom' }));
        expect(emitted[1].type).toBe(appRedirectActions.fetchError.type);
    });

    test.each([
        ['a string array', '["refused because the key is not exportable"]'],
        ['a message', '{"message":"refused because the key is not exportable"}'],
    ])("reads Core's refusal from a blob body holding %s", async (_name, body) => {
        const refusal = new AjaxError(
            'ajax error 422',
            { status: 422, responseType: 'blob', response: new Blob([body]) } as never,
            {} as never,
        );
        const message = 'Failed to export the key (422): refused because the key is not exportable';

        const { emitted } = await runExportKeyEpic(exportAction, () => throwError(() => refusal));

        expect(emitted[0]).toEqual(actions.exportKeyFailure({ error: message }));
        const { error, message: headline } = (emitted[1] as ReturnType<typeof appRedirectActions.fetchError>).payload;
        expect(extractError(error as AjaxError, headline)).toBe(message);
    });
});

describe('listImportKeyAttributeDescriptors', () => {
    test('calls listImportKeyAttributes and emits the success with descriptors', async () => {
        const epicFns = epics as ((action$: any, state$: any, deps: any) => Observable<UnknownAction>)[];
        const attributeDescriptors = [{ uuid: 'attr-1' }] as any;
        const listImportKeyAttributes = vi.fn(() => of(attributeDescriptors));
        const request = { tokenInstanceUuid: 'token-1', tokenProfileUuid: 'profile-1', type: KeyRequestType.KeyPair };
        const deps = { apiClients: { cryptographicKeys: { listImportKeyAttributes } } };

        const emitted = await firstValueFrom(
            epicFns[LIST_IMPORT_KEY_ATTRIBUTE_DESCRIPTORS_EPIC_INDEX](
                of(actions.listImportKeyAttributeDescriptors(request)),
                of({}) as any,
                deps as any,
            ).pipe(take(1), toArray()),
        );

        expect(listImportKeyAttributes).toHaveBeenCalledWith(request);
        expect(emitted).toEqual([actions.listImportKeyAttributeDescriptorsSuccess({ request, attributeDescriptors })]);
    });

    test('failure emits Failure and fetchError', async () => {
        const epicFns = epics as ((action$: any, state$: any, deps: any) => Observable<UnknownAction>)[];
        const request = { tokenInstanceUuid: 'token-1', tokenProfileUuid: 'profile-1', type: KeyRequestType.KeyPair };
        const deps = { apiClients: { cryptographicKeys: { listImportKeyAttributes: () => throwError(() => new Error('boom')) } } };

        const emitted = await firstValueFrom(
            epicFns[LIST_IMPORT_KEY_ATTRIBUTE_DESCRIPTORS_EPIC_INDEX](
                of(actions.listImportKeyAttributeDescriptors(request)),
                of({}) as any,
                deps as any,
            ).pipe(take(2), toArray()),
        );

        expect(emitted[0]).toEqual(
            actions.listImportKeyAttributeDescriptorsFailure({ request, error: 'Failed to get Attributes to import a key. boom' }),
        );
        expect(emitted[1].type).toBe(appRedirectActions.fetchError.type);
    });
});

describe('listExportKeyAttributeDescriptors', () => {
    test('calls listExportKeyAttributes and emits the success with descriptors', async () => {
        const epicFns = epics as ((action$: any, state$: any, deps: any) => Observable<UnknownAction>)[];
        const attributeDescriptors = [{ uuid: 'attr-1' }] as any;
        const listExportKeyAttributes = vi.fn(() => of(attributeDescriptors));
        const request = { uuid: 'key-1', keyItemUuid: 'item-1' };
        const deps = { apiClients: { cryptographicKeys: { listExportKeyAttributes } } };

        const emitted = await firstValueFrom(
            epicFns[LIST_EXPORT_KEY_ATTRIBUTE_DESCRIPTORS_EPIC_INDEX](
                of(actions.listExportKeyAttributeDescriptors(request)),
                of({}) as any,
                deps as any,
            ).pipe(take(1), toArray()),
        );

        expect(listExportKeyAttributes).toHaveBeenCalledWith(request);
        expect(emitted).toEqual([actions.listExportKeyAttributeDescriptorsSuccess({ request, attributeDescriptors })]);
    });

    test('failure emits Failure and fetchError', async () => {
        const epicFns = epics as ((action$: any, state$: any, deps: any) => Observable<UnknownAction>)[];
        const request = { uuid: 'key-1', keyItemUuid: 'item-1' };
        const deps = { apiClients: { cryptographicKeys: { listExportKeyAttributes: () => throwError(() => new Error('boom')) } } };

        const emitted = await firstValueFrom(
            epicFns[LIST_EXPORT_KEY_ATTRIBUTE_DESCRIPTORS_EPIC_INDEX](
                of(actions.listExportKeyAttributeDescriptors(request)),
                of({}) as any,
                deps as any,
            ).pipe(take(2), toArray()),
        );

        expect(emitted[0]).toEqual(
            actions.listExportKeyAttributeDescriptorsFailure({ request, error: 'Failed to get Attributes to export a key. boom' }),
        );
        expect(emitted[1].type).toBe(appRedirectActions.fetchError.type);
    });
});
