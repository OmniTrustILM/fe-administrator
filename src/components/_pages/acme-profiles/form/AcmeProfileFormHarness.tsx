import { configureStore, type Middleware, type UnknownAction } from '@reduxjs/toolkit';
import { useState } from 'react';
import { Provider, useSelector } from 'react-redux';
import { MemoryRouter, Route, Routes } from 'react-router';
import { actions as acmeProfilesActions, slice as acmeProfilesSlice } from 'ducks/acme-profiles';
import { actions as raProfilesActions, selectors as raProfilesSelectors, slice as raProfilesSlice } from 'ducks/ra-profiles';
import { slice as secretsSlice } from 'ducks/secrets';
import { actions as customAttributesActions, slice as customAttributesSlice } from 'ducks/customAttributes';
import { AttributeContentType, AttributeType, Resource } from 'types/openapi';
import { actions as groupsActions, slice as groupsSlice } from 'ducks/certificateGroups';
import { actions as usersActions, slice as usersSlice } from 'ducks/users';
import { testReducers } from 'ducks/test-reducers';
import type { AcmeProfileResponseModel } from 'types/acme-profiles';
import AcmeProfileForm from './index';

type Props = Readonly<{
    profile: Partial<AcmeProfileResponseModel>;
    /** When the RA profile list answers; it never does when omitted. */
    raProfilesDelayMs?: number;
    /** How the RA profile list answers: with one RA profile (default), with none, or with a failure. */
    raProfilesResult?: 'one' | 'empty' | 'fail';
    /** When the user and group lists answer, with owner 'user-1' (Alice) and groups 'group-1' (Admins) and 'group-2' (Ops); never when omitted. */
    associationsDelayMs?: number;
    /** When the attribute descriptors answer: the custom attribute 'customField' for ACME profiles and the RA profile's issue attribute 'issueField'. */
    descriptorsDelayMs?: number;
    /** The resource whose custom attribute descriptor request fails; both load when omitted. */
    failedCustomAttributes?: Resource.AcmeProfiles | Resource.Certificates;
}>;

const stringProperties = { required: false, readOnly: false, visible: true, list: false, multiSelect: false };
const customDescriptor = {
    type: AttributeType.Custom,
    name: 'customField',
    uuid: 'custom-1',
    contentType: AttributeContentType.String,
    version: 2,
    properties: { ...stringProperties, label: 'Custom Field' },
};
const issueDescriptor = {
    type: AttributeType.Data,
    name: 'issueField',
    uuid: 'issue-1',
    contentType: AttributeContentType.String,
    properties: { ...stringProperties, label: 'Issue Field' },
};

const UUID = 'acme-profile-1';

/**
 * The form editing one ACME profile that the store serves on request, with the RA profile list left empty as it is
 * while the list is still loading. The update request the form dispatches is rendered as JSON.
 */
export default function AcmeProfileFormHarness({
    profile,
    raProfilesDelayMs,
    raProfilesResult = 'one',
    associationsDelayMs,
    descriptorsDelayMs = 0,
    failedCustomAttributes,
}: Props) {
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
            if (type === usersActions.list.type && associationsDelayMs !== undefined) {
                const users = [{ uuid: 'user-1', username: 'alice', firstName: 'Alice', enabled: true }] as never;
                setTimeout(() => api.dispatch(usersActions.listSuccess({ users })), associationsDelayMs);
            }
            if (type === groupsActions.listGroups.type && associationsDelayMs !== undefined) {
                const groups = [
                    { uuid: 'group-1', name: 'Admins' },
                    { uuid: 'group-2', name: 'Ops' },
                ] as never;
                setTimeout(() => api.dispatch(groupsActions.listGroupsSuccess({ groups })), associationsDelayMs);
            }
            if (type === customAttributesActions.loadMultipleResourceCustomAttributes.type) {
                const answer = customAttributesActions.receiveMultipleResourceCustomAttributes(
                    [
                        { resource: Resource.AcmeProfiles, customAttributes: [customDescriptor] as never },
                        { resource: Resource.Certificates, customAttributes: [] },
                    ].map((entry) =>
                        entry.resource === failedCustomAttributes ? { ...entry, customAttributes: [], failed: true } : entry,
                    ),
                );
                setTimeout(() => api.dispatch(answer), descriptorsDelayMs);
            }
            if (type === raProfilesActions.listIssuanceAttributeDescriptors.type) {
                const answer = raProfilesActions.listIssuanceAttributesDescriptorsSuccess({
                    uuid: 'ra-1',
                    attributesDescriptors: [issueDescriptor] as never,
                });
                setTimeout(() => api.dispatch(answer), descriptorsDelayMs);
            }
            if (type === raProfilesActions.listRevocationAttributeDescriptors.type) {
                const answer = raProfilesActions.listRevocationAttributeDescriptorsSuccess({ uuid: 'ra-1', attributesDescriptors: [] });
                setTimeout(() => api.dispatch(answer), descriptorsDelayMs);
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
                    [customAttributesSlice.name]: customAttributesSlice.reducer(current?.[customAttributesSlice.name] as never, action),
                    [usersSlice.name]: usersSlice.reducer(current?.[usersSlice.name] as never, action),
                    [groupsSlice.name]: groupsSlice.reducer(current?.[groupsSlice.name] as never, action),
                }) as never,
            middleware: (getDefaultMiddleware) => getDefaultMiddleware({ serializableCheck: false }).concat(serveProfile),
        });
        return { store, getRequest: () => request, onUpdate: (callback: () => void) => (render = callback) };
    });
    const [updates, setUpdates] = useState(0);
    state.onUpdate(() => setUpdates((count) => count + 1));

    return (
        <Provider store={state.store}>
            <MemoryRouter initialEntries={[`/acmeprofiles/edit/${UUID}`]}>
                <Routes>
                    <Route path="/acmeprofiles/edit/:id" element={<AcmeProfileForm acmeProfileId={UUID} />} />
                </Routes>
            </MemoryRouter>
            <pre data-testid="update-request" data-updates={updates}>
                {JSON.stringify(state.getRequest() ?? null)}
            </pre>
            <LoadedRaProfiles />
        </Provider>
    );
}

function LoadedRaProfiles() {
    const raProfiles = useSelector(raProfilesSelectors.raProfiles);
    return <span data-testid="loaded-ra-profiles">{raProfiles.length}</span>;
}
