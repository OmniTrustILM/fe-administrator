import { act } from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { createRoot, type Root } from 'react-dom/client';

import CustomOIDDetail from './index';
import { OidCategory, ExtensionValueEncoding, PlatformEnum, Resource } from 'types/openapi';
import { setupReactActEnvironment } from '../../test-utils/reactActEnvironment';
import { useDispatchMock, useSelectorMock } from '../../test-utils/reactReduxMockModule';

setupReactActEnvironment();

let routeParams: Record<string, string> = {};

vi.mock('react-redux', async () => await import('../../test-utils/reactReduxMockModule'));
vi.mock('react-router', () => ({ useParams: () => routeParams }));
vi.mock('components/CustomTable', async () => {
    const { customTableMockModule } = await import('../../test-utils/mockModules');
    return customTableMockModule();
});
vi.mock('components/Widget', () => ({ default: ({ title, children }: any) => <div data-testid={`widget-${title}`}>{children}</div> }));
vi.mock('components/Dialog', () => ({ default: () => null }));
vi.mock('components/Breadcrumb', () => ({ default: () => <div data-testid="breadcrumb" /> }));
vi.mock('components/Container', () => ({ default: ({ children }: any) => <div>{children}</div> }));
vi.mock('components/DetailPageSkeleton', () => ({ default: () => <div data-testid="skeleton" /> }));
vi.mock('components/EnumDescription', () => ({ EnumValueDescription: () => <span /> }));
vi.mock('components/_pages/custom-oid/form', () => ({ default: () => <div /> }));

function buildState(oid: any) {
    return {
        oids: { oid, isFetching: false, isDeleting: false, isUpdating: false, updateOidSucceeded: false },
        enums: {
            platformEnums: {
                [PlatformEnum.OidCategory]: {
                    [OidCategory.CertificateExtension]: { code: OidCategory.CertificateExtension, label: 'Certificate Extension' },
                    [OidCategory.RdnAttributeType]: { code: OidCategory.RdnAttributeType, label: 'RDN Attribute Type' },
                },
                [PlatformEnum.Resource]: { [Resource.Oids]: { code: Resource.Oids, label: 'OID' } },
            },
        },
    };
}

describe('CustomOIDDetail — additional properties', () => {
    let container: HTMLDivElement;
    let root: Root;

    beforeEach(() => {
        container = document.createElement('div');
        document.body.appendChild(container);
        root = createRoot(container);
        routeParams = { id: '2.5.29.37' };
        useDispatchMock.mockReturnValue(vi.fn());
    });

    afterEach(() => {
        act(() => root.unmount());
        container.remove();
        vi.clearAllMocks();
    });

    async function render(oid: any) {
        useSelectorMock.mockImplementation((selector: any) => selector(buildState(oid)));
        await act(async () => {
            root.render(<CustomOIDDetail />);
        });
    }

    it('renders Default Critical + Value Encoding for a certificate extension OID', async () => {
        await render({
            oid: '2.5.29.37',
            displayName: 'Extended Key Usage',
            category: OidCategory.CertificateExtension,
            additionalProperties: { defaultCritical: true, valueEncoding: ExtensionValueEncoding.Der },
        });

        expect(container.querySelector('[data-testid="widget-Additional Properties"]')).not.toBeNull();
        expect(container.querySelector('[data-testid="row-defaultcritical"]')?.textContent).toContain('Enabled');
        expect(container.querySelector('[data-testid="row-valueencoding"]')?.textContent).toContain('DER');
    });

    it('still renders Code + Alternative Codes for an RDN OID', async () => {
        await render({
            oid: '2.5.4.3',
            displayName: 'Common Name',
            category: OidCategory.RdnAttributeType,
            additionalProperties: { code: 'CN', altCodes: ['commonName'] },
        });

        expect(container.querySelector('[data-testid="row-code"]')?.textContent).toContain('CN');
        expect(container.querySelector('[data-testid="row-alternativecodes"]')?.textContent).toContain('commonName');
    });
});
