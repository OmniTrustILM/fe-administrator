import { useEffect, useMemo } from 'react';
import { Provider, useDispatch, useSelector } from 'react-redux';
import { MemoryRouter, Route, Routes } from 'react-router';
import type { UnknownAction } from '@reduxjs/toolkit';
import { initialState as certificatesInitialState } from 'ducks/certificates';
import locationsReducer, { actions as locationActions, initialState as locationsInitialState } from 'ducks/locations';
import { testInitialState, testReducers } from 'ducks/test-reducers';
import type { CertificateDetailResponseModel } from 'types/certificate';
import type { LocationResponseModel } from 'types/locations';
import { CertificateState, Resource, type ResourceAction } from 'types/openapi';
import { useRecordingStore } from 'utils/test-helpers';
import CertificateDetail from './index';

type Props = Readonly<{
    allowedListings: Resource[];
    /** What the allowed-actions endpoint answered for the certificate; omitted leaves it loading. */
    allowedActions?: ResourceAction[];
    /** The locations the certificate is in, and the ones it can be pushed to. */
    certificateLocations?: LocationResponseModel[];
    pushableLocations?: LocationResponseModel[];
    /** What the allowed-actions endpoint answered for each location; a location left out stays loading. */
    locationAnswers?: Record<string, ResourceAction[]>;
}>;

const certificate = {
    uuid: 'cert-uuid',
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

// The test reducers carry no locations slice, which the page reads.
const reducer = ((state: HarnessState | undefined, action: UnknownAction) => {
    const { locations, ...rest } = state ?? ({} as HarnessState);
    return { ...testReducers(rest as ReturnType<typeof testReducers>, action), locations: locationsReducer(locations, action) };
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
}: Props) {
    const preloadedState = useMemo(
        () => ({
            auth: { ...testInitialState.auth, profile: { username: 'user', permissions: { allowedListings, allowedActions: [] } } },
            certificates: {
                ...certificatesInitialState,
                ...testInitialState.certificates,
                certificateDetail: certificate,
                certificateLocations,
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
        [allowedListings, allowedActions, certificateLocations, pushableLocations, locationAnswers],
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
            <div data-testid="dispatched">{JSON.stringify(dispatched.map((action) => action.type))}</div>
        </Provider>
    );
}
