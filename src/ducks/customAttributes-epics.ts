import type { AppEpic, AppState } from 'ducks';
import type { AnyAction } from '@reduxjs/toolkit';
import { of, forkJoin, type Observable } from 'rxjs';
import { catchError, filter, map, mergeMap, switchMap } from 'rxjs/operators';

import { extractError } from 'utils/net';
import { actions as alertActions } from './alerts';
import { actions as appRedirectActions } from './app-redirect';
import { slice } from './customAttributes';
import { transformAttributeResponseDtoToModel, transformCustomAttributeDtoToModel } from './transform/attributes';
import { actions as userInterfaceActions } from './user-interface';

import { LockWidgetNameEnum } from 'types/user-interface';
import { AttributeVersion, Resource } from 'types/openapi';
import {
    transformCustomAttributeCreateRequestModelToDto,
    transformCustomAttributeDetailResponseDtoToModel,
    transformCustomAttributeResponseDtoToModel,
    transformCustomAttributeUpdateRequestModelToDto,
} from './transform/customAttributes';
import { actions as vaultProfileActions } from './vault-profiles';
import { actions as secretActions } from './secrets';
import { actions as vaultActions } from './vaults';
import type { AttributeRequestModel, AttributeResponseDto, AttributeResponseModel } from 'types/attributes';

const normalizeAttributeVersion = (version: unknown): AttributeVersion => {
    if (version === AttributeVersion.V3 || version === 'v3' || version === '3' || version === 3) {
        return AttributeVersion.V3;
    }
    return AttributeVersion.V2;
};

const toAttributeRequestModel = (attribute: AttributeResponseModel): AttributeRequestModel => {
    const version = normalizeAttributeVersion(attribute.version);
    const content = structuredClone(attribute.content ?? []);

    return {
        uuid: attribute.uuid,
        name: attribute.name,
        contentType: attribute.contentType,
        version,
        content:
            version === AttributeVersion.V3
                ? content.map((item: Record<string, unknown>) => ({
                      ...item,
                      contentType: item.contentType ?? attribute.contentType,
                  }))
                : content,
    };
};

const getVaultProfileCurrentAttributes = (state: AppState, resourceUuid: string) => {
    if (state.vaultProfiles.vaultProfile?.uuid !== resourceUuid) return undefined;
    return state.vaultProfiles.vaultProfile.attributes.map(transformAttributeResponseDtoToModel);
};

const getVaultProfileCurrentCustomAttributes = (state: AppState, resourceUuid: string) => {
    const fromCache = state.customAttributes.resourceCustomAttributesContents.find(
        (entry) => entry.resource === Resource.VaultProfiles && entry.resourceUuid === resourceUuid,
    )?.customAttributes;

    if (fromCache) return fromCache;

    return state.vaultProfiles.vaultProfile?.uuid === resourceUuid
        ? (state.vaultProfiles.vaultProfile.customAttributes ?? []).map(transformAttributeResponseDtoToModel)
        : undefined;
};

const getVaultCurrentAttributes = (state: AppState, resourceUuid: string) => {
    if (state.vaults.vault?.uuid !== resourceUuid) return undefined;
    return state.vaults.vault.attributes.map(transformAttributeResponseDtoToModel);
};

const getVaultCurrentCustomAttributes = (state: AppState, resourceUuid: string) => {
    const fromCache = state.customAttributes.resourceCustomAttributesContents.find(
        (entry) => entry.resource === Resource.Vaults && entry.resourceUuid === resourceUuid,
    )?.customAttributes;

    if (fromCache) return fromCache;

    return state.vaults.vault?.uuid === resourceUuid
        ? (state.vaults.vault.customAttributes ?? []).map(transformAttributeResponseDtoToModel)
        : undefined;
};

const createContentPayload = (resource: Resource, resourceUuid: string, customAttributes: AttributeResponseDto[]) => ({
    resource,
    resourceUuid,
    customAttributes: customAttributes.map(transformAttributeResponseDtoToModel),
});

const createContentFailureAction = (operation: 'update' | 'remove', resource: Resource, resourceUuid: string, err: unknown) => {
    const message = `Failed to ${operation} custom attribute content`;
    const payload = {
        resource,
        resourceUuid,
        error: extractError(err as Error, message),
    };

    return operation === 'update'
        ? slice.actions.updateCustomAttributeContentFailure(payload)
        : slice.actions.removeCustomAttributeContentFailure(payload);
};

const createContentSuccessAction = (
    operation: 'update' | 'remove',
    resource: Resource,
    resourceUuid: string,
    customAttributes: AttributeResponseDto[],
) =>
    operation === 'update'
        ? slice.actions.updateCustomAttributeContentSuccess(createContentPayload(resource, resourceUuid, customAttributes))
        : slice.actions.removeCustomAttributeContentSuccess(createContentPayload(resource, resourceUuid, customAttributes));

const createContentFailureWithRedirect = (operation: 'update' | 'remove', resource: Resource, resourceUuid: string, err: unknown) => {
    const message = `Failed to ${operation} custom attribute content`;

    return of(
        createContentFailureAction(operation, resource, resourceUuid, err),
        appRedirectActions.fetchError({ error: err as Error, message }),
    );
};

const buildNextCustomAttributes = (
    operation: 'update' | 'remove',
    state: AppState,
    attributeUuid: string,
    content: AttributeResponseModel['content'] | undefined,
    currentCustomAttributes: AttributeResponseModel[],
): AttributeResponseModel[] | undefined => {
    if (operation === 'remove') {
        return currentCustomAttributes.filter((entry) => entry.uuid !== attributeUuid);
    }

    const updatedAttribute = resolveUpdatedAttribute(state, attributeUuid, content, currentCustomAttributes);

    if (!updatedAttribute) {
        return undefined;
    }

    return [...currentCustomAttributes.filter((entry) => entry.uuid !== attributeUuid), updatedAttribute];
};

type ContentOperation = 'update' | 'remove';

type ContentActionPayload = {
    resource: Resource;
    resourceUuid: string;
    attributeUuid: string;
    content?: AttributeResponseModel['content'];
};

const createMissingContextError = (operation: ContentOperation, resource: Resource): Error => {
    if (resource === Resource.Vaults) {
        return new Error(`Vault context is not available for custom attribute ${operation === 'update' ? 'update' : 'removal'}`);
    }

    if (resource === Resource.VaultProfiles) {
        return new Error(`Vault profile context is not available for custom attribute ${operation === 'update' ? 'update' : 'removal'}`);
    }

    return new Error(`Secret context is not available for custom attribute ${operation === 'update' ? 'update' : 'removal'}`);
};

const handleVaultsContentUpdate = (
    operation: ContentOperation,
    payload: ContentActionPayload,
    state: AppState,
    deps: any,
): Observable<AnyAction> => {
    const currentVault = state.vaults.vault;
    const currentAttributes = getVaultCurrentAttributes(state, payload.resourceUuid);
    const currentCustomAttributes = getVaultCurrentCustomAttributes(state, payload.resourceUuid);

    if (currentVault?.uuid !== payload.resourceUuid || !currentAttributes || !currentCustomAttributes) {
        return of(
            createContentFailureAction(
                operation,
                payload.resource,
                payload.resourceUuid,
                createMissingContextError(operation, payload.resource),
            ),
        );
    }

    const nextCustomAttributes = buildNextCustomAttributes(
        operation,
        state,
        payload.attributeUuid,
        payload.content,
        currentCustomAttributes,
    );

    if (!nextCustomAttributes) {
        return of(
            createContentFailureAction(
                operation,
                payload.resource,
                payload.resourceUuid,
                new Error('Missing descriptor for selected custom attribute'),
            ),
        );
    }

    return deps.apiClients.vaults
        .updateVaultInstance({
            uuid: payload.resourceUuid,
            vaultInstanceUpdateRequestDto: {
                description: currentVault.description ?? '',
                attributes: currentAttributes.map(toAttributeRequestModel),
                customAttributes: nextCustomAttributes.map(toAttributeRequestModel),
            },
        })
        .pipe(
            mergeMap((vault: any) =>
                of(
                    createContentSuccessAction(operation, payload.resource, payload.resourceUuid, vault.customAttributes ?? []),
                    vaultActions.updateVaultSuccess({ vault }),
                ),
            ),
            catchError((err) => createContentFailureWithRedirect(operation, payload.resource, payload.resourceUuid, err)),
        );
};

const handleVaultProfilesContentUpdate = (
    operation: ContentOperation,
    payload: ContentActionPayload,
    state: AppState,
    deps: any,
): Observable<AnyAction> => {
    const currentVaultProfile = state.vaultProfiles.vaultProfile;
    const currentAttributes = getVaultProfileCurrentAttributes(state, payload.resourceUuid);
    const currentCustomAttributes = getVaultProfileCurrentCustomAttributes(state, payload.resourceUuid);

    if (currentVaultProfile?.uuid !== payload.resourceUuid || !currentAttributes || !currentCustomAttributes) {
        return of(
            createContentFailureAction(
                operation,
                payload.resource,
                payload.resourceUuid,
                createMissingContextError(operation, payload.resource),
            ),
        );
    }

    const nextAttributes = buildNextCustomAttributes(operation, state, payload.attributeUuid, payload.content, currentCustomAttributes);

    if (!nextAttributes) {
        return of(
            createContentFailureAction(
                operation,
                payload.resource,
                payload.resourceUuid,
                new Error('Missing descriptor for selected custom attribute'),
            ),
        );
    }

    return deps.apiClients.vaultProfiles
        .updateVaultProfile({
            vaultUuid: currentVaultProfile.vaultInstance.uuid,
            vaultProfileUuid: payload.resourceUuid,
            vaultProfileUpdateRequestDto: {
                description: currentVaultProfile.description ?? '',
                attributes: currentAttributes.map(toAttributeRequestModel),
                customAttributes: nextAttributes.map(toAttributeRequestModel),
            },
        })
        .pipe(
            mergeMap((profile: any) =>
                of(
                    createContentSuccessAction(operation, payload.resource, payload.resourceUuid, profile.customAttributes ?? []),
                    vaultProfileActions.updateVaultProfileSuccess({ profile }),
                ),
            ),
            catchError((err) => createContentFailureWithRedirect(operation, payload.resource, payload.resourceUuid, err)),
        );
};

const handleGenericContentUpdate = (operation: ContentOperation, payload: ContentActionPayload, deps: any): Observable<AnyAction> => {
    const request = {
        resourceName: payload.resource,
        objectUuid: payload.resourceUuid,
        attributeUuid: payload.attributeUuid,
    };

    const request$ =
        operation === 'update'
            ? deps.apiClients.customAttributes.updateAttributeContentForResource({
                  ...request,
                  attributeContent: payload.content,
              })
            : deps.apiClients.customAttributes.deleteAttributeContentForResource(request);

    return request$.pipe(
        map((response: AttributeResponseDto[]) => createContentSuccessAction(operation, payload.resource, payload.resourceUuid, response)),
        catchError((err: unknown) => createContentFailureWithRedirect(operation, payload.resource, payload.resourceUuid, err)),
    );
};

const handleSecretsContentUpdate = (
    operation: ContentOperation,
    payload: ContentActionPayload,
    state: AppState,
    deps: any,
): Observable<AnyAction> => {
    const currentSecret = state.secrets.secret;

    if (currentSecret?.uuid !== payload.resourceUuid) {
        return of(
            createContentFailureAction(
                operation,
                payload.resource,
                payload.resourceUuid,
                createMissingContextError(operation, payload.resource),
            ),
        );
    }

    const currentCustomAttributes =
        state.customAttributes.resourceCustomAttributesContents.find(
            (entry) => entry.resource === Resource.Secrets && entry.resourceUuid === payload.resourceUuid,
        )?.customAttributes ?? (currentSecret.customAttributes ?? []).map(transformAttributeResponseDtoToModel);

    const nextCustomAttributes = buildNextCustomAttributes(
        operation,
        state,
        payload.attributeUuid,
        payload.content,
        currentCustomAttributes,
    );

    if (!nextCustomAttributes) {
        return of(
            createContentFailureAction(
                operation,
                payload.resource,
                payload.resourceUuid,
                new Error('Missing descriptor for selected custom attribute'),
            ),
        );
    }

    return deps.apiClients.secrets
        .updateSecret({
            uuid: payload.resourceUuid,
            secretUpdateRequestDto: {
                description: currentSecret.description ?? '',
                attributes: (currentSecret.attributes ?? []).map(toAttributeRequestModel),
                customAttributes: nextCustomAttributes.map(toAttributeRequestModel),
            } as any,
        })
        .pipe(
            mergeMap((secret: any) =>
                of(
                    createContentSuccessAction(operation, payload.resource, payload.resourceUuid, secret.customAttributes ?? []),
                    secretActions.updateSecretSuccess({ secret }),
                ),
            ),
            catchError((err) => createContentFailureWithRedirect(operation, payload.resource, payload.resourceUuid, err)),
        );
};

const handleCustomAttributeContentUpdate = (
    operation: ContentOperation,
    payload: ContentActionPayload,
    state: AppState,
    deps: any,
): Observable<AnyAction> => {
    if (payload.resource === Resource.Vaults) {
        return handleVaultsContentUpdate(operation, payload, state, deps);
    }

    if (payload.resource === Resource.VaultProfiles) {
        return handleVaultProfilesContentUpdate(operation, payload, state, deps);
    }

    if (payload.resource === Resource.Secrets) {
        return handleSecretsContentUpdate(operation, payload, state, deps);
    }

    return handleGenericContentUpdate(operation, payload, deps);
};

const resolveUpdatedAttribute = (
    state: AppState,
    attributeUuid: string,
    content: AttributeResponseModel['content'],
    currentAttributes: AttributeResponseModel[],
): AttributeResponseModel | undefined => {
    const descriptor = state.customAttributes.resourceCustomAttributes.find((entry) => entry.uuid === attributeUuid);
    const existingAttribute = currentAttributes.find((entry) => entry.uuid === attributeUuid);

    if (existingAttribute) {
        return { ...existingAttribute, content };
    }

    if (!descriptor) {
        return undefined;
    }

    return {
        uuid: attributeUuid,
        name: descriptor.name,
        label: descriptor?.properties?.label ?? descriptor.name,
        type: descriptor.type,
        contentType: descriptor.contentType,
        version: descriptor.version as unknown as AttributeResponseModel['version'],
        content,
    };
};

const listCustomAttributes: AppEpic = (action$, state$, deps) => {
    return action$.pipe(
        filter(slice.actions.listCustomAttributes.match),
        switchMap((action) =>
            deps.apiClients.customAttributes.listCustomAttributes({ attributeContentType: action.payload.attributeContentType }).pipe(
                switchMap((list) =>
                    of(
                        slice.actions.listCustomAttributesSuccess(list.map(transformCustomAttributeResponseDtoToModel)),
                        userInterfaceActions.removeWidgetLock(LockWidgetNameEnum.ListOfCustomAttributes),
                    ),
                ),
                catchError((err) =>
                    of(
                        slice.actions.listCustomAttributesFailure({ error: extractError(err, 'Failed to get Custom Attributes list') }),
                        userInterfaceActions.insertWidgetLock(err, LockWidgetNameEnum.ListOfCustomAttributes),
                    ),
                ),
            ),
        ),
    );
};

const listResources: AppEpic = (action$, state$, deps) => {
    return action$.pipe(
        filter(slice.actions.listResources.match),
        switchMap(() =>
            deps.apiClients.customAttributes.getResources().pipe(
                map((list) => slice.actions.listResourcesSuccess(list)),
                catchError((err) =>
                    of(
                        slice.actions.listResourcesFailure({ error: extractError(err, 'Failed to get list of resources') }),
                        appRedirectActions.fetchError({ error: err, message: 'Failed to get list of resources' }),
                    ),
                ),
            ),
        ),
    );
};

const listResourceCustomAttributes: AppEpic = (action$, state$, deps) => {
    return action$.pipe(
        filter(slice.actions.listResourceCustomAttributes.match),
        switchMap((action) =>
            deps.apiClients.customAttributes.getResourceCustomAttributes({ resource: action.payload }).pipe(
                switchMap((list) =>
                    of(
                        slice.actions.listResourceCustomAttributesSuccess(list.map(transformCustomAttributeDtoToModel)),
                        userInterfaceActions.removeWidgetLock(LockWidgetNameEnum.CustomAttributeWidget),
                    ),
                ),
                catchError((err) =>
                    of(
                        slice.actions.listResourceCustomAttributesFailure({
                            error: extractError(err, 'Failed to get Resource Custom Attributes list'),
                        }),
                        appRedirectActions.fetchError({ error: err, message: 'Failed to get Resource Custom Attributes list' }),
                        userInterfaceActions.insertWidgetLock(err, LockWidgetNameEnum.CustomAttributeWidget),
                    ),
                ),
            ),
        ),
    );
};

const listSecondaryResourceCustomAttributes: AppEpic = (action$, state$, deps) => {
    return action$.pipe(
        filter(slice.actions.listSecondaryResourceCustomAttributes.match),
        switchMap((action) =>
            deps.apiClients.customAttributes.getResourceCustomAttributes({ resource: action.payload }).pipe(
                map((list) => slice.actions.listSecondaryResourceCustomAttributesSuccess(list.map(transformCustomAttributeDtoToModel))),
                catchError((err) =>
                    of(
                        slice.actions.listSecondaryResourceCustomAttributesFailure({
                            error: extractError(err, 'Failed to get Resource Custom Attributes list'),
                        }),
                        appRedirectActions.fetchError({ error: err, message: 'Failed to get Resource Custom Attributes list' }),
                    ),
                ),
            ),
        ),
    );
};

const loadMultipleResourceCustomAttributes: AppEpic = (action$, state$, deps) => {
    return action$.pipe(
        filter(slice.actions.loadMultipleResourceCustomAttributes.match),
        switchMap((action) => {
            const resourceObservables = action.payload.map(({ resource }) =>
                deps.apiClients.customAttributes.getResourceCustomAttributes({ resource }).pipe(
                    map((list) => ({
                        resource,
                        customAttributes: list.map(transformCustomAttributeDtoToModel),
                    })),
                    catchError(() => {
                        return of({
                            resource,
                            customAttributes: [],
                        });
                    }),
                ),
            );

            return forkJoin(resourceObservables).pipe(
                map((results) => slice.actions.receiveMultipleResourceCustomAttributes(results)),
                catchError((err) =>
                    of(
                        slice.actions.listResourceCustomAttributesFailure({
                            error: extractError(err, 'Failed to get multiple resources custom attributes'),
                        }),
                        appRedirectActions.fetchError({ error: err, message: 'Failed to get multiple resources custom attributes' }),
                    ),
                ),
            );
        }),
    );
};

const createCustomAttribute: AppEpic = (action$, state$, deps) => {
    return action$.pipe(
        filter(slice.actions.createCustomAttribute.match),
        switchMap((action) =>
            deps.apiClients.customAttributes
                .createCustomAttribute({ customAttributeCreateRequestDto: transformCustomAttributeCreateRequestModelToDto(action.payload) })
                .pipe(
                    mergeMap((obj) =>
                        of(
                            slice.actions.createCustomAttributeSuccess({ uuid: obj.uuid }),
                            appRedirectActions.redirect({ url: `../customattributes/detail/${obj.uuid}` }),
                        ),
                    ),
                    catchError((err) =>
                        of(
                            slice.actions.createCustomAttributeFailure({ error: extractError(err, 'Failed to create custom attribute') }),
                            appRedirectActions.fetchError({ error: err, message: 'Failed to create custom attribute' }),
                        ),
                    ),
                ),
        ),
    );
};

const updateCustomAttribute: AppEpic = (action$, state$, deps) => {
    return action$.pipe(
        filter(slice.actions.updateCustomAttribute.match),
        switchMap((action) =>
            deps.apiClients.customAttributes
                .editCustomAttribute({
                    uuid: action.payload.uuid,
                    customAttributeUpdateRequestDto: transformCustomAttributeUpdateRequestModelToDto(
                        action.payload.customAttributeUpdateRequest,
                    ),
                })
                .pipe(
                    mergeMap((customAttributeDetail) =>
                        of(
                            slice.actions.updateCustomAttributeSuccess(
                                transformCustomAttributeDetailResponseDtoToModel(customAttributeDetail),
                            ),
                            slice.actions.getCustomAttribute(customAttributeDetail.uuid),
                            appRedirectActions.redirect({ url: `../../customattributes/detail/${customAttributeDetail.uuid}` }),
                        ),
                    ),
                    catchError((err) =>
                        of(
                            slice.actions.updateCustomAttributeFailure({ error: extractError(err, 'Failed to update custom attribute') }),
                            appRedirectActions.fetchError({ error: err, message: 'Failed to update custom attribute' }),
                        ),
                    ),
                ),
        ),
    );
};

const updateCustomAttributeContent: AppEpic = (action$, state$, deps) => {
    return action$.pipe(
        filter(slice.actions.updateCustomAttributeContent.match),
        switchMap((action) => handleCustomAttributeContentUpdate('update', action.payload, state$.value, deps)),
    );
};

const removeCustomAttributeContent: AppEpic = (action$, state$, deps) => {
    return action$.pipe(
        filter(slice.actions.removeCustomAttributeContent.match),
        switchMap((action) => handleCustomAttributeContentUpdate('remove', action.payload, state$.value, deps)),
    );
};

const getCustomAttribute: AppEpic = (action$, state$, deps) => {
    return action$.pipe(
        filter(slice.actions.getCustomAttribute.match),
        switchMap((action) =>
            deps.apiClients.customAttributes.getCustomAttribute({ uuid: action.payload }).pipe(
                switchMap((customAttributeDetail) =>
                    of(
                        slice.actions.getCustomAttributeSuccess(transformCustomAttributeDetailResponseDtoToModel(customAttributeDetail)),
                        userInterfaceActions.removeWidgetLock(LockWidgetNameEnum.CustomAttributeDetails),
                    ),
                ),
                catchError((err) =>
                    of(
                        slice.actions.getCustomAttributeFailure({ error: extractError(err, 'Failed to get custom attribute detail') }),
                        userInterfaceActions.insertWidgetLock(err, LockWidgetNameEnum.CustomAttributeDetails),
                    ),
                ),
            ),
        ),
    );
};

const deleteCustomAttribute: AppEpic = (action$, state$, deps) => {
    return action$.pipe(
        filter(slice.actions.deleteCustomAttribute.match),
        switchMap((action) =>
            deps.apiClients.customAttributes.deleteCustomAttribute({ uuid: action.payload }).pipe(
                mergeMap(() =>
                    of(
                        slice.actions.deleteCustomAttributeSuccess(action.payload),
                        appRedirectActions.redirect({ url: '../../customattributes' }),
                    ),
                ),
                catchError((err) =>
                    of(
                        slice.actions.deleteCustomAttributeFailure({ error: extractError(err, 'Failed to delete custom attribute') }),
                        appRedirectActions.fetchError({ error: err, message: 'Failed to delete custom attribute' }),
                    ),
                ),
            ),
        ),
    );
};

const bulkDeleteCustomAttributes: AppEpic = (action$, state$, deps) => {
    return action$.pipe(
        filter(slice.actions.bulkDeleteCustomAttributes.match),
        switchMap((action) =>
            deps.apiClients.customAttributes.bulkDeleteCustomAttributes({ requestBody: action.payload }).pipe(
                mergeMap(() =>
                    of(
                        slice.actions.bulkDeleteCustomAttributesSuccess(action.payload),
                        alertActions.success('Selected custom attributes successfully deleted.'),
                    ),
                ),
                catchError((err) =>
                    of(
                        slice.actions.bulkDeleteCustomAttributesFailure({ error: extractError(err, 'Failed to delete custom attributes') }),
                        appRedirectActions.fetchError({ error: err, message: 'Failed to delete custom attributes' }),
                    ),
                ),
            ),
        ),
    );
};

const bulkEnableCustomAttributes: AppEpic = (action$, state$, deps) => {
    return action$.pipe(
        filter(slice.actions.bulkEnableCustomAttributes.match),
        switchMap((action) =>
            deps.apiClients.customAttributes.bulkEnableCustomAttributes({ requestBody: action.payload }).pipe(
                map((errors) => slice.actions.bulkEnableCustomAttributesSuccess(action.payload)),
                catchError((err) =>
                    of(
                        slice.actions.bulkEnableCustomAttributesFailure({ error: extractError(err, 'Failed to enable custom attributes') }),
                        appRedirectActions.fetchError({ error: err, message: 'Failed to enable custom attributes' }),
                    ),
                ),
            ),
        ),
    );
};

const bulkDisableCustomAttributes: AppEpic = (action$, state$, deps) => {
    return action$.pipe(
        filter(slice.actions.bulkDisableCustomAttributes.match),
        switchMap((action) =>
            deps.apiClients.customAttributes.bulkDisableCustomAttributes({ requestBody: action.payload }).pipe(
                map((errors) => slice.actions.bulkDisableCustomAttributesSuccess(action.payload)),
                catchError((err) =>
                    of(
                        slice.actions.bulkDisableCustomAttributesFailure({
                            error: extractError(err, 'Failed to disable custom attributes'),
                        }),
                        appRedirectActions.fetchError({ error: err, message: 'Failed to disable custom attributes' }),
                    ),
                ),
            ),
        ),
    );
};

const enableCustomAttribute: AppEpic = (action$, state$, deps) => {
    return action$.pipe(
        filter(slice.actions.enableCustomAttribute.match),
        switchMap((action) =>
            deps.apiClients.customAttributes.enableCustomAttribute({ uuid: action.payload }).pipe(
                map((errors) => slice.actions.enableCustomAttributeSuccess(action.payload)),
                catchError((err) =>
                    of(
                        slice.actions.enableCustomAttributeFailure({ error: extractError(err, 'Failed to enable custom attribute') }),
                        appRedirectActions.fetchError({ error: err, message: 'Failed to enable custom attribute' }),
                    ),
                ),
            ),
        ),
    );
};

const disableCustomAttribute: AppEpic = (action$, state$, deps) => {
    return action$.pipe(
        filter(slice.actions.disableCustomAttribute.match),
        switchMap((action) =>
            deps.apiClients.customAttributes.disableCustomAttribute({ uuid: action.payload }).pipe(
                map((errors) => slice.actions.disableCustomAttributeSuccess(action.payload)),
                catchError((err) =>
                    of(
                        slice.actions.disableCustomAttributeFailure({ error: extractError(err, 'Failed to disable custom attribute') }),
                        appRedirectActions.fetchError({ error: err, message: 'Failed to disable custom attribute' }),
                    ),
                ),
            ),
        ),
    );
};

const epics = [
    listCustomAttributes,
    listResources,
    listResourceCustomAttributes,
    listSecondaryResourceCustomAttributes,
    loadMultipleResourceCustomAttributes,
    createCustomAttribute,
    updateCustomAttribute,
    getCustomAttribute,
    deleteCustomAttribute,
    bulkDeleteCustomAttributes,
    bulkEnableCustomAttributes,
    enableCustomAttribute,
    bulkDisableCustomAttributes,
    disableCustomAttribute,
    updateCustomAttributeContent,
    removeCustomAttributeContent,
];

export default epics;
