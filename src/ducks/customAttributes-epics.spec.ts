import { describe, expect, test, vi } from 'vitest';
import type { UnknownAction } from '@reduxjs/toolkit';
import { firstValueFrom, of, throwError } from 'rxjs';
import { take, toArray } from 'rxjs/operators';

import { slice } from './customAttributes';
import { actions as appRedirectActions } from './app-redirect';
import { actions as userInterfaceActions } from './user-interface';
import { actions as vaultActions } from './vaults';
import { actions as vaultProfileActions } from './vault-profiles';
import { actions as secretActions } from './secrets';
import { actions as alertActions } from './alerts';
import { LockWidgetNameEnum } from 'types/user-interface';
import { AttributeVersion, Resource } from 'types/openapi';

vi.mock('../App', async () => ({ store: (await import('./epics-test-mocks')).getEpicMocks().appStore }));
vi.mock('./alerts', async () => ({ actions: (await import('./epics-test-mocks')).getEpicMocks().alertActions }));

enum EpicIndex {
    ListCustomAttributes = 0,
    ListResources = 1,
    ListResourceCustomAttributes = 2,
    ListSecondaryResourceCustomAttributes = 3,
    LoadMultipleResourceCustomAttributes = 4,
    CreateCustomAttribute = 5,
    UpdateCustomAttribute = 6,
    GetCustomAttribute = 7,
    DeleteCustomAttribute = 8,
    BulkDeleteCustomAttributes = 9,
    BulkEnableCustomAttributes = 10,
    EnableCustomAttribute = 11,
    BulkDisableCustomAttributes = 12,
    DisableCustomAttribute = 13,
    UpdateContent = 14,
    RemoveContent = 15,
}

type Clients = {
    customAttributes: {
        listCustomAttributes: (args: any) => any;
        getResources: () => any;
        getResourceCustomAttributes: (args: any) => any;
        createCustomAttribute: (args: any) => any;
        editCustomAttribute: (args: any) => any;
        updateAttributeContentForResource: (args: any) => any;
        deleteAttributeContentForResource: (args: any) => any;
        getCustomAttribute: (args: any) => any;
        deleteCustomAttribute: (args: any) => any;
        bulkDeleteCustomAttributes: (args: any) => any;
        bulkEnableCustomAttributes: (args: any) => any;
        bulkDisableCustomAttributes: (args: any) => any;
        enableCustomAttribute: (args: any) => any;
        disableCustomAttribute: (args: any) => any;
    };
    secrets: {
        updateSecret: (args: any) => any;
    };
    vaults: {
        updateVaultInstance: (args: any) => any;
    };
    vaultProfiles: {
        updateVaultProfile: (args: any) => any;
    };
};

function createDeps(overrides: Partial<Clients> = {}) {
    const defaults: Clients = {
        customAttributes: {
            listCustomAttributes: () => of([{ uuid: 'ca-1', name: 'A1' }]),
            getResources: () => of([Resource.Certificates]),
            getResourceCustomAttributes: () => of([{ uuid: 'd-1', name: 'Descriptor' }]),
            createCustomAttribute: () => of({ uuid: 'ca-1' }),
            editCustomAttribute: () => of({ uuid: 'ca-1', name: 'Updated', content: [] }),
            updateAttributeContentForResource: () =>
                of([{ uuid: 'attr-1', name: 'Attr 1', contentType: 'text/plain', version: AttributeVersion.V2, content: [] }]),
            deleteAttributeContentForResource: () =>
                of([{ uuid: 'attr-2', name: 'Attr 2', contentType: 'text/plain', version: AttributeVersion.V2, content: [] }]),
            getCustomAttribute: () => of({ uuid: 'ca-1', name: 'A1', content: [] }),
            deleteCustomAttribute: () => of(undefined),
            bulkDeleteCustomAttributes: () => of(undefined),
            bulkEnableCustomAttributes: () => of([]),
            bulkDisableCustomAttributes: () => of([]),
            enableCustomAttribute: () => of([]),
            disableCustomAttribute: () => of([]),
        },
        vaults: {
            updateVaultInstance: () =>
                of({
                    uuid: 'vault-1',
                    customAttributes: [
                        {
                            uuid: 'attr-1',
                            name: 'Attr 1',
                            contentType: 'text/plain',
                            version: AttributeVersion.V2,
                            content: [{ data: 'x' }],
                        },
                    ],
                }),
        },
        vaultProfiles: {
            updateVaultProfile: () =>
                of({
                    uuid: 'vp-1',
                    customAttributes: [
                        {
                            uuid: 'attr-1',
                            name: 'Attr 1',
                            contentType: 'text/plain',
                            version: AttributeVersion.V2,
                            content: [{ data: 'x' }],
                        },
                    ],
                    vaultInstance: { uuid: 'vault-1' },
                }),
        },
        secrets: {
            updateSecret: () =>
                of({
                    uuid: 'sec-1',
                    customAttributes: [
                        {
                            uuid: 'attr-1',
                            name: 'Attr 1',
                            contentType: 'text/plain',
                            version: AttributeVersion.V2,
                            content: [{ data: 'x' }],
                        },
                    ],
                }),
        },
    };

    return {
        apiClients: {
            customAttributes: { ...defaults.customAttributes, ...overrides.customAttributes },
            vaults: { ...defaults.vaults, ...overrides.vaults },
            vaultProfiles: { ...defaults.vaultProfiles, ...overrides.vaultProfiles },
            secrets: { ...defaults.secrets, ...overrides.secrets },
        },
    };
}

function createState(overrides: any = {}) {
    return {
        customAttributes: {
            resourceCustomAttributesContents: [],
            resourceCustomAttributes: [],
        },
        vaults: { vault: undefined },
        vaultProfiles: { vaultProfile: undefined },
        secrets: { secret: undefined },
        ...overrides,
    };
}

const baseContent = [{ data: 'v' }] as any;
const updateFailureMessage = 'Failed to update custom attribute content';
const removeFailureMessage = 'Failed to remove custom attribute content';

async function runEpic(
    epicIndex: number,
    action: any,
    options: { depsOverrides?: Partial<Clients>; state?: any; takeCount?: number } = {},
): Promise<UnknownAction[]> {
    const { default: epics } = await import('./customAttributes-epics');
    const deps = createDeps(options.depsOverrides);
    const state = options.state ?? createState();
    const takeCount = options.takeCount ?? 1;

    const state$ = of(state) as any;
    state$.value = state;

    const output$ = (epics as any)[epicIndex](of(action), state$, deps as any);
    return firstValueFrom(output$.pipe(take(takeCount), toArray()));
}

function contentAction(operation: 'update' | 'remove', resource: Resource, attributeUuid = 'attr-1') {
    const nonVaultUuid = resource === Resource.Secrets ? 'sec-1' : 'obj-1';
    const vaultOrNonUuid = resource === Resource.Vaults ? 'vault-1' : nonVaultUuid;
    const resourceUuid = resource === Resource.VaultProfiles ? 'vp-1' : vaultOrNonUuid;

    if (operation === 'update') {
        return slice.actions.updateCustomAttributeContent({
            resource,
            resourceUuid,
            attributeUuid,
            content: baseContent,
        });
    }

    return slice.actions.removeCustomAttributeContent({
        resource,
        resourceUuid,
        attributeUuid,
    });
}

function contentEpicIndex(operation: 'update' | 'remove') {
    return operation === 'update' ? EpicIndex.UpdateContent : EpicIndex.RemoveContent;
}

function successActionType(operation: 'update' | 'remove') {
    return operation === 'update'
        ? slice.actions.updateCustomAttributeContentSuccess.type
        : slice.actions.removeCustomAttributeContentSuccess.type;
}

function failureActionType(operation: 'update' | 'remove') {
    return operation === 'update'
        ? slice.actions.updateCustomAttributeContentFailure.type
        : slice.actions.removeCustomAttributeContentFailure.type;
}

function failureMessage(operation: 'update' | 'remove') {
    return operation === 'update' ? updateFailureMessage : removeFailureMessage;
}

function createVaultReadyState(
    custom: any[] = [{ uuid: 'attr-1', name: 'Attr 1', contentType: 'text/plain', version: AttributeVersion.V2, content: [] }],
) {
    return createState({
        customAttributes: {
            resourceCustomAttributesContents: [{ resource: Resource.Vaults, resourceUuid: 'vault-1', customAttributes: custom }],
            resourceCustomAttributes: [
                {
                    uuid: 'attr-1',
                    name: 'Attr 1',
                    type: 'string',
                    contentType: 'application/json',
                    version: '3',
                    properties: { label: 'Attr Label' },
                },
            ],
        },
        vaults: {
            vault: {
                uuid: 'vault-1',
                attributes: [],
                customAttributes: custom,
            },
        },
    });
}

function createVaultProfileReadyState(
    custom: any[] = [{ uuid: 'attr-1', name: 'Attr 1', contentType: 'text/plain', version: AttributeVersion.V2, content: [] }],
) {
    return createState({
        customAttributes: {
            resourceCustomAttributesContents: [{ resource: Resource.VaultProfiles, resourceUuid: 'vp-1', customAttributes: custom }],
            resourceCustomAttributes: [
                {
                    uuid: 'attr-1',
                    name: 'Attr 1',
                    type: 'string',
                    contentType: 'text/plain',
                    version: AttributeVersion.V2,
                    properties: { label: 'Attr Label' },
                },
            ],
        },
        vaultProfiles: {
            vaultProfile: {
                uuid: 'vp-1',
                vaultInstance: { uuid: 'vault-1' },
                attributes: [],
                customAttributes: custom,
            },
        },
    });
}

function createSecretReadyState(
    custom: any[] = [{ uuid: 'attr-1', name: 'Attr 1', contentType: 'text/plain', version: AttributeVersion.V2, content: [] }],
) {
    return createState({
        customAttributes: {
            resourceCustomAttributesContents: [{ resource: Resource.Secrets, resourceUuid: 'sec-1', customAttributes: custom }],
            resourceCustomAttributes: [
                {
                    uuid: 'attr-1',
                    name: 'Attr 1',
                    type: 'string',
                    contentType: 'text/plain',
                    version: AttributeVersion.V2,
                    properties: { label: 'Attr Label' },
                },
            ],
        },
        secrets: {
            secret: {
                uuid: 'sec-1',
                description: 'Secret',
                attributes: [],
                customAttributes: custom,
            },
        },
    });
}

describe('customAttributes epics', () => {
    test('listCustomAttributes success emits success and removeWidgetLock', async () => {
        const emitted = await runEpic(
            EpicIndex.ListCustomAttributes,
            slice.actions.listCustomAttributes({ attributeContentType: undefined }),
            {
                takeCount: 2,
            },
        );

        expect(emitted[0].type).toBe(slice.actions.listCustomAttributesSuccess.type);
        expect(emitted[1]).toEqual(userInterfaceActions.removeWidgetLock(LockWidgetNameEnum.ListOfCustomAttributes));
    });

    test('listCustomAttributes failure emits failure and insertWidgetLock', async () => {
        const err = new Error('boom');
        const emitted = await runEpic(
            EpicIndex.ListCustomAttributes,
            slice.actions.listCustomAttributes({ attributeContentType: undefined }),
            {
                depsOverrides: { customAttributes: { listCustomAttributes: () => throwError(() => err) } as any },
                takeCount: 2,
            },
        );

        expect(emitted[0].type).toBe(slice.actions.listCustomAttributesFailure.type);
        expect(emitted[1].type).toBe(userInterfaceActions.insertWidgetLock.type);
    });

    test('listResources success emits listResourcesSuccess', async () => {
        const emitted = await runEpic(EpicIndex.ListResources, slice.actions.listResources());
        expect(emitted[0]).toEqual(slice.actions.listResourcesSuccess([Resource.Certificates]));
    });

    test('listResources failure emits failure and fetchError', async () => {
        const err = new Error('resources failed');
        const emitted = await runEpic(EpicIndex.ListResources, slice.actions.listResources(), {
            depsOverrides: { customAttributes: { getResources: () => throwError(() => err) } as any },
            takeCount: 2,
        });

        expect(emitted[0].type).toBe(slice.actions.listResourcesFailure.type);
        expect(emitted[1]).toEqual(appRedirectActions.fetchError({ error: err, message: 'Failed to get list of resources' }));
    });

    test.each([
        {
            name: 'listResourceCustomAttributes',
            index: EpicIndex.ListResourceCustomAttributes,
            action: () => slice.actions.listResourceCustomAttributes(Resource.Certificates),
            successType: slice.actions.listResourceCustomAttributesSuccess.type,
            failureType: slice.actions.listResourceCustomAttributesFailure.type,
            takeCount: 3,
            onSuccessSecond: userInterfaceActions.removeWidgetLock(LockWidgetNameEnum.CustomAttributeWidget),
            failureMessage: 'Failed to get Resource Custom Attributes list',
            hasWidgetLockOnFailure: true,
        },
        {
            name: 'listSecondaryResourceCustomAttributes',
            index: EpicIndex.ListSecondaryResourceCustomAttributes,
            action: () => slice.actions.listSecondaryResourceCustomAttributes(Resource.Certificates),
            successType: slice.actions.listSecondaryResourceCustomAttributesSuccess.type,
            failureType: slice.actions.listSecondaryResourceCustomAttributesFailure.type,
            takeCount: 2,
            failureMessage: 'Failed to get Resource Custom Attributes list',
            hasWidgetLockOnFailure: false,
        },
    ])('$name success/failure', async (scenario) => {
        const success = await runEpic(scenario.index, scenario.action(), {
            takeCount: scenario.onSuccessSecond ? 2 : 1,
        });

        expect(success[0].type).toBe(scenario.successType);
        if (scenario.onSuccessSecond) {
            expect(success[1]).toEqual(scenario.onSuccessSecond);
        }

        const err = new Error(`${scenario.name} failed`);
        const failure = await runEpic(scenario.index, scenario.action(), {
            depsOverrides: { customAttributes: { getResourceCustomAttributes: () => throwError(() => err) } as any },
            takeCount: scenario.takeCount,
        });

        expect(failure[0].type).toBe(scenario.failureType);
        expect(failure[1]).toEqual(appRedirectActions.fetchError({ error: err, message: scenario.failureMessage }));
        if (scenario.hasWidgetLockOnFailure) {
            expect(failure[2].type).toBe(userInterfaceActions.insertWidgetLock.type);
        }
    });

    test('loadMultipleResourceCustomAttributes emits mapped resources and empty list on partial error', async () => {
        const emitted = await runEpic(
            EpicIndex.LoadMultipleResourceCustomAttributes,
            slice.actions.loadMultipleResourceCustomAttributes([
                { resource: Resource.Certificates, customAttributes: [] },
                { resource: Resource.Secrets, customAttributes: [] },
            ]),
            {
                depsOverrides: {
                    customAttributes: {
                        getResourceCustomAttributes: ({ resource }: { resource: Resource }) =>
                            resource === Resource.Secrets ? throwError(() => new Error('secret failed')) : of([{ uuid: 'ok', name: 'ok' }]),
                    } as any,
                },
            },
        );

        expect(emitted[0].type).toBe(slice.actions.receiveMultipleResourceCustomAttributes.type);
        expect((emitted[0] as any).payload[1].customAttributes).toEqual([]);
    });

    test.each([
        {
            name: 'createCustomAttribute',
            index: EpicIndex.CreateCustomAttribute,
            action: () => slice.actions.createCustomAttribute({ name: 'name', contentType: 'text/plain' } as any),
            overrideKey: 'createCustomAttribute',
            successAssert: (out: any[]) => {
                expect(out[0]).toEqual(slice.actions.createCustomAttributeSuccess({ uuid: 'ca-1' }));
                expect(out[1]).toEqual(appRedirectActions.redirect({ url: '../customattributes/detail/ca-1' }));
            },
            failureType: slice.actions.createCustomAttributeFailure.type,
            failureMessage: 'Failed to create custom attribute',
        },
        {
            name: 'updateCustomAttribute',
            index: EpicIndex.UpdateCustomAttribute,
            action: () => slice.actions.updateCustomAttribute({ uuid: 'ca-1', customAttributeUpdateRequest: {} as any }),
            overrideKey: 'editCustomAttribute',
            successAssert: (out: any[]) => {
                expect(out[0].type).toBe(slice.actions.updateCustomAttributeSuccess.type);
                expect(out[1]).toEqual(slice.actions.getCustomAttribute('ca-1'));
                expect(out[2]).toEqual(appRedirectActions.redirect({ url: '../../customattributes/detail/ca-1' }));
            },
            failureType: slice.actions.updateCustomAttributeFailure.type,
            failureMessage: 'Failed to update custom attribute',
        },
    ])('$name success/failure', async (scenario) => {
        const success = await runEpic(scenario.index, scenario.action(), { takeCount: scenario.name === 'updateCustomAttribute' ? 3 : 2 });
        scenario.successAssert(success as any[]);

        const err = new Error(`${scenario.name} failed`);
        const failure = await runEpic(scenario.index, scenario.action(), {
            depsOverrides: { customAttributes: { [scenario.overrideKey]: () => throwError(() => err) } as any },
            takeCount: 2,
        });

        expect(failure[0].type).toBe(scenario.failureType);
        expect(failure[1]).toEqual(appRedirectActions.fetchError({ error: err, message: scenario.failureMessage }));
    });

    test.each(['update', 'remove'] as const)('%s content for generic resource success/failure', async (operation) => {
        const resource = Resource.Certificates;
        const action = contentAction(operation, resource, 'attr-1');
        const apiKey = operation === 'update' ? 'updateAttributeContentForResource' : 'deleteAttributeContentForResource';

        const success = await runEpic(contentEpicIndex(operation), action);
        expect(success[0].type).toBe(successActionType(operation));

        const err = new Error(`generic ${operation} failed`);
        const failure = await runEpic(contentEpicIndex(operation), action, {
            depsOverrides: { customAttributes: { [apiKey]: () => throwError(() => err) } as any },
            takeCount: 2,
        });

        expect(failure[0].type).toBe(failureActionType(operation));
        expect(failure[1]).toEqual(appRedirectActions.fetchError({ error: err, message: failureMessage(operation) }));
    });

    test.each([
        {
            operation: 'update' as const,
            resource: Resource.Vaults,
            sideType: vaultActions.updateVaultSuccess.type,
            stateFactory: createVaultReadyState,
        },
        {
            operation: 'remove' as const,
            resource: Resource.Vaults,
            sideType: vaultActions.updateVaultSuccess.type,
            stateFactory: createVaultReadyState,
        },
        {
            operation: 'update' as const,
            resource: Resource.VaultProfiles,
            sideType: vaultProfileActions.updateVaultProfileSuccess.type,
            stateFactory: createVaultProfileReadyState,
        },
        {
            operation: 'remove' as const,
            resource: Resource.VaultProfiles,
            sideType: vaultProfileActions.updateVaultProfileSuccess.type,
            stateFactory: createVaultProfileReadyState,
        },
    ])('$operation content for $resource context missing/success/api failure', async (scenario) => {
        const index = contentEpicIndex(scenario.operation);
        const action = contentAction(scenario.operation, scenario.resource, 'attr-1');

        const missing = await runEpic(index, action, { state: createState() });
        expect(missing[0].type).toBe(failureActionType(scenario.operation));

        const success = await runEpic(index, action, { state: scenario.stateFactory(), takeCount: 2 });
        expect(success[0].type).toBe(successActionType(scenario.operation));
        expect(success[1].type).toBe(scenario.sideType);

        const err = new Error(`${scenario.resource} ${scenario.operation} failed`);
        const apiKey = scenario.resource === Resource.Vaults ? 'updateVaultInstance' : 'updateVaultProfile';
        const failure = await runEpic(index, action, {
            state: scenario.stateFactory(),
            depsOverrides:
                scenario.resource === Resource.Vaults
                    ? { vaults: { [apiKey]: () => throwError(() => err) } as any }
                    : { vaultProfiles: { [apiKey]: () => throwError(() => err) } as any },
            takeCount: 2,
        });

        expect(failure[0].type).toBe(failureActionType(scenario.operation));
        expect(failure[1]).toEqual(appRedirectActions.fetchError({ error: err, message: failureMessage(scenario.operation) }));
    });

    test.each([
        { resource: Resource.Vaults, state: createVaultReadyState([]), operation: 'update' as const, uuid: 'missing-attr' },
        { resource: Resource.VaultProfiles, state: createVaultProfileReadyState([]), operation: 'update' as const, uuid: 'missing-attr' },
    ])('update content failure when descriptor and existing attr are missing for $resource', async (scenario) => {
        const emitted = await runEpic(
            contentEpicIndex(scenario.operation),
            contentAction(scenario.operation, scenario.resource, scenario.uuid),
            { state: scenario.state },
        );

        expect(emitted[0].type).toBe(slice.actions.updateCustomAttributeContentFailure.type);
    });

    test.each(['update', 'remove'] as const)('%s content for secrets context missing/success/api failure', async (operation) => {
        const index = contentEpicIndex(operation);
        const action = contentAction(operation, Resource.Secrets, 'attr-1');

        const missing = await runEpic(index, action, { state: createState() });
        expect(missing[0].type).toBe(failureActionType(operation));

        const success = await runEpic(index, action, { state: createSecretReadyState(), takeCount: 2 });
        expect(success[0].type).toBe(successActionType(operation));
        expect(success[1].type).toBe(secretActions.updateSecretSuccess.type);

        const err = new Error(`Secrets ${operation} failed`);
        const failure = await runEpic(index, action, {
            state: createSecretReadyState(),
            depsOverrides: { secrets: { updateSecret: () => throwError(() => err) } as any },
            takeCount: 2,
        });

        expect(failure[0].type).toBe(failureActionType(operation));
        expect(failure[1]).toEqual(appRedirectActions.fetchError({ error: err, message: failureMessage(operation) }));
    });

    test('remove content for vault keeps v3 when attribute version is numeric 3', async () => {
        let capturedRequest: any;
        const state = createState({
            customAttributes: {
                resourceCustomAttributesContents: [
                    {
                        resource: Resource.Vaults,
                        resourceUuid: 'vault-1',
                        customAttributes: [
                            {
                                uuid: 'attr-1',
                                name: 'Attr 1',
                                contentType: 'application/json',
                                version: 3,
                                content: [{ value: 'x' }],
                            },
                        ],
                    },
                ],
                resourceCustomAttributes: [],
            },
            vaults: {
                vault: {
                    uuid: 'vault-1',
                    attributes: [
                        { uuid: 'base-1', name: 'Base 1', contentType: 'application/json', version: 3, content: [{ value: 'x' }] },
                    ],
                    customAttributes: [
                        {
                            uuid: 'attr-1',
                            name: 'Attr 1',
                            contentType: 'application/json',
                            version: 3,
                            content: [{ value: 'x' }],
                        },
                    ],
                },
            },
        });

        await runEpic(EpicIndex.RemoveContent, contentAction('remove', Resource.Vaults, 'missing-attr'), {
            state,
            depsOverrides: {
                vaults: {
                    updateVaultInstance: (args: any) => {
                        capturedRequest = args;
                        return of({ uuid: 'vault-1', customAttributes: [] });
                    },
                },
            },
            takeCount: 2,
        });

        expect(capturedRequest.vaultInstanceUpdateRequestDto.attributes[0].version).toBe(AttributeVersion.V3);
        expect(capturedRequest.vaultInstanceUpdateRequestDto.attributes[0].content[0].contentType).toBe('application/json');
    });

    test.each([
        {
            name: 'getCustomAttribute',
            index: EpicIndex.GetCustomAttribute,
            action: () => slice.actions.getCustomAttribute('ca-1'),
            successType: slice.actions.getCustomAttributeSuccess.type,
            successSecond: userInterfaceActions.removeWidgetLock(LockWidgetNameEnum.CustomAttributeDetails),
            failureType: slice.actions.getCustomAttributeFailure.type,
            override: { customAttributes: { getCustomAttribute: () => throwError(() => new Error('detail failed')) } as any },
            failureSecondType: userInterfaceActions.insertWidgetLock.type,
        },
        {
            name: 'deleteCustomAttribute',
            index: EpicIndex.DeleteCustomAttribute,
            action: () => slice.actions.deleteCustomAttribute('ca-1'),
            successType: slice.actions.deleteCustomAttributeSuccess.type,
            successSecond: appRedirectActions.redirect({ url: '../../customattributes' }),
            failureType: slice.actions.deleteCustomAttributeFailure.type,
            override: { customAttributes: { deleteCustomAttribute: () => throwError(() => new Error('delete failed')) } as any },
            failureFetchMessage: 'Failed to delete custom attribute',
        },
    ])('$name success/failure', async (scenario) => {
        const success = await runEpic(scenario.index, scenario.action(), { takeCount: 2 });
        expect(success[0].type).toBe(scenario.successType);

        expect(success[1]).toEqual(scenario.successSecond);

        const err = new Error(`${scenario.name} failed`);
        const failure = await runEpic(scenario.index, scenario.action(), {
            depsOverrides:
                scenario.name === 'getCustomAttribute'
                    ? { customAttributes: { getCustomAttribute: () => throwError(() => err) } as any }
                    : { customAttributes: { deleteCustomAttribute: () => throwError(() => err) } as any },
            takeCount: 2,
        });

        expect(failure[0].type).toBe(scenario.failureType);
        if (scenario.name === 'getCustomAttribute') {
            expect(failure[1].type).toBe(userInterfaceActions.insertWidgetLock.type);
        } else {
            expect(failure[1]).toEqual(appRedirectActions.fetchError({ error: err, message: 'Failed to delete custom attribute' }));
        }
    });

    test.each([
        {
            name: 'bulkDeleteCustomAttributes',
            index: EpicIndex.BulkDeleteCustomAttributes,
            action: () => slice.actions.bulkDeleteCustomAttributes(['ca-1', 'ca-2']),
            success: [
                slice.actions.bulkDeleteCustomAttributesSuccess(['ca-1', 'ca-2']),
                alertActions.success('Selected custom attributes successfully deleted.'),
            ],
            override: { customAttributes: { bulkDeleteCustomAttributes: () => throwError(() => new Error('bulk delete failed')) } as any },
            failureType: slice.actions.bulkDeleteCustomAttributesFailure.type,
            failureMessage: 'Failed to delete custom attributes',
        },
        {
            name: 'bulkEnableCustomAttributes',
            index: EpicIndex.BulkEnableCustomAttributes,
            action: () => slice.actions.bulkEnableCustomAttributes(['ca-1']),
            success: [slice.actions.bulkEnableCustomAttributesSuccess(['ca-1'])],
            override: { customAttributes: { bulkEnableCustomAttributes: () => throwError(() => new Error('bulk enable failed')) } as any },
            failureType: slice.actions.bulkEnableCustomAttributesFailure.type,
            failureMessage: 'Failed to enable custom attributes',
        },
        {
            name: 'bulkDisableCustomAttributes',
            index: EpicIndex.BulkDisableCustomAttributes,
            action: () => slice.actions.bulkDisableCustomAttributes(['ca-1']),
            success: [slice.actions.bulkDisableCustomAttributesSuccess(['ca-1'])],
            override: {
                customAttributes: { bulkDisableCustomAttributes: () => throwError(() => new Error('bulk disable failed')) } as any,
            },
            failureType: slice.actions.bulkDisableCustomAttributesFailure.type,
            failureMessage: 'Failed to disable custom attributes',
        },
        {
            name: 'enableCustomAttribute',
            index: EpicIndex.EnableCustomAttribute,
            action: () => slice.actions.enableCustomAttribute('ca-1'),
            success: [slice.actions.enableCustomAttributeSuccess('ca-1')],
            override: { customAttributes: { enableCustomAttribute: () => throwError(() => new Error('enable failed')) } as any },
            failureType: slice.actions.enableCustomAttributeFailure.type,
            failureMessage: 'Failed to enable custom attribute',
        },
        {
            name: 'disableCustomAttribute',
            index: EpicIndex.DisableCustomAttribute,
            action: () => slice.actions.disableCustomAttribute('ca-1'),
            success: [slice.actions.disableCustomAttributeSuccess('ca-1')],
            override: { customAttributes: { disableCustomAttribute: () => throwError(() => new Error('disable failed')) } as any },
            failureType: slice.actions.disableCustomAttributeFailure.type,
            failureMessage: 'Failed to disable custom attribute',
        },
    ])('$name success/failure', async (scenario) => {
        const success = await runEpic(scenario.index, scenario.action(), { takeCount: scenario.success.length });
        expect(success).toEqual(scenario.success);

        const err = new Error(`${scenario.name} failed`);
        const failure = await runEpic(scenario.index, scenario.action(), {
            depsOverrides: {
                customAttributes: Object.fromEntries(
                    Object.keys((scenario.override as any).customAttributes).map((key) => [key, () => throwError(() => err)]),
                ) as any,
            },
            takeCount: 2,
        });

        expect(failure[0].type).toBe(scenario.failureType);
        expect(failure[1]).toEqual(appRedirectActions.fetchError({ error: err, message: scenario.failureMessage }));
    });
});
