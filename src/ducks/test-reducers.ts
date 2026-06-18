import { combineReducers, type UnknownAction } from '@reduxjs/toolkit';

// IMPORTANT: This file is used ONLY in component tests (Playwright CT).
// It must NOT import the real duck modules

export type ReactFlowUITest = {
    flowChartNodes: Array<{ id: string; parentId?: string; hidden?: boolean; position?: { x: number; y: number } }>;
    flowChartEdges: any[];
    expandedHiddenNodeId?: string;
};

export type UserInterfaceTestState = {
    widgetLocks: any[];
    globalModal: {
        title?: string;
        size: 'sm' | 'md' | 'lg' | 'xl';
        content?: unknown;
        isOpen: boolean;
        showCancelButton: boolean;
        showOkButton: boolean;
        showCloseButton: boolean;
        showSubmitButton: boolean;
        okButtonCallback?: () => void;
        cancelButtonCallback?: () => void;
    };
    initiateAttributeCallback?: boolean;
    attributeCallbackValue?: string;
    reactFlowUI?: ReactFlowUITest;
};

const userInterfaceTestInitialState: UserInterfaceTestState = {
    widgetLocks: [],
    globalModal: {
        title: undefined,
        size: 'sm',
        content: undefined,
        isOpen: false,
        showCancelButton: false,
        showOkButton: false,
        showCloseButton: false,
        showSubmitButton: false,
        okButtonCallback: undefined,
        cancelButtonCallback: undefined,
    },
    initiateAttributeCallback: undefined,
    attributeCallbackValue: undefined,
    reactFlowUI: {
        flowChartNodes: [],
        flowChartEdges: [],
        expandedHiddenNodeId: undefined,
    },
};

function userInterfaceTestReducer(
    state: UserInterfaceTestState = userInterfaceTestInitialState,
    action: UnknownAction,
): UserInterfaceTestState {
    const a = action as { type: string; payload?: any };
    if (a.type === 'userInterface/showGlobalModal' && a.payload) {
        return { ...state, globalModal: a.payload };
    }
    if (a.type === 'userInterface/resetState') {
        return { ...userInterfaceTestInitialState };
    }
    if (a.type === 'userInterface/setInitiateAttributeCallback') {
        return { ...state, initiateAttributeCallback: a.payload };
    }
    if (a.type === 'userInterface/setAttributeCallbackValue') {
        return { ...state, attributeCallbackValue: a.payload };
    }
    if (a.type === 'userInterface/clearAttributeCallbackValue') {
        return { ...state, attributeCallbackValue: undefined };
    }
    if (a.type === 'userInterface/updateReactFlowNodes' && a.payload && state.reactFlowUI) {
        return { ...state, reactFlowUI: { ...state.reactFlowUI, flowChartNodes: a.payload } };
    }
    if (a.type === 'userInterface/updateReactFlowEdges' && a.payload && state.reactFlowUI) {
        return { ...state, reactFlowUI: { ...state.reactFlowUI, flowChartEdges: a.payload } };
    }
    if (a.type === 'userInterface/setReactFlowUI') {
        return { ...state, reactFlowUI: a.payload };
    }
    if (a.type === 'userInterface/clearReactFlowUI') {
        return { ...state, reactFlowUI: undefined };
    }
    if (a.type === 'userInterface/setShowHiddenNodes') {
        const reactFlowUI = state.reactFlowUI
            ? { ...state.reactFlowUI, expandedHiddenNodeId: a.payload }
            : { flowChartNodes: [], flowChartEdges: [], expandedHiddenNodeId: a.payload };
        return { ...state, reactFlowUI };
    }
    if (a.type === 'userInterface/deleteNode' && a.payload && state.reactFlowUI) {
        const flowChartNodes = state.reactFlowUI.flowChartNodes.filter((node) => node.id !== a.payload);
        return { ...state, reactFlowUI: { ...state.reactFlowUI, flowChartNodes } };
    }
    return state;
}

export type EnumsTestState = {
    platformEnums: Record<string, Record<string, { label?: string; value?: string }>>;
};

const enumsTestInitialState: EnumsTestState = {
    platformEnums: {},
};

export type FiltersTestState = {
    filters: Array<{
        entity: number;
        filter: {
            availableFilters: any[];
            currentFilters: any[];
            preservedFilters: any[];
            isFetchingFilters: boolean;
        };
    }>;
};

const filtersTestInitialState: FiltersTestState = {
    filters: [],
};

function filtersTestReducer(state: FiltersTestState = filtersTestInitialState, action: UnknownAction): FiltersTestState {
    const a = action as { type: string; payload?: any };
    if (a.type === 'filters/getAvailableFilters') {
        return state;
    }
    if (a.type === 'filters/getAvailableFiltersSuccess' && a.payload) {
        const idx = state.filters.findIndex((f) => f.entity === a.payload.entity);
        const filter =
            idx >= 0
                ? state.filters[idx].filter
                : { availableFilters: [], currentFilters: [], preservedFilters: [], isFetchingFilters: false };
        const next = {
            entity: a.payload.entity,
            filter: { ...filter, availableFilters: a.payload.availableFilters ?? [], isFetchingFilters: false },
        };
        if (idx >= 0) {
            return {
                filters: state.filters.slice(0, idx).concat([next], state.filters.slice(idx + 1)),
            };
        }
        return { filters: [...state.filters, next] };
    }
    if (a.type === 'filters/getAvailableFiltersFailure' && a.payload) {
        const idx = state.filters.findIndex((f) => f.entity === a.payload.entity);
        if (idx < 0) return state;
        const f = state.filters[idx];
        return {
            filters: state.filters
                .slice(0, idx)
                .concat([{ ...f, filter: { ...f.filter, isFetchingFilters: false } }], state.filters.slice(idx + 1)),
        };
    }
    if (a.type === 'filters/setCurrentFilters' && a.payload) {
        const idx = state.filters.findIndex((f) => f.entity === a.payload.entity);
        const filter =
            idx >= 0
                ? state.filters[idx].filter
                : { availableFilters: [], currentFilters: [], preservedFilters: [], isFetchingFilters: false };
        const next = { entity: a.payload.entity, filter: { ...filter, currentFilters: a.payload.currentFilters ?? [] } };
        if (idx >= 0) {
            return {
                filters: state.filters.slice(0, idx).concat([next], state.filters.slice(idx + 1)),
            };
        }
        return { filters: [...state.filters, next] };
    }
    if (a.type === 'filters/setPreservedFilters' && a.payload) {
        const idx = state.filters.findIndex((f) => f.entity === a.payload.entity);
        const filter =
            idx >= 0
                ? state.filters[idx].filter
                : { availableFilters: [], currentFilters: [], preservedFilters: [], isFetchingFilters: false };
        const next = { entity: a.payload.entity, filter: { ...filter, preservedFilters: a.payload.preservedFilters ?? [] } };
        if (idx >= 0) {
            return {
                filters: state.filters.slice(0, idx).concat([next], state.filters.slice(idx + 1)),
            };
        }
        return { filters: [...state.filters, next] };
    }
    return state;
}

function enumsTestReducer(state: EnumsTestState | undefined, _action: UnknownAction): EnumsTestState {
    return state ?? enumsTestInitialState;
}

export type InfoTestState = {
    platformInfo?: any;
    isFetching: boolean;
};

const infoTestInitialState: InfoTestState = {
    platformInfo: undefined,
    isFetching: false,
};

function infoTestReducer(state: InfoTestState | undefined, action: UnknownAction): InfoTestState {
    state ??= infoTestInitialState;
    switch (action.type) {
        case 'info/getPlatformInfo':
            return { platformInfo: undefined, isFetching: true };
        case 'info/getPlatformInfoSuccess':
            return { platformInfo: action.payload, isFetching: false };
        case 'info/getPlatformInfoFailure':
            return { ...state, isFetching: false };
        default:
            return state;
    }
}

export type NotificationsTestState = {
    overviewNotifications: any[];
    isFetchingOverview: boolean;
};

const notificationsTestInitialState: NotificationsTestState = {
    overviewNotifications: [],
    isFetchingOverview: false,
};

function notificationsTestReducer(state: NotificationsTestState | undefined, _action: UnknownAction): NotificationsTestState {
    return state ?? notificationsTestInitialState;
}

export type AuthTestState = {
    profile?: {
        username: string;
        permissions?: {
            allowedListings?: any[];
        };
    };
};

const authTestInitialState: AuthTestState = {
    profile: {
        username: 'Test User',
        permissions: {
            allowedListings: [],
        },
    },
};

function authTestReducer(state: AuthTestState | undefined, _action: UnknownAction): AuthTestState {
    return state ?? authTestInitialState;
}

export type CustomAttributesTestState = {
    resourceCustomAttributes: any[];
    resourceCustomAttributesContents: Array<{ resource: string; resourceUuid: string; customAttributes: any[] }>;
    secondaryResourceCustomAttributes: any[];
    isFetchingResourceCustomAttributes: boolean;
    isUpdatingContent: boolean;
};

const customAttributesTestInitialState: CustomAttributesTestState = {
    resourceCustomAttributes: [],
    resourceCustomAttributesContents: [],
    secondaryResourceCustomAttributes: [],
    isFetchingResourceCustomAttributes: false,
    isUpdatingContent: false,
};

function customAttributesTestReducer(
    state: CustomAttributesTestState = customAttributesTestInitialState,
    action: UnknownAction,
): CustomAttributesTestState {
    const a = action as { type: string; payload?: any };
    switch (a.type) {
        case 'customAttributes/listResourceCustomAttributes':
            return { ...state, isFetchingResourceCustomAttributes: true };
        case 'customAttributes/listResourceCustomAttributesSuccess':
            return {
                ...state,
                resourceCustomAttributes: a.payload ?? [],
                isFetchingResourceCustomAttributes: false,
            };
        case 'customAttributes/listResourceCustomAttributesFailure':
            return { ...state, isFetchingResourceCustomAttributes: false };
        case 'customAttributes/loadCustomAttributeContent': {
            if (!a.payload) return state;
            const loadIdx = state.resourceCustomAttributesContents.findIndex(
                (c) => c.resource === a.payload.resource && c.resourceUuid === a.payload.resourceUuid,
            );
            if (loadIdx === -1) {
                return {
                    ...state,
                    resourceCustomAttributesContents: [...state.resourceCustomAttributesContents, a.payload],
                };
            }
            return {
                ...state,
                resourceCustomAttributesContents: state.resourceCustomAttributesContents.map((c, i) =>
                    i === loadIdx ? { ...c, customAttributes: a.payload.customAttributes } : c,
                ),
            };
        }
        case 'customAttributes/updateCustomAttributeContent':
            return { ...state, isUpdatingContent: true };
        case 'customAttributes/updateCustomAttributeContentSuccess':
        case 'customAttributes/updateCustomAttributeContentFailure':
            return { ...state, isUpdatingContent: false };
        case 'customAttributes/removeCustomAttributeContent':
            return { ...state, isUpdatingContent: true };
        case 'customAttributes/removeCustomAttributeContentSuccess':
        case 'customAttributes/removeCustomAttributeContentFailure':
            return { ...state, isUpdatingContent: false };
        default:
            return state;
    }
}

export type ConnectorsTestState = {
    callbackData: { [key: string]: any };
    isRunningCallback: { [key: string]: boolean };
};

const connectorsTestInitialState: ConnectorsTestState = {
    callbackData: {},
    isRunningCallback: {},
};

function connectorsTestReducer(state: ConnectorsTestState = connectorsTestInitialState, action: UnknownAction): ConnectorsTestState {
    const a = action as { type: string; payload?: any };
    if (a.type === 'connectors/clearCallbackData') {
        return { ...state, callbackData: {} };
    }
    if (a.type === 'connectors/callbackSuccess' && a.payload) {
        return {
            ...state,
            callbackData: { ...state.callbackData, [a.payload.callbackId]: a.payload.data },
            isRunningCallback: { ...state.isRunningCallback, [a.payload.callbackId]: false },
        };
    }
    if (a.type === 'connectors/callbackFailure' && a.payload?.callbackId) {
        return {
            ...state,
            isRunningCallback: { ...state.isRunningCallback, [a.payload.callbackId]: false },
        };
    }
    if (a.type === 'connectors/callbackConnector' || a.type === 'connectors/callbackResource') {
        const callbackId = a.payload?.callbackId;
        if (callbackId) {
            return {
                ...state,
                callbackData: { ...state.callbackData, [callbackId]: undefined },
                isRunningCallback: { ...state.isRunningCallback, [callbackId]: true },
            };
        }
    }
    return state;
}

export type SecretsTestState = {
    syncVaultProfileAttributeDescriptors: any[];
    isFetchingSyncVaultProfileAttributes: boolean;
};

const secretsTestInitialState: SecretsTestState = {
    syncVaultProfileAttributeDescriptors: [],
    isFetchingSyncVaultProfileAttributes: false,
};

function secretsTestReducer(state: SecretsTestState | undefined, _action: UnknownAction): SecretsTestState {
    return state ?? secretsTestInitialState;
}

export type VaultProfilesTestState = {
    vaultProfiles: any[];
};

const vaultProfilesTestInitialState: VaultProfilesTestState = {
    vaultProfiles: [],
};

function vaultProfilesTestReducer(state: VaultProfilesTestState | undefined, _action: UnknownAction): VaultProfilesTestState {
    return state ?? vaultProfilesTestInitialState;
}

export type TablePaginationTestState = {
    byKey: Record<string, { page: number; pageSize: number; search?: string; sortColumn?: string; sortDirection?: 'asc' | 'desc' }>;
    activeRootRoute?: string;
};

const tablePaginationTestInitialState: TablePaginationTestState = {
    byKey: {},
    activeRootRoute: undefined,
};

function tablePaginationTestReducer(
    state: TablePaginationTestState = tablePaginationTestInitialState,
    action: UnknownAction,
): TablePaginationTestState {
    const a = action as { type: string; payload?: any };

    if (a.type === 'tablePagination/setPagination' && a.payload?.key) {
        return {
            ...state,
            byKey: {
                ...state.byKey,
                [a.payload.key]: {
                    ...state.byKey[a.payload.key],
                    page: a.payload.page,
                    pageSize: a.payload.pageSize,
                },
            },
        };
    }

    if (a.type === 'tablePagination/setSearch' && a.payload?.key) {
        const prev = state.byKey[a.payload.key] ?? { page: 1, pageSize: 10 };
        return {
            ...state,
            byKey: { ...state.byKey, [a.payload.key]: { ...prev, search: a.payload.search } },
        };
    }

    if (a.type === 'tablePagination/setSort' && a.payload?.key) {
        const prev = state.byKey[a.payload.key] ?? { page: 1, pageSize: 10 };
        return {
            ...state,
            byKey: {
                ...state.byKey,
                [a.payload.key]: { ...prev, sortColumn: a.payload.sortColumn, sortDirection: a.payload.sortDirection },
            },
        };
    }

    if (a.type === 'tablePagination/clearPagination' && a.payload?.key) {
        const nextByKey = { ...state.byKey };
        delete nextByKey[a.payload.key];
        return {
            ...state,
            byKey: nextByKey,
        };
    }

    if (a.type === 'tablePagination/clearPaginationByRootRoute' && a.payload?.rootRoute) {
        const rootRoutePrefix = `/${a.payload.rootRoute}`;
        const byKey = Object.fromEntries(
            Object.entries(state.byKey).filter(
                ([key]) =>
                    !key.startsWith(`custom-table-pagination:${rootRoutePrefix}`) &&
                    !key.startsWith(`paged-custom-table-pagination:${rootRoutePrefix}`),
            ),
        );

        return {
            ...state,
            byKey,
        };
    }

    if (a.type === 'tablePagination/setActiveRootRoute' && a.payload?.rootRoute) {
        return {
            ...state,
            activeRootRoute: a.payload.rootRoute,
        };
    }

    return state;
}

export type AlertsTestState = {
    messages: Array<{ id: number; message: string; time: number; color: 'success' | 'danger' | 'info'; isHiding?: boolean }>;
    msgId: number;
};

const alertsTestInitialState: AlertsTestState = {
    messages: [],
    msgId: 0,
};

function alertsTestReducer(state: AlertsTestState = alertsTestInitialState, action: UnknownAction): AlertsTestState {
    if (action.type === 'alerts/dismiss' && typeof action.payload === 'number') {
        return { ...state, messages: state.messages.filter((m) => m.id !== action.payload) };
    }
    if (action.type === 'alerts/hide' && typeof action.payload === 'number') {
        return {
            ...state,
            messages: state.messages.map((m) => (m.id === action.payload ? { ...m, isHiding: true } : m)),
        };
    }
    return state;
}

type PagingObject = { totalItems: number; checkedRows: string[]; isFetchingList: boolean; pageNumber: number; pageSize: number };
type PagingEntry = { entity: number; paging: PagingObject };

export type PagingsTestState = { pagings: PagingEntry[] };

const EMPTY_PAGING_OBJ: PagingObject = { totalItems: 0, checkedRows: [], isFetchingList: false, pageNumber: 1, pageSize: 10 };

const pagingsTestInitialState: PagingsTestState = { pagings: [] };

function updatePaging(state: PagingsTestState, entity: number, fn: (p: PagingObject) => PagingObject): PagingsTestState {
    const idx = state.pagings.findIndex((p) => p.entity === entity);
    const existing = idx === -1 ? EMPTY_PAGING_OBJ : state.pagings[idx].paging;
    const next: PagingEntry = { entity, paging: fn(existing) };
    if (idx !== -1) {
        return { pagings: [...state.pagings.slice(0, idx), next, ...state.pagings.slice(idx + 1)] };
    }
    return { pagings: [...state.pagings, next] };
}

function pagingsTestReducer(state: PagingsTestState = pagingsTestInitialState, action: UnknownAction): PagingsTestState {
    const a = action as { type: string; payload?: any };
    if (a.type === 'pagings/list') return updatePaging(state, a.payload, (p) => ({ ...p, isFetchingList: true }));
    if (a.type === 'pagings/listSuccess')
        return updatePaging(state, a.payload?.entity, (p) => ({ ...p, isFetchingList: false, totalItems: a.payload?.totalItems ?? 0 }));
    if (a.type === 'pagings/listFailure') return updatePaging(state, a.payload, (p) => ({ ...p, isFetchingList: false }));
    if (a.type === 'pagings/setCheckedRows')
        return updatePaging(state, a.payload?.entity, (p) => ({ ...p, checkedRows: a.payload?.checkedRows ?? [] }));
    if (a.type === 'pagings/setPagination')
        return updatePaging(state, a.payload?.entity, (p) => ({
            ...p,
            pageNumber: a.payload?.pageNumber ?? p.pageNumber,
            pageSize: a.payload?.pageSize ?? p.pageSize,
        }));
    if (a.type === 'pagings/resetPaging')
        return updatePaging(state, a.payload?.entity, (p) => ({ ...p, pageNumber: 1, pageSize: 10, checkedRows: [] }));
    return state;
}

export type CertificatesTestState = {
    finalizingIssueCertificateUuids: string[];
    confirmingRevokeCertificateUuids: string[];
    cancelingPendingCertificateUuids: string[];
};

const certificatesTestInitialState: CertificatesTestState = {
    finalizingIssueCertificateUuids: [],
    confirmingRevokeCertificateUuids: [],
    cancelingPendingCertificateUuids: [],
};

function certificatesTestReducer(state: CertificatesTestState | undefined, _action: UnknownAction): CertificatesTestState {
    return state ?? certificatesTestInitialState;
}

export type UtilsCertificateTestState = {
    parsedCertificate: any;
};

const utilsCertificateTestInitialState: UtilsCertificateTestState = {
    parsedCertificate: undefined,
};

function utilsCertificateTestReducer(state: UtilsCertificateTestState | undefined, _action: UnknownAction): UtilsCertificateTestState {
    return state ?? utilsCertificateTestInitialState;
}

export type UtilsActuatorTestState = {
    health: any;
};

const utilsActuatorTestInitialState: UtilsActuatorTestState = {
    health: undefined,
};

function utilsActuatorTestReducer(state: UtilsActuatorTestState | undefined, _action: UnknownAction): UtilsActuatorTestState {
    return state ?? utilsActuatorTestInitialState;
}

export type EventHistoryTestState = {
    eventHistory?: any;
    isFetchingEventHistory: boolean;
    objectEventHistory?: any;
    isFetchingObjectEventHistory: boolean;
};

const eventHistoryTestInitialState: EventHistoryTestState = {
    eventHistory: undefined,
    isFetchingEventHistory: false,
    objectEventHistory: undefined,
    isFetchingObjectEventHistory: false,
};

function eventHistoryTestReducer(state: EventHistoryTestState | undefined, _action: UnknownAction): EventHistoryTestState {
    return state ?? eventHistoryTestInitialState;
}

type SigningRecordsDashboardTestState = {
    isFetching: boolean;
    isFetchingSeries: boolean;
    period: string;
    statistics?: any;
};

const signingRecordsDashboardTestInitialState: SigningRecordsDashboardTestState = {
    isFetching: false,
    isFetchingSeries: false,
    period: '24h',
    statistics: undefined,
};

function signingRecordsDashboardTestReducer(
    state: SigningRecordsDashboardTestState | undefined,
    _action: UnknownAction,
): SigningRecordsDashboardTestState {
    return state ?? signingRecordsDashboardTestInitialState;
}

export const testReducers = combineReducers({
    userInterface: userInterfaceTestReducer,
    enums: enumsTestReducer,
    filters: filtersTestReducer,
    info: infoTestReducer,
    eventHistory: eventHistoryTestReducer,
    notifications: notificationsTestReducer,
    auth: authTestReducer,
    customAttributes: customAttributesTestReducer,
    connectors: connectorsTestReducer,
    secrets: secretsTestReducer,
    vaultProfiles: vaultProfilesTestReducer,
    tablePagination: tablePaginationTestReducer,
    alerts: alertsTestReducer,
    pagings: pagingsTestReducer,
    certificates: certificatesTestReducer,
    utilsCertificate: utilsCertificateTestReducer,
    utilsActuator: utilsActuatorTestReducer,
    signingRecordsDashboard: signingRecordsDashboardTestReducer,
});

export const testInitialState = {
    userInterface: userInterfaceTestInitialState,
    enums: enumsTestInitialState,
    filters: filtersTestInitialState,
    info: infoTestInitialState,
    eventHistory: eventHistoryTestInitialState,
    notifications: notificationsTestInitialState,
    auth: authTestInitialState,
    customAttributes: customAttributesTestInitialState,
    connectors: connectorsTestInitialState,
    secrets: secretsTestInitialState,
    vaultProfiles: vaultProfilesTestInitialState,
    tablePagination: tablePaginationTestInitialState,
    alerts: alertsTestInitialState,
    pagings: pagingsTestInitialState,
    certificates: certificatesTestInitialState,
    utilsCertificate: utilsCertificateTestInitialState,
    utilsActuator: utilsActuatorTestInitialState,
    signingRecordsDashboard: signingRecordsDashboardTestInitialState,
};
