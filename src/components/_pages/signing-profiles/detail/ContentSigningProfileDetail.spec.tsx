import { expect, type Locator, type Page, test } from '../../../../../playwright/ct-test';
import { ResourceAction } from 'types/openapi';
import { ContentSigningProfileDetailTestWrapper, type RecordedRequest } from './ContentSigningProfileDetailTestWrapper';
import {
    DOCUMENT_SIGNING_EKU,
    delegatedProfile,
    detailCore,
    ilmNativeProfile,
    namedCertificateProfile,
    noCommonNameProfile,
    otherTypeCertificateProfile,
    signedProfile,
} from './contentSigningDetailFixtures';

const row = (scope: Locator | Page, label: string) =>
    scope.getByRole('row').filter({ has: scope.getByRole('cell', { name: label, exact: true }) });

async function requests(page: Page): Promise<RecordedRequest[]> {
    return JSON.parse((await page.getByTestId('requests').textContent()) ?? '[]') as RecordedRequest[];
}

async function answers(page: Page): Promise<string[]> {
    return JSON.parse((await page.getByTestId('answers').textContent()) ?? '[]') as string[];
}

async function openTab(page: Page, name: string) {
    await page.getByRole('tab', { name }).click();
}

test.describe('Content-signing profile detail', () => {
    test('shows the workflow under the connector’s own family and level names', async ({ mount, page }) => {
        await mount(<ContentSigningProfileDetailTestWrapper core={detailCore} />);
        await openTab(page, 'Content Signing Properties');

        await expect(row(page, 'Content Signing Formatting Connector').getByRole('link', { name: 'PAdES Connector' })).toHaveAttribute(
            'href',
            '/connectors/detail/c-pades',
        );
        await expect(row(page, 'Signature Family')).toContainText('PAdES');
        await expect(row(page, 'Signature Level')).toContainText('PAdES-B-T');
        await expect(row(page, 'Timestamp Source').getByRole('link', { name: 'Durable TSA' })).toHaveAttribute(
            'href',
            '/signingprofiles/detail/tsa-1',
        );
        await expect(row(page, 'Require Non-Repudiation')).toContainText('Enabled');
        await expect(row(page, 'Required Extended Key Usages')).toContainText(DOCUMENT_SIGNING_EKU);
        await expect(page.getByText('Content Signing Formatting Connector Attributes')).toBeVisible();
        await expect(page.getByText('Contract')).toBeVisible();
        expect(await requests(page)).toContainEqual({
            type: 'listSignatureFormattingConnectorDeclarations',
            payload: { connectorUuid: 'c-pades', signingProfileUuid: 'sp-pades' },
        });
    });

    test('falls back to the family code and level when the declarations cannot be read', async ({ mount, page }) => {
        await mount(<ContentSigningProfileDetailTestWrapper core={{ ...detailCore, declarations: { refusal: 'Connector is down' } }} />);
        await openTab(page, 'Content Signing Properties');
        await expect.poll(() => answers(page)).toContain('listSignatureFormattingConnectorDeclarationsFailure');

        await expect(row(page, 'Signature Family')).toContainText('pades');
        await expect(row(page, 'Signature Level')).toContainText('timestamped');
    });

    test('names no timestamp source and accepts any extended key usage at the SIGNED level', async ({ mount, page }) => {
        await mount(<ContentSigningProfileDetailTestWrapper core={{ ...detailCore, profile: signedProfile }} />);
        await openTab(page, 'Content Signing Properties');

        await expect(row(page, 'Timestamp Source')).toContainText('None');
        await expect(row(page, 'Required Extended Key Usages')).toContainText('Any');
    });

    test('offers ILM Native instead of the TSP protocol', async ({ mount, page }) => {
        await mount(<ContentSigningProfileDetailTestWrapper core={detailCore} />);
        await openTab(page, 'Protocols');

        await expect(row(page, 'ILM Native')).toContainText('Disabled');
        await expect(page.getByText('Timestamping Protocol (TSA)')).toHaveCount(0);
        const sent = (await requests(page)).map((request) => request.type);
        expect(sent).toContain('listSupportedProtocols');
        expect(sent).not.toContain('getTspActivationDetails');
    });

    test('activates ILM Native without a confirmation', async ({ mount, page }) => {
        await mount(<ContentSigningProfileDetailTestWrapper core={detailCore} />);
        await openTab(page, 'Protocols');

        await row(page, 'ILM Native').getByRole('button', { name: 'Activate', exact: true }).click();

        await expect(row(page, 'ILM Native')).toContainText('Enabled');
        expect(await requests(page)).toContainEqual({ type: 'activateIlmNative', payload: { uuid: 'sp-pades' } });
    });

    test('deactivates ILM Native once confirmed', async ({ mount, page }) => {
        await mount(<ContentSigningProfileDetailTestWrapper core={{ ...detailCore, profile: ilmNativeProfile }} />);
        await openTab(page, 'Protocols');

        await row(page, 'ILM Native').getByRole('button', { name: 'Deactivate', exact: true }).click();
        await expect(page.getByRole('heading', { name: 'Deactivate ILM Native Protocol' })).toBeVisible();
        expect((await requests(page)).map((request) => request.type)).not.toContain('deactivateIlmNative');

        await page.getByRole('button', { name: 'Deactivate', exact: true }).last().click();

        await expect(row(page, 'ILM Native')).toContainText('Disabled');
        expect(await requests(page)).toContainEqual({ type: 'deactivateIlmNative', payload: { uuid: 'sp-pades' } });
    });

    test('closes the ILM Native deactivation when another profile opens', async ({ mount, page }) => {
        await mount(<ContentSigningProfileDetailTestWrapper core={{ ...detailCore, profile: ilmNativeProfile }} />);
        await openTab(page, 'Protocols');
        await row(page, 'ILM Native').getByRole('button', { name: 'Deactivate', exact: true }).click();
        await expect(page.getByRole('heading', { name: 'Deactivate ILM Native Protocol' })).toBeVisible();

        await page.getByText('Open another profile').dispatchEvent('click');

        await expect(page.getByRole('heading', { name: 'Deactivate ILM Native Protocol' })).toHaveCount(0);
        expect((await requests(page)).map((request) => request.type)).not.toContain('deactivateIlmNative');
    });

    test('names the reason Core refuses the supported protocols', async ({ mount, page }) => {
        await mount(
            <ContentSigningProfileDetailTestWrapper core={{ ...detailCore, supportedProtocols: { refusal: 'Core unavailable' } }} />,
        );
        await openTab(page, 'Protocols');

        await expect(page.getByText('Failed to list the supported protocols: Core unavailable')).toBeVisible();
    });

    test('offers no ILM Native action to a user who may not update the profile', async ({ mount, page }) => {
        await mount(<ContentSigningProfileDetailTestWrapper core={detailCore} allowedActions={[ResourceAction.Detail]} />);
        await openTab(page, 'Protocols');

        await expect(row(page, 'ILM Native')).toContainText('Disabled');
        await expect(row(page, 'ILM Native').getByRole('button', { name: 'Activate', exact: true })).toBeDisabled();
    });

    test('refuses ILM Native for a profile that delegates signing', async ({ mount, page }) => {
        await mount(<ContentSigningProfileDetailTestWrapper core={{ ...detailCore, profile: delegatedProfile }} />);
        await openTab(page, 'Protocols');

        const activate = row(page, 'ILM Native').getByRole('button', { name: 'Activate', exact: true });
        await expect(activate).toBeDisabled();
        await activate.locator('..').hover();
        await expect(page.getByRole('tooltip')).toContainText('This profile delegates signing.');
    });
});

test.describe('Signing profile detail — signing certificate', () => {
    for (const [name, profile, linkText] of [
        ['its display name', namedCertificateProfile, 'Qualified Cert'],
        ['its UUID when an X.509 certificate has no common name', noCommonNameProfile, 'cert-nr'],
        ['its display name when its type has no common name', otherTypeCertificateProfile, 'web-01 host key'],
    ] as const) {
        test(`links the certificate by ${name}`, async ({ mount, page }) => {
            await mount(<ContentSigningProfileDetailTestWrapper core={{ ...detailCore, profile }} />);
            await openTab(page, 'Signing Scheme');

            const link = row(page, 'Certificate').getByRole('link');
            await expect(link).toHaveAttribute('href', '/certificates/detail/cert-nr');
            await expect(link).toHaveText(`${linkText}SN: 2`);
        });
    }
});
