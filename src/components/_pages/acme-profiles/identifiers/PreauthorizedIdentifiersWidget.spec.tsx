import { AcmeIdentifierAuthorizationMode, AcmeIdentifierMatchType, AcmeIdentifierType } from 'types/openapi';
import { expect, test } from '../../../../../playwright/ct-test';
import PreauthorizedIdentifiersWidgetHarness from './PreauthorizedIdentifiersWidgetHarness';

test.describe('PreauthorizedIdentifiersWidget', () => {
    test('an empty policy says nothing is pre-authorized, under the default mode', async ({ mount, page }) => {
        await mount(<PreauthorizedIdentifiersWidgetHarness identifiers={[]} />);

        await expect(page.getByTestId('identifier-policy-mode')).toContainText('Pre-authorized or Challenge');
        await expect(page.getByTestId('identifier-policy-empty')).toBeVisible();
    });

    test('lists each entry with its type, match and wildcard flag, and the mode', async ({ mount, page }) => {
        await mount(
            <PreauthorizedIdentifiersWidgetHarness
                identifiers={[
                    {
                        type: AcmeIdentifierType.Dns,
                        value: 'apps.example.com',
                        matchType: AcmeIdentifierMatchType.Subdomain,
                        allowWildcard: true,
                    },
                    { type: AcmeIdentifierType.Ip, value: '192.0.2.10', matchType: AcmeIdentifierMatchType.Exact },
                ]}
                mode={AcmeIdentifierAuthorizationMode.PreauthorizedOnly}
            />,
        );

        await expect(page.getByTestId('identifier-policy-mode')).toContainText('Pre-authorized Only');
        await expect(page.getByTestId('identifier-policy-mode')).toContainText('are refused');
        await expect(page.getByRole('row').filter({ hasText: 'apps.example.com' })).toContainText('DNS nameSubdomainYes');
        await expect(page.getByRole('row').filter({ hasText: '192.0.2.10' })).toContainText('IP addressExactNo');
    });

    test('a wildcard flag core cannot act on is shown as it is acted on', async ({ mount, page }) => {
        await mount(
            <PreauthorizedIdentifiersWidgetHarness
                identifiers={[
                    { type: AcmeIdentifierType.Dns, value: 'example.com', matchType: AcmeIdentifierMatchType.Exact, allowWildcard: true },
                ]}
            />,
        );

        await expect(page.getByRole('row').filter({ hasText: 'example.com' })).toContainText('ExactNo');
    });

    test('repeated entries each get their own row', async ({ mount, page }) => {
        const entry = { type: AcmeIdentifierType.Dns, value: 'example.com', matchType: AcmeIdentifierMatchType.Subdomain };
        await mount(<PreauthorizedIdentifiersWidgetHarness identifiers={[entry, entry, { ...entry, allowWildcard: true }]} />);

        await expect(page.getByRole('row').filter({ hasText: 'example.com' })).toHaveCount(3);
    });
});
