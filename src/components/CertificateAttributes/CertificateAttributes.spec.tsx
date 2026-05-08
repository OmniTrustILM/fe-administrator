import { test, expect } from '../../../playwright/ct-test';
import { createMockStore, withProviders } from 'utils/test-helpers';
import CertificateAttributes from './index';

const mockCert = {
    subjectDn: 'CN=test',
    issuerDn: 'CN=issuer',
    notBefore: '2024-01-01',
    notAfter: '2025-01-01',
    serialNumber: 'abc123',
} as any;

test.describe('CertificateAttributes', () => {
    test('renders "Certificate information not available" when no certificate', async ({ mount, page }) => {
        await mount(<CertificateAttributes />);
        await expect(page.getByText('Certificate information not available')).toBeVisible();
    });

    test('renders table when certificate is provided', async ({ mount, page }) => {
        const store = createMockStore();
        await mount(withProviders(<CertificateAttributes certificate={mockCert} />, { store }));
        await expect(page.locator('table')).toBeVisible();
    });

    test('csr=true shows only Subject DN row', async ({ mount, page }) => {
        const store = createMockStore();
        await mount(withProviders(<CertificateAttributes certificate={mockCert} csr={true} />, { store }));
        await expect(page.locator('tbody tr')).toHaveCount(1);
    });

    test('csr=false shows 5 rows (Subject DN + 4 more)', async ({ mount, page }) => {
        const store = createMockStore();
        await mount(withProviders(<CertificateAttributes certificate={mockCert} csr={false} />, { store }));
        await expect(page.locator('tbody tr')).toHaveCount(5);
    });

    test('isLoading=true renders table-skeleton', async ({ mount, page }) => {
        const store = createMockStore();
        await mount(withProviders(<CertificateAttributes isLoading={true} />, { store }));
        await expect(page.getByTestId('table-skeleton')).toHaveCount(1);
    });
});
