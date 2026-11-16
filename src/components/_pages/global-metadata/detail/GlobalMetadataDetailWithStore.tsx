import { useState } from 'react';
import { Provider } from 'react-redux';
import { MemoryRouter, Route, Routes } from 'react-router';
import { createObjectPermissionStore } from 'components/_pages/test-utils/objectPermissionStore';
import { slice as globalMetadataSlice } from 'ducks/globalMetadata';
import { Resource, ResourceAction } from 'types/openapi';
import GlobalMetadataDetail from './index';

type Props = Readonly<{
    /** What the allowed-actions endpoint answered for the metadata; every action when omitted. */
    allowedActions?: ResourceAction[];
}>;

const globalMetadata = { uuid: 'metadata-1', name: 'owner', label: 'Owner', contentType: 'string', type: 'meta' };

export default function GlobalMetadataDetailWithStore({ allowedActions = Object.values(ResourceAction) }: Props) {
    const [store] = useState(() =>
        createObjectPermissionStore({
            resource: Resource.Attributes,
            uuid: globalMetadata.uuid,
            allowedActions,
            realSlices: [globalMetadataSlice],
            preloadedState: { globalMetadata: { ...globalMetadataSlice.getInitialState(), globalMetadata } },
        }),
    );

    return (
        <Provider store={store}>
            <MemoryRouter initialEntries={[`/globalmetadata/detail/${globalMetadata.uuid}`]}>
                <Routes>
                    <Route path="/globalmetadata/detail/:id" element={<GlobalMetadataDetail />} />
                </Routes>
            </MemoryRouter>
        </Provider>
    );
}
