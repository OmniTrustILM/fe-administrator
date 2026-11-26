import { useEffect, useMemo } from 'react';
import { Provider, useDispatch, useSelector } from 'react-redux';
import { MemoryRouter, Route, Routes } from 'react-router';
import type { UnknownAction } from '@reduxjs/toolkit';
import { actions as certificateActions, initialState as certificatesInitialState } from 'ducks/certificates';
import locationsReducer, { actions as locationActions, initialState as locationsInitialState } from 'ducks/locations';
import { testInitialState, testReducers } from 'ducks/test-reducers';
import type { CertificateDetailResponseModel } from 'types/certificate';
import type { LocationResponseModel } from 'types/locations';
import { type CertificateSimpleDto, CertificateState, Resource, type ResourceAction } from 'types/openapi';
import { useRecordingStore } from 'utils/test-helpers';
import CertificateDetail from './index';

type Props = Readonly<{
    allowedListings: Resource[];
    /** What the allowed-actions endpoint answered for the certificate; omitted leaves it loading. */
    allowedActions?: ResourceAction[];
    certificateLocations?: LocationResponseModel[];
    pushableLocations?: LocationResponseModel[];
    /** What the allowed-actions endpoint answered for each location; a location left out stays loading. */
    locationAnswers?: Record<string, ResourceAction[]>;
    /** The locations a refresh answers with, delivered when the `refresh-locations` button is clicked. */
    refreshedLocations?: LocationResponseModel[];
    /** Certificates that succeed the shown one. */
    successorCertificates?: CertificateSimpleDto[];
}>;

const certificate = {
    uuid: 'cert-uuid',
    displayName: 'app.example',
    commonName: 'app.example',
    subjectDn: 'CN=app.example',
    state: CertificateState.Issued,
} as unknown as CertificateDetailResponseModel;

const NO_ANSWERS: Record<string, ResourceAction[]> = {};

const recorded = {
    match: (action: unknown) =>
        ['certificates/getCertificateDetail', 'certificates/listCertificateLocations', 'resource/listObjectAllowedActions'].includes(
            (action as { type: string }).type,
        ),
};

type HarnessState = ReturnType<typeof testReducers> & { locations?: typeof locationsInitialState };

// The test reducers carry no locations slice, which the page reads, and keep no certificate locations a refresh answers.
const reducer = ((state: HarnessState | undefined, action: UnknownAction) => {
    const { locations, ...rest } = state ?? ({} as HarnessState);
    const next = { ...testReducers(rest as ReturnType<typeof testReducers>, action), locations: locationsReducer(locations, action) };
    if (!certificateActions.listCertificateLocationsSuccess.match(action)) return next;
    return { ...next, certificates: { ...next.certificates, certificateLocations: action.payload.certificateLocations } };
}) as unknown as typeof testReducers;

/** Answers a location's push attributes with none, after the render that saw them requested, as the epic would. */
function AnswerPushAttributes() {
    const dispatch = useDispatch();
    const requested = useSelector((state: HarnessState) => !!state.locations?.isFetchingPushAttributeDescriptors);
    useEffect(() => {
        if (requested) dispatch(locationActions.getPushAttributesSuccess({ attributes: [] }));
    }, [dispatch, requested]);
    return null;
}

export default function CertificateDetailWithStore({
    allowedListings,
    allowedActions,
    certificateLocations,
    pushableLocations,
    locationAnswers = NO_ANSWERS,
    refreshedLocations,
    successorCertificates,
}: Props) {
    const preloadedState = useMemo(
        () => ({
            auth: { ...testInitialState.auth, profile: { username: 'user', permissions: { allowedListings, allowedActions: [] } } },
            certificates: {
                ...certificatesInitialState,
                ...testInitialState.certificates,
                certificateDetail: certificate,
                certificateLocations,
                ...(successorCertificates && { certificateRelations: { predecessorCertificates: [], successorCertificates } }),
            },
            locations: { ...locationsInitialState, locations: pushableLocations ?? [] },
            resource: {
                ...testInitialState.resource,
                resourcesList: [
                    { resource: Resource.Certificates, hasObjectAccess: true, hasOwner: true },
                    { resource: Resource.Locations, hasObjectAccess: certificateLocations !== undefined, hasOwner: false },
                ],
                objectAllowedActions: {
                    ...(allowedActions && { [`${Resource.Certificates}/cert-uuid`]: { status: 'loaded' as const, allowedActions } }),
                    ...Object.fromEntries(
                        Object.entries(locationAnswers).map(([uuid, actions]) => [
                            `${Resource.Locations}/${uuid}`,
                            { status: 'loaded' as const, allowedActions: actions },
                        ]),
                    ),
                },
            },
        }),
        [allowedListings, allowedActions, certificateLocations, pushableLocations, locationAnswers, successorCertificates],
    );
    const { store, dispatched } = useRecordingStore(preloadedState as never, recorded, reducer);

    return (
        <Provider store={store}>
            <MemoryRouter initialEntries={['/certificates/detail/cert-uuid']}>
                <Routes>
                    <Route path="/certificates/detail/:id" element={<CertificateDetail />} />
                </Routes>
            </MemoryRouter>
            <AnswerPushAttributes />
            {refreshedLocations && certificateLocations && (
                <button
                    type="button"
                    data-testid="restore-locations"
                    onClick={() => store.dispatch(certificateActions.listCertificateLocationsSuccess({ certificateLocations }))}
                >
                    Answer a refresh with the initial locations
                </button>
            )}
            {refreshedLocations && (
                <button
                    type="button"
                    data-testid="refresh-locations"
                    onClick={() =>
                        store.dispatch(certificateActions.listCertificateLocationsSuccess({ certificateLocations: refreshedLocations }))
                    }
                >
                    Answer the locations refresh
                </button>
            )}
            <div data-testid="dispatched">{JSON.stringify(dispatched.map((action) => action.type))}</div>
        </Provider>
    );
}
