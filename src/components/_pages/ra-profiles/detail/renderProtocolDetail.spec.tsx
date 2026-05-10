import { test, expect } from '../../../../../playwright/ct-test';
import { Provider } from 'react-redux';
import { MemoryRouter } from 'react-router';
import { createMockStore } from 'utils/test-helpers';
import { renderProtocolDetail } from './renderProtocolDetail';
import type { TableDataRow, TableHeader } from 'components/CustomTable';
import type { AttributeResponseModel } from 'types/attributes';
import { AttributeContentType, AttributeType, PlatformEnum } from 'types/openapi';

const headers: TableHeader[] = [
    { id: 'setting', content: 'Setting' },
    { id: 'value', content: 'Value' },
];

const profileData: TableDataRow[] = [{ id: 'r1', columns: ['UUID', 'abc-123'] }];

const issueAttr: AttributeResponseModel = {
    uuid: 'i1',
    name: 'IssueAttr',
    label: 'Issue Attribute',
    type: AttributeType.Data,
    contentType: AttributeContentType.String,
    content: [{ data: 'issue-value' }],
};

const revokeAttr: AttributeResponseModel = {
    uuid: 'r1',
    name: 'RevokeAttr',
    label: 'Revoke Attribute',
    type: AttributeType.Data,
    contentType: AttributeContentType.String,
    content: [{ data: 'revoke-value' }],
};

const platformEnums = {
    [PlatformEnum.AttributeContentType]: { [AttributeContentType.String]: { label: 'String' } },
};

const withStore = (node: React.ReactNode) => {
    const store = createMockStore({ enums: { platformEnums } } as any);
    return (
        <Provider store={store}>
            <MemoryRouter>{node}</MemoryRouter>
        </Provider>
    );
};

test.describe('renderProtocolDetail', () => {
    test('shows inactive label when protocol is not available', async ({ mount, page }) => {
        await mount(withStore(<>{renderProtocolDetail(false, 'ACME is not active', headers, profileData)}</>));
        await expect(page.getByText('ACME is not active')).toBeVisible();
        await expect(page.getByText('Protocol settings')).toHaveCount(0);
    });

    test('shows inactive label when isAvailable is undefined', async ({ mount, page }) => {
        await mount(withStore(<>{renderProtocolDetail(undefined, 'SCEP is not active', headers, profileData)}</>));
        await expect(page.getByText('SCEP is not active')).toBeVisible();
    });

    test('shows protocol settings table when available', async ({ mount, page }) => {
        await mount(withStore(<>{renderProtocolDetail(true, 'CMP is not active', headers, profileData)}</>));
        await expect(page.getByText('Protocol settings')).toBeVisible();
        await expect(page.getByText('UUID')).toBeVisible();
        await expect(page.getByText('abc-123')).toBeVisible();
        await expect(page.getByText('Settings for certificate issuing')).toHaveCount(0);
        await expect(page.getByText('Settings for certificate revocation')).toHaveCount(0);
    });

    test('renders issue attributes section when issueAttrs is non-empty', async ({ mount, page }) => {
        await mount(withStore(<>{renderProtocolDetail(true, 'inactive', headers, profileData, [issueAttr])}</>));
        await expect(page.getByText('Settings for certificate issuing')).toBeVisible();
        await expect(page.getByText('Settings for certificate revocation')).toHaveCount(0);
    });

    test('does not render issue attributes section when issueAttrs is empty array', async ({ mount, page }) => {
        await mount(withStore(<>{renderProtocolDetail(true, 'inactive', headers, profileData, [])}</>));
        await expect(page.getByText('Settings for certificate issuing')).toHaveCount(0);
    });

    test('renders revoke attributes section when revokeAttrs is non-empty', async ({ mount, page }) => {
        await mount(withStore(<>{renderProtocolDetail(true, 'inactive', headers, profileData, undefined, [revokeAttr])}</>));
        await expect(page.getByText('Settings for certificate revocation')).toBeVisible();
        await expect(page.getByText('Settings for certificate issuing')).toHaveCount(0);
    });

    test('renders both issue and revoke attribute sections when both provided', async ({ mount, page }) => {
        await mount(withStore(<>{renderProtocolDetail(true, 'inactive', headers, profileData, [issueAttr], [revokeAttr])}</>));
        await expect(page.getByText('Settings for certificate issuing')).toBeVisible();
        await expect(page.getByText('Settings for certificate revocation')).toBeVisible();
    });
});
