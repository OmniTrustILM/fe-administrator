import { combineReducers, configureStore, type Middleware } from '@reduxjs/toolkit';
import { useState } from 'react';
import { Provider } from 'react-redux';
import signingProfilesReducer, { actions, initialState } from 'ducks/signing-profiles';
import { type SignatureFamilyDeclaration, SigningWorkflowType } from 'types/openapi';
import type { ConnectorResponseModel } from 'types/connectors';
import ContentSigningFormattingFields, { type ContentSigningFormattingDraft } from './ContentSigningFormattingFields';

/** Declarations Core answers per connector UUID; `null` makes the fetch fail. */
export type DeclarationsByConnector = Record<string, SignatureFamilyDeclaration[] | null>;

type DeclarationsRequest = ReturnType<typeof actions.listSignatureFormattingConnectorDeclarations>['payload'];

/** Stands in for the epic: reports each declarations fetch and answers it from the given map. */
function declarationsAnswerer(
    declarationsByConnector: DeclarationsByConnector,
    onRequest: (request: DeclarationsRequest) => void,
): Middleware {
    return (store) => (next) => (action) => {
        const result = next(action);
        if (actions.listSignatureFormattingConnectorDeclarations.match(action)) {
            onRequest(action.payload);
            const { connectorUuid } = action.payload;
            const declarations = declarationsByConnector[connectorUuid];
            setTimeout(() =>
                store.dispatch(
                    declarations
                        ? actions.listSignatureFormattingConnectorDeclarationsSuccess({ connectorUuid, declarations })
                        : actions.listSignatureFormattingConnectorDeclarationsFailure({ connectorUuid, reason: 'Connector unreachable' }),
                ),
            );
        }
        return result;
    };
}

/** The picker over a store holding the given connectors. Its draft and declarations fetches are printed for assertions. */
export function ContentSigningFormattingFieldsTestWrapper({
    connectors,
    declarationsByConnector,
    initialDraft = {},
    signingProfileUuid,
    failedConnectorsFetch,
}: Readonly<{
    connectors: Pick<ConnectorResponseModel, 'uuid' | 'name'>[];
    declarationsByConnector: DeclarationsByConnector;
    initialDraft?: ContentSigningFormattingDraft;
    signingProfileUuid?: string;
    failedConnectorsFetch?: { reason?: string };
}>) {
    const [requests, setRequests] = useState<DeclarationsRequest[]>([]);
    const [store] = useState(() =>
        configureStore({
            reducer: combineReducers({ signingProfiles: signingProfilesReducer }),
            preloadedState: {
                signingProfiles: {
                    ...initialState,
                    signatureFormattingConnectors: connectors as ConnectorResponseModel[],
                    signatureFormattingConnectorsWorkflowType: SigningWorkflowType.ContentSigning,
                    failedSignatureFormattingConnectorsFetch: failedConnectorsFetch,
                },
            },
            middleware: (getDefaultMiddleware) =>
                getDefaultMiddleware({ serializableCheck: false }).concat(
                    declarationsAnswerer(declarationsByConnector, (request) => setRequests((previous) => [...previous, request])),
                ),
        }),
    );
    const [draft, setDraft] = useState(initialDraft);
    return (
        <Provider store={store}>
            <ContentSigningFormattingFields value={draft} onChange={setDraft} signingProfileUuid={signingProfileUuid} />
            <output data-testid="draft">{JSON.stringify(draft)}</output>
            <output data-testid="declarations-requests">{JSON.stringify(requests)}</output>
        </Provider>
    );
}
