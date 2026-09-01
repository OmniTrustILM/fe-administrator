import { act } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest';
import { AttributeContentType, AttributeType, ConnectorInterface, ConnectorVersion, FunctionGroupCode } from 'types/openapi';
import { getTokenAttributesQueryKey } from 'ducks/tokens';
import TokenForm from './index';
import { setupReactActEnvironment } from '../../test-utils/reactActEnvironment';
import { useDispatchMock, useSelectorMock } from '../../test-utils/reactReduxMockModule';

setupReactActEnvironment();

const selectChoices = vi.hoisted(() => ({ tokenProviderSelect: '', storeKindSelect: '' }));
let routeParams: Record<string, string> = {};

vi.mock('react-redux', async () => await import('../../test-utils/reactReduxMockModule'));
vi.mock('react-router', () => ({ useParams: () => routeParams }));

vi.mock('components/Select', () => ({
    default: ({ id, onChange }: { id: keyof typeof selectChoices; onChange: (value: string) => void }) => (
        <button type="button" data-testid={`select-${id}`} onClick={() => onChange(selectChoices[id])}>
            select
        </button>
    ),
}));
vi.mock('components/TextInput', () => ({
    default: ({ id, value, onChange }: { id: string; value?: string; onChange: (value: string) => void }) => (
        <input data-testid={`input-${id}`} value={value ?? ''} onChange={(event) => onChange(event.target.value)} />
    ),
}));
vi.mock('components/Widget', () => ({
    default: ({ busy, children }: { busy?: boolean; children: React.ReactNode }) => (
        <div data-testid="token-widget" data-busy={String(!!busy)}>
            {children}
        </div>
    ),
}));
vi.mock('components/Layout/TabLayout', () => ({
    default: ({ tabs }: { tabs: Array<{ title: string; content: React.ReactNode }> }) => (
        <div>
            {tabs.map((tab) => (
                <div key={tab.title}>{tab.content}</div>
            ))}
        </div>
    ),
}));
vi.mock('components/Attributes/AttributeEditor', async () => {
    const { useEffect } = await import('react');
    const { useFormContext } = await import('react-hook-form');
    const keys = await import('components/Attributes/AttributeEditor/attributeEditorKeys');
    return {
        default: ({ id, connectorUuid }: { id: string; connectorUuid?: string }) => {
            const { setValue } = useFormContext();
            useEffect(() => {
                if (id === 'token' && connectorUuid === 'legacy-one') {
                    setValue('__attributes__token__.legacySecret', 'obsolete-value');
                }
            }, [connectorUuid, id, setValue]);
            return <div data-testid={`attribute-editor-${id}`} />;
        },
        ...keys,
    };
});
vi.mock('components/Button', () => ({
    default: ({
        children,
        onClick,
        type,
        'data-testid': dataTestId,
    }: {
        children: React.ReactNode;
        onClick?: () => void;
        type?: 'button' | 'submit';
        'data-testid'?: string;
    }) => (
        <button type={type ?? 'button'} onClick={onClick} data-testid={dataTestId}>
            {children}
        </button>
    ),
}));
vi.mock('components/ProgressButton', () => ({
    default: ({ title, type }: { title: string; type?: 'button' | 'submit' }) => <button type={type ?? 'button'}>{title}</button>,
}));
vi.mock('components/Container', () => ({ default: ({ children }: { children: React.ReactNode }) => <div>{children}</div> }));

const legacyOne = {
    uuid: 'legacy-one',
    name: 'Legacy One',
    version: ConnectorVersion.V1,
    functionGroups: [{ functionGroupCode: FunctionGroupCode.CryptographyProvider, kinds: ['PKCS11', 'SOFT'] }],
    interfaces: [],
};

const legacyTwo = {
    ...legacyOne,
    uuid: 'legacy-two',
    name: 'Legacy Two',
};

const v2Provider = {
    uuid: 'v2-provider',
    name: 'V2 Provider',
    version: ConnectorVersion.V2,
    functionGroups: [{ functionGroupCode: FunctionGroupCode.CryptographyProvider, kinds: ['must-not-be-used'] }],
    interfaces: [{ uuid: 'crypto-interface', code: ConnectorInterface.Cryptography, version: 'v1' }],
};

const legacyDescriptor = {
    type: AttributeType.Data,
    name: 'legacySecret',
    uuid: 'legacy-secret',
    contentType: AttributeContentType.String,
    content: [],
    properties: { required: false, label: 'Legacy secret', readOnly: false, visible: true, list: false },
};

function buildState(overrides: Record<string, unknown> = {}) {
    const token = overrides.token as { uuid?: string; connectorUuid?: string; kind?: string } | undefined;
    const tokenProviders = (overrides.tokenProviders ?? []) as Array<{ uuid: string; version: ConnectorVersion }>;
    const tokenProvider = tokenProviders.find((provider) => provider.uuid === token?.connectorUuid);
    const editQuery =
        tokenProvider && token?.connectorUuid && (tokenProvider.version === ConnectorVersion.V2 || token.kind)
            ? { connectorUuid: token.connectorUuid, ...(tokenProvider.version === ConnectorVersion.V2 ? {} : { kind: token.kind }) }
            : undefined;
    const activeQuery =
        (overrides.activeQuery as { connectorUuid: string; kind?: string } | undefined) ??
        (overrides.descriptorReady === false ? undefined : editQuery);
    const activeQueryKey = activeQuery ? getTokenAttributesQueryKey(activeQuery) : undefined;
    const descriptors = (overrides.descriptors ?? []) as unknown[];

    return {
        tokens: {
            token,
            tokenDetailsByUuid: token?.uuid ? { [token.uuid]: token } : {},
            tokenProviders,
            tokenProviderAttributeDescriptors: descriptors,
            tokenProviderAttributeDescriptorsByQueryKey:
                activeQueryKey && overrides.descriptorReady !== false ? { [activeQueryKey]: descriptors } : {},
            tokenProviderAttributesQueryKey: activeQueryKey,
            isFetchingDetail: false,
            isFetchingTokenProviders: false,
            isFetchingTokenProviderAttributeDescriptors: overrides.isFetchingAttributes ?? false,
            isCreating: false,
            isUpdating: false,
            createTokenSucceeded: false,
            updateTokenSucceeded: false,
        },
        customAttributes: {
            resourceCustomAttributes: [],
            isFetchingResourceCustomAttributes: false,
        },
    };
}

describe('TokenForm token attribute selection', () => {
    let container: HTMLDivElement;
    let root: Root;
    let dispatch: ReturnType<typeof vi.fn>;

    beforeEach(() => {
        container = document.createElement('div');
        document.body.appendChild(container);
        root = createRoot(container);
        dispatch = vi.fn();
        useDispatchMock.mockReturnValue(dispatch);
        routeParams = {};
        selectChoices.tokenProviderSelect = '';
        selectChoices.storeKindSelect = '';
    });

    afterEach(() => {
        act(() => root.unmount());
        container.remove();
        vi.clearAllMocks();
    });

    async function render(state: ReturnType<typeof buildState>) {
        useSelectorMock.mockImplementation((selector: (value: unknown) => unknown) => selector(state));
        await act(async () => root.render(<TokenForm />));
    }

    async function click(testId: string) {
        await act(async () => container.querySelector<HTMLButtonElement>(`[data-testid="${testId}"]`)?.click());
    }

    async function setName(name: string) {
        await act(async () => {
            const input = container.querySelector<HTMLInputElement>('[data-testid="input-name"]');
            const setter = Object.getOwnPropertyDescriptor(globalThis.HTMLInputElement.prototype, 'value')?.set;
            setter?.call(input, name);
            input?.dispatchEvent(new Event('input', { bubbles: true }));
        });
    }

    async function submit() {
        await act(async () => container.querySelector('form')?.dispatchEvent(new Event('submit', { bubbles: true, cancelable: true })));
    }

    test('legacyProvider_waitsForKind_andRefetchesWhenKindChanges', async () => {
        // given
        const state = buildState({ tokenProviders: [legacyOne] });
        selectChoices.tokenProviderSelect = legacyOne.uuid;
        await render(state);

        // when
        await click('select-tokenProviderSelect');

        // then
        expect(dispatch).not.toHaveBeenCalledWith(expect.objectContaining({ type: 'tokens/getTokenProviderAttributesDescriptors' }));
        expect(container.querySelector('[data-testid="select-storeKindSelect"]')).not.toBeNull();

        // when
        selectChoices.storeKindSelect = 'PKCS11';
        await click('select-storeKindSelect');
        selectChoices.storeKindSelect = 'SOFT';
        await click('select-storeKindSelect');

        // then
        const requests = dispatch.mock.calls
            .map(([action]) => action)
            .filter((action) => action.type === 'tokens/ensureTokenProviderAttributesDescriptors');
        expect(requests.map((action) => action.payload)).toEqual([
            { connectorUuid: legacyOne.uuid, kind: 'PKCS11' },
            { connectorUuid: legacyOne.uuid, kind: 'SOFT' },
        ]);
    });

    test('v2Provider_fetchesImmediatelyWithoutKind_andCreateOmitsKind', async () => {
        // given
        const state = buildState({ tokenProviders: [v2Provider] });
        selectChoices.tokenProviderSelect = v2Provider.uuid;
        await render(state);

        // when
        await click('select-tokenProviderSelect');
        await setName('V2 token');
        await submit();

        // then
        expect(container.querySelector('[data-testid="select-storeKindSelect"]')).toBeNull();
        expect(dispatch).toHaveBeenCalledWith({
            type: 'tokens/ensureTokenProviderAttributesDescriptors',
            payload: { connectorUuid: v2Provider.uuid },
        });
        const createAction = dispatch.mock.calls.map(([action]) => action).find((action) => action.type === 'tokens/createToken');
        expect(createAction.payload).not.toHaveProperty('kind');
    });

    test('connectorChange_clearsPreviousSchemaValues', async () => {
        // given
        const state = buildState({
            tokenProviders: [legacyOne, legacyTwo],
            descriptors: [legacyDescriptor],
            activeQuery: { connectorUuid: legacyOne.uuid, kind: 'PKCS11' },
        });
        selectChoices.tokenProviderSelect = legacyOne.uuid;
        selectChoices.storeKindSelect = 'PKCS11';
        await render(state);
        await click('select-tokenProviderSelect');
        await click('select-storeKindSelect');

        // when
        selectChoices.tokenProviderSelect = legacyTwo.uuid;
        await click('select-tokenProviderSelect');
        await click('select-storeKindSelect');
        await setName('Changed connector token');
        await submit();

        // then
        const createAction = dispatch.mock.calls.map(([action]) => action).find((action) => action.type === 'tokens/createToken');
        expect(createAction.payload.connectorUuid).toBe(legacyTwo.uuid);
        expect(createAction.payload.attributes).toEqual([]);
    });

    test('editV2Provider_withCachedSchema_updatesWithoutKind', async () => {
        // given
        const token = {
            uuid: 'token-1',
            name: 'Existing V2 token',
            connectorUuid: v2Provider.uuid,
            connectorName: v2Provider.name,
            attributes: [],
            customAttributes: [],
        };
        routeParams = { id: token.uuid };

        // when
        await render(buildState({ token, tokenProviders: [v2Provider] }));
        await submit();

        // then
        const updateAction = dispatch.mock.calls.map(([action]) => action).find((action) => action.type === 'tokens/updateToken');
        expect(updateAction.payload.updateToken).not.toHaveProperty('kind');
    });

    test('editV2Provider_requestsMissingSchema_withoutWaitingForKind', async () => {
        // given
        const token = {
            uuid: 'token-without-schema',
            name: 'Existing V2 token',
            connectorUuid: v2Provider.uuid,
            connectorName: v2Provider.name,
            attributes: [],
            customAttributes: [],
        };
        routeParams = { id: token.uuid };

        // when
        await render(buildState({ token, tokenProviders: [v2Provider], descriptorReady: false }));

        // then
        expect(dispatch).toHaveBeenCalledWith({
            type: 'tokens/ensureTokenProviderAttributesDescriptors',
            payload: { connectorUuid: v2Provider.uuid },
        });
    });

    test('attributeLoading_keepsExistingBusyUiBehavior', async () => {
        // given
        const state = buildState({ isFetchingAttributes: true });

        // when
        await render(state);

        // then
        expect(container.querySelector('[data-testid="token-widget"]')?.getAttribute('data-busy')).toBe('true');
    });

    test('attributeFailure_stopsBusyUi_andDoesNotMountAnEmptySchema', async () => {
        // given
        const token = {
            uuid: 'token-with-failed-schema',
            name: 'Failed schema token',
            connectorUuid: legacyOne.uuid,
            connectorName: legacyOne.name,
            kind: 'PKCS11',
            attributes: [],
            customAttributes: [],
        };
        routeParams = { id: token.uuid };

        // when
        await render(
            buildState({
                token,
                tokenProviders: [legacyOne],
                descriptorReady: false,
                activeQuery: { connectorUuid: legacyOne.uuid, kind: token.kind },
            }),
        );

        // then
        expect(container.querySelector('[data-testid="token-widget"]')?.getAttribute('data-busy')).toBe('false');
        expect(container.querySelector('[data-testid="attribute-editor-token"]')).toBeNull();
        expect(container.querySelector<HTMLInputElement>('[data-testid="input-name"]')?.value).toBe(token.name);
        expect(container.querySelector<HTMLInputElement>('[data-testid="input-tokenProvider"]')?.value).toBe(token.connectorName);
        expect(container.querySelector<HTMLInputElement>('[data-testid="input-storeKind"]')?.value).toBe(token.kind);
        expect(container.querySelector('[data-testid="retry-token-attributes"]')).not.toBeNull();

        // when
        await click('retry-token-attributes');

        // then
        expect(dispatch).toHaveBeenCalledWith({
            type: 'tokens/getTokenProviderAttributesDescriptors',
            payload: { connectorUuid: legacyOne.uuid, kind: token.kind },
        });
    });

    test('editHydration_displaysTokenProviderAndKind_withoutPostMountReset', async () => {
        // given
        const token = {
            uuid: 'token-1',
            name: 'test',
            connectorUuid: legacyOne.uuid,
            connectorName: 'HSM PIN',
            kind: 'softhsm',
            attributes: [],
            customAttributes: [],
        };
        routeParams = { id: token.uuid };

        // when
        await render(buildState({ token, tokenProviders: [legacyOne], descriptors: [legacyDescriptor] }));

        // then
        expect(container.querySelector<HTMLInputElement>('[data-testid="input-name"]')?.value).toBe('test');
        expect(container.querySelector<HTMLInputElement>('[data-testid="input-tokenProvider"]')?.value).toBe('HSM PIN');
        expect(container.querySelector<HTMLInputElement>('[data-testid="input-storeKind"]')?.value).toBe('softhsm');
        expect(container.querySelector('[data-testid="attribute-editor-token"]')).not.toBeNull();
    });

    test('switchingFromEditToCreate_resetsPreviousTokenValues', async () => {
        // given
        const token = {
            uuid: 'token-to-edit',
            name: 'Existing token',
            connectorUuid: legacyOne.uuid,
            connectorName: legacyOne.name,
            kind: 'PKCS11',
            attributes: [],
            customAttributes: [],
        };
        routeParams = { id: token.uuid };
        await render(buildState({ token, tokenProviders: [legacyOne], descriptors: [legacyDescriptor] }));

        // when
        routeParams = {};
        await render(buildState({ tokenProviders: [legacyOne] }));
        await setName('New token');
        await submit();

        // then
        const createAction = dispatch.mock.calls.map(([action]) => action).find((action) => action.type === 'tokens/createToken');
        expect(createAction).toBeUndefined();
        expect(container.querySelector<HTMLInputElement>('[data-testid="input-name"]')?.value).toBe('New token');
    });
});
