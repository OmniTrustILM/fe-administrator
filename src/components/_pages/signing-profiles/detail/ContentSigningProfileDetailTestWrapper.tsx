import type { Middleware, UnknownAction } from '@reduxjs/toolkit';
import { useState } from 'react';
import { Provider } from 'react-redux';
import { Link, MemoryRouter, Route, Routes } from 'react-router';
import { createObjectPermissionStore } from 'components/_pages/test-utils/objectPermissionStore';
import { actions, slice as signingProfilesSlice } from 'ducks/signing-profiles';
import { slice as tspProfilesSlice } from 'ducks/tsp-profiles';
import {
    type BaseAttributeDto,
    Resource,
    ResourceAction,
    type SignatureFamilyDeclaration,
    type SigningProfileDto,
    type SigningProtocol,
} from 'types/openapi';
import SigningProfileDetail from './SigningProfileDetail';

export interface DetailCoreAnswers {
    profile: SigningProfileDto;
    /** Declarations of the profile's connector, or the reason Core gives for refusing them. */
    declarations: SignatureFamilyDeclaration[] | { refusal: string };
    /** Protocols Core supports for the profile's workflow, or the reason Core gives for refusing them. */
    supportedProtocols: SigningProtocol[] | { refusal: string };
    /** Request attributes the connector declares for the workflow, or the reason Core gives for refusing them. */
    requestAttributes: BaseAttributeDto[] | { refusal: string };
}

/** Route of a profile other than the one the page opens on. */
export const otherProfileRoute = '/signingprofiles/detail/sp-other';

/** A request the page sends, as the action type without the slice prefix and its payload. */
export type RecordedRequest = { type: string; payload: unknown };

const recordedTypes = new Set<string>([
    actions.getTspActivationDetails.type,
    actions.listSupportedProtocols.type,
    actions.listSignatureFormattingConnectorDeclarations.type,
    actions.listContentSigningProfileAttributes.type,
    actions.activateIlmNative.type,
    actions.deactivateIlmNative.type,
]);

function answer(core: DetailCoreAnswers, action: UnknownAction): UnknownAction | undefined {
    if (actions.getSigningProfile.match(action)) return actions.getSigningProfileSuccess({ signingProfile: core.profile });
    if (actions.listSignatureFormattingConnectorDeclarations.match(action)) {
        const { connectorUuid } = action.payload;
        if ('refusal' in core.declarations) {
            return actions.listSignatureFormattingConnectorDeclarationsFailure({ connectorUuid, reason: core.declarations.refusal });
        }
        return actions.listSignatureFormattingConnectorDeclarationsSuccess({ connectorUuid, declarations: core.declarations });
    }
    if (actions.listSupportedProtocols.match(action)) {
        if ('refusal' in core.supportedProtocols) return actions.listSupportedProtocolsFailure({ error: core.supportedProtocols.refusal });
        return actions.listSupportedProtocolsSuccess({ supportedProtocols: core.supportedProtocols });
    }
    if (actions.listContentSigningProfileAttributes.match(action)) {
        if ('refusal' in core.requestAttributes)
            return actions.listContentSigningProfileAttributesFailure({ reason: core.requestAttributes.refusal });
        return actions.listContentSigningProfileAttributesSuccess({ profileAttributes: [], requestAttributes: core.requestAttributes });
    }
    if (actions.activateIlmNative.match(action)) return actions.activateIlmNativeSuccess(action.payload);
    if (actions.deactivateIlmNative.match(action)) return actions.deactivateIlmNativeSuccess(action.payload);
    return undefined;
}

const withoutSlicePrefix = (type: string) => type.replace(/^signingProfiles\//, '');

/** Stands in for the epics: records the page's requests and the type of each answer it gives from `core`. */
function coreStandIn(core: DetailCoreAnswers, onRequest: (request: RecordedRequest) => void, onAnswer: (type: string) => void): Middleware {
    return (store) => (next) => (action) => {
        const result = next(action);
        const { type, payload } = action as UnknownAction & { payload: unknown };
        if (recordedTypes.has(type)) onRequest({ type: withoutSlicePrefix(type), payload });
        const response = answer(core, action as UnknownAction);
        if (response) {
            setTimeout(() => {
                store.dispatch(response);
                onAnswer(withoutSlicePrefix(response.type));
            });
        }
        return result;
    };
}

interface Props {
    core: DetailCoreAnswers;
    /** Actions the user may take on the profile; detail and update by default. */
    allowedActions?: ResourceAction[];
}

/** The signing-profile detail page over a store whose Core answers from `core`. */
export function ContentSigningProfileDetailTestWrapper({
    core,
    allowedActions = [ResourceAction.Detail, ResourceAction.Update],
}: Readonly<Props>) {
    const [requests, setRequests] = useState<RecordedRequest[]>([]);
    const [answers, setAnswers] = useState<string[]>([]);
    const [store] = useState(() =>
        createObjectPermissionStore({
            resource: Resource.SigningProfiles,
            uuid: core.profile.uuid,
            allowedActions,
            realSlices: [signingProfilesSlice, tspProfilesSlice],
            middleware: [
                coreStandIn(
                    core,
                    (request) => setRequests((previous) => [...previous, request]),
                    (type) => setAnswers((previous) => [...previous, type]),
                ),
            ],
        }),
    );

    return (
        <Provider store={store}>
            <MemoryRouter initialEntries={[`/signingprofiles/detail/${core.profile.uuid}`]}>
                <Routes>
                    <Route path="/signingprofiles/detail/:id" element={<SigningProfileDetail />} />
                </Routes>
                <Link to={otherProfileRoute}>Open another profile</Link>
            </MemoryRouter>
            <output data-testid="requests">{JSON.stringify(requests)}</output>
            <output data-testid="answers">{JSON.stringify(answers)}</output>
        </Provider>
    );
}
