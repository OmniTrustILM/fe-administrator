import { configureStore, type Middleware, type MiddlewareAPI, type UnknownAction } from '@reduxjs/toolkit';
import { actions as certificateActions, slice as certificateSlice, type State as CertificateState } from 'ducks/certificates';
import { actions as keyActions, slice as keySlice, type State as KeyState } from 'ducks/cryptographic-keys';
import { type AuthTestState, testInitialState, testReducers } from 'ducks/test-reducers';
import { slice as userInterfaceSlice, type State as UserInterfaceState } from 'ducks/user-interface';
import { type BaseAttributeDto, Resource, ResourceAction } from 'types/openapi';
import { nth, type SchemaAnswer } from './testAnswers';

type SharedState = Omit<ReturnType<typeof testReducers>, 'certificates' | 'cryptographicKeys' | 'userInterface'> & {
    certificates: CertificateState;
    cryptographicKeys: KeyState;
};

export type ExportDialogState = SharedState & { userInterface: UserInterfaceState };

function reducer(state: ExportDialogState | undefined, action: UnknownAction): ExportDialogState {
    // The test reducers keep a user interface state of another shape, so it is kept out of what they are handed.
    const { userInterface, ...shared } = state ?? {};
    const sharedState = state ? (shared as SharedState) : undefined;
    return {
        ...testReducers(sharedState, action),
        certificates: certificateSlice.reducer(sharedState?.certificates, action),
        cryptographicKeys: keySlice.reducer(sharedState?.cryptographicKeys, action),
        userInterface: userInterfaceSlice.reducer(userInterface, action),
    };
}

/** How a PKCS#12 download or a key export is answered: after `delay` milliseconds, refused with `error` when it is set. */
export type ExportAnswer = Readonly<{ delay?: number; error?: string }>;

/** Answers a download or an export as `answer` says, or leaves it in flight without one. */
export function answerExport(
    api: MiddlewareAPI,
    answer: ExportAnswer | undefined,
    success: UnknownAction,
    failure: (error: string) => UnknownAction,
) {
    if (!answer) return;
    const { delay = 0, error } = answer;
    setTimeout(() => api.dispatch(error ? failure(error) : success), delay);
}

/** The harnesses' signed-in user, who holds the key export permission unless `granted` is false. */
export const keyExportAuth = (granted = true): AuthTestState => ({
    profile: {
        username: 'Test User',
        permissions: {
            allowedListings: [],
            allowedActions: granted ? [{ resource: Resource.Keys, actions: [ResourceAction.ExportKey] }] : [],
        },
    },
});

/** The key export's failure action, for {@link answerExport}. */
export const keyExportFailure = (error: string) => keyActions.exportKeyFailure({ error });

export type ExportDialogAnswers = Readonly<{
    /** Answers every export attribute schema listing, unless `exportAttributeListings` answers them one by one. */
    exportAttributeDescriptors?: BaseAttributeDto[];
    exportAttributeListings?: SchemaAnswer[];
    /** Leaves the download or the export in flight when absent. */
    exportAnswer?: ExportAnswer;
    onAction?: (action: UnknownAction) => void;
}>;

/**
 * The store every harness of a dialog built on `ExportPassphraseForm` mounts against: the real certificates,
 * cryptographicKeys and userInterface slices, with the export attribute schema listing and the download or export
 * answered from the fixtures a test passes, in place of the epics. A harness builds it inside the mounted component,
 * since a store built in the test body does not cross the Playwright CT boundary.
 */
export function exportDialogTestStore(
    { exportAttributeDescriptors = [], exportAttributeListings, exportAnswer, onAction }: ExportDialogAnswers,
    preloadedState: Partial<ExportDialogState> = {},
) {
    let listingsAnswered = 0;

    const apiResponses: Middleware = (api) => (next) => (action) => {
        const result = next(action);
        onAction?.(action as UnknownAction);
        if (keyActions.listExportKeyAttributeDescriptors.match(action)) {
            const request = action.payload;
            const answer = nth(exportAttributeListings, listingsAnswered++) ?? { descriptors: exportAttributeDescriptors };
            if (answer.error) {
                api.dispatch(keyActions.listExportKeyAttributeDescriptorsFailure({ request, error: answer.error }));
            } else if (!answer.pending) {
                api.dispatch(
                    keyActions.listExportKeyAttributeDescriptorsSuccess({ request, attributeDescriptors: answer.descriptors ?? [] }),
                );
            }
        } else if (certificateActions.downloadKeystore.match(action)) {
            answerExport(api, exportAnswer, certificateActions.downloadKeystoreSuccess(), (error) =>
                certificateActions.downloadKeystoreFailure({ error }),
            );
        } else if (keyActions.exportKey.match(action)) {
            answerExport(api, exportAnswer, keyActions.exportKeySuccess(), keyExportFailure);
        }
        return result;
    };

    return configureStore({
        reducer,
        middleware: (getDefaultMiddleware) => getDefaultMiddleware({ serializableCheck: false }).concat(apiResponses),
        preloadedState: {
            ...testInitialState,
            certificates: certificateSlice.getInitialState(),
            cryptographicKeys: keySlice.getInitialState(),
            userInterface: userInterfaceSlice.getInitialState(),
            ...preloadedState,
        },
    });
}
