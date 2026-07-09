import { act } from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { createRoot, type Root } from 'react-dom/client';

import CustomOIDForm from './index';
import { OidCategory, ExtensionValueEncoding, PlatformEnum } from 'types/openapi';
import { setupReactActEnvironment } from '../../test-utils/reactActEnvironment';
import { useDispatchMock, useSelectorMock } from '../../test-utils/reactReduxMockModule';

setupReactActEnvironment();

vi.mock('react-redux', async () => await import('../../test-utils/reactReduxMockModule'));

let selectValueById: Record<string, unknown> = {};

vi.mock('components/Select', () => ({
    default: ({ id, value, onChange }: any) => (
        <button type="button" data-testid={`select-${id}`} data-value={value ?? ''} onClick={() => onChange(selectValueById[id])}>
            select
        </button>
    ),
}));
vi.mock('components/Switch', () => ({
    default: ({ id, checked, onChange }: any) => (
        <input type="checkbox" data-testid={`switch-${id}`} checked={!!checked} onChange={(e) => onChange(e.target.checked)} />
    ),
}));
vi.mock('components/TextInput', () => ({
    default: ({ id, value, onChange }: any) => (
        <input data-testid={`input-${id}`} value={value ?? ''} onChange={(e) => onChange(e.target.value)} />
    ),
}));
vi.mock('components/TextArea', () => ({
    default: ({ id, value, onChange }: any) => (
        <textarea data-testid={`textarea-${id}`} value={value ?? ''} onChange={(e) => onChange(e.target.value)} />
    ),
}));
vi.mock('components/Input/MultipleValueTextInput', () => ({
    default: ({ id }: any) => <div data-testid={`multi-${id}`} />,
}));
vi.mock('components/Label', () => ({ default: ({ children }: any) => <span>{children}</span> }));
vi.mock('components/Widget', () => ({ default: ({ children }: any) => <div>{children}</div> }));
vi.mock('components/Container', () => ({ default: ({ children }: any) => <div>{children}</div> }));
vi.mock('components/Button', () => ({
    default: ({ children, onClick, type }: any) => (
        <button type={type ?? 'button'} onClick={onClick}>
            {children}
        </button>
    ),
}));
vi.mock('components/ProgressButton', () => ({
    default: ({ title, type, disabled }: any) => (
        <button type={type ?? 'button'} disabled={disabled}>
            {title}
        </button>
    ),
}));

function buildState() {
    return {
        oids: {
            oid: undefined,
            isFetching: false,
            isCreating: false,
            isUpdating: false,
        },
        enums: {
            platformEnums: {
                [PlatformEnum.OidCategory]: {
                    [OidCategory.RdnAttributeType]: { code: OidCategory.RdnAttributeType, label: 'RDN Attribute Type' },
                    [OidCategory.CertificateExtension]: {
                        code: OidCategory.CertificateExtension,
                        label: 'Certificate Extension',
                    },
                },
            },
        },
    };
}

describe('CustomOIDForm — Certificate Extension branch', () => {
    let container: HTMLDivElement;
    let root: Root;
    let dispatchFn: ReturnType<typeof vi.fn>;

    beforeEach(() => {
        container = document.createElement('div');
        document.body.appendChild(container);
        root = createRoot(container);
        selectValueById = {};
        dispatchFn = vi.fn();
        useDispatchMock.mockReturnValue(dispatchFn);
    });

    afterEach(() => {
        act(() => root.unmount());
        container.remove();
        vi.clearAllMocks();
    });

    async function render() {
        const state = buildState();
        useSelectorMock.mockImplementation((selector: any) => selector(state));
        await act(async () => {
            root.render(<CustomOIDForm onCancel={() => {}} />);
        });
    }

    it('reveals Default Critical + Value Encoding when Certificate Extension is picked', async () => {
        selectValueById = { categorySelect: OidCategory.CertificateExtension };
        await render();
        await act(async () => {
            container.querySelector<HTMLButtonElement>('[data-testid="select-categorySelect"]')?.click();
        });

        expect(container.querySelector('[data-testid="switch-defaultCritical"]')).not.toBeNull();
        expect(container.querySelector('[data-testid="select-valueEncodingSelect"]')).not.toBeNull();
        expect(container.querySelector('[data-testid="input-code"]')).toBeNull();
    });

    it('keeps the RDN OID code field for the RDN category', async () => {
        selectValueById = { categorySelect: OidCategory.RdnAttributeType };
        await render();
        await act(async () => {
            container.querySelector<HTMLButtonElement>('[data-testid="select-categorySelect"]')?.click();
        });

        expect(container.querySelector('[data-testid="input-code"]')).not.toBeNull();
        expect(container.querySelector('[data-testid="switch-defaultCritical"]')).toBeNull();
    });

    it('dispatches createOID with certificate-extension additionalProperties', async () => {
        selectValueById = { categorySelect: OidCategory.CertificateExtension, valueEncodingSelect: ExtensionValueEncoding.Der };
        await render();

        const setInput = (id: string, val: string) => {
            const el = container.querySelector<HTMLInputElement>(`[data-testid="input-${id}"]`);
            const setter = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, 'value')?.set;
            setter?.call(el, val);
            el?.dispatchEvent(new Event('input', { bubbles: true }));
        };

        await act(async () => setInput('oid', '2.5.29.37'));
        await act(async () => setInput('displayName', 'Extended Key Usage'));
        await act(async () => {
            container.querySelector<HTMLButtonElement>('[data-testid="select-categorySelect"]')?.click();
        });
        await act(async () => {
            container.querySelector<HTMLButtonElement>('[data-testid="select-valueEncodingSelect"]')?.click();
        });
        await act(async () => {
            container.querySelector<HTMLInputElement>('[data-testid="switch-defaultCritical"]')?.click();
        });
        await act(async () => {
            container.querySelector('form')?.dispatchEvent(new Event('submit', { bubbles: true, cancelable: true }));
        });

        expect(dispatchFn).toHaveBeenCalledWith(
            expect.objectContaining({
                type: expect.stringContaining('createOID'),
                payload: {
                    oid: expect.objectContaining({
                        category: OidCategory.CertificateExtension,
                        additionalProperties: { defaultCritical: true, valueEncoding: ExtensionValueEncoding.Der },
                    }),
                },
            }),
        );
    });

    it('enables submit after switching category from RDN to Certificate Extension', async () => {
        selectValueById = { categorySelect: OidCategory.RdnAttributeType };
        await render();

        const setInput = (id: string, val: string) => {
            const el = container.querySelector<HTMLInputElement>(`[data-testid="input-${id}"]`);
            const setter = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, 'value')?.set;
            setter?.call(el, val);
            el?.dispatchEvent(new Event('input', { bubbles: true }));
        };

        await act(async () => setInput('oid', '2.5.29.37'));
        await act(async () => setInput('displayName', 'Extended Key Usage'));
        // Pick RDN → reveals a required `code` field that is left empty.
        await act(async () => {
            container.querySelector<HTMLButtonElement>('[data-testid="select-categorySelect"]')?.click();
        });
        // Switch to Certificate Extension — the now-hidden RDN `code` must no longer block validity.
        selectValueById.categorySelect = OidCategory.CertificateExtension;
        await act(async () => {
            container.querySelector<HTMLButtonElement>('[data-testid="select-categorySelect"]')?.click();
        });
        // Fill the Certificate Extension required field.
        selectValueById.valueEncodingSelect = ExtensionValueEncoding.Der;
        await act(async () => {
            container.querySelector<HTMLButtonElement>('[data-testid="select-valueEncodingSelect"]')?.click();
        });

        const submit = [...container.querySelectorAll('button')].find((b) => b.textContent === 'Create');
        expect(submit).toBeDefined();
        expect((submit as HTMLButtonElement).disabled).toBe(false);
    });

    it('pre-populates Default Critical and Value Encoding in edit mode', async () => {
        const state = buildState();
        state.oids.oid = {
            oid: '2.5.29.37',
            displayName: 'Extended Key Usage',
            description: '',
            category: OidCategory.CertificateExtension,
            additionalProperties: { defaultCritical: true, valueEncoding: ExtensionValueEncoding.Der },
        } as any;
        useSelectorMock.mockImplementation((selector: any) => selector(state));

        await act(async () => {
            root.render(<CustomOIDForm oidId="2.5.29.37" onCancel={() => {}} />);
        });

        const critical = container.querySelector<HTMLInputElement>('[data-testid="switch-defaultCritical"]');
        expect(critical).not.toBeNull();
        expect(critical?.checked).toBe(true);

        const encoding = container.querySelector<HTMLButtonElement>('[data-testid="select-valueEncodingSelect"]');
        expect(encoding).not.toBeNull();
        expect(encoding?.getAttribute('data-value')).toBe(ExtensionValueEncoding.Der);
    });
});
