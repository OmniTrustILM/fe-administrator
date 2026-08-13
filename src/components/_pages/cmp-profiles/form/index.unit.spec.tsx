import { configureStore } from '@reduxjs/toolkit';
import { act } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { Provider } from 'react-redux';
import { MemoryRouter } from 'react-router';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { reducers } from 'ducks/reducers';
import { actions as groupsActions } from 'ducks/certificateGroups';
import { actions as cmpActions } from 'ducks/cmp-profiles';
import { actions as customAttrActions } from 'ducks/customAttributes';
import { actions as userActions } from 'ducks/users';
import { CmpProfileDetailDtoVariantEnum, ProtectionMethod, Resource } from 'types/openapi';

import CmpProfileForm from './index';

// @ts-expect-error test env flag
globalThis.IS_REACT_ACT_ENVIRONMENT = true;

const user = { uuid: 'u-1', username: 'admin', enabled: true };
const group = { uuid: 'g-1', name: 'group-one' };

const profile = {
    uuid: 'cmp-1',
    name: 'cmp1',
    description: '',
    enabled: true,
    variant: CmpProfileDetailDtoVariantEnum.V2,
    requestProtectionMethod: ProtectionMethod.SharedSecret,
    responseProtectionMethod: ProtectionMethod.SharedSecret,
    customAttributes: [],
    certificateAssociations: { ownerUuid: 'u-1', groupUuids: ['g-1'], customAttributes: [] },
};

function createStore() {
    return configureStore({
        reducer: reducers,
        middleware: (getDefaultMiddleware) => getDefaultMiddleware({ serializableCheck: false, immutableCheck: false }),
    });
}

describe('CmpProfileForm (edit mode) challenge source', () => {
    let root: Root;
    let container: HTMLDivElement;

    beforeEach(() => {
        container = document.createElement('div');
        document.body.appendChild(container);
        root = createRoot(container);
    });

    afterEach(() => {
        act(() => root.unmount());
        container.remove();
        vi.clearAllMocks();
    });

    async function renderForm(store: ReturnType<typeof createStore>, cmpProfile: any = profile) {
        await act(async () => {
            root.render(
                <Provider store={store}>
                    <MemoryRouter initialEntries={['/']}>
                        <CmpProfileForm cmpProfileId="cmp-1" />
                    </MemoryRouter>
                </Provider>,
            );
        });
        await act(async () => {
            store.dispatch(cmpActions.getCmpProfileSuccess({ cmpProfile }));
            store.dispatch(userActions.listSuccess({ users: [user] as any }));
            store.dispatch(groupsActions.listGroupsSuccess({ groups: [group] as any }));
            store.dispatch(
                customAttrActions.receiveMultipleResourceCustomAttributes([
                    { resource: Resource.CmpProfiles, customAttributes: [] },
                    { resource: Resource.Certificates, customAttributes: [] },
                ]),
            );
        });
        await act(async () => {});
    }

    async function submitAndCaptureUpdate(store: ReturnType<typeof createStore>, dispatched: unknown[]) {
        const form = container.querySelector('form') as HTMLFormElement;
        await act(async () => {
            form.dispatchEvent(new Event('submit', { bubbles: true, cancelable: true }));
        });
        await act(async () => {});
        return dispatched.find((a: any) => a.type === cmpActions.updateCmpProfile.type) as any;
    }

    function trackedStore() {
        const store = createStore();
        const dispatched: unknown[] = [];
        const originalDispatch = store.dispatch;
        (store as any).dispatch = (action: any) => {
            dispatched.push(action);
            return originalDispatch(action);
        };
        return { store, dispatched };
    }

    it('shows the challenge source selector and the shared secret field for a protocolDefault profile', async () => {
        await renderForm(createStore());

        expect(container.querySelector('[data-testid="select-challengeSource-trigger"]')).toBeTruthy();
        expect(container.querySelector('#sharedSecret')).toBeTruthy();
    });

    it('hides the shared secret field for a certificateRegistration profile', async () => {
        await renderForm(createStore(), { ...profile, challengeSource: 'certificateRegistration' });

        // The per-registration challenge is the MAC secret — a stored profile secret is not configurable.
        expect(container.querySelector('[data-testid="select-challengeSource-trigger"]')).toBeTruthy();
        expect(container.querySelector('#sharedSecret')).toBeNull();
    });

    it('sends the stored challenge source and no shared secret for a certificateRegistration profile', async () => {
        const { store, dispatched } = trackedStore();
        await renderForm(store, { ...profile, challengeSource: 'certificateRegistration' });

        const update = await submitAndCaptureUpdate(store, dispatched);
        expect(update).toBeTruthy();
        expect(update.payload.updateCmpRequest.challengeSource).toBe('certificateRegistration');
        expect(update.payload.updateCmpRequest.sharedSecret).toBeUndefined();
    });

    it('defaults the challenge source to protocolDefault when the profile has none', async () => {
        const { store, dispatched } = trackedStore();
        await renderForm(store);

        const update = await submitAndCaptureUpdate(store, dispatched);
        expect(update).toBeTruthy();
        expect(update.payload.updateCmpRequest.challengeSource).toBe('protocolDefault');
    });
});
