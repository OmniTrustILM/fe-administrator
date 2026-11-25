import { configureStore, type Middleware, type UnknownAction } from '@reduxjs/toolkit';
import { useState } from 'react';
import { Provider } from 'react-redux';
import { MemoryRouter, Route, Routes } from 'react-router';
import { actions as acmeProfilesActions, slice as acmeProfilesSlice } from 'ducks/acme-profiles';
import { actions as raProfilesActions, slice as raProfilesSlice } from 'ducks/ra-profiles';
import { slice as secretsSlice } from 'ducks/secrets';
import { testReducers } from 'ducks/test-reducers';
import type { AcmeProfileResponseModel } from 'types/acme-profiles';
import AcmeProfileForm from './index';

type Props = Readonly<{
    profile: Partial<AcmeProfileResponseModel>;
    /** When the RA profile list answers; it never does when omitted. */
    raProfilesDelayMs?: number;
    /** How the RA profile list answers: with one RA profile (default), with none, or with a failure. */
    raProfilesResult?: 'one' | 'empty' | 'fail';
}>;

const UUID = 'acme-profile-1';

/**
 * The form editing one ACME profile that the store serves on request, with the RA profile list left empty as it is
 * while the list is still loading. The update request the form dispatches is rendered as JSON.
 */
export default function AcmeProfileFormHarness({ profile, raProfilesDelayMs, raProfilesResult = 'one' }: Props) {
    const [state] = useState(() => {
        const loaded = { uuid: UUID, name: 'ACME profile', enabled: true, ...profile } as AcmeProfileResponseModel;
        let request: unknown;
        let render: (() => void) | undefined;
        const serveProfile: Middleware = (api) => (next) => (action) => {
            const result = next(action);
            const type = (action as UnknownAction).type;
            if (type === acmeProfilesActions.getAcmeProfile.type) {
                setTimeout(() => api.dispatch(acmeProfilesActions.getAcmeProfileSuccess({ acmeProfile: loaded })), 0);
            }
            if (type === raProfilesActions.listRaProfiles.type && raProfilesDelayMs !== undefined) {
                const raProfiles = (raProfilesResult === 'one' ? [{ uuid: 'ra-1', name: 'RA profile', enabled: true }] : []) as never;
                const answer =
                    raProfilesResult === 'fail'
                        ? raProfilesActions.listRaProfilesFailure({ error: 'Failed' })
                        : raProfilesActions.listRaProfilesSuccess({ raProfiles });
                setTimeout(() => api.dispatch(answer), raProfilesDelayMs);
            }
            if (type === acmeProfilesActions.updateAcmeProfile.type) {
                request = (action as ReturnType<typeof acmeProfilesActions.updateAcmeProfile>).payload.updateAcmeRequest;
                render?.();
            }
            return result;
        };
        const store = configureStore({
            reducer: (current: Record<string, unknown> | undefined, action: UnknownAction) =>
                ({
                    ...testReducers(current as never, action),
                    [acmeProfilesSlice.name]: acmeProfilesSlice.reducer(current?.[acmeProfilesSlice.name] as never, action),
                    [raProfilesSlice.name]: raProfilesSlice.reducer(current?.[raProfilesSlice.name] as never, action),
                    [secretsSlice.name]: secretsSlice.reducer(current?.[secretsSlice.name] as never, action),
                }) as never,
            middleware: (getDefaultMiddleware) => getDefaultMiddleware({ serializableCheck: false }).concat(serveProfile),
        });
        return { store, getRequest: () => request, onUpdate: (callback: () => void) => (render = callback) };
    });
    const [, setTick] = useState(0);
    state.onUpdate(() => setTick((tick) => tick + 1));

    return (
        <Provider store={state.store}>
            <MemoryRouter initialEntries={[`/acmeprofiles/edit/${UUID}`]}>
                <Routes>
                    <Route path="/acmeprofiles/edit/:id" element={<AcmeProfileForm acmeProfileId={UUID} />} />
                </Routes>
            </MemoryRouter>
            <pre data-testid="update-request">{JSON.stringify(state.getRequest() ?? null)}</pre>
        </Provider>
    );
}
