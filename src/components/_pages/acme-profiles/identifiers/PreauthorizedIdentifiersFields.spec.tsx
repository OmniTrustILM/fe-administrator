import type { Page } from '@playwright/test';
import { AcmeIdentifierAuthorizationMode, AcmeIdentifierMatchType, AcmeIdentifierType } from 'types/openapi';
import { MATCH_TYPE_HELP } from 'utils/acme-identifier-policy';
import { expect, test } from '../../../../../playwright/ct-test';
import PreauthorizedIdentifiersFieldsHarness from './PreauthorizedIdentifiersFieldsHarness';

const values = async (page: Page) => JSON.parse(await page.getByTestId('values').innerText());

async function pick(page: Page, testId: string, option: string) {
    await page.getByTestId(`${testId}-trigger`).click();
    await page.getByRole('option', { name: option, exact: true }).click();
}

async function typeValue(page: Page, index: number, value: string) {
    const input = page.getByTestId(`identifier-${index}-value`);
    await input.click();
    await input.fill(value);
    await input.blur();
}

test.describe('PreauthorizedIdentifiersFields', () => {
    test('explains the match types where they are chosen', async ({ mount, page }) => {
        await mount(<PreauthorizedIdentifiersFieldsHarness />);

        await expect(page.getByTestId('identifier-match-help')).toContainText(MATCH_TYPE_HELP);
    });

    test('a new entry is invalid until it holds a usable value', async ({ mount, page }) => {
        await mount(<PreauthorizedIdentifiersFieldsHarness />);

        await page.getByTestId('add-identifier').click();
        await expect(page.getByTestId('identifier-row')).toHaveCount(1);
        await expect(page.getByTestId('valid')).toHaveText('false');

        await typeValue(page, 0, 'apps.example.com');

        await expect(page.getByTestId('valid')).toHaveText('true');
    });

    test('a wildcard written into the value points to the wildcard flag', async ({ mount, page }) => {
        await mount(<PreauthorizedIdentifiersFieldsHarness />);

        await page.getByTestId('add-identifier').click();
        await typeValue(page, 0, '*.example.com');

        await expect(page.getByText("Enter the name without '*.' and allow wildcards on a subdomain entry instead")).toBeVisible();
        await expect(page.getByTestId('valid')).toHaveText('false');
    });

    test('the wildcard flag is per entry and only available on a subdomain entry', async ({ mount, page }) => {
        await mount(
            <PreauthorizedIdentifiersFieldsHarness
                identifiers={[
                    { type: AcmeIdentifierType.Dns, value: 'example.com', matchType: AcmeIdentifierMatchType.Exact },
                    { type: AcmeIdentifierType.Dns, value: 'apps.example.com', matchType: AcmeIdentifierMatchType.Exact },
                ]}
            />,
        );

        await expect(page.getByTestId('identifier-0-wildcard')).toBeDisabled();
        await pick(page, 'identifier-1-match', 'Subdomain');
        await expect(page.getByTestId('identifier-1-wildcard')).toBeEnabled();
        await page.getByTestId('identifier-1-wildcard').check();

        expect((await values(page)).preauthorizedIdentifiers.map((entry: { allowWildcard?: boolean }) => !!entry.allowWildcard)).toEqual([
            false,
            true,
        ]);

        await pick(page, 'identifier-1-match', 'Exact');
        await expect.poll(async () => (await values(page)).preauthorizedIdentifiers[1].allowWildcard).toBe(false);
    });

    test('an IP address is exact only, and switching to it drops subdomain and wildcard', async ({ mount, page }) => {
        await mount(
            <PreauthorizedIdentifiersFieldsHarness
                identifiers={[
                    {
                        type: AcmeIdentifierType.Dns,
                        value: '192.0.2.10',
                        matchType: AcmeIdentifierMatchType.Subdomain,
                        allowWildcard: true,
                    },
                ]}
            />,
        );

        await pick(page, 'identifier-0-type', 'IP address');

        await expect(page.getByTestId('identifier-0-match-trigger')).toBeDisabled();
        await expect(page.getByTestId('identifier-0-wildcard')).toBeDisabled();
        await expect
            .poll(async () => (await values(page)).preauthorizedIdentifiers[0])
            .toMatchObject({ type: AcmeIdentifierType.Ip, matchType: AcmeIdentifierMatchType.Exact, allowWildcard: false });
        await expect(page.getByTestId('valid')).toHaveText('true');
    });

    test('switching the type shows at once why the stored value no longer fits', async ({ mount, page }) => {
        await mount(
            <PreauthorizedIdentifiersFieldsHarness
                identifiers={[{ type: AcmeIdentifierType.Dns, value: 'apps.example.com', matchType: AcmeIdentifierMatchType.Exact }]}
            />,
        );

        await pick(page, 'identifier-0-type', 'IP address');

        await expect(page.getByText('Not a valid IPv4 or IPv6 address')).toBeVisible();
        await expect(page.getByTestId('valid')).toHaveText('false');
    });

    test('each row control has an accessible name of its own', async ({ mount, page }) => {
        await mount(
            <PreauthorizedIdentifiersFieldsHarness
                identifiers={[{ type: AcmeIdentifierType.Dns, value: 'apps.example.com', matchType: AcmeIdentifierMatchType.Exact }]}
            />,
        );

        await expect(page.getByLabel('Identifier 1', { exact: true })).toHaveValue('apps.example.com');
    });

    test('a value is checked against its own type', async ({ mount, page }) => {
        await mount(
            <PreauthorizedIdentifiersFieldsHarness
                identifiers={[{ type: AcmeIdentifierType.Ip, value: '192.0.2.10', matchType: AcmeIdentifierMatchType.Exact }]}
            />,
        );

        await typeValue(page, 0, 'example.com');

        await expect(page.getByText('Not a valid IPv4 or IPv6 address')).toBeVisible();
    });

    test('Pre-authorized only cannot be chosen while the list is empty', async ({ mount, page }) => {
        await mount(<PreauthorizedIdentifiersFieldsHarness />);

        const only = page.getByRole('radio', { name: /Pre-authorized Only/ });
        await expect(only).toBeDisabled();
        await expect(page.getByText('Add an identifier first.')).toBeVisible();

        await page.getByTestId('add-identifier').click();
        await typeValue(page, 0, 'example.com');
        await expect(only).toBeEnabled();
        await only.check();

        await expect
            .poll(async () => (await values(page)).identifierAuthorizationMode)
            .toBe(AcmeIdentifierAuthorizationMode.PreauthorizedOnly);
        await expect(page.getByTestId('valid')).toHaveText('true');
    });

    test('removing the last entry under Pre-authorized only blocks the form with the reason', async ({ mount, page }) => {
        await mount(
            <PreauthorizedIdentifiersFieldsHarness
                identifiers={[{ type: AcmeIdentifierType.Dns, value: 'example.com', matchType: AcmeIdentifierMatchType.Exact }]}
                mode={AcmeIdentifierAuthorizationMode.PreauthorizedOnly}
            />,
        );

        await page.getByRole('button', { name: 'Remove identifier 1' }).click();

        await expect(page.getByTestId('identifier-mode-error')).toContainText('Pre-authorized only needs at least one identifier');
        await expect(page.getByTestId('valid')).toHaveText('false');
    });
});
