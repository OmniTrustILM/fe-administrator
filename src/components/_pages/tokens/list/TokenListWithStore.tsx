import type { Slice, UnknownAction } from '@reduxjs/toolkit';
import { useState } from 'react';
import { Provider } from 'react-redux';
import { MemoryRouter } from 'react-router';
import { createObjectPermissionStore } from 'components/_pages/test-utils/objectPermissionStore';
import { testInitialState } from 'ducks/test-reducers';
import { actions as tokensActions, initialState as tokensInitialState, slice as tokensSlice } from 'ducks/tokens';
import { Resource, type ResourceAction } from 'types/openapi';
import TokenList from './index';

type Props = Readonly<{
    resourceActions: ResourceAction[];
    hasObjectAccess: boolean;
}>;

const token = { uuid: 'token-1', name: 'Token one', connectorUuid: 'connector-1', connectorName: 'Connector', tokenProfiles: 0 };

const tokensKeepingSeededRows = {
    name: tokensSlice.name,
    reducer: (state: typeof tokensInitialState | undefined, action: UnknownAction) =>
        tokensActions.listTokens.match(action) ? (state ?? tokensInitialState) : tokensSlice.reducer(state, action),
} as unknown as Slice;

export default function TokenListWithStore({ resourceActions, hasObjectAccess }: Props) {
    const [store] = useState(() =>
        createObjectPermissionStore({
            resource: Resource.Tokens,
            uuid: token.uuid,
            allowedActions: [],
            resourceGrants: [{ resource: Resource.Tokens, actions: resourceActions }],
            realSlices: [tokensKeepingSeededRows],
            preloadedState: {
                tokens: { ...tokensInitialState, tokens: [token] },
                resource: {
                    ...testInitialState.resource,
                    resourcesList: [{ resource: Resource.Tokens, hasObjectAccess, hasOwner: false }],
                },
            },
        }),
    );

    return (
        <Provider store={store}>
            <MemoryRouter initialEntries={['/tokens']}>
                <TokenList />
            </MemoryRouter>
        </Provider>
    );
}
