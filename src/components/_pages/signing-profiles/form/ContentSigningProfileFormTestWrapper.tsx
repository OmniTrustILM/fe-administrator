import { combineReducers, configureStore, type Middleware, type Reducer, type UnknownAction } from '@reduxjs/toolkit';
import { useState } from 'react';
import { Provider } from 'react-redux';
import { MemoryRouter, Route, Routes } from 'react-router';
import connectorsReducer from 'ducks/connectors';
import userInterfaceReducer from 'ducks/user-interface';
import signingProfilesReducer, { actions } from 'ducks/signing-profiles';
import type {
    BaseAttributeDto,
    CertificateDto,
    NameAndUuidDto,
    SignatureFamilyDeclaration,
    SignatureLevel,
    SigningProfileDto,
    SigningWorkflowType,
} from 'types/openapi';
import type { ConnectorResponseModel } from 'types/connectors';
import SigningProfileForm from './SigningProfileForm';

const identity =
    <S,>(initial: S): Reducer<S> =>
    (state) =>
        state ?? initial;

/** A signing certificate Core holds, with the purposes the certificate-purpose knobs filter on. */
export interface HeldCertificate {
    uuid: string;
    displayName: string;
    commonName: string;
    serialNumber: string;
    nonRepudiation?: boolean;
    extendedKeyUsageOids?: string[];
}

export interface CoreAnswers {
    connectorsByWorkflow: Partial<Record<SigningWorkflowType, Pick<ConnectorResponseModel, 'uuid' | 'name'>[]>>;
    declarationsByConnector: Record<string, SignatureFamilyDeclaration[]>;
    certificates: HeldCertificate[];
    profileAttributesByLevel?: Partial<Record<SignatureLevel, BaseAttributeDto[]>>;
    requestAttributesByLevel?: Partial<Record<SignatureLevel, BaseAttributeDto[]>>;
    /** Reason Core gives for refusing every profile-attribute listing. */
    profileAttributesRefusal?: string;
    /** Reason Core gives for refusing the profile-attribute listing at one level. */
    profileAttributeRefusalsByLevel?: Partial<Record<SignatureLevel, string>>;
    /** Leaves the profile-attribute listing unanswered. */
    profileAttributesPending?: boolean;
    /** Reason Core gives for refusing every certificate query; the queries succeed without it. */
    certificatesRefusal?: string;
    timestampSources?: {
        candidates: Pick<SigningProfileDto, 'uuid' | 'name' | 'enabled'>[];
        ineligible?: NameAndUuidDto[];
        unreadable: NameAndUuidDto[];
    };
    /** Leaves the timestamp-source listing unanswered. */
    timestampSourcesPending?: boolean;
    /** Profile the detail fetch returns. */
    editedProfile?: SigningProfileDto;
    /** Profile the route edits while its detail fetch stays unanswered. */
    pendingProfileUuid?: string;
    /** Profile an earlier page left in the store. */
    cachedProfile?: SigningProfileDto;
}

/** Requests the form sends, in order, as the action type without the slice prefix and its payload. */
export type RecordedRequest = { type: string; payload: unknown };

const recordedTypes = new Set<string>([
    actions.listSignatureFormattingConnectors.type,
    actions.listSigningCertificates.type,
    actions.listContentSigningProfileAttributes.type,
    actions.listTimestampSourceCandidates.type,
    actions.createSigningProfile.type,
    actions.updateSigningProfile.type,
]);

function answer(core: CoreAnswers, action: UnknownAction): UnknownAction | undefined {
    if (actions.listSignatureFormattingConnectors.match(action)) {
        const { workflowType } = action.payload;
        const connectors = (core.connectorsByWorkflow[workflowType] ?? []) as ConnectorResponseModel[];
        return actions.listSignatureFormattingConnectorsSuccess({ connectors });
    }
    if (actions.listSignatureFormattingConnectorDeclarations.match(action)) {
        const { connectorUuid } = action.payload;
        return actions.listSignatureFormattingConnectorDeclarationsSuccess({
            connectorUuid,
            declarations: core.declarationsByConnector[connectorUuid] ?? [],
        });
    }
    if (actions.listSigningCertificates.match(action)) {
        if (core.certificatesRefusal) return actions.listSigningCertificatesFailure({ error: core.certificatesRefusal });
        const { requireNonRepudiation, requiredExtendedKeyUsageOids = [] } = action.payload;
        const offered = core.certificates.filter(
            (certificate) =>
                (!requireNonRepudiation || certificate.nonRepudiation) &&
                requiredExtendedKeyUsageOids.every((oid) => certificate.extendedKeyUsageOids?.includes(oid)),
        );
        return actions.listSigningCertificatesSuccess({ signingCertificates: offered as CertificateDto[] });
    }
    if (actions.listContentSigningProfileAttributes.match(action)) {
        if (core.profileAttributesPending) return undefined;
        const refusal = core.profileAttributesRefusal ?? core.profileAttributeRefusalsByLevel?.[action.payload.level];
        if (refusal) return actions.listContentSigningProfileAttributesFailure({ reason: refusal });
        return actions.listContentSigningProfileAttributesSuccess({
            profileAttributes: core.profileAttributesByLevel?.[action.payload.level] ?? [],
            requestAttributes: core.requestAttributesByLevel?.[action.payload.level] ?? [],
        });
    }
    if (actions.listTimestampSourceCandidates.match(action)) {
        if (core.timestampSourcesPending) return undefined;
        const { candidates, ineligible = [], unreadable } = core.timestampSources ?? { candidates: [], unreadable: [] };
        return actions.listTimestampSourceCandidatesSuccess({ candidates: candidates as SigningProfileDto[], ineligible, unreadable });
    }
    if (actions.getSigningProfile.match(action) && core.editedProfile) {
        return actions.getSigningProfileSuccess({ signingProfile: core.editedProfile });
    }
    if (actions.listSignatureAttributesForCertificate.match(action)) {
        return actions.listSignatureAttributesForCertificateSuccess({ attributeDescriptors: [] });
    }
    return undefined;
}

/** Stands in for the epics: records the form's requests and answers each from `core`. */
function coreStandIn(core: CoreAnswers, onRequest: (request: RecordedRequest) => void): Middleware {
    return (store) => (next) => (action) => {
        const result = next(action);
        const { type, payload } = action as UnknownAction & { payload: unknown };
        if (recordedTypes.has(type)) {
            onRequest({ type: type.replace(/^signingProfiles\//, ''), payload });
        }
        const response = answer(core, action as UnknownAction);
        if (response) setTimeout(() => store.dispatch(response));
        return result;
    };
}

/** The signing-profile form over a store whose Core answers from `core`. Its requests are printed for assertions. */
export function ContentSigningProfileFormTestWrapper({ core }: Readonly<{ core: CoreAnswers }>) {
    const { editedProfile, cachedProfile } = core;
    const editedUuid = editedProfile?.uuid ?? core.pendingProfileUuid;
    const [requests, setRequests] = useState<RecordedRequest[]>([]);
    const [store] = useState(() => {
        const configured = configureStore({
            reducer: combineReducers({
                enums: identity({ platformEnums: {} }),
                signingProfiles: signingProfilesReducer,
                timeQualityConfigurations: identity({ timeQualityConfigurations: [], isFetchingList: false }),
                customAttributes: identity({ resourceCustomAttributesContents: [], isFetchingResourceCustomAttributes: false }),
                connectors: connectorsReducer,
                userInterface: userInterfaceReducer,
            }),
            middleware: (getDefaultMiddleware) =>
                getDefaultMiddleware({ serializableCheck: false }).concat(
                    coreStandIn(core, (request) => setRequests((previous) => [...previous, request])),
                ),
        });
        if (cachedProfile) configured.dispatch(actions.getSigningProfileSuccess({ signingProfile: cachedProfile }));
        return configured;
    });
    return (
        <Provider store={store}>
            <MemoryRouter initialEntries={[editedUuid ? `/signingprofiles/edit/${editedUuid}` : '/signingprofiles/add']}>
                <Routes>
                    <Route path="/signingprofiles/add" element={<SigningProfileForm />} />
                    <Route path="/signingprofiles/edit/:id" element={<SigningProfileForm />} />
                </Routes>
            </MemoryRouter>
            <output data-testid="requests">{JSON.stringify(requests)}</output>
        </Provider>
    );
}
