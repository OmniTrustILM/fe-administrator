import type { UnknownAction } from '@reduxjs/toolkit';
import { useMemo, useState } from 'react';

import type { AttributeDescriptorModel } from 'types/attributes';
import type { LocationResponseModel } from 'types/locations';
import type { RaProfileResponseModel } from 'types/ra-profiles';
import { createMockStore, withProviders } from 'utils/test-helpers';

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
        const mockStore = createMockStore();
        const dispatch = mockStore.dispatch;
        mockStore.dispatch = ((action: UnknownAction) => {
            onAction?.(action);
            return dispatch(action);
        }) as typeof dispatch;
        return mockStore;
    }, [onAction]);

    const [issueCallbackAttributes, setIssueCallbackAttributes] = useState<AttributeDescriptorModel[]>([]);
    const [csrCallbackAttributes, setCsrCallbackAttributes] = useState<AttributeDescriptorModel[]>([]);

    return withProviders(
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
        />,
        { store },
    );
}

export default IssueCertificateFormTestWrapper;
