import { of } from 'rxjs';
import { catchError, filter, map, switchMap } from 'rxjs/operators';

import type { AppEpic } from 'ducks';
import { extractError } from 'utils/net';

import { actions as appRedirectActions } from './app-redirect';
import { slice } from './cryptographic-operations';

import { transformAttributeDescriptorDtoToModel } from './transform/attributes';
import {
    transformCryptographicKeyRandomDataRequestModelToDto,
    transformCryptographicKeyRandomDataResponseDtoToModel,
    transformCryptographicKeySignDataResponseDtoToModel,
    transformCryptographicKeySignRequestModelToDto,
    transformCryptographicKeyVerifyDataResponseDtoToModel,
    transformCryptographicKeyVerifyRequestModelToDto,
} from './transform/cryptographic-operations';

const getSignatureAttributesDescriptors: AppEpic = (action$, state, deps) => {
    return action$.pipe(
        filter(slice.actions.listSignatureAttributeDescriptors.match),
        switchMap((action) => {
            const client = deps.apiClients.cryptographicOperations;
            const key = {
                tokenInstanceUuid: action.payload.tokenInstanceUuid,
                keyItemUuid: action.payload.keyItemUuid,
                tokenProfileUuid: action.payload.tokenProfileUuid,
                uuid: action.payload.uuid,
            };
            const attributes$ = action.payload.operation === 'sign' ? client.listSignAttributes(key) : client.listVerifyAttributes(key);
            return attributes$.pipe(
                map((descriptors) =>
                    slice.actions.listSignatureAttributeDescriptorsSuccess({
                        uuid: action.payload.uuid,
                        attributeDescriptors: descriptors.map(transformAttributeDescriptorDtoToModel),
                        store: action.payload.store,
                    }),
                ),

                catchError((err) =>
                    of(
                        slice.actions.listSignatureAttributesFailure({
                            error: extractError(err, 'Failed to get Signature Attribute Descriptor list'),
                        }),
                        appRedirectActions.fetchError({ error: err, message: 'Failed to get Signature Attribute Descriptor list' }),
                    ),
                ),
            );
        }),
    );
};

const getRandomAttributesDescriptors: AppEpic = (action$, state, deps) => {
    return action$.pipe(
        filter(slice.actions.listRandomAttributeDescriptors.match),
        switchMap((action) =>
            deps.apiClients.cryptographicOperations
                .listRandomAttributes({
                    tokenInstanceUuid: action.payload.tokenInstanceUuid,
                })
                .pipe(
                    map((descriptors) =>
                        slice.actions.listRandomAttributeDescriptorsSuccess({
                            uuid: action.payload.tokenInstanceUuid,
                            attributeDescriptors: descriptors.map(transformAttributeDescriptorDtoToModel),
                        }),
                    ),

                    catchError((err) =>
                        of(
                            slice.actions.listRandomAttributesFailure({
                                error: extractError(err, 'Failed to get Random Data Generation Attribute Descriptor list'),
                            }),
                            appRedirectActions.fetchError({
                                error: err,
                                message: 'Failed to get Random Data Generation Attribute Descriptor list',
                            }),
                        ),
                    ),
                ),
        ),
    );
};

const signData: AppEpic = (action$, state$, deps) => {
    return action$.pipe(
        filter(slice.actions.signData.match),

        switchMap((action) =>
            deps.apiClients.cryptographicOperations
                .signData({
                    tokenInstanceUuid: action.payload.tokenInstanceUuid,
                    uuid: action.payload.uuid,
                    tokenProfileUuid: action.payload.tokenProfileUuid,
                    keyItemUuid: action.payload.keyItemUuid,
                    signDataRequestDto: transformCryptographicKeySignRequestModelToDto(action.payload.request),
                })
                .pipe(
                    map((response) =>
                        slice.actions.signDataSuccess({
                            uuid: action.payload.uuid,
                            signature: transformCryptographicKeySignDataResponseDtoToModel(response),
                        }),
                    ),

                    catchError((err) =>
                        of(
                            slice.actions.signDataFailure({ error: extractError(err, 'Failed to Sign the data') }),
                            appRedirectActions.fetchError({ error: err, message: 'Failed to Sign the data' }),
                        ),
                    ),
                ),
        ),
    );
};

const verifyData: AppEpic = (action$, state$, deps) => {
    return action$.pipe(
        filter(slice.actions.verifyData.match),

        switchMap((action) =>
            deps.apiClients.cryptographicOperations
                .verifyData({
                    tokenInstanceUuid: action.payload.tokenInstanceUuid,
                    uuid: action.payload.uuid,
                    tokenProfileUuid: action.payload.tokenProfileUuid,
                    keyItemUuid: action.payload.keyItemUuid,
                    verifyDataRequestDto: transformCryptographicKeyVerifyRequestModelToDto(action.payload.request),
                })
                .pipe(
                    map((response) =>
                        slice.actions.verifyDataSuccess({
                            uuid: action.payload.uuid,
                            signature: transformCryptographicKeyVerifyDataResponseDtoToModel(response),
                        }),
                    ),

                    catchError((err) =>
                        of(
                            slice.actions.verifyDataFailure({ error: extractError(err, 'Failed to Verify the data') }),
                            appRedirectActions.fetchError({ error: err, message: 'Failed to Verify the data' }),
                        ),
                    ),
                ),
        ),
    );
};

const generateRandomData: AppEpic = (action$, state$, deps) => {
    return action$.pipe(
        filter(slice.actions.generateRandomData.match),

        switchMap((action) =>
            deps.apiClients.cryptographicOperations
                .randomData({
                    tokenInstanceUuid: action.payload.tokenInstanceUuid,
                    randomDataRequestDto: transformCryptographicKeyRandomDataRequestModelToDto(action.payload.request),
                })
                .pipe(
                    map((response) =>
                        slice.actions.generateRandomDataSuccess({
                            uuid: action.payload.tokenInstanceUuid,
                            randomData: transformCryptographicKeyRandomDataResponseDtoToModel(response),
                        }),
                    ),

                    catchError((err) =>
                        of(
                            slice.actions.generateRandomDataFailure({ error: extractError(err, 'Failed to generate random data') }),
                            appRedirectActions.fetchError({ error: err, message: 'Failed to generate random data' }),
                        ),
                    ),
                ),
        ),
    );
};

const epics = [getSignatureAttributesDescriptors, getRandomAttributesDescriptors, signData, verifyData, generateRandomData];

export default epics;
