import type { Middleware, MiddlewareAPI, UnknownAction } from '@reduxjs/toolkit';
import { actions as appRedirectActions } from 'ducks/app-redirect';
import { actions as alertActions } from 'ducks/alerts';
import { actions as certificateActions } from 'ducks/certificates';
import { actions as keyActions, type ImportKeyAttributesRequest } from 'ducks/cryptographic-keys';
import { actions as customAttributeActions } from 'ducks/customAttributes';
import { actions as inspectionActions } from 'ducks/inspections';
import { actions as tokenProfileActions } from 'ducks/token-profiles';
import type { CustomAttributeModel } from 'types/attributes';
import type {
    BaseAttributeDto,
    CertificateImportResultDto,
    InspectionResponseDto,
    KeyTransferCapabilityDto,
    Resource,
    TokenProfileDto,
} from 'types/openapi';
import { nth, type SchemaAnswer } from '../../test-utils/testAnswers';

/**
 * An inspection answer; one that names a file, a passphrase or a token profile answers only a request sent with it. A failure
 * carries Core's HTTP `status`, if it had one.
 */
export type InspectAnswer = Readonly<{
    /** The file's content, base64-encoded. */
    file?: string;
    passphrase?: string;
    tokenProfileUuid?: string;
    inspection?: InspectionResponseDto;
    error?: string;
    status?: number;
}>;

/** The answer to one token profile listing, taken in order; a `pending` one leaves its listing in flight. */
export type ListingAnswer = Readonly<{ tokenProfiles?: TokenProfileDto[]; error?: string; pending?: boolean }>;

/** How one `getTokenProfileDetail` is answered: with the profile and its `keyTransfer`, left in flight, or refused. */
export type TokenProfileDetailAnswer = 'loaded' | 'pending' | 'failure';

/** The answer to one import request, taken in the order the requests are sent; a `pending` one leaves it in flight. */
export type ImportAnswer = Readonly<{ results?: CertificateImportResultDto[]; error?: string; pending?: boolean }>;

export type ImportWizardAnswers = Readonly<{
    inspectAnswers: InspectAnswer[];
    /** Answers every token profile listing, unless `profileListings` answers them one by one. */
    importableTokenProfiles?: TokenProfileDto[];
    profileListings?: ListingAnswer[];
    /** A listed profile's `keyTransfer`, answered for `getTokenProfileDetail`, keyed by profile uuid. */
    keyTransferByProfile?: Record<string, KeyTransferCapabilityDto>;
    /** The answers to `getTokenProfileDetail` for a listed profile, taken in order; each is `loaded` unless given. */
    profileDetailAnswers?: TokenProfileDetailAnswer[];
    /** Answers every import attribute schema listing, unless `importAttributeListings` answers them one by one. */
    importKeyAttributes?: BaseAttributeDto[];
    importAttributeListings?: SchemaAnswer[];
    certificateCustomAttributes?: CustomAttributeModel[];
    keyCustomAttributes?: CustomAttributeModel[];
    /** The resources whose custom attribute listing is left in flight. */
    pendingCustomAttributes?: Resource[];
    importAnswers?: ImportAnswer[];
    onAction?: (action: UnknownAction) => void;
}>;

/**
 * A middleware that answers the wizard's actions from the fixtures a test passes, in place of the epics — shared by
 * every harness that mounts `ImportWizard`, standalone or embedded. A failure is answered as its epic answers it, with
 * a `fetchError` that `Alerts` shows as the app's error alert. `answersProfileDetail` is false for a harness that
 * answers `getTokenProfileDetail` itself.
 */
export function importWizardTestMiddleware(
    {
        inspectAnswers,
        importableTokenProfiles,
        profileListings,
        keyTransferByProfile,
        profileDetailAnswers,
        importKeyAttributes,
        importAttributeListings,
        certificateCustomAttributes,
        keyCustomAttributes,
        pendingCustomAttributes,
        importAnswers,
        onAction,
    }: ImportWizardAnswers,
    answersProfileDetail = true,
): Middleware {
    let listingsAnswered = 0;
    let attributeListingsAnswered = 0;
    let importsAnswered = 0;
    let profileDetailsAnswered = 0;

    const inspect = (request: { file: string; passphrase?: string; tokenProfileUuid?: string }) => {
        const answer = inspectAnswers.find(
            (candidate) =>
                (candidate.file === undefined || candidate.file === request.file) &&
                (candidate.passphrase === undefined || candidate.passphrase === request.passphrase) &&
                (candidate.tokenProfileUuid === undefined || candidate.tokenProfileUuid === request.tokenProfileUuid),
        );
        return answer?.inspection
            ? inspectionActions.inspectFileSuccess({ inspection: answer.inspection })
            : inspectionActions.inspectFileFailure({ error: answer?.error ?? 'Failed to read the uploaded file', status: answer?.status });
    };

    const listProfiles = (api: MiddlewareAPI) => {
        const answer = nth(profileListings, listingsAnswered++) ?? { tokenProfiles: importableTokenProfiles ?? [] };
        if (answer.pending) return;
        if (answer.error) {
            api.dispatch(tokenProfileActions.listImportableTokenProfilesFailure({ error: answer.error }));
            api.dispatch(appRedirectActions.fetchError({ error: undefined, message: answer.error }));
        } else {
            api.dispatch(tokenProfileActions.listImportableTokenProfilesSuccess({ tokenProfiles: answer.tokenProfiles ?? [] }));
        }
    };

    const listImportAttributes = (api: MiddlewareAPI, request: ImportKeyAttributesRequest) => {
        const answer = nth(importAttributeListings, attributeListingsAnswered++) ?? { descriptors: importKeyAttributes };
        if (answer.error) {
            api.dispatch(keyActions.listImportKeyAttributeDescriptorsFailure({ request, error: answer.error }));
        } else if (!answer.pending) {
            api.dispatch(keyActions.listImportKeyAttributeDescriptorsSuccess({ request, attributeDescriptors: answer.descriptors ?? [] }));
        }
    };

    const answerProfileDetail = (api: MiddlewareAPI, uuid: string) => {
        const answer = nth(profileDetailAnswers, profileDetailsAnswered++) ?? 'loaded';
        const listed = [...(importableTokenProfiles ?? []), ...(profileListings ?? []).flatMap((each) => each.tokenProfiles ?? [])];
        const summary = listed.find((each) => each.uuid === uuid);
        if (answer === 'failure') {
            api.dispatch(tokenProfileActions.getTokenProfileDetailFailure({ error: 'Failed to get Token Profile detail' }));
        } else if (answer === 'loaded' && summary) {
            api.dispatch(
                tokenProfileActions.getTokenProfileDetailSuccess({
                    tokenProfile: { ...summary, attributes: [], keyTransfer: keyTransferByProfile?.[uuid] },
                }),
            );
        }
    };

    const importEntries = (api: MiddlewareAPI) => {
        const answer = nth(importAnswers, importsAnswered++);
        if (answer?.pending) return;
        if (answer?.results) {
            api.dispatch(certificateActions.importCertificatesSuccess({ results: answer.results }));
            return;
        }
        const error = answer?.error ?? 'Failed to import certificates and keys';
        api.dispatch(certificateActions.importCertificatesFailure({ error }));
        api.dispatch(appRedirectActions.fetchError({ error: undefined, message: error }));
    };

    return (api) => (next) => (action) => {
        const result = next(action);
        onAction?.(action as UnknownAction);
        if (inspectionActions.inspectFile.match(action)) {
            api.dispatch(inspect(action.payload.inspectionRequestDto));
        } else if (tokenProfileActions.listImportableTokenProfiles.match(action)) {
            listProfiles(api);
        } else if (answersProfileDetail && tokenProfileActions.getTokenProfileDetail.match(action)) {
            answerProfileDetail(api, action.payload.uuid);
        } else if (keyActions.listImportKeyAttributeDescriptors.match(action)) {
            listImportAttributes(api, action.payload);
        } else if (certificateActions.importCertificates.match(action)) {
            importEntries(api);
        } else if (customAttributeActions.listSecondaryResourceCustomAttributes.match(action)) {
            if (!pendingCustomAttributes?.includes(action.payload)) {
                api.dispatch(customAttributeActions.listSecondaryResourceCustomAttributesSuccess(certificateCustomAttributes ?? []));
            }
        } else if (customAttributeActions.listResourceCustomAttributes.match(action)) {
            if (!pendingCustomAttributes?.includes(action.payload)) {
                api.dispatch(customAttributeActions.listResourceCustomAttributesSuccess(keyCustomAttributes ?? []));
            }
        } else if (appRedirectActions.fetchError.match(action)) {
            api.dispatch(alertActions.error(action.payload.message));
        }
        return result;
    };
}
