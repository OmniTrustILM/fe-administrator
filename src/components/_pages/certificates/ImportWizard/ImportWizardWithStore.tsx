import { configureStore, type UnknownAction } from '@reduxjs/toolkit';
import { useMemo } from 'react';
import { Provider } from 'react-redux';
import { MemoryRouter } from 'react-router';
import Alerts from 'components/Alerts';
import ImportWizard from 'components/_pages/certificates/ImportWizard';
import { alertsSlice, type State as AlertState } from 'ducks/alert-slice';
import { slice as certificateSlice, type State as CertificateState } from 'ducks/certificates';
import { slice as keySlice, type State as KeyState } from 'ducks/cryptographic-keys';
import { slice as customAttributeSlice, type State as CustomAttributeState } from 'ducks/customAttributes';
import { slice as inspectionSlice, type State as InspectionState } from 'ducks/inspections';
import { testReducers } from 'ducks/test-reducers';
import { slice as tokenProfileSlice, type State as TokenProfileState } from 'ducks/token-profiles';
import type { CertificateImportResultDto } from 'types/openapi';
import { importWizardTestMiddleware, type ImportWizardAnswers } from './importWizardTestSupport';

export type { ImportAnswer, ImportWizardAnswers, InspectAnswer, ListingAnswer } from './importWizardTestSupport';

type SharedState = Omit<
    ReturnType<typeof testReducers>,
    'alerts' | 'certificates' | 'cryptographicKeys' | 'customAttributes' | 'tokenprofiles'
> & {
    alerts: AlertState;
    certificates: CertificateState;
    cryptographicKeys: KeyState;
    customAttributes: CustomAttributeState;
    tokenprofiles: TokenProfileState;
};

type State = SharedState & { inspections: InspectionState };

function reducer(state: State | undefined, action: UnknownAction): State {
    // The test reducers know nothing of the inspections slice, so it is kept out of what they are handed.
    const { inspections, ...shared } = state ?? {};
    const sharedState = state ? (shared as SharedState) : undefined;
    return {
        ...testReducers(sharedState, action),
        alerts: alertsSlice.reducer(sharedState?.alerts, action),
        certificates: certificateSlice.reducer(sharedState?.certificates, action),
        cryptographicKeys: keySlice.reducer(sharedState?.cryptographicKeys, action),
        customAttributes: customAttributeSlice.reducer(sharedState?.customAttributes, action),
        tokenprofiles: tokenProfileSlice.reducer(sharedState?.tokenprofiles, action),
        inspections: inspectionSlice.reducer(inspections, action),
    };
}

export type ImportWizardWithStoreProps = ImportWizardAnswers &
    Readonly<{
        presetTokenProfileUuid?: string;
        showCertificateCustomAttributes?: boolean;
        onCancel?: () => void;
        onDone?: (results: CertificateImportResultDto[]) => void;
    }>;

const noop = () => {};

/**
 * Builds the store every harness mounts against, with {@link importWizardTestMiddleware} answering its API actions.
 * The store is built inside the mounted component, since one built in the test body does not cross the Playwright CT
 * boundary.
 */
export function useImportTestStore({
    inspectAnswers,
    importableTokenProfiles,
    profileListings,
    keyTransferByProfile,
    importKeyAttributes,
    importAttributeListings,
    certificateCustomAttributes,
    keyCustomAttributes,
    importAnswers,
    onAction,
}: ImportWizardAnswers) {
    return useMemo(() => {
        const apiResponses = importWizardTestMiddleware({
            inspectAnswers,
            importableTokenProfiles,
            profileListings,
            keyTransferByProfile,
            importKeyAttributes,
            importAttributeListings,
            certificateCustomAttributes,
            keyCustomAttributes,
            importAnswers,
            onAction,
        });

        return configureStore({
            reducer,
            middleware: (getDefaultMiddleware) => getDefaultMiddleware({ serializableCheck: false }).concat(apiResponses),
        });
    }, [
        inspectAnswers,
        importableTokenProfiles,
        profileListings,
        keyTransferByProfile,
        importKeyAttributes,
        importAttributeListings,
        certificateCustomAttributes,
        keyCustomAttributes,
        importAnswers,
        onAction,
    ]);
}

/** Mounts the wizard alone against {@link useImportTestStore}'s store. */
export function ImportWizardWithStore({
    presetTokenProfileUuid,
    showCertificateCustomAttributes = false,
    onCancel = noop,
    onDone = noop,
    ...fixtures
}: ImportWizardWithStoreProps) {
    const store = useImportTestStore(fixtures);

    return (
        <Provider store={store}>
            <MemoryRouter>
                <ImportWizard
                    presetTokenProfileUuid={presetTokenProfileUuid}
                    showCertificateCustomAttributes={showCertificateCustomAttributes}
                    onCancel={onCancel}
                    onDone={onDone}
                />
                <Alerts />
            </MemoryRouter>
        </Provider>
    );
}

export default ImportWizardWithStore;
