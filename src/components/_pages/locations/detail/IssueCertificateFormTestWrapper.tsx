import { configureStore, type Middleware } from '@reduxjs/toolkit';
import { useMemo, useState } from 'react';
import { Provider } from 'react-redux';
import { MemoryRouter } from 'react-router';

import { testInitialState, testReducers } from 'ducks/test-reducers';
import type { AttributeDescriptorModel } from 'types/attributes';
import type { LocationResponseModel } from 'types/locations';
import type { RaProfileResponseModel } from 'types/ra-profiles';

import { IssueCertificateForm } from './index';

export type IssueCertificateFormTestWrapperProps = Readonly<{
    csrAttributeDescriptors: AttributeDescriptorModel[];
    onAction?: (action: { type: string; payload?: unknown }) => void;
}>;

const testLocation = { uuid: 'location-uuid', entityInstanceUuid: 'entity-uuid', name: 'Test Location' } as LocationResponseModel;

const testRaProfiles = [{ uuid: 'ra-1', name: 'RA One', authorityInstanceUuid: 'auth-1', enabled: true }] as RaProfileResponseModel[];

/**
 * Builds the store inside the mounted component, because Playwright CT cannot carry a live store
 * across the Node/browser boundary. See CertificateFormTestWrapper.tsx for the established precedent.
 */
export function IssueCertificateFormTestWrapper({ csrAttributeDescriptors, onAction }: IssueCertificateFormTestWrapperProps) {
    const store = useMemo(() => {
        const onActionMiddleware: Middleware = () => (next) => (action) => {
            onAction?.(action as { type: string; payload?: unknown });
            return next(action);
        };
        return configureStore({
            reducer: testReducers,
            middleware: (getDefaultMiddleware) => getDefaultMiddleware({ serializableCheck: false }).concat(onActionMiddleware),
            preloadedState: testInitialState,
        });
    }, [onAction]);

    const [issueCallbackAttributes, setIssueCallbackAttributes] = useState<AttributeDescriptorModel[]>([]);
    const [csrCallbackAttributes, setCsrCallbackAttributes] = useState<AttributeDescriptorModel[]>([]);

    return (
        <Provider store={store}>
            <MemoryRouter>
                <IssueCertificateForm
                    location={testLocation}
                    issuanceAttributeDescriptors={[]}
                    issueGroupAttributesCallbackAttributes={issueCallbackAttributes}
                    setIssueGroupAttributesCallbackAttributes={setIssueCallbackAttributes}
                    csrAttributeDescriptors={csrAttributeDescriptors}
                    csrGroupAttributesCallbackAttributes={csrCallbackAttributes}
                    setCsrGroupAttributesCallbackAttributes={setCsrCallbackAttributes}
                    resourceCustomAttributes={[]}
                    raProfiles={testRaProfiles}
                    isPushingCertificate={false}
                    setIssueDialog={() => {}}
                />
            </MemoryRouter>
        </Provider>
    );
}

export default IssueCertificateFormTestWrapper;
