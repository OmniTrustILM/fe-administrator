import type { AppEpic } from 'ducks';
import { of } from 'rxjs';
import { catchError, filter, map, mergeMap, switchMap } from 'rxjs/operators';
import { FunctionGroupCode } from 'types/openapi';
import { extractError } from 'utils/net';
import { actions as alertActions } from './alerts';
import { actions as appRedirectActions } from './app-redirect';
import { slice } from './tokens';
import { transformAttributeDescriptorDtoToModel } from './transform/attributes';
import { transformConnectorResponseDtoToModel } from './transform/connectors';
import { actions as userInterfaceActions } from './user-interface';

import { LockWidgetNameEnum } from 'types/user-interface';
import {
    transformTokenDetailResponseDtoToModel,
    transformTokenRequestModelToDto,
    transformTokenResponseDtoToModel,
} from './transform/tokens';

const listTokens: AppEpic = (action$, state$, deps) => {
    return action$.pipe(
        filter(slice.actions.listTokens.match),
        switchMap(() =>
            deps.apiClients.tokenInstances.listTokenInstances().pipe(
                switchMap((tokens) =>
                    of(
                        slice.actions.listTokensSuccess({
                            tokenList: tokens.map(transformTokenResponseDtoToModel),
                        }),
                        userInterfaceActions.removeWidgetLock(LockWidgetNameEnum.TokenStore),
                    ),
                ),

                catchError((err) =>
                    of(
                        slice.actions.listTokensFailure({ error: extractError(err, 'Failed to get Tokens list') }),
                        userInterfaceActions.insertWidgetLock(err, LockWidgetNameEnum.TokenStore),
                    ),
                ),
            ),
        ),
    );
};

const getTokenDetail: AppEpic = (action$, state$, deps) => {
    return action$.pipe(
        filter(slice.actions.getTokenDetail.match),

        switchMap((action) =>
            deps.apiClients.tokenInstances.getTokenInstance({ uuid: action.payload.uuid }).pipe(
                switchMap((tokenDto) =>
                    of(
                        slice.actions.getTokenDetailSuccess({ token: transformTokenDetailResponseDtoToModel(tokenDto) }),
                        userInterfaceActions.removeWidgetLock(LockWidgetNameEnum.TokenDetails),
                    ),
                ),

                catchError((err) =>
                    of(
                        slice.actions.getTokenDetailFailure({ error: extractError(err, 'Failed to get Token detail') }),
                        userInterfaceActions.insertWidgetLock(err, LockWidgetNameEnum.TokenDetails),
                    ),
                ),
            ),
        ),
    );
};

const listTokenProviders: AppEpic = (action$, state, deps) => {
    return action$.pipe(
        filter(slice.actions.listTokenProviders.match),
        switchMap(() =>
            deps.apiClients.connectors.listConnectors({ functionGroup: FunctionGroupCode.CryptographyProvider }).pipe(
                map((providers) =>
                    slice.actions.listTokenProvidersSuccess({
                        connectors: providers.map(transformConnectorResponseDtoToModel),
                    }),
                ),

                catchError((err) =>
                    of(
                        slice.actions.listTokenProvidersFailure({ error: extractError(err, 'Failed to get Cryptography Provider list') }),
                        appRedirectActions.fetchError({ error: err, message: 'Failed to get Cryptography Provider list' }),
                    ),
                ),
            ),
        ),
    );
};

const getTokenProviderAttributesDescriptors: AppEpic = (action$, state, deps) => {
    return action$.pipe(
        filter(slice.actions.getTokenProviderAttributesDescriptors.match),
        switchMap((action) =>
            deps.apiClients.connectors
                .getAttributes({
                    uuid: action.payload.uuid,
                    functionGroup: FunctionGroupCode.CryptographyProvider,
                    kind: action.payload.kind,
                })
                .pipe(
                    map((attributeDescriptors) =>
                        slice.actions.getTokenProviderAttributesDescriptorsSuccess({
                            attributeDescriptor: attributeDescriptors.map(transformAttributeDescriptorDtoToModel),
                        }),
                    ),

                    catchError((err) =>
                        of(
                            slice.actions.getTokenProviderAttributeDescriptorsFailure({
                                error: extractError(err, 'Failed to get Cryptography Provider Attribute Descriptor list'),
                            }),
                            appRedirectActions.fetchError({
                                error: err,
                                message: 'Failed to get Cryptography Provider Attribute Descriptor list',
                            }),
                        ),
                    ),
                ),
        ),
    );
};

const getTokenProfileAttributesDescriptors: AppEpic = (action$, state, deps) => {
    return action$.pipe(
        filter(slice.actions.getTokenProfileAttributesDescriptors.match),
        switchMap((action) =>
            deps.apiClients.tokenInstances.listTokenProfileAttributes({ uuid: action.payload.tokenUuid }).pipe(
                map((descriptors) =>
                    slice.actions.getTokenProfileAttributesDescriptorsSuccess({
                        tokenUuid: action.payload.tokenUuid,
                        attributesDescriptors: descriptors.map(transformAttributeDescriptorDtoToModel),
                    }),
                ),

                catchError((err) =>
                    of(
                        slice.actions.getTokenProfileAttributesDescriptorsFailure({
                            error: extractError(err, 'Failed to get Token Profile Attribute Descriptor list'),
                        }),
                        appRedirectActions.fetchError({ error: err, message: 'Failed to get Token Profile Attribute Descriptor list' }),
                    ),
                ),
            ),
        ),
    );
};

const getTokenActivationAttributesDescriptors: AppEpic = (action$, state, deps) => {
    return action$.pipe(
        filter(slice.actions.listActivationAttributeDescriptors.match),
        switchMap((action) =>
            deps.apiClients.tokenInstances.listTokenInstanceActivationAttributes({ uuid: action.payload.uuid }).pipe(
                map((descriptors) =>
                    slice.actions.listActivationAttributesDescriptorsSuccess({
                        uuid: action.payload.uuid,
                        attributesDescriptors: descriptors.map(transformAttributeDescriptorDtoToModel),
                    }),
                ),

                catchError((err) =>
                    of(
                        slice.actions.listActivationAttributesFailure({
                            error: extractError(err, 'Failed to get Activation Attribute Descriptor list'),
                        }),
                        appRedirectActions.fetchError({ error: err, message: 'Failed to get Activation Attribute Descriptor list' }),
                    ),
                ),
            ),
        ),
    );
};

const createToken: AppEpic = (action$, state$, deps) => {
    return action$.pipe(
        filter(slice.actions.createToken.match),
        switchMap((action) =>
            deps.apiClients.tokenInstances
                .createTokenInstance({ tokenInstanceRequestDto: transformTokenRequestModelToDto(action.payload) })
                .pipe(
                    mergeMap((obj) =>
                        of(
                            slice.actions.createTokenSuccess({ uuid: obj.uuid }),
                            appRedirectActions.redirect({ url: `../tokens/detail/${obj.uuid}` }),
                        ),
                    ),

                    catchError((err) =>
                        of(
                            slice.actions.createTokenFailure({ error: extractError(err, 'Failed to create Token') }),
                            appRedirectActions.fetchError({ error: err, message: 'Failed to create Token' }),
                        ),
                    ),
                ),
        ),
    );
};

const updateToken: AppEpic = (action$, state$, deps) => {
    return action$.pipe(
        filter(slice.actions.updateToken.match),

        switchMap((action) =>
            deps.apiClients.tokenInstances
                .updateTokenInstance({
                    uuid: action.payload.uuid,
                    tokenInstanceRequestDto: transformTokenRequestModelToDto(action.payload.updateToken),
                })
                .pipe(
                    mergeMap((tokenDto) =>
                        of(
                            slice.actions.updateTokenSuccess({ token: transformTokenDetailResponseDtoToModel(tokenDto) }),
                            appRedirectActions.redirect({ url: `../../tokens/detail/${tokenDto.uuid}` }),
                        ),
                    ),

                    catchError((err) =>
                        of(
                            slice.actions.updateTokenFailure({ error: extractError(err, 'Failed to update Token') }),
                            appRedirectActions.fetchError({ error: err, message: 'Failed to update Token' }),
                        ),
                    ),
                ),
        ),
    );
};

const deleteToken: AppEpic = (action$, state$, deps) => {
    return action$.pipe(
        filter(slice.actions.deleteToken.match),
        switchMap((action) =>
            deps.apiClients.tokenInstances.deleteTokenInstance({ uuid: action.payload.uuid }).pipe(
                mergeMap(() =>
                    of(
                        slice.actions.deleteTokenSuccess({ uuid: action.payload.uuid }),
                        appRedirectActions.redirect({ url: '../../tokens' }),
                    ),
                ),

                catchError((err) =>
                    of(
                        slice.actions.deleteTokenFailure({ error: extractError(err, 'Failed to delete Token') }),
                        appRedirectActions.fetchError({ error: err, message: 'Failed to delete Token' }),
                    ),
                ),
            ),
        ),
    );
};

const activateToken: AppEpic = (action$, state$, deps) => {
    return action$.pipe(
        filter(slice.actions.activateToken.match),
        switchMap((action) =>
            deps.apiClients.tokenInstances
                .activateTokenInstance({ uuid: action.payload.uuid, requestAttribute: action.payload.request })
                .pipe(
                    mergeMap(() => of(slice.actions.activateTokenSuccess({ uuid: action.payload.uuid }))),

                    catchError((err) =>
                        of(
                            slice.actions.deleteTokenFailure({ error: extractError(err, 'Failed to activate Token') }),
                            appRedirectActions.fetchError({ error: err, message: 'Failed to activate Token' }),
                        ),
                    ),
                ),
        ),
    );
};

const deactivateToken: AppEpic = (action$, state$, deps) => {
    return action$.pipe(
        filter(slice.actions.deactivateToken.match),
        switchMap((action) =>
            deps.apiClients.tokenInstances.deactivateTokenInstance({ uuid: action.payload.uuid }).pipe(
                mergeMap(() => of(slice.actions.deactivateTokenSuccess({ uuid: action.payload.uuid }))),

                catchError((err) =>
                    of(
                        slice.actions.deactivateTokenFailure({ error: extractError(err, 'Failed to activate Token') }),
                        appRedirectActions.fetchError({ error: err, message: 'Failed to activate Token' }),
                    ),
                ),
            ),
        ),
    );
};

const reloadToken: AppEpic = (action$, state$, deps) => {
    return action$.pipe(
        filter(slice.actions.reloadToken.match),

        switchMap((action) =>
            deps.apiClients.tokenInstances.reloadStatus({ uuid: action.payload.uuid }).pipe(
                map((tokenDto) => slice.actions.reloadSuccess({ token: transformTokenDetailResponseDtoToModel(tokenDto) })),

                catchError((err) =>
                    of(
                        slice.actions.reloadFailure({ error: extractError(err, 'Failed to get Token detail') }),
                        appRedirectActions.fetchError({ error: err, message: 'Failed to get Token detail' }),
                    ),
                ),
            ),
        ),
    );
};

const bulkDeleteToken: AppEpic = (action$, state$, deps) => {
    return action$.pipe(
        filter(slice.actions.bulkDeleteToken.match),
        switchMap((action) =>
            deps.apiClients.tokenInstances.deleteTokenInstance1({ requestBody: action.payload.uuids }).pipe(
                mergeMap(() =>
                    of(
                        slice.actions.bulkDeleteTokenSuccess({ uuids: action.payload.uuids }),
                        alertActions.success('Selected tokens successfully deleted.'),
                    ),
                ),

                catchError((err) =>
                    of(
                        slice.actions.bulkDeleteTokenFailure({ error: extractError(err, 'Failed to bulk delete Tokens') }),
                        appRedirectActions.fetchError({ error: err, message: 'Failed to bulk delete Tokens' }),
                    ),
                ),
            ),
        ),
    );
};

const epics = [
    listTokens,
    getTokenDetail,
    listTokenProviders,
    getTokenProviderAttributesDescriptors,
    getTokenProfileAttributesDescriptors,
    getTokenActivationAttributesDescriptors,
    createToken,
    updateToken,
    deleteToken,
    bulkDeleteToken,
    activateToken,
    deactivateToken,
    reloadToken,
];

export default epics;
